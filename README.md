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

Development.create(gulp, __dirname, [
    {
        src:'src',
        dist:'dist',
        loader:'development-tool-web',
        tasks:[
            {
                [src:'dist/**/*.js',]
                dist: 'dist/bundles',
                loader: 'development-tool-jspm',
                jspmConfig:'./jspm.conf.js',
                bundles:{
                    libs:{
                        combine:true,
                        toES5:true,
                        exclude: [...],
                        items: string[] | (config)=> string[]
                    },
                    module1:{
                        combine:true,
                        toES5:true,
                        exclude: [...],
                        items: string[] | (config)=> string[]
                    }
                    app:{
                        combine:true,
                        toES5:true,
                        exclude: ['libs', 'module1'],
                        items: ['app/app']
                    }
                }
            }
        ]
    }
])

```


## Documentation

Documentation is available on the
[development-tool-jspm docs site](https://github.com/zhouhoujun/development-tool-jspm).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)