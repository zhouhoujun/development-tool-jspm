// import * as _ from 'lodash';
// import * as path from 'path';
// import * as gulp from 'gulp';
// import { readFileSync, existsSync, writeFileSync } from 'fs';
// import * as chalk from 'chalk';
// // const babel = require('gulp-babel');
// const jspm = require('jspm');
// const source = require('vinyl-source-stream');
// const vinylBuffer = require('vinyl-buffer');
// // const ngAnnotate = require('gulp-ng-annotate');
// // const sourcemaps = require('gulp-sourcemaps');
// const uglify = require('gulp-uglify');
// const chksum = require('checksum');
// const mkdirp = require('mkdirp');

// import { bindingConfig } from 'development-core';
// import { IJspmTaskConfig, IBundlesConfig, IBuidlerConfig, IBundleGroup, IBuilder } from './config';

// /**
//  * jspm builder.
//  * 
//  * @export
//  * @class JspmBuilder
//  */
// export class JspmBuilder implements IBuilder {
//     constructor(private config: IJspmTaskConfig) {
//         this.init();
//     }

//     private init() {

//         if (!this.config.getDist) {
//             this.config = <IJspmTaskConfig>bindingConfig(this.config);
//         }
//         let option = _.extend(<IBundlesConfig>{
//             baseURL: '',
//             jspmConfig: 'jspm.conf.js',
//             dest: '',
//             file: '',
//             systemConfigTempl: '',
//             relationToRoot: '',
//             bust: '',
//             bundles: {},
//             jspmMates: {
//                 '*.css': {
//                     loader: 'css'
//                 },
//                 '*.json': {
//                     loader: 'json'
//                 },
//                 '*.jsx': {
//                     loader: 'jsx'
//                 }
//             },
//             builder: {
//                 sfx: false,
//                 minify: false,
//                 mangle: false,
//                 sourceMaps: false,
//                 separateCSS: false,
//                 lowResSourceMaps: true
//             }
//         }, this.config.option);

//         // console.log(this.options.bundles);
//         this.config.env.root = this.config.env.root || (path.dirname(module.parent.filename) + '/');

//         if (!path.isAbsolute(option.baseURL)) {
//             option.baseURL = path.join(this.config.env.root, option.baseURL, '/');
//         }

//         if (!path.isAbsolute(option.jspmConfig)) {
//             option.jspmConfig = path.join(this.config.env.root, option.jspmConfig);
//         }

//         if (_.isFunction(option.bundles)) {
//             option.bundles = option.bundles(this.config);
//         }

//         this.config.option = option;
//         console.log('bundles config:', chalk.cyan(<any>this.config));
//     }

//     bundleAll(name: string, src: string | string[], dest: string, bundlesConfig?: IBundlesConfig): Promise<any> {
//         bundlesConfig = bundlesConfig || this.config.option;

//         let builder = new jspm.Builder({ separateCSS: bundlesConfig.builder.separateCSS });

//         builder.config(bundlesConfig.builder.config);

//         let sfx = bundlesConfig.builder.sfx;
//         var bundler = (sfx) ? builder.buildStatic : builder.bundle;

//         return new Promise<any>((resolve, reject) => {
//             bundler.bind(builder)(src, bundlesConfig.builder)
//                 .then(function (output) {
//                     var stream = source(name);

//                     stream.write(output.source);
//                     process.nextTick(function () {
//                         stream.end();
//                     });

//                     return stream.pipe(vinylBuffer())
//                         // .pipe(sourcemaps.init())
//                         // .pipe(babel(bundlesConfig.bundleOption))
//                         // .pipe(ngAnnotate({
//                         //     sourceMap: true,
//                         //     gulpWarnings: false
//                         // }))
//                         .pipe(uglify())
//                         // .pipe(rename({ suffix: '.min' }))
//                         // .pipe(sourcemaps.write())
//                         .pipe(gulp.dest(dest))
//                         .on('end', resolve)
//                         .on('error', reject);
//                 }, reject);
//         });
//     }

//     /**
//      * Create bundles using the bundle configuration. If no bundles are
//      * specified, all groups will be bundles.
//      *
//      * Example:
//      * bundler.bundle(['app', 'routes']);
//      *
//      * @param {Array} groups
//      * @returns {Promise}
//      */
//     bundle(groups?: string | string[]): Promise<any> {

//         let option = this.config.option;

//         if (_.isEmpty(option.bundles)) {
//             throw new Error('Cant bundle until bundles are defined');
//         }

//         let bundlegs: string[] = [];

//         if (groups) {
//             if ((_.isArray(groups))) {
//                 bundlegs = <string[]>groups;
//             } else if (_.isString(groups)) {
//                 bundlegs = groups.indexOf(',') > 0 ? (<string>groups).split(',') : [<string>groups];
//             }
//         }

//         if (bundlegs.length < 1) {
//             bundlegs = _.keys(option.bundles);
//         }

//         console.log(`bundles: ${bundlegs}`);

//         let thenable: Promise<any> = Promise.resolve(this.config);

//         let allBundles = [];
//         _.each(bundlegs, name => {
//             thenable = thenable.then(() => {
//                 return this.groupBundle(name)
//                     .then((bundles: any) => {
//                         if (_.isArray(bundles)) {
//                             allBundles = allBundles.concat(<any[]>bundles);
//                         } else {
//                             allBundles.push(bundles);
//                         }
//                         return allBundles;
//                     });
//             });
//         });

//         return thenable.then((bundles: any[]) => {
//             if (option.bust) {
//                 return this.calcChecksums(bundles).then((checksums) => {
//                     return this.updateBundleManifest(bundles, checksums).then(function () {
//                         console.log(chalk.green('------ Complete -------------'));
//                     });
//                 });
//             } else {
//                 return this.updateBundleManifest(bundles).then(function () {
//                     console.log(chalk.green('------ Complete -------------'));
//                 });
//             }
//         })
//             .catch(err => {
//                 console.error(chalk.red(err));
//             });
//     }


//     unbundle(groups?: string | string[]): Promise<any> {

//         console.log('------ Unbundling -----------');

//         if (!groups) {
//             console.warn(chalk.yellow('Removing all bundles...'));
//             return this.writeBundleManifest(null);
//         }

//         let bundlegs: string[];

//         if ((_.isArray(groups))) {
//             bundlegs = <string[]>groups;
//         } else if (_.isString(groups)) {
//             bundlegs = groups.indexOf(',') > 0 ? (<string>groups).split(',') : [<string>groups];
//         }


//         var unbundles = [];
//         var shortPath = '';

//         _.forEach(bundlegs, function (groupName) {

//             var bundleOpts = this.getBundleOpts(groupName);

//             if (bundleOpts.combine) {

//                 shortPath = this.getBundleShortPath(groupName, bundleOpts);
//                 unbundles.push({ path: shortPath });
//                 console.log('Success removed:', chalk.cyan(shortPath));

//             } else {

//                 _.forEach(bundleOpts.items, function (item) {
//                     shortPath = this.getBundleShortPath(item, bundleOpts);
//                     unbundles.push({ path: shortPath });
//                     console.log('Success removed:', chalk.cyan(shortPath));
//                 });

//             }

//         });

//         return this.removeFromBundleManifest(unbundles);

//     }

//     protected groupBundle(name: string): Promise<any> {
//         let option = this.config.option;

//         let bundleOpts = this.getBundleOpts(name);
//         if (!bundleOpts) {
//             return Promise.reject(<any>('Unable to find group: ' + name));

//         }



//         let bundleStr = '';
//         let bundleDest = '';

//         let bundleItems: string[] = [];
//         let minusStr = this.exclusionString(bundleOpts.exclude, option.bundles);

//         if (bundleOpts.items) {
//             bundleItems = _.isArray(bundleItems) ? <string[]>bundleOpts.items : _.keys(bundleOpts.items);
//         }

//         console.log(`-------------------------------\nBundling group: ${chalk.cyan(name)} ... \ngroup items:\n  ${chalk.cyan(<any>bundleItems)}\n-------------------------------`);


//         let jsbuilder = new jspm.Builder({ separateCSS: bundleOpts.builder.separateCSS });

//         return Promise.resolve(jsbuilder)
//             .then(builder => {
//                 if (option.jspmConfig) {
//                     return builder.loadConfig(option.jspmConfig, undefined, true)
//                         .then(() => {
//                             return builder;
//                         });
//                 } else {
//                     return builder;
//                 }
//             })
//             .then(builder => {
//                 builder.config(bundleOpts.builder.config);

//                 if (bundleOpts.combine) {
//                     bundleDest = this.getBundleDest(name, bundleOpts);
//                     bundleStr = bundleItems.join(' + ') + minusStr;
//                     return this.createBundler(builder, name, bundleStr, bundleDest, bundleOpts);

//                 } else {
//                     return Promise.all(bundleItems.map(key => {
//                         bundleStr = key + minusStr;
//                         bundleDest = this.getBundleDest(key, bundleOpts);
//                         return this.createBundler(builder, key, bundleStr, bundleDest, bundleOpts);
//                     }));
//                 }

//             });
//     }

//     private exclusionString(exclude, groups): string {
//         var str = this.exclusionArray(exclude, groups).join(' - ');
//         return (str) ? ' - ' + str : '';
//     }

//     private exclusionArray(exclude, groups): string[] {
//         var minus: string[] = [];
//         exclude = (_.isArray(exclude)) ? exclude : _.keys(exclude);
//         _.forEach(exclude, (item: string) => {
//             var group = groups[item];
//             if (group) {
//                 // exclude everything from this group
//                 minus = minus.concat(this.exclusionArray(group.items, groups));
//             } else {
//                 // exclude this item by name
//                 minus.push(item);
//             }
//         });
//         return minus;
//     }

//     private createBundler(builder: any, bundleName: string, bundleStr: string, bundleDest: string, bundleOpts: IBundleGroup): Promise<any> {

//         let sfx = bundleOpts.builder.sfx;
//         let bundler = (sfx) ? builder.buildStatic : builder.bundle;
//         let shortPath = this.getBundleShortPath(bundleName, bundleOpts);
//         let filename = path.parse(bundleDest).base;

//         let buildConfig;
//         if (bundleOpts.toES5) {
//             buildConfig = _.clone(bundleOpts.builder);
//             buildConfig.minify = false;
//             buildConfig.sourceMaps = false;
//         } else {
//             buildConfig = bundleOpts.builder;
//         }

//         return bundler.bind(builder)(bundleStr, bundleDest, buildConfig)
//             .then(output => {

//                 mkdirp.sync(path.dirname(bundleDest));

//                 if (bundleOpts.toES5) {
//                     return new Promise<any>((resolve, reject) => {
//                         var stream = source(filename);

//                         stream.write(output.source);
//                         process.nextTick(function () {
//                             stream.end();
//                         });

//                         return stream.pipe(vinylBuffer())
//                             // .pipe(sourcemaps.init())
//                             // .pipe(ngAnnotate())
//                             .pipe(uglify())
//                             // .pipe(rename({ suffix: '.min' }))
//                             // .pipe(sourcemaps.write('.'))
//                             .pipe(gulp.dest(path.dirname(bundleDest)))
//                             .on('end', () => {
//                                 resolve(output);
//                             })
//                             .on('error', reject);
//                     });

//                 } else {

//                     writeFileSync(bundleDest, output.source);
//                     return output;
//                 }
//             })
//             .then(output => {
//                 if (sfx) {
//                     console.log(`Built sfx package: ${chalk.cyan(bundleName)} -> ${chalk.cyan(filename)}\n   dest: ${chalk.cyan(bundleDest)}`);
//                 } else {
//                     console.log(`Bundled package: ${chalk.cyan(bundleName)} -> ${chalk.cyan(filename)}\n   dest: ${chalk.cyan(bundleDest)}`);
//                 }
//                 return {
//                     path: shortPath,
//                     modules: output.modules
//                 };
//             });


//     }



//     private calcChecksums(bundles: any[]): Promise<any> {
//         let chksums = {};

//         console.log('Calculating checksums...');

//         return Promise.all(_.map(bundles, (bundle: any) => {
//             if (!_.isObject(bundle)) {
//                 return null;
//             }

//             return new Promise((resolve, reject) => {
//                 let filepath = path.join(this.config.option.baseURL, bundle.path);
//                 let filename = path.parse(bundle.path).base;
//                 chksum.file(filepath, (err, sum) => {
//                     if (err) {
//                         console.error(chalk.red(' Checksum Error:'), chalk.red(err));
//                     }
//                     console.log(filename, chalk.cyan(sum));
//                     chksums[bundle.path] = sum;
//                     resolve(chksums);
//                 });
//             });

//         })).then(() => {
//             return chksums;
//         });
//     }

//     protected updateBundleManifest(bundles: any[], chksums?: any) {

//         chksums = chksums || {};

//         var manifest: any = _.defaults(this.getBundleManifest(), {
//             bundles: {},
//             chksums: {}
//         });

//         // console.log(manifest);

//         _.each(bundles, bundle => {
//             if (bundle.path) {
//                 manifest.bundles[bundle.path] = bundle.modules;
//                 manifest.chksums[bundle.path] = chksums[bundle.path] || '';
//             }
//         });

//         return this.writeBundleManifest(manifest);

//     }

//     protected removeFromBundleManifest(bundles): Promise<any> {

//         var manifest: any = _.defaults(this.getBundleManifest(), {
//             bundles: {},
//             chksums: {}
//         });

//         _.forEach(bundles, function (bundle) {
//             delete manifest.bundles[bundle.path];
//             delete manifest.chksums[bundle.path];
//         });

//         return this.writeBundleManifest(manifest);

//     }

//     private manifestSplit = `/*------bundles infos------*/`;
//     private writeBundleManifest(manifest): Promise<any> {

//         let option = this.config.option;

//         if (!option.file) {
//             return Promise.resolve(true);
//         }


//         console.log('Writing manifest...');

//         let options = option;

//         let output = `System.config({
//             baseURL: '${options.rootUri || '.'}',
//             defaultJSExtensions: true
//         });
//         System.bundled = true;
//         System.bust = '${options.bust}';
//         if(window != undefined) window.prod = true;
//         ${this.manifestSplit}
//         `;
//         let template = '';

//         if (manifest) {
//             // try {
//             template = option.systemConfigTempl;

//             if (!template) {
//                 template = (option.bust) ?
//                     `
//                     (function(module) {
//                     var bust = {};
//                     var systemLocate = System.locate;
//                     var systemNormalize = System.normalize;

//                     var chksums = module.exports.chksums = \${chksums};
//                     var bundles = module.exports.bundles = \${bundles};                    
//                     var maps = \${ maps };
//                     var jspmMeta = \${ jspmMeta };

//                     System.config({
//                          packages: {
//                             "meta": jspmMeta
//                         },
//                         map: maps,
//                         //paths: paths,
//                         bundles: bundles
//                     });

//                     System.normalize = function (name, pName, pAddress) {
//                         return systemNormalize.call(this, name, pName, pAddress).then(function (address) {
//                             var chksum = chksums[name];
//                             if (chksums[name]) { bust[address] = chksum; }
//                             return address;
//                         });
//                     };

//                     System.locate = function (load) {
//                         return Promise.resolve(systemLocate.call(this, load)).then(function (address) {
//                             var chksum = bust[address];
//                             return (chksum) ? address + '?' + chksum : address;
//                         });
//                     };

//                 })((typeof module !== 'undefined') ? module : {exports: {}}, this);
//                 `
//                     :
//                     `
//                     (function(module) {
//                     var bundles = module.exports.bundles = \${bundles};
//                     var paths =  module.exports.paths = \${paths};
//                     var maps = \${ maps };
//                     var jspmMeta = \${ jspmMeta };

//                     System.config({
//                          packages: {
//                             "meta": jspmMeta
//                         },
//                         map: maps,
//                         //paths: paths,
//                         bundles: bundles
//                     });

//                 })((typeof module !== 'undefined') ? module : {exports: {}}, this);
//                 `;
//             }

//             // } catch (e) {

//             //     console.log(' X Unable to open manifest template');
//             //     console.log(e);
//             //     return Promise.reject(<any>false);

//             // }


//             let maps = {
//                 css: 'github:systemjs/plugin-css@0.1.20.js',
//                 json: 'github:systemjs/plugin-json@0.1.2.js'
//             };

//             _.each(_.keys(manifest.bundles), n => {
//                 if (/css.min.js$/.test(n)) {
//                     maps.css = <string>_.first(manifest.bundles[n]);
//                 }
//                 if (/json.min.js$/.test(n)) {
//                     maps.css = <string>_.first(manifest.bundles[n]);
//                 }
//             });

//             let jspmMetas = option.jspmMetas;
//             output += _.template(template)({
//                 maps: JSON.stringify(maps, null, '    '),
//                 jspmMeta: JSON.stringify(jspmMetas, null, '    '),
//                 // paths: JSON.stringify(this.options.builder.config.paths, null, '    '),
//                 chksums: JSON.stringify(manifest.chksums, null, '    '),
//                 bundles: JSON.stringify(manifest.bundles, null, '    '),
//             });

//         }

//         let mainfile = this.getBundleManifestPath();
//         if (!existsSync(mainfile)) {
//             mkdirp.sync(path.dirname(mainfile));

//             writeFileSync(mainfile, output, { flag: 'wx' });
//         } else {
//             writeFileSync(mainfile, output);
//         }

//         console.log(chalk.green('Manifest written'));

//         return Promise.resolve(true);

//     }

//     private getBundleManifestPath(): string {
//         var url = this.config.option.baseURL;
//         return path.join(url, this.config.option.file);
//     }
//     private getBundleManifest(): any {
//         let data: any = {};
//         let path: string = this.getBundleManifestPath();
//         if (existsSync(path)) {
//             try {
//                 let content = readFileSync(path, 'utf8');
//                 let idx = content.indexOf(this.manifestSplit);
//                 idx = idx > 0 ? (idx + this.manifestSplit.length) : 0;
//                 content = content.substring(idx);
//                 // console.log(content);
//                 writeFileSync(path, content);
//                 data = require(path);
//                 console.log('has old bundle：\n', chalk.cyan(path)); // , 'data:\n', data);
//             } catch (e) {
//                 console.log(chalk.red(e));
//             }
//         }

//         return data;
//     }

//     private getBundleOpts(name: string): IBundleGroup {
//         let bundleOpts = this.config.option.bundles[name];
//         if (bundleOpts) {
//             bundleOpts.builder = <IBuidlerConfig>_.defaults(bundleOpts.builder, this.config.option.builder);
//             return bundleOpts;
//         } else {
//             return null;
//         }
//     }

//     private getBundleShortPath(bundleName: string, bundleOpts: IBundleGroup) {
//         var fullPath = this.getBundleDest(bundleName, bundleOpts);
//         let spath: string = path.relative(this.config.option.baseURL, fullPath);
//         spath = spath.replace(/\\/g, '/').replace(/^\//g, '');
//         return spath;
//     }

//     private getBundleDest(bundleName: string, bundleOpts: IBundleGroup) {

//         var url = path.join(this.config.option.baseURL, this.config.getDist());
//         var min = bundleOpts.builder.minify;
//         var name = bundleOpts.items[bundleName] || bundleName;
//         var file = name + ((min) ? '.min.js' : '.js');

//         if (bundleOpts.combine) {
//             url = path.join(url, bundleName, file);
//         } else {
//             url = path.join(url, file);
//         }

//         return url;
//     }
// }
