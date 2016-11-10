import * as mocha from 'mocha';
import { expect, assert } from 'chai';
import { Operation, IDirLoaderOption, ITask, bindingConfig, runTaskSequence, ITaskConfig, IDynamicLoaderOption } from 'development-core';

import * as gulp from 'gulp';
import { IBundlesConfig, JspmBundle } from '../src';

const del = require('del');
let root: string = __dirname;

import * as path from 'path';

describe('Jspm bundle task', () => {


    it('jspm bundle all', async () => {
        await del(path.join(root, 'dis'));
        let cfg = bindingConfig({
            env: { root: path.join(root, 'app'), release: true },
            option: <IBundlesConfig>{
                baseURL: '',
                mainfile: 'bundle.js',
                jspmConfig: 'development/jspm-config/config.js',
                src: 'development/app',
                dist: 'bundles'
             }
        });
        // expect(fs.existsSync(path.resolve(root, './app/test.html'))).eq(true);

        let tasks: ITask[] = await cfg.findTasks(JspmBundle);
        expect(tasks).to.not.null;
        expect(tasks.length).eq(1);

        await runTaskSequence(gulp, tasks, cfg);

    });

})
