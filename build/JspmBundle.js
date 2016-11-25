"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if ((typeof Reflect === "undefined" ? "undefined" : _typeof(Reflect)) === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    }return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = undefined && undefined.__metadata || function (k, v) {
    if ((typeof Reflect === "undefined" ? "undefined" : _typeof(Reflect)) === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _ = require('lodash');
var development_core_1 = require('development-core');
var path = require('path');
var fs_1 = require('fs');
var chalk = require('chalk');
// const globby = require('globby');
var jspm = require('jspm');
var source = require('vinyl-source-stream');
var vinylBuffer = require('vinyl-buffer');
var chksum = require('checksum');
var mkdirp = require('mkdirp');
// const uglify = require('gulp-uglify');
var JspmBundle = function (_development_core_1$P) {
    _inherits(JspmBundle, _development_core_1$P);

    function JspmBundle(info) {
        _classCallCheck(this, JspmBundle);

        var _this = _possibleConstructorReturn(this, (JspmBundle.__proto__ || Object.getPrototypeOf(JspmBundle)).call(this, info));

        _this.name = 'jspm-bundle';
        _this.runWay = development_core_1.RunWay.sequence;
        _this.packages = {};
        _this.manifestSplit = "/*------bundles infos------*/";
        return _this;
    }

    _createClass(JspmBundle, [{
        key: "getOption",
        value: function getOption(config) {
            return config.option;
        }
    }, {
        key: "loadBuilder",
        value: function loadBuilder(ctx) {
            var option = ctx.option;
            jspm.setPackagePath(path.dirname(option.packageFile));
            var jsbuilder = new jspm.Builder({ separateCSS: option.builder.separateCSS });
            return Promise.resolve(jsbuilder).then(function (builder) {
                if (option.jspmConfig) {
                    return builder.loadConfig(option.jspmConfig, undefined, true).then(function () {
                        return builder;
                    });
                } else {
                    return builder;
                }
            });
        }
    }, {
        key: "translate",
        value: function translate(trans) {
            if (_.isArray(trans)) {
                return _.map(trans, function (t) {
                    t.stream['bundle'] = t.bundle;
                    return t.stream;
                });
            } else {
                trans.stream['bundle'] = trans.bundle;
                return trans.stream;
            }
        }
    }, {
        key: "initBundles",
        value: function initBundles(ctx) {
            var _this2 = this;

            var opt = ctx.option;
            var pr = Promise.resolve(null).then(function () {
                if (_.isFunction(opt.bundles)) {
                    // opt['_bundlesFunc'] = opt.bundles;
                    return opt.bundles(ctx);
                } else {
                    return opt.bundles;
                }
            });
            if (opt.bundleDeps) {
                pr = pr.then(function (bundles) {
                    var pkg = _this2.getPackage(opt);
                    if (!pkg) {
                        console.log(chalk.red('can not found package.json file.'));
                        process.exit(0);
                    }
                    if (!pkg.jspm) {
                        console.log(chalk.red('jspm not init in package.json file.'));
                        process.exit(0);
                    }
                    var deps = _.keys(pkg.jspm.dependencies);
                    if (opt.depsExclude) {
                        (function () {
                            var exclude = _.isFunction(opt.depsExclude) ? opt.depsExclude(ctx, deps) : opt.depsExclude;
                            deps = _.filter(deps, function (d) {
                                return exclude.indexOf(d) < 0;
                            });
                        })();
                    }
                    return Promise.resolve().then(function () {
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
                    }).then(function (bundleDeps) {
                        var cores = _.keys(bundleDeps);
                        _.each(_.values(bundles), function (b) {
                            b.exclude = b.exclude || [];
                            b.exclude = cores.concat(b.exclude);
                        });
                        return bundles;
                    });
                });
            }
            return pr.then(function (bundles) {
                _this2.bundleConfig = bundles;
                return bundles;
            });
        }
    }, {
        key: "source",
        value: function source(ctx, dist, gulp) {
            var _this3 = this;

            var option = ctx.option;
            if (option.bundles) {
                return this.initBundles(ctx).then(function () {
                    return Promise.all(_.map(_this3.getBundles(ctx), function (name) {
                        return _this3.loadBuilder(ctx).then(function (builder) {
                            var bundle = _this3.bundleConfig[name];
                            bundle.builder = _.defaults(bundle.builder, option.builder);
                            if (option.builder.config) {
                                builder.config(bundle.builder.config);
                            }
                            return _this3.groupBundle(ctx, builder, name, bundle, gulp).then(function (trans) {
                                return _this3.translate(trans);
                            });
                        });
                    }));
                }).then(function (groups) {
                    return _.flatten(groups);
                });
            } else {
                return this.loadBuilder(ctx).then(function (builder) {
                    var src = ctx.getSrc(_this3.getInfo());
                    console.log('start bundle all src : ', chalk.cyan(src));
                    if (option.builder.config) {
                        builder.config(option.builder.config);
                    }
                    return Promise.resolve(ctx.fileFilter(src)).then(function (files) {
                        files = _this3.getRelativeSrc(files, ctx);
                        console.log('bundle files:', chalk.cyan(files));
                        var mainfile = _this3.getBundleManifestPath(ctx);
                        return _this3.createBundler(ctx, builder, 'bundle', files.join(' + '), mainfile, option.builder).then(function (trans) {
                            return _this3.translate(trans);
                        });
                    });
                });
            }
        }
    }, {
        key: "getRelativeSrc",
        value: function getRelativeSrc(src, config) {
            var _this4 = this;

            var toModule = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            // console.log(option.baseURL);
            var baseURL = config.option.baseURL;
            if (_.isArray(src)) {
                return _.map(src, function (s) {
                    var filename = path.relative(baseURL, s).replace(/\\/g, '/').replace(/^\//g, '');
                    return toModule ? _this4.toModulePath(filename) : filename;
                });
            } else {
                var fn = path.relative(baseURL, src).replace(/\\/g, '/').replace(/^\//g, '');
                return [toModule ? this.toModulePath(fn) : fn];
            }
        }
    }, {
        key: "toModulePath",
        value: function toModulePath(filename) {
            if (!filename) {
                return '';
            }
            return filename.substring(0, filename.length - path.extname(filename).length);
        }
    }, {
        key: "initOption",
        value: function initOption(ctx) {
            var option = _.extend({
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
                bundleFolder: './',
                includePackageFiles: ['system-polyfills.src.js', 'system.src.js'],
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
            }, ctx.option);
            option.baseURL = ctx.toRootPath(option.baseURL);
            if (option.jspmConfig) {
                option.jspmConfig = ctx.toRootPath(option.jspmConfig);
            }
            option.packageFile = ctx.toRootPath(option.packageFile);
            var pkg = this.getPackage(option);
            if (!option.jspmPackages) {
                if (pkg.jspm.directories && pkg.jspm.directories.packages) {
                    option.jspmPackages = pkg.jspm.directories.packages;
                } else {
                    option.jspmPackages = 'jspm_packages';
                }
            }
            option.jspmPackages = ctx.toRootPath(option.jspmPackages);
            if (!fs_1.readdirSync(option.jspmPackages)) {
                console.log(chalk.red('jspm project config error!'));
                process.exit(0);
            }
            return option;
        }
    }, {
        key: "execute",
        value: function execute(context, gulp) {
            var _this5 = this;

            this.bundleMaps = [];
            var ctx = context;
            return _get(JspmBundle.prototype.__proto__ || Object.getPrototypeOf(JspmBundle.prototype), "execute", this).call(this, ctx, gulp).then(function () {
                var option = ctx.option;
                if (option.bundles) {
                    return _this5.calcChecksums(option, _this5.bundleMaps).then(function (checksums) {
                        return _this5.updateBundleManifest(ctx, _this5.bundleMaps, checksums);
                    });
                } else {
                    return null;
                }
            }).then(function (manifest) {
                if (manifest) {
                    return _this5.writeBundleManifest(ctx, manifest, gulp).then(function () {
                        console.log(chalk.green('------ Complete -------------'));
                    });
                } else {
                    console.log(chalk.green('------ Complete -------------'));
                    return null;
                }
            });
        }
    }, {
        key: "setup",
        value: function setup(ctx, gulp) {
            ctx.option = this.initOption(ctx);
            return _get(JspmBundle.prototype.__proto__ || Object.getPrototypeOf(JspmBundle.prototype), "setup", this).call(this, ctx, gulp);
        }
    }, {
        key: "working",
        value: function working(source, ctx, option, gulp, pipes, output) {
            var _this6 = this;

            var bundle = source['bundle'];
            return _get(JspmBundle.prototype.__proto__ || Object.getPrototypeOf(JspmBundle.prototype), "working", this).call(this, source, ctx, option, gulp, pipes, output).then(function () {
                var bundlemap = {
                    path: bundle.path,
                    modules: bundle.modules
                };
                _this6.bundleMaps.push(bundlemap);
                if (bundle.sfx) {
                    console.log("Built sfx package: " + chalk.cyan(bundle.bundleName) + " -> " + chalk.cyan(bundle.filename) + "\n   dest: " + chalk.cyan(bundle.bundleDest));
                } else {
                    console.log("Bundled package: " + chalk.cyan(bundle.bundleName) + " -> " + chalk.cyan(bundle.filename) + "\n   dest: " + chalk.cyan(bundle.bundleDest));
                }
                return;
            });
        }
    }, {
        key: "getBundles",
        value: function getBundles(ctx) {
            var groups = [];
            if (ctx.env.gb) {
                groups = _.uniq(_.isArray(ctx.env.gb) ? ctx.env.gb : (ctx.env.gb || '').split(','));
            }
            if (groups.length < 1) {
                groups = _.keys(this.bundleConfig);
            } else {
                groups = _.filter(groups, function (f) {
                    return f && groups[f];
                });
            }
            console.log('cmmand group bundle:', chalk.cyan(groups));
            return groups;
        }
    }, {
        key: "groupBundle",
        value: function groupBundle(config, builder, name, bundleGp, gulp) {
            var _this7 = this;

            var bundleStr = '';
            var bundleDest = '';
            var bundleItems = [];
            var minusStr = this.exclusionString(bundleGp.exclude, this.bundleConfig);
            if (bundleGp.items) {
                bundleItems = _.isArray(bundleItems) ? bundleGp.items : _.keys(bundleGp.items);
            }
            if (bundleGp.combine) {
                bundleDest = this.getBundleDest(config, name, bundleGp);
                bundleStr = bundleItems.join(' + ') + minusStr;
                console.log("Bundling group: " + chalk.cyan(name) + " ... \ngroup source:\n  " + chalk.cyan(bundleStr) + "\n-------------------------------");
                return this.createBundler(config, builder, name, bundleStr, bundleDest, bundleGp.builder, bundleGp);
            } else {
                console.log("Bundling group: " + chalk.cyan(name) + " ... \ngroup items:\n  " + chalk.cyan(bundleItems) + "\n-------------------------------");
                return Promise.all(bundleItems.map(function (key) {
                    bundleStr = key + minusStr;
                    bundleDest = _this7.getBundleDest(config, key, bundleGp);
                    return _this7.createBundler(config, builder, key, bundleStr, bundleDest, bundleGp.builder, bundleGp);
                }));
            }
        }
    }, {
        key: "exclusionString",
        value: function exclusionString(exclude, groups) {
            var str = this.exclusionArray(exclude, groups).join(' - ');
            return str ? ' - ' + str : '';
        }
    }, {
        key: "exclusionArray",
        value: function exclusionArray(exclude, groups) {
            var _this8 = this;

            var minus = [];
            exclude = _.isArray(exclude) ? exclude : _.keys(exclude);
            _.forEach(exclude, function (item) {
                var group = groups[item];
                if (group) {
                    // exclude everything from this group
                    minus = minus.concat(_this8.exclusionArray(group.items, groups));
                } else {
                    // exclude this item by name
                    minus.push(item);
                }
            });
            return minus;
        }
    }, {
        key: "createBundler",
        value: function createBundler(config, builder, bundleName, bundleStr, bundleDest, builderCfg, bundleGp) {
            var sfx = builderCfg.sfx;
            var bundler = sfx ? builder.buildStatic : builder.bundle;
            var shortPath = this.getBundleShortPath(config, bundleName, bundleGp);
            var filename = path.parse(bundleDest).base;
            return bundler.bind(builder)(bundleStr, bundleDest, builderCfg).then(function (output) {
                mkdirp.sync(path.dirname(bundleDest));
                var stream = source(filename);
                stream.write(output.source);
                process.nextTick(function () {
                    stream.end();
                });
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
    }, {
        key: "getPackage",
        value: function getPackage(option) {
            if (!this.packages[option.packageFile]) {
                this.packages[option.packageFile] = require(option.packageFile);
            }
            return this.packages[option.packageFile];
        }
    }, {
        key: "calcChecksums",
        value: function calcChecksums(option, bundles) {
            var chksums = {};
            console.log('Calculating checksums...');
            return Promise.all(_.map(bundles, function (bundle) {
                if (!_.isObject(bundle)) {
                    return null;
                }
                return new Promise(function (resolve, reject) {
                    var filepath = path.join(option.baseURL || '.', bundle.path);
                    var filename = path.parse(bundle.path).base;
                    chksum.file(filepath, function (err, sum) {
                        if (err) {
                            console.error(chalk.red(' Checksum Error:'), chalk.red(err));
                        }
                        console.log(filename, chalk.cyan(sum));
                        chksums[bundle.path] = sum;
                        resolve(chksums);
                    });
                });
            })).then(function () {
                return chksums;
            });
        }
    }, {
        key: "updateBundleManifest",
        value: function updateBundleManifest(ctx, bundles, chksums) {
            chksums = chksums || {};
            var manifest = _.defaults(this.getBundleManifest(ctx), {
                bundles: {},
                chksums: {}
            });
            // console.log(manifest);
            _.each(bundles, function (bundle) {
                if (bundle.path) {
                    manifest.bundles[bundle.path] = bundle.modules;
                    manifest.chksums[bundle.path] = chksums[bundle.path] || '';
                }
            });
            return manifest;
        }
    }, {
        key: "writeBundleManifest",
        value: function writeBundleManifest(ctx, manifest, gulp) {
            var _this9 = this;

            var option = ctx.option;
            if (!option.mainfile) {
                return Promise.reject('mainfile not configed.');
            }
            console.log('Writing manifest...');
            var output = "\nSystem.config({\n    baseURL: '" + (path.relative(option.baseURL, ctx.env.root) || '.') + "',\n    defaultJSExtensions: true\n});\nSystem.bundled = true;\nSystem.bust = '" + option.bust + "';\nif(window != undefined) window.prod = true;\n" + this.manifestSplit + "\n";
            var template = '';
            if (manifest) {
                (function () {
                    // try {
                    template = option.systemConfigTempl;
                    if (!template) {
                        template = option.bust ? "\n(function(module) {\n    var bust = {};\n    var systemLocate = System.locate;\n    var systemNormalize = System.normalize;\n    var paths =  module.exports.paths = ${paths} || {};\n    var chksums = module.exports.chksums = ${chksums};\n    var bundles = module.exports.bundles = ${bundles};                    \n    var maps = ${ maps };\n    var jspmMeta = ${ jspmMeta };\n\n    System.config({\n            packages: {\n            \"meta\": jspmMeta\n        },\n        map: maps,\n        paths: paths,\n        bundles: bundles\n    });\n\n    System.normalize = function (name, pName, pAddress) {\n        return systemNormalize.call(this, name, pName, pAddress).then(function (address) {\n            var chksum = chksums[name];\n            if (chksums[name]) { bust[address] = chksum; }\n            return address;\n        });\n    };\n\n    System.locate = function (load) {\n        return Promise.resolve(systemLocate.call(this, load)).then(function (address) {\n            var chksum = bust[address];\n            return (chksum) ? address + '?' + chksum : address;\n        });\n    };\n\n})((typeof module !== 'undefined') ? module : {exports: {}}, this);\n" : "\n(function(module) {\n    var bundles = module.exports.bundles = ${bundles};\n    var paths =  module.exports.paths = ${paths} || {};\n    var maps = ${ maps };\n    var jspmMeta = ${ jspmMeta };\n\n    System.config({\n            packages: {\n            \"meta\": jspmMeta\n        },\n        map: maps,\n        paths: paths,\n        bundles: bundles\n    });\n\n})((typeof module !== 'undefined') ? module : {exports: {}}, this);\n";
                    }
                    var maps = {
                        css: 'github:systemjs/plugin-css@0.1.20.js',
                        json: 'github:systemjs/plugin-json@0.1.2.js'
                    };
                    _.each(_.keys(manifest.bundles), function (n) {
                        if (/css.min.js$/.test(n)) {
                            maps.css = _.first(manifest.bundles[n]);
                        }
                        if (/json.min.js$/.test(n)) {
                            maps.css = _.first(manifest.bundles[n]);
                        }
                    });
                    var jspmMetas = option.jspmMates;
                    output += _.template(template)({
                        maps: JSON.stringify(maps, null, '    '),
                        jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                        paths: JSON.stringify(ctx.option.builder.config ? ctx.option.builder.config.paths : null, null, '    '),
                        chksums: JSON.stringify(manifest.chksums, null, '    '),
                        bundles: JSON.stringify(manifest.bundles, null, '    ')
                    });
                })();
            }
            var includes = option.includes || [];
            includes = includes.concat(_.map(option.includePackageFiles, function (f) {
                return path.join(option.jspmPackages, f);
            }));
            return Promise.all(_.map(includes, function (f) {
                return new Promise(function (resolve, reject) {
                    fs_1.readFile(path.join(option.jspmConfig, f), 'utf8', function (err, data) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });
            })).then(function (data) {
                data.push(output);
                var mainfile = option.mainfile; // path.relative(this.getBundleManifestPath(ctx), ctx.getDist(this.getInfo()));
                console.log('mainfile:', mainfile);
                mkdirp.sync(path.dirname(mainfile));
                var stream = source(mainfile);
                stream.write(data.join('\n'));
                process.nextTick(function () {
                    stream.end();
                });
                return _get(JspmBundle.prototype.__proto__ || Object.getPrototypeOf(JspmBundle.prototype), "working", _this9).call(_this9, stream.pipe(vinylBuffer()), ctx, option, gulp, option.mainfilePipes || [], option.mainfileOutput);
            });
        }
    }, {
        key: "getBundleManifestPath",
        value: function getBundleManifestPath(ctx) {
            return this.getBundleDest(ctx, ctx.option.mainfile);
        }
    }, {
        key: "getBundleManifest",
        value: function getBundleManifest(ctx) {
            var data = {};
            var mainfile = this.getBundleManifestPath(ctx);
            console.log('try to load old bundle in path ', mainfile);
            if (fs_1.existsSync(mainfile)) {
                try {
                    var content = fs_1.readFileSync(mainfile, 'utf8');
                    var idx = content.indexOf(this.manifestSplit);
                    idx = idx > 0 ? idx + this.manifestSplit.length : 0;
                    content = content.substring(idx);
                    // console.log(content);
                    fs_1.writeFileSync(mainfile, content);
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
    }, {
        key: "getBundleShortPath",
        value: function getBundleShortPath(config, bundleName, bundleGp) {
            var fullPath = bundleGp ? this.getBundleDest(config, bundleName, bundleGp) : path.join(config.getDist(), bundleName);
            var spath = path.relative(config.option.baseURL, fullPath);
            spath = spath.replace(/\\/g, '/').replace(/^\//g, '');
            return spath;
        }
    }, {
        key: "getBundleDest",
        value: function getBundleDest(config, bundleName, bundleGp) {
            var dest = path.join(config.getDist(), config.option.bundleFolder);
            if (bundleGp) {
                var min = bundleGp.builder.minify;
                var name = bundleGp.items[bundleName] || bundleName;
                var file = name + (min ? '.min.js' : '.js');
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
    }]);

    return JspmBundle;
}(development_core_1.PipeTask);
JspmBundle = __decorate([development_core_1.task({
    oper: development_core_1.Operation.release | development_core_1.Operation.deploy
}), __metadata('design:paramtypes', [Object])], JspmBundle);
exports.JspmBundle = JspmBundle;
//# sourceMappingURL=sourcemaps/JspmBundle.js.map
