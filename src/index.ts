import {task, ITaskConfig, IAssertDist, Pipe, Operation, PipeTask } from 'development-core';
import { Gulp } from 'gulp';

export * from './config';
export * from './JspmBuilder';

@task({
    oper: Operation.release | Operation.deploy
})
export class JspmBundle extends PipeTask {

    name = 'pipetask1';
    pipes(config: ITaskConfig, dist: IAssertDist, gulp?: Gulp): Pipe[] {
        return [
            // () => cache('typescript'),
            // {
            //     oper: Operation.build,
            //     toTransform: ()=> sourcemaps.init(),
            // },
            // tsProject
        ]
    }

}