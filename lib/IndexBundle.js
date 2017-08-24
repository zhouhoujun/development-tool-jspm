"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var development_core_1 = require("development-core");
var htmlreplace = require("gulp-html-replace");
var url = require("url");
var IndexBundle = (function (_super) {
    __extends(IndexBundle, _super);
    function IndexBundle(info) {
        var _this = _super.call(this, info) || this;
        _this.name = 'mainindex';
        return _this;
    }
    IndexBundle.prototype.source = function (ctx, option, gulp) {
        var cfgopt = ctx.option;
        var src;
        if (cfgopt.index) {
            src = cfgopt.index;
        }
        else {
            src = 'src/index.html';
        }
        return gulp.src(ctx.toRootSrc(src));
    };
    // private packages = {};
    // public getPackage(option: IBundlesConfig): any {
    //     if (!this.packages[<string>option.packageFile]) {
    //         this.packages[<string>option.packageFile] = require(<string>option.packageFile);
    //     }
    //     return this.packages[<string>option.packageFile]
    // }
    IndexBundle.prototype.pipes = function (ctx, dist, gulp) {
        var option = ctx.option;
        var pkg = ctx.getPackage();
        var pipes = [
            function (ctx) { return htmlreplace({ 'js': url.resolve(ctx.toStr(option.baseURL) || './', ctx.toStr(option.mainfile)) + '?bust=' + (ctx.toStr(option.bust) || pkg.version) }); }
        ];
        if (option.indexPipes && option.indexPipes.length > 0) {
            pipes = pipes.concat(option.indexPipes);
        }
        return pipes; // concat(super.pipes(ctx, dist, gulp));
    };
    return IndexBundle;
}(development_core_1.PipeTask));
IndexBundle = __decorate([
    development_core_1.task({
        order: 1,
        oper: development_core_1.Operation.release | development_core_1.Operation.deploy
    }),
    __metadata("design:paramtypes", [Object])
], IndexBundle);
exports.IndexBundle = IndexBundle;

//# sourceMappingURL=sourcemaps/IndexBundle.js.map
