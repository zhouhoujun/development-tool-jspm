import * as _ from 'lodash';
import { task, ITaskContext, IAssertDist, Pipe, ITaskInfo, TransformSource, Operation, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import * as htmlreplace from 'gulp-html-replace';

import { IBundlesConfig } from './config';

@task({
    oper: Operation.release | Operation.deploy
})
export class MainBundle extends PipeTask {

    constructor(info?: ITaskInfo) {
        super(info);
    }

    sourceStream(ctx: ITaskContext, option: IAssertDist, gulp: Gulp): TransformSource | Promise<TransformSource> {
        let cfgopt = <IBundlesConfig>ctx.option;
        return gulp.src(cfgopt.index)
    }

    pipes(ctx: ITaskContext, dist: IAssertDist, gulp?: Gulp): Pipe[] {
        let pipes = <Pipe[]>[
            (ctx: ITaskContext) => {
                let option = <IBundlesConfig>ctx.option;
                return htmlreplace({ 'js': option.mainfile + '?bust=' + option.bust });
            }
        ];

        return pipes.concat(super.pipes(ctx, dist, gulp));
    }
}
