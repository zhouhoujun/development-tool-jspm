import * as _ from 'lodash';
import { task, ITaskConfig, RunWay, IAssertDist, Src, Pipe, OutputPipe, ITaskInfo, TransformSource, ITransform, Operation, PipeTask } from 'development-core';
import { Gulp } from 'gulp';
import * as htmlreplace from 'gulp-html-replace';

import { IJspmTaskConfig, IBundlesConfig } from './config';

@task({
    oper: Operation.release | Operation.deploy
})
export class MainBundle extends PipeTask {

    constructor(info?: ITaskInfo) {
        super(info);
    }

    sourceStream(config: ITaskConfig, option: IAssertDist, gulp: Gulp): TransformSource | Promise<TransformSource> {
        let cfgopt = <IBundlesConfig>config.option;
        return gulp.src(cfgopt.index)
    }

    pipes(config: ITaskConfig, dist: IAssertDist, gulp?: Gulp): Pipe[] {
        let pipes = <Pipe[]>[
            (config: ITaskConfig) => {
                let option = <IBundlesConfig>config.option;
                return htmlreplace({'js': option.mainfile + '?bust=' + option.bust});
            }
        ];

        return  pipes.concat(super.pipes(config, dist, gulp));
    }
}
