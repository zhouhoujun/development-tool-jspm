# packaged development-tool-jspm

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/development-tool-jspm/src/mastert).
Please file issues and pull requests against that repo.
This package use to bundle jspm project by custom group.

## Install

You can install this package either with `npm` or with `jspm`.

### npm

```shell

npm install development-tool-jspm

```

### use bundles with development-tool

```ts
import  { Development } from 'development-tool';
import { IBundleGroup, IBundlesConfig } from 'development-tool-jspm';

//bundle all from src
 ['app/home/**/*.js']
Development.create(gulp, __dirname, [
    {
        src:'src',
        dist:'dist',
        loader:'development-tool-web',
        tasks:[
            <IBundlesConfig>{
                loader: 'development-tool-jspm',
                baseURL: '',
                mainfile: 'bundle.js',
                bust: 'v0.1.0',
                // jspmConfig: 'development/jspm-config/config.js',
                src:'app/home/**/*.js',
                dist: 'bundles',
                //bundle output file to work with
                pipes: [
                    (ctx) => ngAnnotate(),
                    (ctx) => uglify()
                ]
            }
        ]
    }
]);

```

## group bundles， demo for angular.

```ts

import * as gulp from 'gulp';
import * as _ from 'lodash';
import { Pipe, IPipe, Operation, IMap, IDynamicTaskOption, RunWay } from 'development-core';
import { Development, IContext } from 'development-tool';
import { IBundlesConfig, IBundleGroup } from 'development-tool-jspm';
import { IWebTaskOption } from 'development-tool-web';
import { ITsTaskOption } from 'development-assert-ts';
import * as path from 'path';
const tslint = require('gulp-tslint');
const ngAnnotate = require('gulp-ng-annotate');
const cache = require('gulp-cached');
const rename = require('gulp-rename');
const jeditor = require('gulp-json-editor');
const through = require('through2');
const JSONC = require('json-comments');
const replace = require('gulp-replace');
const del = require('del');
const uglify = require('gulp-uglify');

Development.create(gulp, __dirname, [
    <IWebTaskOption>{
        src: 'src',
        dist: 'dist/development',
        releaseDist: 'dist/production',
        cleanSrc: (ctx) => {
            if (ctx.env.release || ctx.env.deploy) {
                if (ctx.env.gb) {
                    return ['dist/production/!(*.js)'];
                } else {
                    return 'dist/production';
                }
            } else {
                return 'dist/development';
            }
        },
        karma: {
            jspm: {
                resource: 'assets'
            }
        },
        loader: 'development-tool-web',
        assertsOrder: total => 1 / total,
        asserts: {
            css: '', less: '',
            jpeg: Operation.default, jpg: Operation.default, png: Operation.default, svg: Operation.default,
            ttf: Operation.default, woff: Operation.default, eot: Operation.default, xslx: Operation.default,
            pdf: Operation.default,
            html: 'src/*.html',
            json:['src/**/*.json', '!src/data/**/*.json', '!src**/jsconfig.json', '!src/config*.json'],
            config: {
                src(ctx) {
                    if (ctx.env.config) {
                        return `src/config-${ctx.env.config}.json`;
                    } else {
                        return 'src/config.json';
                    }
                },
                loader: []
            },
            template: {
                src: 'src/**/*.tpl.html',
                loader: 'development-assert-templ'
            },
            ts: {
                src: ['src/**/*.ts', 'test/**/*.ts'],
                uglify: false,
                loader: {
                    module: 'development-assert-ts',
                    pipes: <Pipe[]>[
                        { name: 'tscompile', toTransform: () => ngAnnotate(), order: total => 1 / total },
                    ]
                }
            },
            jspmconfig: {
                src: 'src/jspm-config/*.js',
                dist: 'dist/development/jspm-config',
                releaseDist: 'dist/production/jspm-config',
                watch: true,
                loader: [
                    {
                        pipes: <Pipe[]>[
                            // {
                            //     oper: Operation.build,
                            //     toTransform: () => replace(/dist\/jspm_packages/g, 'dist/jspm_packages')
                            // }
                        ]
                    }
                ]
            },
            js: ['src/**/*.js', '!src/jspm-config/**/*.js']
        },
        subTaskOrder: total => 3 / total,
        tasks: [
            <IBundlesConfig>{
                index: ['src/index.html', 'src/Index.cshtml'],
                bundleBaseDir: 'dist/production',
                src: 'dist/production/**/*.js',
                dist: 'dist/production',
                jspmConfig: 'dist/production/jspm-config/config.js',
                mainfile: 'bundle.js',
                loader: 'development-tool-jspm',
                bundles: (ctx) => {
                    let routes = [
                        'app/subapp1/routes.json',
                        'app/subapp2/routes.json',
                        'app/subapp3.json'
                    ];
                    let dist = ctx.parent.getDist();
                    return ctx.fileFilter(path.join(dist, 'common/**/*.js'), null, n => {
                        return ctx.toUrl(dist, n); // path.relative(dist, n).replace(/\\/g, '/').replace(/^\//g, '');
                    }).then(cits => {
                        let bundle: IMap<IBundleGroup> = {
                            commons: {
                                combine: true,
                                exclude: [],
                                items: cits
                            }
                        };
                        _.each(routes, (r, idx) => {
                            let rf = path.join(dist, r);
                            let route: any[] = require(rf);
                            if (route) {
                                let rs = r.split('/');
                                let name = rs[(rs.length - 2)];
                                let items = _.uniq(_.map(route, r => {
                                    return r.src;
                                }));
                                let exclude = [];
                                if (idx === (routes.length - 1)) {
                                    exclude = _.keys(bundle);
                                    items.push('app/app');
                                }

                                bundle[name] = {
                                    combine: true,
                                    items: items,
                                    exclude: exclude
                                }
                            }
                        });
                        return bundle;
                    });
                },
                depsExclude: ['angular-i18n', 'jquery'],
                bundleDeps: (ctx, deps) => {
                    let libs = ['bootstrap', 'bootstrap-less', 'css', 'less', 'json', 'lodash', 'text', 'url', 'normalize.css', 'spectrum', 'html2canvas', 'moment', 'highcharts'];
                    let cores = ['angular', 'oclazyload', 'angular-translate', 'angular-translate-loader-static-files', 'angular-messages'
                        , 'angular-ui-event', 'angular-ui-utils', 'angular-ui-validate', 'angular-ui-router', 'angular-loading-bar'
                        , 'ng-file-upload', 'angular-ui-bootstrap', 'ui-router-extras'];
                    return {
                        libs: {
                            combine: true,
                            items: libs
                        },
                        core: {
                            combine: true,
                            items: cores,
                            exclude: ['libs']
                        },
                        tools: {
                            combine: true,
                            items: _.filter(deps, function (d) {
                                return libs.indexOf(d) < 0 && cores.indexOf(d) < 0;
                            }),
                            exclude: ['libs', 'core']
                        },
                        components: {
                            combine: true,
                            items: _.filter(deps, function (d) {
                                return libs.indexOf(d) < 0 && cores.indexOf(d) < 0;
                            }),
                            exclude: ['libs', 'core', 'tools']
                        }
                    };
                },
                pipes: [
                    () => ngAnnotate(),
                    () => uglify()
                ]
            },
            {
                loader: <IDynamicTaskOption>{
                    name: 'clean-production',
                    oper: Operation.release,
                    task: (ctx) => del(ctx.toDistSrc(['app', 'common', 'data']))
                }
            }
        ]
    }
]);


```


## Documentation

Documentation is available on the
[development-tool-jspm docs site](https://github.com/zhouhoujun/development-tool-jspm).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)