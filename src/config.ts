import { Src, Pipe, IMap, IAsserts, ITaskContext, OutputPipe, ITransform, TaskString } from 'development-core'

/**
 * jspm mate loader config
 * 
 * @export
 * @interface IJspmMate
 */
export interface IJspmMate {
    loader: string;
}

/**
 * bundle config
 * 
 * @export
 * @interface BundlesConfig
 */
export interface IBundlesConfig extends IAsserts {
    /**
     * index html etc.  default ['index.*html', 'Index.*html'].
     * 
     * @type {Src}
     * @memberOf IBundlesConfig
     */
    index?: Src;

    /**
     * index html pipes works.
     * 
     * @type {Pipe[]}
     * @memberOf IBundlesConfig
     */
    indexPipes?: Pipe[];
    /**
     * systemjs baseURL, the bundle app path relation to root site.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    baseURL?: TaskString;

    /**
     * bundle base dir. used when bundling. if empty use parent context dist.
     * 
     * @type {TaskString}
     * @memberOf IBundlesConfig
     */
    bundleBaseDir?: TaskString;
    /**
     * bundlePaths
     * 
     * 
     * @memberOf IBundlesConfig
     */
    bundlePaths?: IMap<string> | ((ctx: ITaskContext) => IMap<string>);
    /**
     * jspm config file full path.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    jspmConfig?: TaskString;

    /**
     * package.json file path.
     * 
     * @type {string}
     * @memberOf IBundlesConfig
     */
    packageFile?: TaskString;

    /**
     * jspm packages folder.
     * 
     * @type {string}
     * @memberOf IBundlesConfig
     */
    jspmPackages?: TaskString;
    /**
     * bundle main file.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    mainfile: TaskString;
    /**
     * mainfile pipe works.
     * 
     * @type {Pipe[]}
     * @memberOf IBundlesConfig
     */
    mainfilePipes?: Pipe[];

    /**
     * mainfile output pipe.
     * 
     * @type {OutputPipe[]}
     * @memberOf IBundlesConfig
     */
    mainfileOutput?: OutputPipe[];
    /**
     * mainfile includes libs. 
     * default includes 
     *   ./system-polyfills.src.js,
     *   ./system.src.js
     * 
     * @type {string[]}
     * @memberOf IBundlesConfig
     */
    includes?: string[];

    /**
     * include jspm package file.
     * 
     * @type {string[]}
     * @memberOf IBundlesConfig
     */
    includePackageFiles?: string[];
    /**
     * deploy bust.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    bust?: TaskString;
    /**
     * the config to bundle jspm loader.
     * 
     * @type {IMap<IJspmMate>}
     * @memberOf BundlesConfig
     */
    jspmMates?: IMap<IJspmMate>;
    /**
     * build Config.
     * 
     * @type {IBuidlerConfig}
     * @memberOf BundlesConfig
     */
    builder?: IBuidlerConfig;
    /**
     * custom template for bundle main file.
     * 
     * @type {string}
     * @memberOf BundlesConfig
     */
    systemConfigTempl?: TaskString;

    /**
     * reset asserts css url src to relative to context dist. default 'assets'.
     * 
     * @type {Src}
     * @memberOf IBundlesConfig
     */
    resetAsserts?: Src;

    /**
     * bundle folder.
     * 
     * @type {string}
     * @memberOf IBundlesConfig
     */
    bundleFolder?: TaskString;
    /**
     * bundle group config, if not set will bundle all.
     * 
     * @type {(IMap<IBundleGroup> | ((ctx: IJspmTaskConfig) => IMap<IBundleGroup>)}
     * @memberOf BundlesConfig
     */
    bundles?: IMap<IBundleGroup> | ((ctx: ITaskContext) => IMap<IBundleGroup> | Promise<IMap<IBundleGroup>>);

    /**
     * set task to bundle jspm dependencies or not.
     * 
     * 
     * @memberOf IBundlesConfig
     */
    bundleDeps?: boolean | IMap<IBundleGroup> | ((ctx: ITaskContext, dependencies: string[]) => IMap<IBundleGroup> | Promise<IMap<IBundleGroup>>);

    /**
     * bundle jspm dependencies exclude items.
     * 
     * 
     * @memberOf IBundlesConfig
     */
    depsExclude?: string[] | ((ctx: ITaskContext, dependencies: string[]) => string[]);

}

/**
 * bundle map.
 * 
 * @export
 * @interface IBundleMap
 */
export interface IBundleMap {
    /**
     * bundle path.
     * 
     * @type {string}
     * @memberOf IBundleMap
     */
    path: string;
    /**
     * bundle modules.
     * 
     * @type {Src}
     * @memberOf IBundleMap
     */
    modules: Src;

    /**
     * sfx builder or not.
     * 
     * @type {boolean}
     * @memberOf IBundleMap
     */
    sfx?: boolean;
    /**
     * bundle name.
     * 
     * @type {string}
     * @memberOf IBundleMap
     */
    bundleName?: string;

    /**
     * bundle file name.
     * 
     * @type {string}
     * @memberOf IBundleMap
     */
    filename?: string;

    /**
     * bundle dest.
     * 
     * @type {string}
     * @memberOf IBundleMap
     */
    bundleDest?: string;
}

/**
 * bundle transform.
 * 
 * @export
 * @interface IBundleTransform
 */
export interface IBundleTransform {
    /**
     * bundle info.
     * 
     * @type {IBundleMap}
     * @memberOf IBundleTransform
     */
    bundle: IBundleMap;
    /**
     * bundle stream.
     * 
     * @type {ITransform}
     * @memberOf IBundleTransform
     */
    stream: ITransform;
}

// /**
//  * jspm task option.
//  * 
//  * @export
//  * @interface IJspmTaskOption
//  * @extends {ITaskOption}
//  */
// export interface ITaskContext extends ITaskContext {
//     option: IBundlesConfig
// }

/**
 * jspm build config.
 * 
 * @export
 * @interface IBuidlerConfig
 */
export interface IBuidlerConfig {
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

/**
 * bundle group config.
 * 
 * @export
 * @interface IBundleGroup
 */
export interface IBundleGroup {
    /**
     * Whether to bundle this group.
     */
    bundle?: boolean;

    /**
     * compile to es5.
     * 
     * @type {boolean}
     * @memberOf IBundleGroup
     */
    toES5?: boolean;
    /**
     *  Combine items together via addition.
     */
    combine: boolean;
    /**
     * Exclude groups or packages via subtraction.
     */
    exclude?: string[];
    /**
     * the items to bundle to this group.
     * 
     * @type {(string[] | Map<string, string>)}
     * @memberOf IBundleGroup
     */
    items: string[] | IMap<string>;
    /**
     * bundle config.
     * 
     * @type {IBuidlerConfig}
     * @memberOf IBundleGroup
     */
    builder?: IBuidlerConfig;
}

/**
 * jspm builder.
 *
 * @export
 * @class JSPMBuilder
 */
export interface IBuilder {
    /**
     * bundle all
     * 
     * @param {string} name
     * @param {(string | string[])} src
     * @param {string} dest
     * @param {BundlesConfig} [bundlesConfig]
     * @returns {Promise<any>}
     * 
     * @memberOf IBuilder
     */
    bundleAll(name: string, src: string | string[], dest: string, bundlesConfig?: IBundlesConfig): Promise<any>;
    /**
     * Create group bundles using the bundle configuration. If no bundles are
     * specified, all groups will be bundles.
     *
     * Example:
     * bundler.bundle(['app', 'routes']);
     *
     * @param {Array} groups
     * @returns {Promise}
     */
    bundle(groups?: string | string[]): Promise<any>;
    /**
     * unbundle specified group
     * 
     * @param {(string | string[])} [groups]
     * @returns {Promise<any>}
     * 
     * @memberOf IBuilder
     */
    unbundle(groups?: string | string[]): Promise<any>;
}
