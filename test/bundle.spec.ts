import * as mocha from 'mocha';
import { expect } from 'chai';
import { ITask, bindingConfig, runTaskSequence } from 'development-core';
import * as fs from 'fs';
import * as gulp from 'gulp';
import { IBundlesConfig, JspmBundle, IBundleGroup } from '../src';
import * as path from 'path';

const ngAnnotate = require('gulp-ng-annotate');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');

const del = require('del');
let root: string = __dirname;
root = path.join(root, 'app/development');


describe('Jspm bundle task', function () {
    this.timeout(60000 * 10);

    before(async () => {
        await del(path.join(root, '../bundles'));
        await del(path.join(root, '../gbundles'));
    })

    it('jspm bundle all', async () => {

        let ctx = bindingConfig({
            env: { root: root, release: true },
            option: <IBundlesConfig>{
                baseURL: '',
                mainfile: 'bundle.js',
                // jspmConfig: 'development/jspm-config/config.js',
                src: ['app/home/**/*.js'],
                dist: '../bundles'
            }
        });
        // expect(fs.existsSync(path.resolve(root, './app/test.html'))).eq(true);

        let tasks: ITask[] = await ctx.findTasks(JspmBundle);

        expect(tasks).to.not.null;
        expect(tasks.length).eq(1);
        expect(tasks[0].getInfo().oper).eq(24); // { oper: 24, name: 'jspm-bundle' });
        expect(tasks[0].getInfo().name).eq('jspm-bundle'); // { oper: 24, name: 'jspm-bundle' });

        await runTaskSequence(gulp, tasks, ctx);

        expect(fs.existsSync(path.join(root, '../bundles', 'bundle.js'))).eq(true);

    }, 60000 * 10);


    it('jspm bundle group', async () => {

        let ctx = bindingConfig({
            env: { root: root, release: true },
            option: <IBundlesConfig>{
                baseURL: '',
                mainfile: 'bundle.js',
                bust: 'v0.1.0',
                // jspmConfig: 'development/jspm-config/config.js',
                src: ['app/home/**/*.js'],
                dist: '../gbundles',
                pipes: [
                    (ctx) => ngAnnotate(),
                    (ctx) => uglify()
                ],
                mainfilePipes: [
                    (ctx) => ngAnnotate(),
                    (ctx) => uglify()
                ],
                bundles: {
                    iapi: <IBundleGroup>{
                        combine: true,
                        bundle: true,
                        items: ['app/iapi/app', 'app/iapi/interface/index', 'app/iapi/interface/apiModule/app'],
                        exclude: []
                    },
                    app: <IBundleGroup>{
                        combine: true,
                        bundle: true,
                        items: ['app/login/login', 'app/signup/signup', 'app/home/app', 'app/home/overview/overview'],
                        exclude: ['iapi']
                    }
                }
            }
        });
        // expect(fs.existsSync(path.resolve(root, './app/test.html'))).eq(true);

        let tasks: ITask[] = await ctx.findTasks(JspmBundle);

        expect(tasks).to.not.null;
        expect(tasks.length).eq(1);
        expect(tasks[0].getInfo().oper).eq(24); // { oper: 24, name: 'jspm-bundle' });
        expect(tasks[0].getInfo().name).eq('jspm-bundle'); // { oper: 24, name: 'jspm-bundle' });

        await runTaskSequence(gulp, tasks, ctx);

        expect(fs.existsSync(path.join(root, '../bundles', 'bundle.js'))).eq(true);

    }, 60000 * 10);

})
