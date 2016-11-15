import * as _ from 'lodash';
import { task, RunWay, IAssertDist, ITaskContext, Src, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, Operation, PipeTask, bindingConfig } from 'development-core';
import { Gulp } from 'gulp';
import * as path from 'path';
import { IJspmTaskContext, IBundlesConfig, IBundleGroup, IBuidlerConfig, IBundleMap, IBundleTransform } from './config';

import { readFileSync, readFile, existsSync, writeFileSync, readdirSync } from 'fs';
import * as chalk from 'chalk';
const globby = require('globby');
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
    private bundles: IBundleMap[];
    constructor(info?: ITaskInfo) {
        super(info);
    }

    protected getOption(config: ITaskContext): IAssertDist {
        return config.option;
    }

    protected loadBuilder(ctx: ITaskContext): Promise<any> {
        let option = <IBundlesConfig>ctx.option;
        jspm.setPackagePath(path.dirname(option.packageFile));
        let jsbuilder = new jspm.Builder({ separateCSS: option.builder.separateCSS });

        return Promise.resolve(jsbuilder)
            .then(builder => {
                if (option.jspmConfig) {
                    return builder.loadConfig(option.jspmConfig, undefined, true)
                        .then(() => {
                            return builder;
                        });
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

    source(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource> {
        let option = <IBundlesConfig>ctx.option;
        if (option.bundles) {
            return Promise.all(_.map(this.getbundles(ctx), name => {
                return this.loadBuilder(ctx)
                    .then(builder => {
                        let bundle: IBundleGroup = option.bundles[name];
                        bundle.builder = <IBuidlerConfig>_.defaults(bundle.builder, option.builder);
                        if (option.builder.config) {
                            builder.config(bundle.builder.config);
                        }
                        return this.groupBundle(<IJspmTaskContext>ctx, builder, name, bundle, gulp)
                            .then(trans => this.translate(trans));
                    });
            })).then(groups => {
                return _.flatten(groups);
            });
        } else {
            return this.loadBuilder(ctx)
                .then(builder => {
                    let src = ctx.getSrc(this.getInfo());
                    console.log('start bundle all src : ', chalk.cyan(<any>src));
                    if (option.builder.config) {
                        builder.config(option.builder.config)
                    }

                    return Promise.resolve<string[]>(globby(src))
                        .then(files => {
                            files = this.getRelativeSrc(files, <IJspmTaskContext>ctx);
                            console.log('bundle files:', chalk.cyan(<any>files));
                            return this.createBundler(<IJspmTaskContext>ctx, builder, 'bundle', files.join(' + '), option.mainfile, option.builder)
                                .then(trans => this.translate(trans));
                        });
                });
        }
    }

    private getRelativeSrc(src: Src, config: IJspmTaskContext, toModule = false): string[] {
        // console.log(option.baseURL);
        let baseURL = config.option.baseURL
        if (_.isArray(src)) {
            return _.map(src, s => {
                let filename = path.relative(baseURL, s).replace(/\\/g, '/').replace(/^\//g, '');
                return toModule ? this.toModulePath(filename) : filename;
            });
        } else {
            let fn = path.relative(baseURL, src).replace(/\\/g, '/').replace(/^\//g, '');
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
        let option = <IBundlesConfig>_.extend(<IBundlesConfig>{
            baseURL: '',
            mainfile: 'bundle.js',
            jspmConfig: '',
            packageFile: 'package.json',
            dest: '',
            file: '',
            systemConfigTempl: '',
            relationToRoot: '',
            bust: '',
            bundles: null,
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

        option.baseURL = ctx.toRootPath(option.baseURL);
        if (option.jspmConfig) {
            option.jspmConfig = ctx.toRootPath(option.jspmConfig);
        }
        option.packageFile = ctx.toRootPath(option.packageFile);

        let pkg = this.getPackage(option);
        if (!option.jspmPackages) {
            if (pkg.jspm.directories && pkg.jspm.directories.packages) {
                option.jspmPackages = <string>pkg.jspm.directories.packages;
            } else {
                option.jspmPackages = 'jspm_packages';
            }
        }
        option.jspmPackages = ctx.toRootPath(option.jspmPackages);

        if (!readdirSync(option.jspmPackages)) {
            console.log(chalk.red('jspm project config error!'));
            process.exit(0);
        }

        return option;
    }


    execute(context: ITaskContext, gulp: Gulp) {
        this.bundles = [];
        let ctx = <IJspmTaskContext>context;
        return super.execute(ctx, gulp)
            .then(() => {
                let option = <IBundlesConfig>ctx.option;
                if (option.bundles) {
                    return this.calcChecksums(option, this.bundles).then((checksums) => {
                        return this.updateBundleManifest(ctx, this.bundles, checksums);
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

    protected working(source: ITransform, ctx: ITaskContext, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]) {
        let bundle = <IBundleMap>source['bundle'];
        return super.working(source, ctx, option, gulp, pipes, output)
            .then(() => {
                let bundlemap: IBundleMap = {
                    path: bundle.path,
                    modules: bundle.modules
                };
                this.bundles.push(bundlemap);
                if (bundle.sfx) {
                    console.log(`Built sfx package: ${chalk.cyan(bundle.bundleName)} -> ${chalk.cyan(bundle.filename)}\n   dest: ${chalk.cyan(bundle.bundleDest)}`);
                } else {
                    console.log(`Bundled package: ${chalk.cyan(bundle.bundleName)} -> ${chalk.cyan(bundle.filename)}\n   dest: ${chalk.cyan(bundle.bundleDest)}`);
                }
                return;
            });
    }

    getbundles(ctx: ITaskContext) {
        let option = <IBundlesConfig>ctx.option;
        let groups = [];
        if (ctx.env.gb) {
            groups = _.uniq(_.isArray(ctx.env.gb) ? ctx.env.gb : (ctx.env.gb || '').split(','));
        }

        if (groups.length < 1) {
            groups = _.keys(option.bundles);
        } else {
            groups = _.filter(groups, f => f && groups[f]);
        }
        console.log('cmmand group bundle:', chalk.cyan(<any>groups));
        return groups;
    }

    protected groupBundle(config: IJspmTaskContext, builder, name: string, bundleGp: IBundleGroup, gulp: Gulp): Promise<IBundleTransform | IBundleTransform[]> {

        let option: IBundlesConfig = config.option;

        let bundleStr = '';
        let bundleDest = '';

        let bundleItems: string[] = [];
        let minusStr = this.exclusionString(bundleGp.exclude, option.bundles);

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

    private createBundler(config: IJspmTaskContext, builder: any, bundleName: string, bundleStr: string, bundleDest: string, builderCfg: IBuidlerConfig, bundleGp?: IBundleGroup): Promise<IBundleTransform> {

        let sfx = builderCfg.sfx;
        let bundler = (sfx) ? builder.buildStatic : builder.bundle;
        let shortPath = this.getBundleShortPath(config, bundleName, bundleGp);
        let filename = path.parse(bundleDest).base;

        return bundler.bind(builder)(bundleStr, bundleDest, builderCfg)
            .then(output => {
                mkdirp.sync(path.dirname(bundleDest));
                var stream: ITransform = source(filename);
                stream.write(output.source);
                process.nextTick(function() {
                    stream.end();
                });


                // transform['bundle'] = {
                //     sfx: sfx,
                //     path: shortPath,
                //     bundleName: bundleName,
                //     filename: filename,
                //     bundleDest: bundleDest,
                //     modules: output.modules
                // };
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

    private packages = {};
    public getPackage(option: IBundlesConfig): any {
        if (!this.packages[option.packageFile]) {
            this.packages[option.packageFile] = require(option.packageFile);
        }
        return this.packages[option.packageFile]
    }

    private calcChecksums(option: IBundlesConfig, bundles: any[]): Promise<any> {
        let chksums = {};

        console.log('Calculating checksums...');

        return Promise.all(_.map(bundles, (bundle: any) => {
            if (!_.isObject(bundle)) {
                return null;
            }

            return new Promise((resolve, reject) => {
                let filepath = path.join(option.baseURL || '.', bundle.path);
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

    protected updateBundleManifest(ctx: IJspmTaskContext, bundles: any[], chksums?: any) {

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
    private writeBundleManifest(ctx: IJspmTaskContext, manifest, gulp: Gulp): Promise<any> {
        let option = ctx.option;
        if (!option.mainfile) {
            return Promise.reject('mainfile not configed.');
        }


        console.log('Writing manifest...');


        let output = `
System.config({
    baseURL: '${ path.relative(option.baseURL, ctx.env.root) || '.'}',
    defaultJSExtensions: true
});
System.bundled = true;
System.bust = '${option.bust}';
if(window != undefined) window.prod = true;
${this.manifestSplit}
`;
        let template = '';

        if (manifest) {
            // try {
            template = option.systemConfigTempl;

            if (!template) {
                template = (option.bust) ? `
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


            let maps = {
                css: 'github:systemjs/plugin-css@0.1.20.js',
                json: 'github:systemjs/plugin-json@0.1.2.js'
            };

            _.each(_.keys(manifest.bundles), n => {
                if (/css.min.js$/.test(n)) {
                    maps.css = <string>_.first(manifest.bundles[n]);
                }
                if (/json.min.js$/.test(n)) {
                    maps.css = <string>_.first(manifest.bundles[n]);
                }
            });

            let jspmMetas = option.jspmMates;
            output += _.template(template)({
                maps: JSON.stringify(maps, null, '    '),
                jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                paths: JSON.stringify(ctx.option.builder.config ? ctx.option.builder.config.paths : null, null, '    '),
                chksums: JSON.stringify(manifest.chksums, null, '    '),
                bundles: JSON.stringify(manifest.bundles, null, '    '),
            });

        }


        let includes = option.includes || [];

        includes = includes.concat(_.map(option.includePackageFiles, f => path.join(option.jspmPackages, f)));

        return Promise.all(_.map(includes, f => {
            return new Promise<string>((resolve, reject) => {
                readFile(path.join(option.jspmConfig, f), 'utf8', (err, data) => {
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
                let mainfile = option.mainfile; // path.relative(this.getBundleManifestPath(ctx), ctx.getDist(this.getInfo()));
                // console.log('mainfile:', mainfile);
                mkdirp.sync(path.dirname(mainfile));
                var stream = <NodeJS.ReadWriteStream>source(mainfile);
                stream.write(data.join('\n'));
                process.nextTick(() => {
                    stream.end();
                });

                return super.working(stream.pipe(vinylBuffer()), ctx, option, gulp, option.mainfilePipes, option.mainfileOutput);
            });

    }

    private getBundleManifestPath(ctx: IJspmTaskContext): string {
        return this.getBundleDest(ctx, ctx.option.mainfile);
    }
    private getBundleManifest(ctx: IJspmTaskContext): any {
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

    private getBundleShortPath(config: IJspmTaskContext, bundleName: string, bundleGp?: IBundleGroup) {
        var fullPath = bundleGp ? this.getBundleDest(config, bundleName, bundleGp)
            : path.join(config.getDist(), bundleName);

        let spath: string = path.relative(config.option.baseURL, fullPath);
        spath = spath.replace(/\\/g, '/').replace(/^\//g, '');
        return spath;
    }

    private getBundleDest(config: IJspmTaskContext, bundleName: string, bundleGp?: IBundleGroup) {

        let dest = config.getDist();
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
