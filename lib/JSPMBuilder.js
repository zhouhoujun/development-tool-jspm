"use strict";
const _ = require('lodash');
const path = require('path');
const gulp = require('gulp');
const fs_1 = require('fs');
const console = require('color-console');
const jspm = require('jspm');
const source = require('vinyl-source-stream');
const vinylBuffer = require('vinyl-buffer');
const ngAnnotate = require('gulp-ng-annotate');
const uglify = require('gulp-uglify');
const chksum = require('checksum');
const mkdirp = require('mkdirp');
class JSPMBuilder {
    constructor(options) {
        this.options = options;
        this.manifestSplit = `/*------bundles infos------*/`;
        this.options = _.defaults(this.options, {
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
            builder: {
                sfx: false,
                minify: false,
                mangle: false,
                sourceMaps: false,
                separateCSS: false,
                lowResSourceMaps: true
            }
        });
        let root = (path.dirname(module.parent.filename) + '/');
        this.options.root = this.options.root || root;
        if (!path.isAbsolute(this.options.baseURL)) {
            this.options.baseURL = path.join(this.options.root, this.options.baseURL, '/') || root;
        }
        console.log('bundles config:', this.options);
    }
    bundleAll(name, src, dest, bundlesConfig) {
        bundlesConfig = bundlesConfig || this.options;
        let builder = new jspm.Builder({ separateCSS: bundlesConfig.builder.separateCSS });
        builder.config(bundlesConfig.builder.config);
        let sfx = bundlesConfig.builder.sfx;
        var bundler = (sfx) ? builder.buildStatic : builder.bundle;
        return new Promise((resolve, reject) => {
            bundler.bind(builder)(src, bundlesConfig.builder)
                .then(function (output) {
                var stream = source(name);
                stream.write(output.source);
                process.nextTick(function () {
                    stream.end();
                });
                return stream.pipe(vinylBuffer())
                    .pipe(ngAnnotate({
                    sourceMap: true,
                    gulpWarnings: false
                }))
                    .pipe(uglify())
                    .pipe(gulp.dest(dest))
                    .on('end', resolve)
                    .on('error', reject);
            }, reject);
        });
    }
    bundle(groups) {
        if (_.isEmpty(this.options.bundles)) {
            throw new Error('Cant bundle until bundles are defined');
        }
        let bundlegs = [];
        if (groups) {
            if ((_.isArray(groups))) {
                bundlegs = groups;
            }
            else if (_.isString(groups)) {
                bundlegs = groups.indexOf(',') > 0 ? groups.split(',') : [groups];
            }
        }
        if (bundlegs.length < 1) {
            bundlegs = _.keys(this.options.bundles);
        }
        console.log(`bundles: ${bundlegs}`);
        let thenable = Promise.resolve(this.options);
        let allBundles = [];
        _.each(bundlegs, name => {
            thenable = thenable.then(() => {
                return this.groupBundle(name)
                    .then((bundles) => {
                    if (_.isArray(bundles)) {
                        allBundles = allBundles.concat(bundles);
                    }
                    else {
                        allBundles.push(bundles);
                    }
                    return allBundles;
                });
            });
        });
        return thenable.then((bundles) => {
            if (this.options.bust) {
                return this.calcChecksums(bundles).then((checksums) => {
                    return this.updateBundleManifest(bundles, checksums).then(function () {
                        console.success('------ Complete -------------');
                    });
                });
            }
            else {
                return this.updateBundleManifest(bundles).then(function () {
                    console.success('------ Complete -------------');
                });
            }
        })
            .catch(err => {
            console.error(err);
        });
    }
    unbundle(groups) {
        console.log('------ Unbundling -----------');
        if (!groups) {
            console.warn('Removing all bundles...');
            return this.writeBundleManifest(null);
        }
        let bundlegs;
        if ((_.isArray(groups))) {
            bundlegs = groups;
        }
        else if (_.isString(groups)) {
            bundlegs = groups.indexOf(',') > 0 ? groups.split(',') : [groups];
        }
        var unbundles = [];
        var shortPath = '';
        _.forEach(bundlegs, function (groupName) {
            var bundleOpts = this.getBundleOpts(groupName);
            if (bundleOpts.combine) {
                shortPath = this.getBundleShortPath(groupName, bundleOpts);
                unbundles.push({ path: shortPath });
                console.success('Success removed:', shortPath);
            }
            else {
                _.forEach(bundleOpts.items, function (item) {
                    shortPath = this.getBundleShortPath(item, bundleOpts);
                    unbundles.push({ path: shortPath });
                    console.success('Success removed:', shortPath);
                });
            }
        });
        return this.removeFromBundleManifest(unbundles);
    }
    groupBundle(name) {
        let bundleOpts = this.getBundleOpts(name);
        if (!bundleOpts) {
            return Promise.reject(('Unable to find group: ' + name));
        }
        let bundleStr = '';
        let bundleDest = '';
        let bundleItems = [];
        let minusStr = this.exclusionString(bundleOpts.exclude, this.options.bundles);
        if (bundleOpts.items) {
            bundleItems = _.isArray(bundleItems) ? bundleOpts.items : _.keys(bundleOpts.items);
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
            }
            else {
                return builder;
            }
        })
            .then(builder => {
            builder.config(bundleOpts.builder.config);
            if (bundleOpts.combine) {
                bundleDest = this.getBundleDest(name, bundleOpts);
                bundleStr = bundleItems.join(' + ') + minusStr;
                return this.createBundler(builder, name, bundleStr, bundleDest, bundleOpts);
            }
            else {
                return Promise.all(bundleItems.map(key => {
                    bundleStr = key + minusStr;
                    bundleDest = this.getBundleDest(key, bundleOpts);
                    return this.createBundler(builder, key, bundleStr, bundleDest, bundleOpts);
                }));
            }
        });
    }
    exclusionString(exclude, groups) {
        var str = this.exclusionArray(exclude, groups).join(' - ');
        return (str) ? ' - ' + str : '';
    }
    exclusionArray(exclude, groups) {
        var minus = [];
        exclude = (_.isArray(exclude)) ? exclude : _.keys(exclude);
        _.forEach(exclude, (item) => {
            var group = groups[item];
            if (group) {
                minus = minus.concat(this.exclusionArray(group.items, groups));
            }
            else {
                minus.push(item);
            }
        });
        return minus;
    }
    createBundler(builder, bundleName, bundleStr, bundleDest, bundleOpts) {
        let sfx = bundleOpts.builder.sfx;
        let bundler = (sfx) ? builder.buildStatic : builder.bundle;
        let shortPath = this.getBundleShortPath(bundleName, bundleOpts);
        let filename = path.parse(bundleDest).base;
        let buildConfig;
        if (bundleOpts.toES5) {
            buildConfig = _.clone(bundleOpts.builder);
            buildConfig.minify = false;
            buildConfig.sourceMaps = false;
        }
        else {
            buildConfig = bundleOpts.builder;
        }
        return bundler.bind(builder)(bundleStr, bundleDest, buildConfig)
            .then(output => {
            mkdirp.sync(path.dirname(bundleDest));
            if (bundleOpts.toES5) {
                return new Promise((resolve, reject) => {
                    var stream = source(filename);
                    stream.write(output.source);
                    process.nextTick(function () {
                        stream.end();
                    });
                    return stream.pipe(vinylBuffer())
                        .pipe(ngAnnotate())
                        .pipe(uglify())
                        .pipe(gulp.dest(path.dirname(bundleDest)))
                        .on('end', () => {
                        resolve(output);
                    })
                        .on('error', reject);
                });
            }
            else {
                fs_1.writeFileSync(bundleDest, output.source);
                return output;
            }
        })
            .then(output => {
            if (sfx) {
                console.success(`Built sfx package: ${bundleName} -> ${filename}\n   dest: ${bundleDest}`);
            }
            else {
                console.success(`Bundled package: ${bundleName} -> ${filename}\n   dest: ${bundleDest}`);
            }
            return {
                path: shortPath,
                modules: output.modules
            };
        });
    }
    calcChecksums(bundles) {
        let chksums = {};
        console.log('Calculating checksums...');
        return Promise.all(_.map(bundles, (bundle) => {
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
    updateBundleManifest(bundles, chksums) {
        chksums = chksums || {};
        var manifest = _.defaults(this.getBundleManifest(), {
            bundles: {},
            chksums: {}
        });
        _.each(bundles, bundle => {
            if (bundle.path) {
                manifest.bundles[bundle.path] = bundle.modules;
                manifest.chksums[bundle.path] = chksums[bundle.path] || '';
            }
        });
        return this.writeBundleManifest(manifest);
    }
    removeFromBundleManifest(bundles) {
        var manifest = _.defaults(this.getBundleManifest(), {
            bundles: {},
            chksums: {}
        });
        _.forEach(bundles, function (bundle) {
            delete manifest.bundles[bundle.path];
            delete manifest.chksums[bundle.path];
        });
        return this.writeBundleManifest(manifest);
    }
    writeBundleManifest(manifest) {
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
            let maps = {
                css: 'github:systemjs/plugin-css@0.1.20.js',
                json: 'github:systemjs/plugin-json@0.1.2.js'
            };
            _.each(_.keys(manifest.bundles), n => {
                if (/css.min.js$/.test(n)) {
                    maps.css = _.first(manifest.bundles[n]);
                }
                if (/json.min.js$/.test(n)) {
                    maps.css = _.first(manifest.bundles[n]);
                }
            });
            let jspmMetas = this.options.jspmMetas;
            output += _.template(template)({
                maps: JSON.stringify(maps, null, '    '),
                jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                chksums: JSON.stringify(manifest.chksums, null, '    '),
                bundles: JSON.stringify(manifest.bundles, null, '    '),
            });
        }
        let mainfile = this.getBundleManifestPath();
        if (!fs_1.existsSync(mainfile)) {
            mkdirp.sync(path.dirname(mainfile));
            fs_1.writeFileSync(mainfile, output, { flag: 'wx' });
        }
        else {
            fs_1.writeFileSync(mainfile, output);
        }
        console.success('Manifest written');
        return Promise.resolve(true);
    }
    getBundleManifestPath() {
        var url = this.options.baseURL;
        return String(path.join(url, this.options.file));
    }
    getBundleManifest() {
        let data = {};
        let path = this.getBundleManifestPath();
        if (fs_1.existsSync(path)) {
            try {
                let content = fs_1.readFileSync(path, 'utf8');
                let idx = content.indexOf(this.manifestSplit);
                idx = idx > 0 ? (idx + this.manifestSplit.length) : 0;
                content = content.substring(idx);
                fs_1.writeFileSync(path, content);
                data = require(path);
                console.log('has old bundle：\n', path);
            }
            catch (e) {
                console.log(e);
            }
        }
        return data;
    }
    getBundleOpts(name) {
        let bundleOpts = this.options.bundles[name];
        if (bundleOpts) {
            bundleOpts.builder = _.defaults(bundleOpts.builder, this.options.builder);
            return bundleOpts;
        }
        else {
            return null;
        }
    }
    getBundleShortPath(bundleName, bundleOpts) {
        var fullPath = this.getBundleDest(bundleName, bundleOpts);
        let spath = fullPath.replace(this.options.baseURL, '');
        if (/^(\\)/.test(spath)) {
            spath = spath.substring(2);
        }
        return spath;
    }
    getBundleDest(bundleName, bundleOpts) {
        var url = path.join(this.options.baseURL, this.options.dest);
        var min = bundleOpts.builder.minify;
        var name = bundleOpts.items[bundleName] || bundleName;
        var file = name + ((min) ? '.min.js' : '.js');
        if (bundleOpts.combine) {
            url = path.join(url, bundleName, file);
        }
        else {
            url = path.join(url, file);
        }
        return url;
    }
}
exports.JSPMBuilder = JSPMBuilder;
