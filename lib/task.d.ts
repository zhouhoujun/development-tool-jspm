/// <reference types="gulp" />
import { ITaskConfig, RunWay, IAssertDist, Src, ITaskInfo, TransformSource, ITransform, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import { IJspmTaskConfig, IBundlesConfig, IBundleGroup } from './config';
export interface IBundleMap {
    path: string;
    modules: Src;
}
export declare class JspmBundle extends PipeTask {
    name: string;
    runWay: RunWay;
    private bundles;
    constructor(info?: ITaskInfo);
    protected getOption(config: ITaskConfig): IAssertDist;
    protected loadBuilder(config: ITaskConfig): Promise<any>;
    sourceStream(config: ITaskConfig, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource>;
    execute(config: ITaskConfig, gulp: Gulp): Promise<void>;
    protected working(source: ITransform, config: ITaskConfig, option: IAssertDist, gulp: Gulp): Promise<IBundleMap>;
    getbundles(config: ITaskConfig): string[];
    protected groupBundle(config: IJspmTaskConfig, name: string, bundleOpts: IBundleGroup, gulp: Gulp): Promise<any>;
    private exclusionString(exclude, groups);
    private exclusionArray(exclude, groups);
    private createBundler(config, builder, bundleName, bundleStr, bundleDest, bundleOpts, gulp);
    private calcChecksums(option, bundles);
    protected updateBundleManifest(option: IBundlesConfig, bundles: any[], chksums?: any): Promise<any>;
    protected removeFromBundleManifest(option: IBundlesConfig, bundles: any): Promise<any>;
    private manifestSplit;
    private writeBundleManifest(option, manifest);
    private getBundleManifestPath(option);
    private getBundleManifest(option);
    private getBundleShortPath(config, bundleName, bundleOpts);
    private getBundleDest(config, bundleName, bundleOpts);
}
