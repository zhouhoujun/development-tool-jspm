import * as _ from 'lodash';
import { task, Src, ITaskContext, IAssertDist, Pipe, ITaskInfo, TransformSource, Operation, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import * as htmlreplace from 'gulp-html-replace';
import { IBundlesConfig } from './config';
import * as url from 'url';

@task({
    order: 1,
    oper: Operation.release | Operation.deploy
})
export class IndexBundle extends PipeTask {

    constructor(info?: ITaskInfo) {
        super(info);
        this.name = 'mainindex';
    }

    source(ctx: ITaskContext, option: IAssertDist, gulp: Gulp): TransformSource | Promise<TransformSource> {
        let cfgopt = <IBundlesConfig>ctx.option;
        let src: Src;
        if (cfgopt.index) {
            src = cfgopt.index;
        } else {
            src = 'src/index.html';
        }
        return gulp.src(ctx.toRootSrc(src));
    }

    // private packages = {};
    // public getPackage(option: IBundlesConfig): any {
    //     if (!this.packages[<string>option.packageFile]) {
    //         this.packages[<string>option.packageFile] = require(<string>option.packageFile);
    //     }
    //     return this.packages[<string>option.packageFile]
    // }

    pipes(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): Pipe[] {
        let option = <IBundlesConfig>ctx.option;
        let pkg = ctx.getPackage()
        let pipes = <Pipe[]>[
            (ctx: ITaskContext) => htmlreplace({ 'js': url.resolve(ctx.toStr(option.baseURL) || './', ctx.toStr(option.mainfile)) + '?bust=' + (ctx.toStr(option.bust) || pkg.version) })
        ];

        if (option.indexPipes && option.indexPipes.length > 0) {
            pipes = pipes.concat(option.indexPipes);
        }

        return pipes; // concat(super.pipes(ctx, dist, gulp));
    }
}
