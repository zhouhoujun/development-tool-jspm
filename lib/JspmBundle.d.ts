/// <reference types="gulp" />
import { RunWay, IAssertDist, ITaskContext, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import { IJspmTaskContext, IBundlesConfig, IBundleGroup, IBundleTransform } from './config';
export declare class JspmBundle extends PipeTask {
    name: string;
    runWay: RunWay;
    private bundleMaps;
    constructor(info?: ITaskInfo);
    protected getOption(config: ITaskContext): IAssertDist;
    protected loadBuilder(ctx: ITaskContext): Promise<any>;
    private translate(trans);
    private bundleConfig;
    initBundles(ctx: IJspmTaskContext): void;
    source(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource>;
    private getRelativeSrc(src, config, toModule?);
    private toModulePath(filename);
    private initOption(ctx);
    execute(context: ITaskContext, gulp: Gulp): Promise<void>;
    setup(ctx: ITaskContext, gulp: Gulp): string | void | string[];
    protected working(source: ITransform, ctx: ITaskContext, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]): Promise<void>;
    getBundles(ctx: ITaskContext): any[];
    protected groupBundle(config: IJspmTaskContext, builder: any, name: string, bundleGp: IBundleGroup, gulp: Gulp): Promise<IBundleTransform | IBundleTransform[]>;
    private exclusionString(exclude, groups);
    private exclusionArray(exclude, groups);
    private createBundler(config, builder, bundleName, bundleStr, bundleDest, builderCfg, bundleGp?);
    private packages;
    getPackage(option: IBundlesConfig): any;
    private calcChecksums(option, bundles);
    protected updateBundleManifest(ctx: IJspmTaskContext, bundles: any[], chksums?: any): any;
    private manifestSplit;
    private writeBundleManifest(ctx, manifest, gulp);
    private getBundleManifestPath(ctx);
    private getBundleManifest(ctx);
    private getBundleShortPath(config, bundleName, bundleGp?);
    private getBundleDest(config, bundleName, bundleGp?);
}
