import * as _ from 'lodash';
import { IMap, task, RunWay, IAssertDist, ITaskContext, Src, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, Operation, PipeTask, bindingConfig } from 'development-core';
import { Gulp } from 'gulp';
import * as path from 'path';
import { IBundlesConfig, IBundleGroup, IBuidlerConfig, IBundleMap, IBundleTransform } from './config';
import * as url from 'url';
import { readFileSync, readFile, existsSync, writeFileSync, readdirSync } from 'fs';
import * as chalk from 'chalk';

const replace = require('gulp-replace');
// const globby = require('globby');
const jspm = require('jspm');
const source = require('vinyl-source-stream');
const vinylBuffer = require('vinyl-buffer');
const chksum = require('checksum');
const mkdirp = require('mkdirp');
// const uglify = require('gulp-uglify');


@task({
    oper: Operation.release | Operation.deploy
})
export class JspmBundle extends PipeTask {

    name = 'jspm-bundle';
    runWay = RunWay.sequence;
    private bundleMaps: IBundleMap[];
    constructor(info?: ITaskInfo) {
        super(info);
    }

    source(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource> {
        let option = <IBundlesConfig>ctx.option;
        if (option.bundles) {
            return this.initBundles(<ITaskContext>ctx)
                .then(() => {
                    return Promise.all(_.map(this.getBundles(ctx), name => {
                        return this.loadBuilder(ctx)
                            .then(builder => {
                                let bundle: IBundleGroup = this.bundleConfig[name];
                                let bcfg = this.getBuildConfig(ctx);
                                bundle.builder = <IBuidlerConfig>_.defaults(bundle.builder, bcfg);
                                if (bundle.builder.config) {
                                    builder.config(bundle.builder.config);
                                }
                                return this.groupBundle(<ITaskContext>ctx, builder, name, bundle, gulp)
                                    .then(trans => this.translate(trans));
                            });
                    }))
                }).then(groups => {
                    return _.flatten(groups);
                });
        } else {
            return this.loadBuilder(ctx)
                .then(builder => {
                    let src = ctx.getSrc(this.getInfo());
                    console.log('start bundle all src : ', chalk.cyan(<any>src));
                    let bcfg = this.getBuildConfig(ctx);
                    if (bcfg.config) {
                        builder.config(bcfg.config)
                    }

                    return ctx.fileFilter(src)
                        .then(files => {
                            files = this.getRelativeSrc(ctx, files);
                            console.log('bundle files:', chalk.cyan(<any>files));
                            let mainfile = this.getBundleManifestPath(<ITaskContext>ctx);
                            return this.createBundler(<ITaskContext>ctx, builder, 'bundle', files.join(' + '), mainfile, bcfg)
                                .then(trans => this.translate(trans));
                        });
                });
        }
    }

    execute(context: ITaskContext, gulp: Gulp) {
        this.bundleMaps = [];
        let ctx = <ITaskContext>context;
        return super.execute(ctx, gulp)
            .then(() => {
                let option = <IBundlesConfig>ctx.option;
                if (option.bundles) {
                    return this.calcChecksums(option, this.bundleMaps).then((checksums) => {
                        return this.updateBundleManifest(ctx, this.bundleMaps, checksums);
                    });
                } else {
                    return null;
                }
            }).then(manifest => {
                if (manifest) {
                    return this.writeBundleManifest(ctx, manifest, gulp)
                        .then(() => {
                            console.log(chalk.green('------ Complete -------------'));
                        });
                } else {
                    console.log(chalk.green('------ Complete -------------'));
                    return null;
                }
            });
    }

    setup(ctx: ITaskContext, gulp: Gulp) {
        ctx.option = this.initOption(ctx);
        return super.setup(ctx, gulp);
    }

    pipes(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): Pipe[] {
        let pipes = super.pipes(ctx, dist, gulp) || [];
        let ps = this.getAssertResetPipe(ctx);
        if (ps && ps.length > 0) {
            pipes = pipes.concat(ps);
        }
        return pipes;
    }

    protected working(source: ITransform, ctx: ITaskContext, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]) {
        let bundle = <IBundleMap>source['bundle'];
        return super.working(source, ctx, option, gulp, pipes, output)
            .then(() => {
                let bundlemap: IBundleMap = {
                    path: bundle.path,
                    modules: bundle.modules
                };
                this.bundleMaps.push(bundlemap);
                if (bundle.sfx) {
                    console.log(`Built sfx package: ${chalk.cyan(bundle.bundleName)} -> ${chalk.cyan(bundle.filename)}\n   dest: ${chalk.cyan(bundle.bundleDest)}`);
                } else {
                    console.log(`Bundled package: ${chalk.cyan(bundle.bundleName)} -> ${chalk.cyan(bundle.filename)}\n   dest: ${chalk.cyan(bundle.bundleDest)}`);
                }
                return;
            });
    }


    protected getOption(config: ITaskContext): IAssertDist {
        return config.option;
    }

    protected loadBuilder(ctx: ITaskContext): Promise<any> {
        let option = <IBundlesConfig>ctx.option;
        jspm.setPackagePath(path.dirname(ctx.toStr(option.packageFile)));
        let jsbuilder = new jspm.Builder({ separateCSS: option.builder.separateCSS });

        return Promise.resolve(jsbuilder)
            .then(builder => {
                if (option.jspmConfig) {
                    if (_.isArray(option.jspmConfig)) {
                        return Promise.all(option.jspmConfig.map(cf => builder.loadConfig(cf, undefined, true)))
                            .then(() => {
                                return builder;
                            });
                    } else {
                        return builder.loadConfig(option.jspmConfig, undefined, true)
                            .then(() => {
                                return builder;
                            });
                    }
                } else {
                    return builder;
                }
            });
    }

    private translate(trans: IBundleTransform | IBundleTransform[]): ITransform | ITransform[] {
        if (_.isArray(trans)) {
            return _.map(trans, t => {
                t.stream['bundle'] = t.bundle;
                return t.stream;
            });
        } else {
            trans.stream['bundle'] = trans.bundle;
            return trans.stream;
        }
    }

    private bundleConfig: IMap<IBundleGroup>;
    protected initBundles(ctx: ITaskContext): Promise<IMap<IBundleGroup>> {
        let opt = <IBundlesConfig>ctx.option;
        let pr = Promise.resolve<IMap<IBundleGroup>>(null)
            .then(() => ctx.to<IMap<IBundleGroup> | Promise<IMap<IBundleGroup>>>(opt.bundles));

        if (opt.bundleDeps) {
            pr = pr.then(bundles => {
                let pkg = ctx.getPackage(<string>opt.packageFile);
                if (!pkg) {
                    console.log(chalk.red('can not found package.json file.'));
                    process.exit(0);
                }

                let deps = opt.dependencies ? ctx.to<string[]>(opt.dependencies) : _.keys(pkg.jspm.dependencies);
                if (!deps || deps.length < 0) {
                    console.log(chalk.red('not set bundle dependencies libs, or not setting jspm config.'));
                    process.exit(0);
                }
                if (opt.depsExclude) {
                    let exclude = _.isFunction(opt.depsExclude) ? opt.depsExclude(ctx, deps) : opt.depsExclude;
                    deps = _.filter(deps, d => exclude.indexOf(d) < 0);
                }

                return Promise.resolve()
                    .then(() => {
                        if (_.isFunction(opt.bundleDeps)) {
                            // opt['_bundleDepsFunc'] = opt.bundleDeps;
                            return opt.bundleDeps(ctx, deps);
                        } else if (_.isBoolean(opt.bundleDeps)) {
                            return {
                                deplibs: {
                                    combine: true,
                                    items: deps
                                }
                            };
                        } else {
                            return opt.bundleDeps;
                        }
                    })
                    .then(bundleDeps => {

                        let cores = _.keys(bundleDeps);
                        _.each(_.keys(bundles), n => {
                            let b: IBundleGroup = bundles[n];
                            b.exclude = b.exclude || [];
                            b.exclude = cores.concat(b.exclude);
                            bundleDeps[n] = b;
                        });

                        return bundleDeps;
                    });
            });
        }

        return pr.then(bundles => {
            this.bundleConfig = bundles;
            console.log('group bundles setting:\n', bundles, '---------------------------------\n');
            return bundles;
        });

    }

    private getRelativeSrc(ctx: ITaskContext, src: Src, toModule = false): string[] {
        let bunldeBase = <string>(<IBundlesConfig>ctx.option).bundleBaseDir;
        if (_.isArray(src)) {
            return _.map(src, s => {
                let filename = ctx.toUrl(bunldeBase, s);
                return toModule ? this.toModulePath(filename) : filename;
            });
        } else {
            let fn = ctx.toUrl(bunldeBase, src);
            return [(toModule ? this.toModulePath(fn) : fn)];
        }
    }

    private toModulePath(filename: string): string {
        if (!filename) {
            return '';
        }
        return filename.substring(0, filename.length - path.extname(filename).length);
    }

    private initOption(ctx: ITaskContext) {
        let option = <IBundlesConfig>_.extend({}, <IBundlesConfig>{
            baseURL: '',
            bundleBaseDir: '.',
            mainfile: 'bundle.js',
            jspmConfig: '',
            packageFile: 'package.json',
            dest: '',
            file: '',
            systemConfigTempl: '',
            relationToRoot: '',
            bust: '',
            bundles: null,
            bundlePaths(ctx) {
                let paths: any = {};
                let bundleDest = ctx.getDist();
                let rootpath = <string>option.bundleBaseDir;
                ctx.getFolders(rootpath, (f, d) => {
                    if (f !== bundleDest) {
                        let p = d + '/*';
                        paths[p] = ctx.toUrl(ctx.env.root, path.join(rootpath, p));
                    }
                    return '';
                });
                // let jpk = <string>option.jspmPackages;
                // let jp = path.basename(jpk) + '/*';
                // paths[jp] = self.toUrl(rootpath, path.join(jpk, jp));
                console.log('paths: ', paths);
                return paths;
            },
            includePackageFiles: [
                'system-polyfills.src.js',
                'system.src.js'
            ],
            jspmMates: {
                '*.css': {
                    loader: 'css'
                },
                '*.json': {
                    loader: 'json'
                },
                '*.jsx': {
                    loader: 'jsx'
                }
            },
            builder: {
                sfx: false,
                minify: false,
                mangle: false,
                sourceMaps: false,
                separateCSS: false,
                lowResSourceMaps: true
            }
        }, <IBundlesConfig>ctx.option);

        ctx.option = option;

        option.baseURL = ctx.toStr(option.baseURL) || './';
        console.log('baseURL set as:', option.baseURL);
        if (!option.bundleBaseDir && ctx.parent) {
            option.bundleBaseDir = ctx.parent.getDist()
        } else if (option.bundleBaseDir) {
            option.bundleBaseDir = ctx.toRootPath(ctx.toStr(option.bundleBaseDir));
        } else {
            console.log(chalk.red('bundleBaseURL config error!'));
            process.exit(0);
        }

        if (option.jspmConfig) {
            option.jspmConfig = ctx.toRootSrc(ctx.toSrc(option.jspmConfig));
        }
        option.packageFile = ctx.toRootPath(ctx.toStr(option.packageFile));
        option.mainfile = ctx.toStr(option.mainfile);
        let pkg = ctx.getPackage(<string>option.packageFile);
        if (!option.jspmPackages) {
            if (pkg.jspm.directories && pkg.jspm.directories.packages) {
                option.jspmPackages = <string>pkg.jspm.directories.packages;
            } else {
                option.jspmPackages = 'jspm_packages';
            }
        }
        option.jspmPackages = ctx.toRootPath(ctx.toStr(option.jspmPackages));

        if (!readdirSync(option.jspmPackages)) {
            console.log(chalk.red('jspm project config error!'));
            process.exit(0);
        }

        return option;
    }

    protected getBuildConfig(ctx: ITaskContext) {
        let option = <IBundlesConfig>ctx.option;
        if (!option.builder.config) {
            option.builder.config = _.extend(option.builder.config || {}, {
                paths: ctx.to<IMap<string>>(option.bundlePaths) || {},
                rootURL: <string>option.bundleBaseDir
            });
        }

        return option.builder;
    }

    private restps: Pipe[];
    protected getAssertResetPipe(ctx: ITaskContext) {
        if (!this.restps) {
            let option = <IBundlesConfig>ctx.option;
            if (_.isUndefined(option.resetAsserts)) {
                option.resetAsserts = 'assets';
            }
            if (option.resetAsserts) {
                let folders: string[];
                if (_.isString(option.resetAsserts)) {
                    let pth = ctx.toDistPath(option.resetAsserts, this.getInfo());
                    if (existsSync(pth)) {
                        folders = ctx.getFolders(pth);
                        folders.push(pth);
                    } else {
                        console.log(chalk.yellow('rest css asserts folders:', pth, 'not exists.'))
                    }
                } else {
                    folders = <string[]>ctx.toDistSrc(option.resetAsserts, this.getInfo());
                }

                folders = folders || [];

                let ps = [];
                let dist = ctx.getDist(this.getInfo());
                let baseURL = <string>option.baseURL; // ctx.toUrl(ctx.getRootPath(), <string>option.baseURL) || '.';
                let root = ctx.getRootPath();
                _.each(folders, f => {
                    let relp = url.resolve(baseURL,  ctx.toUrl(root, ctx.toUrl(dist, f)));
                    let fm = path.basename(f);
                    console.log('reset css url folder name:', chalk.cyan(fm), 'relate url:', chalk.cyan(relp));
                    let reg = new RegExp(`(url\\((\\.\\.\\/)+${fm})|(url\\(\\/${fm})`, 'gi');
                    ps.push(() => replace(reg, `url(${relp}`));
                    let reg2 = new RegExp(`(url\\(\\\\'(\\.\\.\\/)+${fm})|(url\\(\\\\'\\/${fm})`, 'gi');
                    ps.push(() => replace(reg2, `url(\\'${relp}`));
                    let reg3 = new RegExp(`(url\\(("\\.\\.\\/)+${fm})|(url\\("\\/${fm})`, 'gi');
                    ps.push(() => replace(reg3, `url("${relp}`));
                });
                this.restps = ps;
            } else {
                this.restps = [];
            }
        }
        return this.restps;
    }


    protected getBundles(ctx: ITaskContext) {

        let groups = [];
        if (ctx.env.gb) {
            groups = _.uniq(_.isArray(ctx.env.gb) ? ctx.env.gb : (ctx.env.gb || '').split(','));
        }

        if (groups.length < 1) {
            groups = _.keys(this.bundleConfig);
        } else {
            groups = _.filter(groups, f => f && this.bundleConfig[f]);
        }
        console.log('cmmand group bundle:', chalk.cyan(<any>groups));
        return groups;
    }

    protected groupBundle(config: ITaskContext, builder, name: string, bundleGp: IBundleGroup, gulp: Gulp): Promise<IBundleTransform | IBundleTransform[]> {

        let bundleStr = '';
        let bundleDest = '';

        let bundleItems: string[] = [];
        let minusStr = this.exclusionString(bundleGp.exclude, this.bundleConfig);

        if (bundleGp.items) {
            bundleItems = _.isArray(bundleItems) ? <string[]>bundleGp.items : _.keys(bundleGp.items);
        }

        if (bundleGp.combine) {
            bundleDest = this.getBundleDest(config, name, bundleGp);
            bundleStr = bundleItems.join(' + ') + minusStr;
            console.log(`Bundling group: ${chalk.cyan(name)} ... \ngroup source:\n  ${chalk.cyan(bundleStr)}\n-------------------------------`);
            return this.createBundler(config, builder, name, bundleStr, bundleDest, bundleGp.builder, bundleGp);

        } else {
            console.log(`Bundling group: ${chalk.cyan(name)} ... \ngroup items:\n  ${chalk.cyan(<any>bundleItems)}\n-------------------------------`);
            return Promise.all(bundleItems.map(key => {
                bundleStr = key + minusStr;
                bundleDest = this.getBundleDest(config, key, bundleGp);
                return this.createBundler(config, builder, key, bundleStr, bundleDest, bundleGp.builder, bundleGp);
            }));
        }
    }

    private exclusionString(exclude, groups): string {
        let str = this.exclusionArray(exclude, groups).join(' - ');
        return (str) ? ' - ' + str : '';
    }

    private exclusionArray(exclude, groups): string[] {
        let minus: string[] = [];
        exclude = (_.isArray(exclude)) ? exclude : _.keys(exclude);
        _.forEach(exclude, (item: string) => {
            var group = groups[item];
            if (group) {
                // exclude everything from this group
                minus = minus.concat(this.exclusionArray(group.items, groups));
            } else {
                // exclude this item by name
                minus.push(item);
            }
        });
        return minus;
    }

    private createBundler(config: ITaskContext, builder: any, bundleName: string, bundleStr: string, bundleDest: string, builderCfg: IBuidlerConfig, bundleGp?: IBundleGroup): Promise<IBundleTransform> {

        let sfx = builderCfg.sfx;
        let bundler = (sfx) ? builder.buildStatic : builder.bundle;
        let shortPath = this.getBundleShortPath(config, bundleName, bundleGp);
        let filename = path.parse(bundleDest).base;

        return bundler.bind(builder)(bundleStr, bundleDest, builderCfg)
            .then(output => {
                mkdirp.sync(path.dirname(bundleDest));
                var stream: ITransform = source(filename);
                stream.write(output.source);
                process.nextTick(function () {
                    stream.end();
                });

                console.log('pipe bundling：', chalk.cyan(bundleName));
                return {
                    stream: stream.pipe(vinylBuffer()),
                    bundle: {
                        path: shortPath,
                        sfx: sfx,
                        bundleName: bundleName,
                        filename: filename,
                        bundleDest: bundleDest,
                        modules: output.modules
                    }
                };
            });

    }

    private calcChecksums(option: IBundlesConfig, bundles: any[]): Promise<any> {
        let chksums = {};

        console.log('Calculating checksums...');

        return Promise.all(_.map(bundles, (bundle: any) => {
            if (!_.isObject(bundle)) {
                return null;
            }

            return new Promise((resolve, reject) => {
                let filepath = path.join(<string>option.bundleBaseDir || '.', bundle.path);
                let filename = path.parse(bundle.path).base;
                chksum.file(filepath, (err, sum) => {
                    if (err) {
                        console.error(chalk.red(' Checksum Error:'), chalk.red(err));
                    }
                    console.log(filename, chalk.cyan(sum));
                    chksums[bundle.path] = sum;
                    resolve(chksums);
                });
            });

        })).then(() => {
            return chksums;
        });
    }

    protected updateBundleManifest(ctx: ITaskContext, bundles: any[], chksums?: any) {

        chksums = chksums || {};

        var manifest: any = _.defaults(this.getBundleManifest(ctx), {
            bundles: {},
            chksums: {}
        });

        // console.log(manifest);

        _.each(bundles, bundle => {
            if (bundle.path) {
                manifest.bundles[bundle.path] = bundle.modules;
                manifest.chksums[bundle.path] = chksums[bundle.path] || '';
            }
        });

        return manifest;

    }

    private manifestSplit = `/*------bundles infos------*/`;
    private writeBundleManifest(ctx: ITaskContext, manifest, gulp: Gulp): Promise<any> {
        let option = <IBundlesConfig>ctx.option;
        if (!option.mainfile) {
            return Promise.reject('mainfile not configed.');
        }


        console.log('Writing manifest...');

        let baseURL = ctx.toUrl(<string>option.baseURL) || '.';
        console.log('system config baseURL: ', chalk.cyan(baseURL));

        let bust = ctx.toStr(option.bust);
        console.log('system bust: ', chalk.cyan(bust));

        let output = `
System.config({
    baseURL: '${baseURL}',
    defaultJSExtensions: true
});
System.bundled = true;
System.bust = '${bust}';
if(window != undefined) window.prod = true;
${this.manifestSplit}
`;
        let template = '';

        if (manifest) {
            // try {
            template = ctx.toStr(option.systemConfigTempl);

            if (!template) {
                template = (bust) ? `
(function(module) {
    var bust = {};
    var systemLocate = System.locate;
    var systemNormalize = System.normalize;
    var paths =  module.exports.paths = \${paths} || {};
    var chksums = module.exports.chksums = \${chksums};
    var bundles = module.exports.bundles = \${bundles};                    
    var maps = \${ maps };
    var jspmMeta = \${ jspmMeta };

    System.config({
            packages: {
            "meta": jspmMeta
        },
        map: maps,
        paths: paths,
        bundles: bundles
    });

    System.normalize = function (name, pName, pAddress) {
        return systemNormalize.call(this, name, pName, pAddress).then(function (address) {
            var chksum = chksums[name];
            if (chksums[name]) { bust[address] = chksum; }
            return address;
        });
    };

    System.locate = function (load) {
        return Promise.resolve(systemLocate.call(this, load)).then(function (address) {
            var chksum = bust[address];
            return (chksum) ? address + '?' + chksum : address;
        });
    };

})((typeof module !== 'undefined') ? module : {exports: {}}, this);
` : `
(function(module) {
    var bundles = module.exports.bundles = \${bundles};
    var paths =  module.exports.paths = \${paths} || {};
    var maps = \${ maps };
    var jspmMeta = \${ jspmMeta };

    System.config({
            packages: {
            "meta": jspmMeta
        },
        map: maps,
        paths: paths,
        bundles: bundles
    });

})((typeof module !== 'undefined') ? module : {exports: {}}, this);
`;
            }


            // let maps = {
            //     css: 'github:systemjs/plugin-css@0.1.20.js',
            //     json: 'github:systemjs/plugin-json@0.1.2.js'
            // };

           let maps = option.bundleMaps || {
                css: '',
                json: '',
                text: ''
            };

            let cssSrc, jsonSrc, textSrc;
            _.each(_.keys(manifest.bundles), n => {
                if (!maps.css) {
                    cssSrc = <string>_.find(manifest.bundles[n], (it: string) => /(css(.min){0,1}.js)|(plugin-css@\d+.\d+.\d+.js)$/.test(it));
                    if (cssSrc) {
                        maps.css = cssSrc;
                    }
                }

                if (!maps.json) {
                    jsonSrc = _.find(manifest.bundles[n], (it: string) => /(json(.min){0,1}.js)|(plugin-json@\d+.\d+.\d+.js)$/.test(it));
                    if (jsonSrc) {
                        maps.json = jsonSrc;
                    }
                }
                if (!maps.text) {
                    textSrc = <string>_.find(manifest.bundles[n], (it: string) => /(text(.min){0,1}.js)|(plugin-text@\d+.\d+.\d+.js)$/.test(it));
                    if (textSrc) {
                        maps.text = textSrc;
                    }
                }
            });
            let jspmMetas = option.jspmMates;
            output += _.template(template)({
                maps: JSON.stringify(maps, null, '    '),
                jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                paths: JSON.stringify(null, null, '    '), // option.builder.config ? option.builder.config.paths :
                chksums: JSON.stringify(manifest.chksums, null, '    '),
                bundles: JSON.stringify(manifest.bundles, null, '    '),
            });

        }


        let includes = option.includes || [];

        includes = includes.concat(_.map(option.includePackageFiles, f => path.join(option.jspmPackages, f)));

        return Promise.all(_.map(includes, f => {
            return new Promise<string>((resolve, reject) => {
                readFile(f, 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        }))
            .then(data => {
                data.push(output);
                let mainfile = ctx.toStr(option.mainfile); // path.relative(this.getBundleManifestPath(ctx), ctx.getDist(this.getInfo()));
                console.log('mainfile:', mainfile);
                mkdirp.sync(path.dirname(mainfile));
                var stream = <NodeJS.ReadWriteStream>source(mainfile);
                stream.write(data.join('\n'));
                process.nextTick(() => {
                    stream.end();
                });

                return super.working(stream.pipe(vinylBuffer()), ctx, option, gulp, option.mainfilePipes || [], option.mainfileOutput);
            });

    }

    private getBundleManifestPath(ctx: ITaskContext): string {
        return this.getBundleDest(ctx, <string>(<IBundlesConfig>ctx.option).mainfile);
    }
    private getBundleManifest(ctx: ITaskContext): any {
        let data: any = {};
        let mainfile: string = this.getBundleManifestPath(ctx);
        console.log('try to load old bundle in path ', mainfile);
        if (existsSync(mainfile)) {
            try {
                let content = readFileSync(mainfile, 'utf8');
                let idx = content.indexOf(this.manifestSplit);
                idx = idx > 0 ? (idx + this.manifestSplit.length) : 0;
                content = content.substring(idx);
                // console.log(content);
                writeFileSync(mainfile, content);
                data = require(mainfile);
                console.log('has old bundle：\n', chalk.cyan(mainfile)); // , 'data:\n', data);
            } catch (e) {
                console.log(chalk.red(e));
            }
        } else {
            console.log('no old bundle：\n', chalk.cyan(mainfile)); // , 'data:\n', data);
        }

        return data;
    }

    private getBundleShortPath(ctx: ITaskContext, bundleName: string, bundleGp?: IBundleGroup) {
        var fullPath = bundleGp ? this.getBundleDest(ctx, bundleName, bundleGp)
            : path.join(ctx.getDist(), bundleName);

        return ctx.toUrl(<string>(<IBundlesConfig>ctx.option).bundleBaseDir, fullPath)

    }

    private getBundleDest(ctx: ITaskContext, bundleName: string, bundleGp?: IBundleGroup) {

        let dest = ctx.getDist();
        if (bundleGp) {
            let min = bundleGp.builder.minify;
            let name = bundleGp.items[bundleName] || bundleName;
            let file = name + ((min) ? '.min.js' : '.js');

            if (bundleGp.combine) {
                dest = path.join(dest, file);
            } else {
                dest = path.join(dest, bundleName, file);
            }
        } else {
            dest = path.join(dest, bundleName);
        }

        return dest;
    }
}
