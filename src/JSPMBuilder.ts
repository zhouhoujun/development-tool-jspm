import * as _ from 'lodash';
import * as path from 'path';
import * as gulp from 'gulp';
import {readFileSync, existsSync, writeFileSync} from 'fs';

const console = require('color-console');
// const babel = require('gulp-babel');
const jspm = require('jspm');
const source = require('vinyl-source-stream');
const vinylBuffer = require('vinyl-buffer');
const ngAnnotate = require('gulp-ng-annotate');
// const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const chksum = require('checksum');
const mkdirp = require('mkdirp');

/**
 * object map. 
 * 
 * @export
 * @interface IMap
 * @template T
 */
export interface IMap<T> {
    [K: string]: T;
}

/**
 * jspm mate loader config
 * 
 * @export
 * @interface JspmMate
 */
export interface JspmMate {
    loader: string;
}

/**
 * bundle config
 * 
 * @export
 * @interface BundlesConfig
 */
export interface BundlesConfig {
    /**
     * project root path to build.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    root?: string;
    /**
     * systemjs baseURL
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    baseURL?: string;
    /**
     * the bundle app path relation to root site.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    baseUri?: string;
    /**
     * jspm config file full path.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    jspmConfig?: string;
    /**
     * bundle to dest path.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    dest?: string;
    /**
     * bundle main file.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    file?: string;
    bust?: boolean | string;
    version?: string;
    /**
     * the config to bundle jspm loader.
     * 
     * @type {IMap<JspmMate>}
     * @memberOf BundlesConfig
     */
    jspmMetas?: IMap<JspmMate>;
    /**
     * build Config.
     * 
     * @type {BuidlerConfig}
     * @memberOf BundlesConfig
     */
    builder?: BuidlerConfig;
    // /**
    //  * babel 6 option
    //  * 
    //  * @type {*}
    //  * @memberOf BundlesConfig
    //  */
    // babelOption?: any;
    /**
     * custom template for bundle main file.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    systemConfigTempl?: string;
    /**
     * bundle group config
     * 
     * @type {IMap<string, BundleGroup>}
     * @memberOf BundlesConfig
     */
    bundles?: IMap<BundleGroup>;
}

export interface BuidlerConfig {
    sfx?: boolean;
    minify: boolean;
    mangle: boolean;
    sourceMaps: boolean;
    separateCSS: boolean;
    lowResSourceMaps: boolean;
    config?: {
        paths?: any;
        rootURL?: string;
    };
}

export interface BundleGroup {
    /**
     * Whether to bundle this group.
     */
    bundle: boolean;

    /**
     * compile to es5.
     * 
     * @type {boolean}
     * @memberOf BundleGroup
     */
    toES5?: boolean;
    /**
     *  Combine items together via addition.
     */
    combine: boolean;
    /**
     * Exclude groups or packages via subtraction.
     */
    exclude: string[];
    /**
     * the items to bundle to this group.
     * 
     * @type {(string[] | Map<string, string>)}
     * @memberOf BundleGroup
     */
    items: string[] | IMap<string>;
    /**
     * bundle config.
     * 
     * @type {BuidlerConfig}
     * @memberOf BundleGroup
     */
    builder: BuidlerConfig;
}

/**
 * jspm builder.
 * 
 * @export
 * @class JSPMBuilder
 */
export class JSPMBuilder {
    constructor(private options: BundlesConfig) {

        this.options = _.defaults(this.options, <BundlesConfig>{
            dest: '',
            file: '',
            systemConfigTempl: '',
            relationToRoot: '',
            bust: false,
            bundles: {},
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
            // babelOption: {
            //     presets: ['es2015']
            // }
            builder: {
                sfx: false,
                minify: false,
                mangle: false,
                sourceMaps: false,
                separateCSS: false,
                lowResSourceMaps: true
            }
        });

        // console.log(this.options.bundles);
        let root = (path.dirname(module.parent.filename) + '/');
        this.options.root = this.options.root || root;

        if (!path.isAbsolute(this.options.baseURL)) {
            this.options.baseURL = path.join(this.options.root, this.options.baseURL, '/') || root;
        }

        console.log('bundles config:', this.options);
    }

    bundleAll(name: string, src: string | string[], dest: string, bundlesConfig?: BundlesConfig): Promise<any> {
        bundlesConfig = bundlesConfig || this.options;

        let builder = new jspm.Builder({ separateCSS: bundlesConfig.builder.separateCSS });

        builder.config(bundlesConfig.builder.config);

        let sfx = bundlesConfig.builder.sfx;
        var bundler = (sfx) ? builder.buildStatic : builder.bundle;

        return new Promise<any>((resolve, reject) => {
            bundler.bind(builder)(src, bundlesConfig.builder)
                .then(function (output) {
                    var stream = source(name);

                    stream.write(output.source);
                    process.nextTick(function () {
                        stream.end();
                    });

                    return stream.pipe(vinylBuffer())
                        // .pipe(sourcemaps.init())
                        // .pipe(babel(bundlesConfig.bundleOption))
                        .pipe(ngAnnotate({
                            sourceMap: true,
                            gulpWarnings: false
                        }))
                        .pipe(uglify())
                        // .pipe(rename({ suffix: '.min' }))
                        // .pipe(sourcemaps.write())
                        .pipe(gulp.dest(dest))
                        .on('end', resolve)
                        .on('error', reject);
                }, reject);
        });
    }

    /**
     * Create bundles using the bundle configuration. If no bundles are
     * specified, all groups will be bundles.
     *
     * Example:
     * bundler.bundle(['app', 'routes']);
     *
     * @param {Array} groups
     * @returns {Promise}
     */
    bundle(groups: string | string[]): Promise<any> {


        if (_.isEmpty(this.options.bundles)) {
            throw new Error('Cant bundle until bundles are defined');
        }

        let bundlegs: string[] = [];

        if (groups) {
            if ((_.isArray(groups))) {
                bundlegs = <string[]>groups;
            } else if (_.isString(groups)) {
                bundlegs = groups.indexOf(',') > 0 ? (<string>groups).split(',') : [<string>groups];
            }
        }

        if (bundlegs.length < 1) {
            bundlegs = _.keys(this.options.bundles);
        }

        console.log(`bundles: ${bundlegs}`);

        let thenable: Promise<any> = Promise.resolve(this.options);

        let allBundles = [];
        _.each(bundlegs, name => {
            thenable = thenable.then(() => {
                return this.groupBundle(name)
                    .then((bundles: any) => {
                        if (_.isArray(bundles)) {
                            allBundles = allBundles.concat(<any[]>bundles);
                        } else {
                            allBundles.push(bundles);
                        }
                        return allBundles;
                    });
            });
        });

        return thenable.then((bundles: any[]) => {
            if (this.options.bust) {
                return this.calcChecksums(bundles).then((checksums) => {
                    return this.updateBundleManifest(bundles, checksums).then(function () {
                        console.success('------ Complete -------------');
                    });
                });
            } else {
                return this.updateBundleManifest(bundles).then(function () {
                    console.success('------ Complete -------------');
                });
            }
        })
        .catch(err => {
            console.error(err);
        });
    }


    unbundle(groups: string | string[]): Promise<any> {

        console.log('------ Unbundling -----------');

        if (!groups) {
            console.warn('Removing all bundles...');
            return this.writeBundleManifest(null);
        }

        let bundlegs: string[];

        if ((_.isArray(groups))) {
            bundlegs = <string[]>groups;
        } else if (_.isString(groups)) {
            bundlegs = groups.indexOf(',') > 0 ? (<string>groups).split(',') : [<string>groups];
        }


        var unbundles = [];
        var shortPath = '';

        _.forEach(bundlegs, function (groupName) {

            var bundleOpts = this.getBundleOpts(groupName);

            if (bundleOpts.combine) {

                shortPath = this.getBundleShortPath(groupName, bundleOpts);
                unbundles.push({ path: shortPath });
                console.success('Success removed:', shortPath);

            } else {

                _.forEach(bundleOpts.items, function (item) {
                    shortPath = this.getBundleShortPath(item, bundleOpts);
                    unbundles.push({ path: shortPath });
                    console.success('Success removed:', shortPath);
                });

            }

        });

        return this.removeFromBundleManifest(unbundles);

    }

    groupBundle(name: string): Promise<any> {

        let bundleOpts = this.getBundleOpts(name);
        if (!bundleOpts) {
            return Promise.reject(<any>('Unable to find group: ' + name));

        }



        let bundleStr = '';
        let bundleDest = '';

        let bundleItems: string[] = [];
        let minusStr = this.exclusionString(bundleOpts.exclude, this.options.bundles);

        if (bundleOpts.items) {
            bundleItems = _.isArray(bundleItems) ? <string[]>bundleOpts.items : _.keys(bundleOpts.items);
        }

        console.log(`-------------------------------\nBundling group: ${name} ... \ngroup items:\n  ${bundleItems}\n-------------------------------`);


        let jsbuilder = new jspm.Builder({ separateCSS: bundleOpts.builder.separateCSS });

        return Promise.resolve(jsbuilder)
            .then(builder => {
                if (this.options.jspmConfig) {
                    return builder.loadConfig(this.options.jspmConfig, undefined, true)
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
                    bundleDest = this.getBundleDest(name, bundleOpts);
                    bundleStr = bundleItems.join(' + ') + minusStr;
                    return this.createBundler(builder, name, bundleStr, bundleDest, bundleOpts);

                } else {
                    return Promise.all(bundleItems.map(key => {
                        bundleStr = key + minusStr;
                        bundleDest = this.getBundleDest(key, bundleOpts);
                        return this.createBundler(builder, key, bundleStr, bundleDest, bundleOpts);
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

    private createBundler(builder: any, bundleName: string, bundleStr: string, bundleDest: string, bundleOpts: BundleGroup): Promise<any> {

        let sfx = bundleOpts.builder.sfx;
        let bundler = (sfx) ? builder.buildStatic : builder.bundle;
        let shortPath = this.getBundleShortPath(bundleName, bundleOpts);
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

                if (bundleOpts.toES5) {
                    return new Promise<any>((resolve, reject) => {
                        var stream = source(filename);

                        stream.write(output.source);
                        process.nextTick(function () {
                            stream.end();
                        });

                        return stream.pipe(vinylBuffer())
                            // .pipe(sourcemaps.init())
                            .pipe(ngAnnotate())
                            .pipe(uglify())
                            // .pipe(rename({ suffix: '.min' }))
                            // .pipe(sourcemaps.write('.'))
                            .pipe(gulp.dest(path.dirname(bundleDest)))
                            .on('end', () => {
                                resolve(output);
                            })
                            .on('error', reject);
                    });

                } else {

                    writeFileSync(bundleDest, output.source);
                    return output;
                }
            })
            .then(output => {
                if (sfx) {
                    console.success(`Built sfx package: ${bundleName} -> ${filename}\n   dest: ${bundleDest}`);
                } else {
                    console.success(`Bundled package: ${bundleName} -> ${filename}\n   dest: ${bundleDest}`);
                }
                return {
                    path: shortPath,
                    modules: output.modules
                };
            });


    }



    private calcChecksums(bundles: any[]): Promise<any> {

        let chksums = {};

        console.log('Calculating checksums...');

        return Promise.all(_.map(bundles, (bundle: any) => {
            if (!_.isObject(bundle)) {
                return;
            }

            return new Promise((resolve, reject) => {
                let filepath = path.join(this.options.baseURL, bundle.path);
                let filename = path.parse(bundle.path).base;
                chksum.file(filepath, (err, sum) => {
                    if (err) {
                        console.error(' Checksum Error:', err);
                    }
                    console.success(filename, sum);
                    chksums[bundle.path] = sum;
                    resolve(chksums);
                });
            });

        })).then(() => {
            return chksums;
        });
    }

    protected updateBundleManifest(bundles: any[], chksums?: any) {

        chksums = chksums || {};

        var manifest: any = _.defaults(this.getBundleManifest(), {
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

        return this.writeBundleManifest(manifest);

    }

    protected removeFromBundleManifest(bundles): Promise<any> {

        var manifest: any = _.defaults(this.getBundleManifest(), {
            bundles: {},
            chksums: {}
        });

        _.forEach(bundles, function (bundle) {
            delete manifest.bundles[bundle.path];
            delete manifest.chksums[bundle.path];
        });

        return this.writeBundleManifest(manifest);

    }

    private manifestSplit = `/*------bundles infos------*/`;
    private writeBundleManifest(manifest): Promise<any> {
        if (!this.options.file) {
            return Promise.resolve(true);
        }


        console.log('Writing manifest...');

        let options = this.options;

        let output = `System.config({
            baseURL: '${options.baseUri || '.'}',
            defaultJSExtensions: true
        });
        System.bundled = true;
        System.bundle_version = '${options.version}';
        if(window != undefined) window.prod = true;
        ${this.manifestSplit}
        `;
        let template = '';

        if (manifest) {
            // try {
            template = this.options.systemConfigTempl;

            if (!template) {
                template = (this.options.bust) ?
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

            let jspmMetas = this.options.jspmMetas;
            output += _.template(template)({
                maps: JSON.stringify(maps, null, '    '),
                jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                // paths: JSON.stringify(this.options.builder.config.paths, null, '    '),
                chksums: JSON.stringify(manifest.chksums, null, '    '),
                bundles: JSON.stringify(manifest.bundles, null, '    '),
            });

        }

        let mainfile = this.getBundleManifestPath();
        if (!existsSync(mainfile)) {
            mkdirp.sync(path.dirname(mainfile));

            writeFileSync(mainfile, output, { flag: 'wx' });
        } else {
            writeFileSync(mainfile, output);
        }

        console.success('Manifest written');

        return Promise.resolve(true);

    }

    private getBundleManifestPath(): string {
        var url = this.options.baseURL;
        return String(path.join(url, this.options.file));
    }
    private getBundleManifest(): any {
        let data: any = {};
        let path: string = this.getBundleManifestPath();
        if (existsSync(path)) {
            try {
                let content = readFileSync(path, 'utf8');
                let idx = content.indexOf(this.manifestSplit);
                idx = idx > 0 ? (idx + this.manifestSplit.length) : 0;
                content = content.substring(idx);
                // console.log(content);
                writeFileSync(path, content);
                data = require(path);
                console.log('has old bundle：\n', path); // , 'data:\n', data);
            } catch (e) {
                console.log(e);
            }
        }

        return data;
    }

    private getBundleOpts(name: string): BundleGroup {
        let bundleOpts = this.options.bundles[name];
        if (bundleOpts) {
            bundleOpts.builder = <BuidlerConfig>_.defaults(bundleOpts.builder, this.options.builder);
            return bundleOpts;
        } else {
            return null;
        }
    }

    private getBundleShortPath(bundleName: string, bundleOpts: BundleGroup) {
        var fullPath = this.getBundleDest(bundleName, bundleOpts);
        let spath: string = path.relative(this.options.baseURL, fullPath);
        spath = spath.replace(/\\/g, '/').replace(/^\//g, '');
        return spath;
    }

    private getBundleDest(bundleName: string, bundleOpts: BundleGroup) {

        var url = path.join(this.options.baseURL, this.options.dest);
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
