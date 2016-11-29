/// <reference types="gulp" />
import { IMap, RunWay, IAssertDist, ITaskContext, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import { IBundleGroup, IBuidlerConfig, IBundleTransform } from './config';
export declare class JspmBundle extends PipeTask {
    name: string;
    runWay: RunWay;
    private bundleMaps;
    constructor(info?: ITaskInfo);
    protected getOption(config: ITaskContext): IAssertDist;
    protected loadBuilder(ctx: ITaskContext): Promise<any>;
    private translate(trans);
    private bundleConfig;
    initBundles(ctx: ITaskContext): Promise<IMap<IBundleGroup>>;
    source(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource>;
    private getRelativeSrc(ctx, src, toModule?);
    private toModulePath(filename);
    private initOption(ctx);
    getBuildConfig(ctx: ITaskContext): IBuidlerConfig;
    execute(context: ITaskContext, gulp: Gulp): Promise<void>;
    setup(ctx: ITaskContext, gulp: Gulp): string | void | string[];
    protected working(source: ITransform, ctx: ITaskContext, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]): Promise<void>;
    getBundles(ctx: ITaskContext): any[];
    protected groupBundle(config: ITaskContext, builder: any, name: string, bundleGp: IBundleGroup, gulp: Gulp): Promise<IBundleTransform | IBundleTransform[]>;
    private exclusionString(exclude, groups);
    private exclusionArray(exclude, groups);
    private createBundler(config, builder, bundleName, bundleStr, bundleDest, builderCfg, bundleGp?);
    private calcChecksums(option, bundles);
    protected updateBundleManifest(ctx: ITaskContext, bundles: any[], chksums?: any): any;
    private manifestSplit;
    private writeBundleManifest(ctx, manifest, gulp);
    private getBundleManifestPath(ctx);
    private getBundleManifest(ctx);
    private getBundleShortPath(ctx, bundleName, bundleGp?);
    private getBundleDest(ctx, bundleName, bundleGp?);
}
