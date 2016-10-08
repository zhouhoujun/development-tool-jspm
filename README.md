# packaged jspm-bundle-builder

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/jspm-bundle-builder/src/mastert).
Please file issues and pull requests against that repo.
This package use to bundle jspm project by custom group. 

## Install

You can install this package either with `npm` or with `jspm`.

### npm

```shell
dependencies: {
  "jspm-bundle-builder": "https://github.com/zhouhoujun/jspm-bundle-builder.git#commit-ish"
}
npm install
```

You can `import` modules:

```js

import  { JSPMBuilder } from 'jspm-bundle-builder';

builder = new JSPMBuilder(bundlesConfig);
//bundle all ,setting in bundlesConfig.bundles.
builder.bundle();
//only bundle group1, setting in options .
builder.bundle('group1');
//bundle 'group1','group2','group2', setting in options .
builder.bundle(['group1','group2','group2'])

```

### bundle builder options

```ts

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

```

## Documentation

Documentation is available on the
[jspm-bundle-builder docs site](https://github.com/zhouhoujun/jspm-bundle-builder).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)