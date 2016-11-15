/// <reference types="gulp" />
import { RunWay, IAssertDist, ITaskContext, Src, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, PipeTask } from 'development-core';
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
    protected getOption(config: ITaskContext): IAssertDist;
    protected loadBuilder(ctx: ITaskContext): Promise<any>;
    source(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource>;
    private getRelativeSrc(src, config, toModule?);
    private toModulePath(filename);
    private initOption(ctx);
    execute(ctx: ITaskContext, gulp: Gulp): Promise<void>;
    setup(ctx: ITaskContext, gulp: Gulp): string | void | string[];
    protected working(source: ITransform, ctx: ITaskContext, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]): Promise<void>;
    getbundles(ctx: ITaskContext): any[];
    protected groupBundle(config: IJspmTaskConfig, builder: any, name: string, bundleGp: IBundleGroup, gulp: Gulp): Promise<ITransform | ITransform[]>;
    private exclusionString(exclude, groups);
    private exclusionArray(exclude, groups);
    private createBundler(config, builder, bundleName, bundleStr, bundleDest, builderCfg, bundleGp?);
    private packages;
    getPackage(option: IBundlesConfig): any;
    private calcChecksums(option, bundles);
    protected updateBundleManifest(option: IBundlesConfig, bundles: any[], chksums?: any): any;
    private manifestSplit;
    private writeBundleManifest(config, manifest, gulp);
    private getBundleManifestPath(option);
    private getBundleManifest(option);
    private getBundleShortPath(config, bundleName, bundleGp?);
    private getBundleDest(config, bundleName, bundleGp);
}
