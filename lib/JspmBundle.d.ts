/// <reference types="gulp" />
import { IMap, RunWay, IAssertDist, ITaskContext, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import { IBundleGroup, IBuidlerConfig, IBundleTransform } from './config';
export declare class JspmBundle extends PipeTask {
    name: string;
    runWay: RunWay;
    private bundleMaps;
    constructor(info?: ITaskInfo);
    source(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): TransformSource | Promise<TransformSource>;
    execute(context: ITaskContext, gulp: Gulp): Promise<any>;
    setup(ctx: ITaskContext, gulp: Gulp): string | void | string[];
    pipes(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): Pipe[];
    protected working(source: ITransform, ctx: ITaskContext, option: IAssertDist, gulp: Gulp, pipes?: Pipe[], output?: OutputPipe[]): Promise<void | ITransform[]>;
    protected getOption(config: ITaskContext): IAssertDist;
    protected loadBuilder(ctx: ITaskContext): Promise<any>;
    private translate(trans);
    private bundleConfig;
    protected initBundles(ctx: ITaskContext): Promise<IMap<IBundleGroup>>;
    private getRelativeSrc(ctx, src, toModule?);
    private toModulePath(filename);
    private initOption(ctx);
    protected getBuildConfig(ctx: ITaskContext): IBuidlerConfig;
    private restps;
    protected getAssertResetPipe(ctx: ITaskContext): Pipe[];
    protected getBundles(ctx: ITaskContext): any[];
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
