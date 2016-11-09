import * as mocha from 'mocha';
import { expect, assert } from 'chai';
import { Operation, IDirLoaderOption, ITask, bindingConfig, runTaskSequence, ITaskConfig, IDynamicLoaderOption } from 'development-core';

import * as gulp from 'gulp';
import { IBundlesConfig, JspmBundle } from '../src';

const del = require('del');
let root: string = __dirname;

import * as path from 'path';

describe('Jspm bundle task', () => {

    // let factory: (confg: IBundleGroup) => IBuilder;

    // beforeEach(() => {
    //     factory = (option: IBundleGroup) => //new JspmBuilder(option);
    // })

    it('jspm bundle all', async () => {
        await del(path.join(root, 'dist/dev'));
        let cfg = bindingConfig({
            env: { root: root, release: true },
            option: <IBundlesConfig>{ baseURL: '', jspmConfig: 'app/development/jspm-config/config.js', src: 'app/**/*.js', dist: 'bundles' }
        });
        // expect(fs.existsSync(path.resolve(root, './app/test.html'))).eq(true);

        let tasks: ITask[] = await cfg.findTasks(JspmBundle);
        expect(tasks).to.not.null;
        expect(tasks.length).eq(1);

        await runTaskSequence(gulp, tasks, cfg);

    });

})
