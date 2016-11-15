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

//bundle group.
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
                src:'',
                dist: 'gbundles',
                //bundle output file to work with
                pipes: [
                    (ctx) => ngAnnotate(),
                    (ctx) => uglify()
                ],
                ////bundle output main file to work with
                mainfilePipes: [
                    (ctx) => ngAnnotate(),
                    (ctx) => uglify()
                ],
                bundles: {
                    iapi: <IBundleGroup>{
                        combine: true,
                        bundle: true,
                        items: ['app/iapi/app', 'app/iapi/interface/index', 'app/iapi/interface/apiModule/app'],
                        exclude: []
                    },
                    app: <IBundleGroup>{
                        combine: true,
                        bundle: true,
                        items: ['app/login/login', 'app/signup/signup', 'app/home/app', 'app/home/overview/overview'],
                        exclude: ['iapi']
                    }
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