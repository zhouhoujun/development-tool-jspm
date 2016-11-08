import * as _ from 'lodash';
import { task, ITaskConfig, RunWay, IAssertDist, Src, ITaskInfo, TransformSource, ITransform, Operation, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import * as path from 'path';
import { IJspmTaskConfig, IBundlesConfig, IBundleGroup } from './config';

import { readFileSync, readFile, existsSync, writeFileSync } from 'fs';
import * as chalk from 'chalk';
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
                        bundle.builder = _.defaults(bundle.builder, option.builder);
                        return this.groupBundle(<IJspmTaskConfig>config, name, bundle, gulp);
                    });
            })).then(groups => {
                return _.flatten(groups);
            });
        } else {
            return this.loadBuilder(config)
                .then(builder => {
                    builder.config(option.builder.config)
                    let sfx = option.builder.sfx;
                    var bundler = (sfx) ? builder.buildStatic : builder.bundle;
                    return bundler.bind(builder)(config.getSrc(), option.builder);
                });
        }
    }


    execute(config: ITaskConfig, gulp: Gulp) {
        this.bundles = [];
        return super.execute(config, gulp)
            .then(() => {
                let option = <IBundlesConfig>config.option;
                if (option.bundles) {
                    if (option.bust) {
                        return this.calcChecksums(option, this.bundles).then((checksums) => {
                            return this.updateBundleManifest(option, this.bundles, checksums);;
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

    protected working(source: ITransform, config: ITaskConfig, option: IAssertDist, gulp: Gulp) {
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
                return bundlemap;
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

    protected groupBundle(config: IJspmTaskConfig, name: string, bundleOpts: IBundleGroup, gulp: Gulp): Promise<any> {

        let option: IBundlesConfig = config.option;

        let bundleStr = '';
        let bundleDest = '';

        let bundleItems: string[] = [];
        let minusStr = this.exclusionString(bundleOpts.exclude, option.bundles);

        if (bundleOpts.items) {
            bundleItems = _.isArray(bundleItems) ? <string[]>bundleOpts.items : _.keys(bundleOpts.items);
        }

        console.log(`-------------------------------\nBundling group: ${chalk.cyan(name)} ... \ngroup items:\n  ${chalk.cyan(<any>bundleItems)}\n-------------------------------`);


        let jsbuilder = new jspm.Builder({ separateCSS: bundleOpts.builder.separateCSS });

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
            })
            .then(builder => {
                builder.config(bundleOpts.builder.config);

                if (bundleOpts.combine) {
                    bundleDest = this.getBundleDest(config, name, bundleOpts);
                    bundleStr = bundleItems.join(' + ') + minusStr;
                    return this.createBundler(config, builder, name, bundleStr, bundleDest, bundleOpts, gulp);

                } else {
                    return Promise.all(bundleItems.map(key => {
                        bundleStr = key + minusStr;
                        bundleDest = this.getBundleDest(config, key, bundleOpts);
                        return this.createBundler(config, builder, key, bundleStr, bundleDest, bundleOpts, gulp);
                    }));
                }

            });
    }

    private exclusionString(exclude, groups): string {
        var str = this.exclusionArray(exclude, groups).join(' - ');
        return (str) ? ' - ' + str : '';
    }

    private exclusionArray(exclude, groups): string[] {
        var minus: string[] = [];
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

    private createBundler(config: IJspmTaskConfig, builder: any, bundleName: string, bundleStr: string, bundleDest: string, bundleOpts: IBundleGroup, gulp: Gulp): Promise<any> {

        let sfx = bundleOpts.builder.sfx;
        let bundler = (sfx) ? builder.buildStatic : builder.bundle;
        let shortPath = this.getBundleShortPath(config, bundleName, bundleOpts);
        let filename = path.parse(bundleDest).base;

        let buildConfig;
        if (bundleOpts.toES5) {
            buildConfig = _.clone(bundleOpts.builder);
            buildConfig.minify = false;
            buildConfig.sourceMaps = false;
        } else {
            buildConfig = bundleOpts.builder;
        }

        return bundler.bind(builder)(bundleStr, bundleDest, buildConfig)
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


        let output = `System.config({
            baseURL: '${option.rootUri || '.'}',
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
                template = (option.bust) ?
                    `
                    (function(module) {
                    var bust = {};
                    var systemLocate = System.locate;
                    var systemNormalize = System.normalize;

                    var chksums = module.exports.chksums = \${chksums};
                    var bundles = module.exports.bundles = \${bundles};                    
                    var maps = \${ maps };
                    var jspmMeta = \${ jspmMeta };

                    System.config({
                         packages: {
                            "meta": jspmMeta
                        },
                        map: maps,
                        //paths: paths,
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
                `
                    :
                    `
                    (function(module) {
                    var bundles = module.exports.bundles = \${bundles};
                    var paths =  module.exports.paths = \${paths};
                    var maps = \${ maps };
                    var jspmMeta = \${ jspmMeta };

                    System.config({
                         packages: {
                            "meta": jspmMeta
                        },
                        map: maps,
                        //paths: paths,
                        bundles: bundles
                    });

                })((typeof module !== 'undefined') ? module : {exports: {}}, this);
                `;
            }

            // } catch (e) {

            //     console.log(' X Unable to open manifest template');
            //     console.log(e);
            //     return Promise.reject(<any>false);

            // }


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
                // paths: JSON.stringify(this.options.builder.config.paths, null, '    '),
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

    private getBundleShortPath(config: IJspmTaskConfig, bundleName: string, bundleOpts: IBundleGroup) {
        var fullPath = this.getBundleDest(config, bundleName, bundleOpts);
        let spath: string = path.relative(config.option.baseURL, fullPath);
        spath = spath.replace(/\\/g, '/').replace(/^\//g, '');
        return spath;
    }

    private getBundleDest(config: IJspmTaskConfig, bundleName: string, bundleOpts: IBundleGroup) {

        var url = path.join(config.option.baseURL, config.getDist());
        var min = bundleOpts.builder.minify;
        var name = bundleOpts.items[bundleName] || bundleName;
        var file = name + ((min) ? '.min.js' : '.js');

        if (bundleOpts.combine) {
            url = path.join(url, bundleName, file);
        } else {
            url = path.join(url, file);
        }

        return url;
    }
}
