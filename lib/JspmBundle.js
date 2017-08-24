"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _ = require("lodash");
var development_core_1 = require("development-core");
var path = require("path");
var url = require("url");
var fs_1 = require("fs");
var chalk = require("chalk");
var replace = require('gulp-replace');
// const globby = require('globby');
var jspm = require('jspm');
var source = require('vinyl-source-stream');
var vinylBuffer = require('vinyl-buffer');
var chksum = require('checksum');
var mkdirp = require('mkdirp');
// const uglify = require('gulp-uglify');
var JspmBundle = (function (_super) {
    __extends(JspmBundle, _super);
    function JspmBundle(info) {
        var _this = _super.call(this, info) || this;
        _this.name = 'jspm-bundle';
        _this.runWay = development_core_1.RunWay.sequence;
        _this.manifestSplit = "/*------bundles infos------*/";
        return _this;
    }
    JspmBundle.prototype.source = function (ctx, dist, gulp) {
        var _this = this;
        var option = ctx.option;
        if (option.bundles) {
            return this.initBundles(ctx)
                .then(function () {
                return Promise.all(_.map(_this.getBundles(ctx), function (name) {
                    return _this.loadBuilder(ctx)
                        .then(function (builder) {
                        var bundle = _this.bundleConfig[name];
                        var bcfg = _this.getBuildConfig(ctx);
                        bundle.builder = _.defaults(bundle.builder, bcfg);
                        if (bundle.builder.config) {
                            builder.config(bundle.builder.config);
                        }
                        return _this.groupBundle(ctx, builder, name, bundle, gulp)
                            .then(function (trans) { return _this.translate(trans); });
                    });
                }));
            }).then(function (groups) {
                return _.flatten(groups);
            });
        }
        else {
            return this.loadBuilder(ctx)
                .then(function (builder) {
                var src = ctx.getSrc(_this.getInfo());
                console.log('start bundle all src : ', chalk.cyan(src));
                var bcfg = _this.getBuildConfig(ctx);
                if (bcfg.config) {
                    builder.config(bcfg.config);
                }
                return ctx.fileFilter(src)
                    .then(function (files) {
                    files = _this.getRelativeSrc(ctx, files);
                    console.log('bundle files:', chalk.cyan(files));
                    var mainfile = _this.getBundleManifestPath(ctx);
                    return _this.createBundler(ctx, builder, 'bundle', files.join(' + '), mainfile, bcfg)
                        .then(function (trans) { return _this.translate(trans); });
                });
            });
        }
    };
    JspmBundle.prototype.execute = function (context, gulp) {
        var _this = this;
        this.bundleMaps = [];
        var ctx = context;
        return _super.prototype.execute.call(this, ctx, gulp)
            .then(function () {
            var option = ctx.option;
            if (option.bundles) {
                return _this.calcChecksums(option, _this.bundleMaps).then(function (checksums) {
                    return _this.updateBundleManifest(ctx, _this.bundleMaps, checksums);
                });
            }
            else {
                return null;
            }
        }).then(function (manifest) {
            if (manifest) {
                return _this.writeBundleManifest(ctx, manifest, gulp)
                    .then(function () {
                    console.log(chalk.green('------ Complete -------------'));
                });
            }
            else {
                console.log(chalk.green('------ Complete -------------'));
                return null;
            }
        });
    };
    JspmBundle.prototype.setup = function (ctx, gulp) {
        ctx.option = this.initOption(ctx);
        return _super.prototype.setup.call(this, ctx, gulp);
    };
    JspmBundle.prototype.pipes = function (ctx, dist, gulp) {
        var pipes = _super.prototype.pipes.call(this, ctx, dist, gulp) || [];
        var ps = this.getAssertResetPipe(ctx);
        if (ps && ps.length > 0) {
            pipes = pipes.concat(ps);
        }
        return pipes;
    };
    JspmBundle.prototype.working = function (source, ctx, option, gulp, pipes, output) {
        var _this = this;
        var bundle = source['bundle'];
        return _super.prototype.working.call(this, source, ctx, option, gulp, pipes, output)
            .then(function () {
            var bundlemap = {
                path: bundle.path,
                modules: bundle.modules
            };
            _this.bundleMaps.push(bundlemap);
            if (bundle.sfx) {
                console.log("Built sfx package: " + chalk.cyan(bundle.bundleName) + " -> " + chalk.cyan(bundle.filename) + "\n   dest: " + chalk.cyan(bundle.bundleDest));
            }
            else {
                console.log("Bundled package: " + chalk.cyan(bundle.bundleName) + " -> " + chalk.cyan(bundle.filename) + "\n   dest: " + chalk.cyan(bundle.bundleDest));
            }
            return;
        });
    };
    JspmBundle.prototype.getOption = function (config) {
        return config.option;
    };
    JspmBundle.prototype.loadBuilder = function (ctx) {
        var option = ctx.option;
        jspm.setPackagePath(path.dirname(ctx.toStr(option.packageFile)));
        var jsbuilder = new jspm.Builder({ separateCSS: option.builder.separateCSS });
        return Promise.resolve(jsbuilder)
            .then(function (builder) {
            if (option.jspmConfig) {
                if (_.isArray(option.jspmConfig)) {
                    return Promise.all(option.jspmConfig.map(function (cf) { return builder.loadConfig(cf, undefined, true); }))
                        .then(function () {
                        return builder;
                    });
                }
                else {
                    return builder.loadConfig(option.jspmConfig, undefined, true)
                        .then(function () {
                        return builder;
                    });
                }
            }
            else {
                return builder;
            }
        });
    };
    JspmBundle.prototype.translate = function (trans) {
        if (_.isArray(trans)) {
            return _.map(trans, function (t) {
                t.stream['bundle'] = t.bundle;
                return t.stream;
            });
        }
        else {
            trans.stream['bundle'] = trans.bundle;
            return trans.stream;
        }
    };
    JspmBundle.prototype.initBundles = function (ctx) {
        var _this = this;
        var opt = ctx.option;
        var pr = Promise.resolve(null)
            .then(function () { return ctx.to(opt.bundles); });
        if (opt.bundleDeps) {
            pr = pr.then(function (bundles) {
                var pkg = ctx.getPackage(opt.packageFile);
                if (!pkg) {
                    console.log(chalk.red('can not found package.json file.'));
                    process.exit(0);
                }
                var deps = opt.dependencies ? ctx.to(opt.dependencies) : _.keys(pkg.jspm.dependencies);
                if (!deps || deps.length < 0) {
                    console.log(chalk.red('not set bundle dependencies libs, or not setting jspm config.'));
                    process.exit(0);
                }
                if (opt.depsExclude) {
                    var exclude_1 = _.isFunction(opt.depsExclude) ? opt.depsExclude(ctx, deps) : opt.depsExclude;
                    deps = _.filter(deps, function (d) { return exclude_1.indexOf(d) < 0; });
                }
                return Promise.resolve()
                    .then(function () {
                    if (_.isFunction(opt.bundleDeps)) {
                        // opt['_bundleDepsFunc'] = opt.bundleDeps;
                        return opt.bundleDeps(ctx, deps);
                    }
                    else if (_.isBoolean(opt.bundleDeps)) {
                        return {
                            deplibs: {
                                combine: true,
                                items: deps
                            }
                        };
                    }
                    else {
                        return opt.bundleDeps;
                    }
                })
                    .then(function (bundleDeps) {
                    var cores = _.keys(bundleDeps);
                    _.each(_.keys(bundles), function (n) {
                        var b = bundles[n];
                        b.exclude = b.exclude || [];
                        b.exclude = cores.concat(b.exclude);
                        bundleDeps[n] = b;
                    });
                    return bundleDeps;
                });
            });
        }
        return pr.then(function (bundles) {
            _this.bundleConfig = bundles;
            console.log('group bundles setting:\n', bundles, '---------------------------------\n');
            return bundles;
        });
    };
    JspmBundle.prototype.getRelativeSrc = function (ctx, src, toModule) {
        var _this = this;
        if (toModule === void 0) { toModule = false; }
        var bunldeBase = ctx.option.bundleBaseDir;
        if (_.isArray(src)) {
            return _.map(src, function (s) {
                var filename = ctx.toUrl(bunldeBase, s);
                return toModule ? _this.toModulePath(filename) : filename;
            });
        }
        else {
            var fn = ctx.toUrl(bunldeBase, src);
            return [(toModule ? this.toModulePath(fn) : fn)];
        }
    };
    JspmBundle.prototype.toModulePath = function (filename) {
        if (!filename) {
            return '';
        }
        return filename.substring(0, filename.length - path.extname(filename).length);
    };
    JspmBundle.prototype.initOption = function (ctx) {
        var option = _.extend({}, {
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
            bundlePaths: function (ctx) {
                var paths = {};
                var bundleDest = ctx.getDist();
                var rootpath = option.bundleBaseDir;
                ctx.getFolders(rootpath, function (f, d) {
                    if (f !== bundleDest) {
                        var p = d + '/*';
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
        }, ctx.option);
        ctx.option = option;
        option.baseURL = ctx.toStr(option.baseURL) || './';
        console.log('baseURL set as:', option.baseURL);
        if (!option.bundleBaseDir && ctx.parent) {
            option.bundleBaseDir = ctx.parent.getDist();
        }
        else if (option.bundleBaseDir) {
            option.bundleBaseDir = ctx.toRootPath(ctx.toStr(option.bundleBaseDir));
        }
        else {
            console.log(chalk.red('bundleBaseURL config error!'));
            process.exit(0);
        }
        if (option.jspmConfig) {
            option.jspmConfig = ctx.toRootSrc(ctx.toSrc(option.jspmConfig));
        }
        option.packageFile = ctx.toRootPath(ctx.toStr(option.packageFile));
        option.mainfile = ctx.toStr(option.mainfile);
        var pkg = ctx.getPackage(option.packageFile);
        if (!option.jspmPackages) {
            if (pkg.jspm.directories && pkg.jspm.directories.packages) {
                option.jspmPackages = pkg.jspm.directories.packages;
            }
            else {
                option.jspmPackages = 'jspm_packages';
            }
        }
        option.jspmPackages = ctx.toRootPath(ctx.toStr(option.jspmPackages));
        if (!fs_1.readdirSync(option.jspmPackages)) {
            console.log(chalk.red('jspm project config error!'));
            process.exit(0);
        }
        return option;
    };
    JspmBundle.prototype.getBuildConfig = function (ctx) {
        var option = ctx.option;
        if (!option.builder.config) {
            option.builder.config = _.extend(option.builder.config || {}, {
                paths: ctx.to(option.bundlePaths) || {},
                rootURL: option.bundleBaseDir
            });
        }
        return option.builder;
    };
    JspmBundle.prototype.getAssertResetPipe = function (ctx) {
        if (!this.restps) {
            var option = ctx.option;
            if (_.isUndefined(option.resetAsserts)) {
                option.resetAsserts = 'assets';
            }
            if (option.resetAsserts) {
                var folders = void 0;
                if (_.isString(option.resetAsserts)) {
                    var pth = ctx.toDistPath(option.resetAsserts, this.getInfo());
                    if (fs_1.existsSync(pth)) {
                        folders = ctx.getFolders(pth);
                        folders.push(pth);
                    }
                    else {
                        console.log(chalk.yellow('rest css asserts folders:', pth, 'not exists.'));
                    }
                }
                else {
                    folders = ctx.toDistSrc(option.resetAsserts, this.getInfo());
                }
                folders = folders || [];
                var ps_1 = [];
                var dist_1 = ctx.getDist(this.getInfo());
                var baseURL_1 = option.baseURL; // ctx.toUrl(ctx.getRootPath(), <string>option.baseURL) || '.';
                var root_1 = ctx.getRootPath();
                _.each(folders, function (f) {
                    var relp = url.resolve(baseURL_1, ctx.toUrl(root_1, ctx.toUrl(dist_1, f)));
                    var fm = path.basename(f);
                    console.log('reset css url folder name:', chalk.cyan(fm), 'relate url:', chalk.cyan(relp));
                    var reg = new RegExp("(url\\((\\.\\.\\/)+" + fm + ")|(url\\(\\/" + fm + ")", 'gi');
                    ps_1.push(function () { return replace(reg, "url(" + relp); });
                    var reg2 = new RegExp("(url\\(\\\\'(\\.\\.\\/)+" + fm + ")|(url\\(\\\\'\\/" + fm + ")", 'gi');
                    ps_1.push(function () { return replace(reg2, "url(\\'" + relp); });
                    var reg3 = new RegExp("(url\\((\"\\.\\.\\/)+" + fm + ")|(url\\(\"\\/" + fm + ")", 'gi');
                    ps_1.push(function () { return replace(reg3, "url(\"" + relp); });
                });
                this.restps = ps_1;
            }
            else {
                this.restps = [];
            }
        }
        return this.restps;
    };
    JspmBundle.prototype.getBundles = function (ctx) {
        var _this = this;
        var groups = [];
        if (ctx.env.gb) {
            groups = _.uniq(_.isArray(ctx.env.gb) ? ctx.env.gb : (ctx.env.gb || '').split(','));
        }
        if (groups.length < 1) {
            groups = _.keys(this.bundleConfig);
        }
        else {
            groups = _.filter(groups, function (f) { return f && _this.bundleConfig[f]; });
        }
        console.log('cmmand group bundle:', chalk.cyan(groups));
        return groups;
    };
    JspmBundle.prototype.groupBundle = function (config, builder, name, bundleGp, gulp) {
        var _this = this;
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
        }
        else {
            console.log("Bundling group: " + chalk.cyan(name) + " ... \ngroup items:\n  " + chalk.cyan(bundleItems) + "\n-------------------------------");
            return Promise.all(bundleItems.map(function (key) {
                bundleStr = key + minusStr;
                bundleDest = _this.getBundleDest(config, key, bundleGp);
                return _this.createBundler(config, builder, key, bundleStr, bundleDest, bundleGp.builder, bundleGp);
            }));
        }
    };
    JspmBundle.prototype.exclusionString = function (exclude, groups) {
        var str = this.exclusionArray(exclude, groups).join(' - ');
        return (str) ? ' - ' + str : '';
    };
    JspmBundle.prototype.exclusionArray = function (exclude, groups) {
        var _this = this;
        var minus = [];
        exclude = (_.isArray(exclude)) ? exclude : _.keys(exclude);
        _.forEach(exclude, function (item) {
            var group = groups[item];
            if (group) {
                // exclude everything from this group
                minus = minus.concat(_this.exclusionArray(group.items, groups));
            }
            else {
                // exclude this item by name
                minus.push(item);
            }
        });
        return minus;
    };
    JspmBundle.prototype.createBundler = function (config, builder, bundleName, bundleStr, bundleDest, builderCfg, bundleGp) {
        var sfx = builderCfg.sfx;
        var bundler = (sfx) ? builder.buildStatic : builder.bundle;
        var shortPath = this.getBundleShortPath(config, bundleName, bundleGp);
        var filename = path.parse(bundleDest).base;
        return bundler.bind(builder)(bundleStr, bundleDest, builderCfg)
            .then(function (output) {
            mkdirp.sync(path.dirname(bundleDest));
            var stream = source(filename);
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
    };
    JspmBundle.prototype.calcChecksums = function (option, bundles) {
        var chksums = {};
        console.log('Calculating checksums...');
        return Promise.all(_.map(bundles, function (bundle) {
            if (!_.isObject(bundle)) {
                return null;
            }
            return new Promise(function (resolve, reject) {
                var filepath = path.join(option.bundleBaseDir || '.', bundle.path);
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
    };
    JspmBundle.prototype.updateBundleManifest = function (ctx, bundles, chksums) {
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
    };
    JspmBundle.prototype.writeBundleManifest = function (ctx, manifest, gulp) {
        var _this = this;
        var option = ctx.option;
        if (!option.mainfile) {
            return Promise.reject('mainfile not configed.');
        }
        console.log('Writing manifest...');
        var baseURL = ctx.toUrl(option.baseURL) || '.';
        console.log('system config baseURL: ', chalk.cyan(baseURL));
        var bust = ctx.toStr(option.bust);
        console.log('system bust: ', chalk.cyan(bust));
        var output = "\nSystem.config({\n    baseURL: '" + baseURL + "',\n    defaultJSExtensions: true\n});\nSystem.bundled = true;\nSystem.bust = '" + bust + "';\nif(window != undefined) window.prod = true;\n" + this.manifestSplit + "\n";
        var template = '';
        if (manifest) {
            // try {
            template = ctx.toStr(option.systemConfigTempl);
            if (!template) {
                template = (bust) ? "\n(function(module) {\n    var bust = {};\n    var systemLocate = System.locate;\n    var systemNormalize = System.normalize;\n    var paths =  module.exports.paths = ${paths} || {};\n    var chksums = module.exports.chksums = ${chksums};\n    var bundles = module.exports.bundles = ${bundles};                    \n    var maps = ${ maps };\n    var jspmMeta = ${ jspmMeta };\n\n    System.config({\n            packages: {\n            \"meta\": jspmMeta\n        },\n        map: maps,\n        paths: paths,\n        bundles: bundles\n    });\n\n    System.normalize = function (name, pName, pAddress) {\n        return systemNormalize.call(this, name, pName, pAddress).then(function (address) {\n            var chksum = chksums[name];\n            if (chksums[name]) { bust[address] = chksum; }\n            return address;\n        });\n    };\n\n    System.locate = function (load) {\n        return Promise.resolve(systemLocate.call(this, load)).then(function (address) {\n            var chksum = bust[address];\n            return (chksum) ? address + '?' + chksum : address;\n        });\n    };\n\n})((typeof module !== 'undefined') ? module : {exports: {}}, this);\n" : "\n(function(module) {\n    var bundles = module.exports.bundles = ${bundles};\n    var paths =  module.exports.paths = ${paths} || {};\n    var maps = ${ maps };\n    var jspmMeta = ${ jspmMeta };\n\n    System.config({\n            packages: {\n            \"meta\": jspmMeta\n        },\n        map: maps,\n        paths: paths,\n        bundles: bundles\n    });\n\n})((typeof module !== 'undefined') ? module : {exports: {}}, this);\n";
            }
            // let maps = {
            //     css: 'github:systemjs/plugin-css@0.1.20.js',
            //     json: 'github:systemjs/plugin-json@0.1.2.js'
            // };
            var maps_1 = option.bundleMaps || {
                css: '',
                json: '',
                text: ''
            };
            var cssSrc_1, jsonSrc_1, textSrc_1;
            _.each(_.keys(manifest.bundles), function (n) {
                if (!maps_1.css) {
                    cssSrc_1 = _.find(manifest.bundles[n], function (it) { return /(css(.min){0,1}.js)|(plugin-css@\d+.\d+.\d+.js)$/.test(it); });
                    if (cssSrc_1) {
                        maps_1.css = cssSrc_1;
                    }
                }
                if (!maps_1.json) {
                    jsonSrc_1 = _.find(manifest.bundles[n], function (it) { return /(json(.min){0,1}.js)|(plugin-json@\d+.\d+.\d+.js)$/.test(it); });
                    if (jsonSrc_1) {
                        maps_1.json = jsonSrc_1;
                    }
                }
                if (!maps_1.text) {
                    textSrc_1 = _.find(manifest.bundles[n], function (it) { return /(text(.min){0,1}.js)|(plugin-text@\d+.\d+.\d+.js)$/.test(it); });
                    if (textSrc_1) {
                        maps_1.text = textSrc_1;
                    }
                }
            });
            var jspmMetas = option.jspmMates;
            output += _.template(template)({
                maps: JSON.stringify(maps_1, null, '    '),
                jspmMeta: JSON.stringify(jspmMetas, null, '    '),
                paths: JSON.stringify(null, null, '    '),
                chksums: JSON.stringify(manifest.chksums, null, '    '),
                bundles: JSON.stringify(manifest.bundles, null, '    '),
            });
        }
        var includes = option.includes || [];
        includes = includes.concat(_.map(option.includePackageFiles, function (f) { return path.join(option.jspmPackages, f); }));
        return Promise.all(_.map(includes, function (f) {
            return new Promise(function (resolve, reject) {
                fs_1.readFile(f, 'utf8', function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        }))
            .then(function (data) {
            data.push(output);
            var mainfile = ctx.toStr(option.mainfile); // path.relative(this.getBundleManifestPath(ctx), ctx.getDist(this.getInfo()));
            console.log('mainfile:', mainfile);
            mkdirp.sync(path.dirname(mainfile));
            var stream = source(mainfile);
            stream.write(data.join('\n'));
            process.nextTick(function () {
                stream.end();
            });
            return _super.prototype.working.call(_this, stream.pipe(vinylBuffer()), ctx, option, gulp, option.mainfilePipes || [], option.mainfileOutput);
        });
    };
    JspmBundle.prototype.getBundleManifestPath = function (ctx) {
        return this.getBundleDest(ctx, ctx.option.mainfile);
    };
    JspmBundle.prototype.getBundleManifest = function (ctx) {
        var data = {};
        var mainfile = this.getBundleManifestPath(ctx);
        console.log('try to load old bundle in path ', mainfile);
        if (fs_1.existsSync(mainfile)) {
            try {
                var content = fs_1.readFileSync(mainfile, 'utf8');
                var idx = content.indexOf(this.manifestSplit);
                idx = idx > 0 ? (idx + this.manifestSplit.length) : 0;
                content = content.substring(idx);
                // console.log(content);
                fs_1.writeFileSync(mainfile, content);
                data = require(mainfile);
                console.log('has old bundle：\n', chalk.cyan(mainfile)); // , 'data:\n', data);
            }
            catch (e) {
                console.log(chalk.red(e));
            }
        }
        else {
            console.log('no old bundle：\n', chalk.cyan(mainfile)); // , 'data:\n', data);
        }
        return data;
    };
    JspmBundle.prototype.getBundleShortPath = function (ctx, bundleName, bundleGp) {
        var fullPath = bundleGp ? this.getBundleDest(ctx, bundleName, bundleGp)
            : path.join(ctx.getDist(), bundleName);
        return ctx.toUrl(ctx.option.bundleBaseDir, fullPath);
    };
    JspmBundle.prototype.getBundleDest = function (ctx, bundleName, bundleGp) {
        var dest = ctx.getDist();
        if (bundleGp) {
            var min = bundleGp.builder.minify;
            var name_1 = bundleGp.items[bundleName] || bundleName;
            var file = name_1 + ((min) ? '.min.js' : '.js');
            if (bundleGp.combine) {
                dest = path.join(dest, file);
            }
            else {
                dest = path.join(dest, bundleName, file);
            }
        }
        else {
            dest = path.join(dest, bundleName);
        }
        return dest;
    };
    return JspmBundle;
}(development_core_1.PipeTask));
JspmBundle = __decorate([
    development_core_1.task({
        oper: development_core_1.Operation.release | development_core_1.Operation.deploy
    }),
    __metadata("design:paramtypes", [Object])
], JspmBundle);
exports.JspmBundle = JspmBundle;

//# sourceMappingURL=sourcemaps/JspmBundle.js.map
