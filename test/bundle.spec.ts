import * as mocha from 'mocha';
import { expect, assert } from 'chai';
import { Operation, IDirLoaderOption, ITask, ITaskConfig, IDynamicLoaderOption } from 'development-core';

import { JspmBuilder, IBuilder, IBundleGroup } from '../src';
let root = __dirname;
import * as path from 'path';

describe('JspmBuilder', () => {

    let factory: (confg: IBundleGroup) => IBuilder;

    beforeEach(() => {
        factory = (option: IBundleGroup) => new JspmBuilder(option);
    })

    it('create dynamic loader', async function () {

        // let taskconfig: ITaskConfig = factory({
        //     root: path.join(config.dirname, config.dest),
        //     baseURL: config.option.baseURL, // path.join(config.dirname, config.dest, config.option.baseURL),
        //     baseUri: config.option.env.aspnet ? config.option.aspnetRoot : config.option.root,
        //     dest: config.option.production.bundleDest,
        //     file: config.option.production.bundleMain,
        //     jspmConfig: config.option.jspmConfigFile,
        //     bust: config.option.production.bust,
        //     version: version,
        //     jspmMetas: config.option.production.jspmMates,
        //     builder: {
        //         minify: true,
        //         mangle: true,
        //         sourceMaps: false,
        //         separateCSS: config.option.production.separateCSS,
        //         lowResSourceMaps: config.option.production.lowResSourceMaps,
        //         config: {
        //             paths: getPaths(config),
        //             rootURL: config.js.dest
        //         }
        //     }
        // })

        // expect(taskconfig).to.not.null;
        // expect(taskconfig).to.not.undefined;
        // expect(taskconfig.env.config).to.equals('test');
        // expect(taskconfig.oper).to.eq(Operation.build);
        // expect(Array.isArray(taskconfig.option.loader)).to.false;
        // expect(Array.isArray(taskconfig.option.loader['dynamicTasks'])).to.true;

        // let tasks = await loader.load(taskconfig);
        // expect(tasks).not.null;
        // expect(tasks.length).eq(0);
    });

})
