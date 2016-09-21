export interface IMap<T> {
    [K: string]: T;
}
export interface JspmMate {
    loader: string;
}
export interface BundlesConfig {
    root?: string;
    baseURL?: string;
    baseUri?: string;
    jspmConfig?: string;
    dest?: string;
    file?: string;
    bust?: boolean | string;
    version?: string;
    jspmMetas?: IMap<JspmMate>;
    builder?: BuidlerConfig;
    systemConfigTempl?: string;
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
    bundle: boolean;
    toES5?: boolean;
    combine: boolean;
    exclude: string[];
    items: string[] | IMap<string>;
    builder: BuidlerConfig;
}
export declare class JSPMBuilder {
    private options;
    constructor(options: BundlesConfig);
    bundleAll(name: string, src: string | string[], dest: string, bundlesConfig?: BundlesConfig): Promise<any>;
    bundle(groups: string | string[]): Promise<any>;
    unbundle(groups: string | string[]): Promise<any>;
    groupBundle(name: string): Promise<any>;
    private exclusionString(exclude, groups);
    private exclusionArray(exclude, groups);
    private createBundler(builder, bundleName, bundleStr, bundleDest, bundleOpts);
    private calcChecksums(bundles);
    protected updateBundleManifest(bundles: any[], chksums?: any): Promise<any>;
    protected removeFromBundleManifest(bundles: any): Promise<any>;
    private manifestSplit;
    private writeBundleManifest(manifest);
    private getBundleManifestPath();
    private getBundleManifest();
    private getBundleOpts(name);
    private getBundleShortPath(bundleName, bundleOpts);
    private getBundleDest(bundleName, bundleOpts);
}
