import * as _ from 'lodash';
import { task, ITaskConfig, RunWay, IAssertDist, Src, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, Operation, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import * as path from 'path';
import { IJspmTaskConfig, IBundlesConfig, IBundleGroup, IBuidlerConfig } from './config';

import { readFileSync, readFile, existsSync, writeFileSync } from 'fs';
import * as chalk from 'chalk';
const globby = require('globby');
const jspm = require('jspm');
const source = require('vinyl-source-stream');
const vinylBuffer = require('vinyl-buffer');
const chksum = require('checksum');
const mkdirp = require('mkdirp');
// const uglify = require('gulp-uglify');

export interface IBundleMap {
    path: string;
    modules: Src
}

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

    protected getOption(config: ITaskConfig): IAssertDist {
        return config.option;
    }

    protected loadBuilder(config: ITaskConfig): Promise<any> {
        let option = <IBundlesConfig>config.option;
        // console.log(path.dirname(option.packageFile));
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

    sourceStream(config: ITaskConfig, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource> {
        let option = <IBundlesConfig>config.option;
        if (option.bundles) {
            return Promise.all(_.map(this.getbundles(config), name => {
                return this.loadBuilder(config)
                    .then(builder => {
                        let bundle: IBundleGroup = option.bundles[name];
                        bundle.builder = <IBuidlerConfig>_.defaults(bundle.builder, option.builder);
                        if ( option.builder.config ) {
                            builder.config(bundle.builder.config);
                        }
                        return this.groupBundle(<IJspmTaskConfig>config, builder, name, bundle, gulp);
                    });
            })).then(groups => {
                return _.flatten(groups);
            });
        } else {
            return this.loadBuilder(config)
                .then(builder => {
                    console.log('start bundle all src : ', chalk.cyan(<any>config.getSrc()));
                    if ( option.builder.config ) {
                        builder.config(option.builder.config)
                    }

                    return Promise.resolve<string[]>(globby(config.getSrc()))
                        .then(files => {
                            files = this.getRelativeSrc(files, <IJspmTaskConfig>config);
                            console.log(files);
                            return this.createBundler(<IJspmTaskConfig>config, builder, 'bundle', files.join(' + '), option.mainfile, option.builder);
                        });
                });
        }
    }

    private getRelativeSrc(src: Src, config: IJspmTaskConfig, toModule = false): string[] {
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

    private initOption(config: ITaskConfig) {
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
        }, <IBundlesConfig>config.option);

        option.baseURL = config.toRootPath(option.baseURL);
        option.jspmConfig = config.toRootPath(option.jspmConfig);
        option.packageFile = config.toRootPath(option.packageFile);

        return option;
    }


    execute(config: ITaskConfig, gulp: Gulp) {
        this.bundles = [];
        return super.execute(config, gulp)
            .then(() => {
                let option = <IBundlesConfig>config.option;
                if (option.bundles) {
                    if (option.bust) {
                        return this.calcChecksums(option, this.bundles).then((checksums) => {
                            return this.updateBundleManifest(option, this.bundles, checksums);
                        });
                    } else {
                        return this.updateBundleManifest(option, this.bundles);
                    }
                } else {
                    return null;
                }
            }).then(manifest => {
                if (manifest) {
                    return this.writeBundleManifest(<IJspmTaskConfig>config, manifest, gulp)
                        .then(() => {
                            console.log(chalk.green('------ Complete -------------'));
                        });
                } else {
                    console.log(chalk.green('------ Complete -------------'));
                    return null;
                }
            });
    }

    setup(config: ITaskConfig, gulp: Gulp) {
        config.option = this.initOption(config);
        return super.setup(config, gulp);
    }

    protected working(source: ITransform, config: ITaskConfig, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]) {
        let bundle = source['bundle'];
        if (bundle.sfx) {
            console.log(`Built sfx package: ${chalk.cyan(bundle.bundleName)} -> ${chalk.cyan(bundle.filename)}\n   dest: ${chalk.cyan(bundle.bundleDest)}`);
        } else {
            console.log(`Bundled package: ${chalk.cyan(bundle.bundleName)} -> ${chalk.cyan(bundle.filename)}\n   dest: ${chalk.cyan(bundle.bundleDest)}`);
        }
        return super.working(source, config, option, gulp)
            .then(() => {
                let bundlemap: IBundleMap = {
                    path: bundle.shortPath,
                    modules: bundle.modules
                };
                this.bundles.push(bundlemap);
                return;
            });
    }

    getbundles(config: ITaskConfig) {
        let option = <IBundlesConfig>config.option;
        let groups = _.uniq(_.isArray(config.env.gb) ? config.env.gb : (config.env.gb || '').split(','));
        if (groups.length < 1) {
            groups = _.keys(option.bundles);
        } else {
            groups = _.filter(groups, f => f && groups[f]);
        }

        return groups;
    }

    protected groupBundle(config: IJspmTaskConfig, builder, name: string, bundleGp: IBundleGroup, gulp: Gulp): Promise<any> {

        let option: IBundlesConfig = config.option;

        let bundleStr = '';
        let bundleDest = '';

        let bundleItems: string[] = [];
        let minusStr = this.exclusionString(bundleGp.exclude, option.bundles);

        if (bundleGp.items) {
            bundleItems = _.isArray(bundleItems) ? <string[]>bundleGp.items : _.keys(bundleGp.items);
        }

        console.log(`-------------------------------\nBundling group: ${chalk.cyan(name)} ... \ngroup items:\n  ${chalk.cyan(<any>bundleItems)}\n-------------------------------`);

        return Promise.resolve(builder)
            .then(builder => {
                if (bundleGp.combine) {
                    bundleDest = this.getBundleDest(config, name, bundleGp);
                    bundleStr = bundleItems.join(' + ') + minusStr;
                    return this.createBundler(config, builder, name, bundleStr, bundleDest, bundleGp.builder, bundleGp);

                } else {
                    return Promise.all(bundleItems.map(key => {
                        bundleStr = key + minusStr;
                        bundleDest = this.getBundleDest(config, key, bundleGp);
                        return this.createBundler(config, builder, key, bundleStr, bundleDest, bundleGp.builder, bundleGp);
                    }));
                }

            });
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

    private createBundler(config: IJspmTaskConfig, builder: any, bundleName: string, bundleStr: string, bundleDest: string, builderCfg: IBuidlerConfig, bundleGp?: IBundleGroup): Promise<any> {

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

                return stream.pipe(vinylBuffer());
            })
            .then(output => {
                output['bundle'] = {
                    sfx: sfx,
                    path: shortPath,
                    bundleName: bundleName,
                    filename: filename,
                    bundleDest: bundleDest,
                    modules: output.modules
                };
                return output;
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
                let filepath = path.join(option.baseURL, bundle.path);
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

    protected updateBundleManifest(option: IBundlesConfig, bundles: any[], chksums?: any) {

        chksums = chksums || {};

        var manifest: any = _.defaults(this.getBundleManifest(option), {
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
    private writeBundleManifest(config: IJspmTaskConfig, manifest, gulp: Gulp): Promise<any> {
        let option = config.option;
        if (!option.mainfile) {
            return Promise.reject('mainfile not configed.');
        }


        console.log('Writing manifest...');


        let output = `
System.config({
    baseURL: '${ path.relative(option.baseURL, config.env.root) || '.'}',
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

            let jspmMetas = option.jspmMetas;
            output += _.template(template)({
                maps: JSON.stringify(maps, null, '    '),
                jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                paths: JSON.stringify(config.option.builder.config ? config.option.builder.config.paths : null, null, '    '),
                chksums: JSON.stringify(manifest.chksums, null, '    '),
                bundles: JSON.stringify(manifest.bundles, null, '    '),
            });

        }

        let mainfile = this.getBundleManifestPath(option);


        let includes = option.includes || [
            './system-polyfills.src.js',
            './system.src.js'
        ]
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
                mkdirp.sync(path.dirname(mainfile));
                var stream = <NodeJS.ReadWriteStream>source(mainfile);
                stream.write(data.join('\n'));
                process.nextTick(() => {
                    stream.end();
                });

                return super.working(stream.pipe(vinylBuffer()), config, option, gulp, option.mainfilePipes);
            });

        // if (!existsSync(mainfile)) {
        //     mkdirp.sync(path.dirname(mainfile));

        //     writeFileSync(mainfile, output, { flag: 'wx' });
        // } else {
        //     writeFileSync(mainfile, output);
        // }

        // console.log(chalk.green('Manifest written'));

        // return Promise.resolve(true);

    }

    private getBundleManifestPath(option: IBundlesConfig): string {
        var url = option.baseURL;
        return path.join(url, option.mainfile);
    }
    private getBundleManifest(option: IBundlesConfig): any {
        let data: any = {};
        let path: string = this.getBundleManifestPath(option);
        if (existsSync(path)) {
            try {
                let content = readFileSync(path, 'utf8');
                let idx = content.indexOf(this.manifestSplit);
                idx = idx > 0 ? (idx + this.manifestSplit.length) : 0;
                content = content.substring(idx);
                // console.log(content);
                writeFileSync(path, content);
                data = require(path);
                console.log('has old bundle：\n', chalk.cyan(path)); // , 'data:\n', data);
            } catch (e) {
                console.log(chalk.red(e));
            }
        }

        return data;
    }

    private getBundleShortPath(config: IJspmTaskConfig, bundleName: string, bundleGp?: IBundleGroup) {
        var fullPath = bundleGp ? this.getBundleDest(config, bundleName, bundleGp)
            : path.join(config.getDist(), bundleName);

        let spath: string = path.relative(config.option.baseURL, fullPath);
        spath = spath.replace(/\\/g, '/').replace(/^\//g, '');
        return spath;
    }

    private getBundleDest(config: IJspmTaskConfig, bundleName: string, bundleGp: IBundleGroup) {

        let dest = config.getDist();
        let min = bundleGp.builder.minify;
        let name = bundleGp.items[bundleName] || bundleName;
        let file = name + ((min) ? '.min.js' : '.js');

        if (bundleGp.combine) {
            dest = path.join(dest, file);
        } else {
            dest = path.join(dest, bundleName, file);
        }

        return dest;
    }
}
