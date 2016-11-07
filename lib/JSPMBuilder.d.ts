import { IBundlesConfig, IBuilder } from './config';
/**
 * jspm builder.
 *
 * @export
 * @class JspmBuilder
 */
export declare class JspmBuilder implements IBuilder {
    private options;
    constructor(options: IBundlesConfig);
    bundleAll(name: string, src: string | string[], dest: string, bundlesConfig?: IBundlesConfig): Promise<any>;
    /**
     * Create bundles using the bundle configuration. If no bundles are
     * specified, all groups will be bundles.
     *
     * Example:
     * bundler.bundle(['app', 'routes']);
     *
     * @param {Array} groups
     * @returns {Promise}
     */
    bundle(groups?: string | string[]): Promise<any>;
    unbundle(groups?: string | string[]): Promise<any>;
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
