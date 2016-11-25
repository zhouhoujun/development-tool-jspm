"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if ((typeof Reflect === "undefined" ? "undefined" : _typeof(Reflect)) === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    }return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = undefined && undefined.__metadata || function (k, v) {
    if ((typeof Reflect === "undefined" ? "undefined" : _typeof(Reflect)) === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var development_core_1 = require('development-core');
var htmlreplace = require('gulp-html-replace');
var IndexBundle = function (_development_core_1$P) {
    _inherits(IndexBundle, _development_core_1$P);

    function IndexBundle(info) {
        _classCallCheck(this, IndexBundle);

        var _this = _possibleConstructorReturn(this, (IndexBundle.__proto__ || Object.getPrototypeOf(IndexBundle)).call(this, info));

        _this.name = 'mainindex';
        return _this;
    }

    _createClass(IndexBundle, [{
        key: "source",
        value: function source(ctx, option, gulp) {
            var cfgopt = ctx.option;
            return gulp.src(cfgopt.index);
        }
    }, {
        key: "pipes",
        value: function pipes(ctx, dist, gulp) {
            var pipes = [function (ctx) {
                var option = ctx.option;
                return htmlreplace({ 'js': option.mainfile + '?bust=' + option.bust });
            }];
            return pipes.concat(_get(IndexBundle.prototype.__proto__ || Object.getPrototypeOf(IndexBundle.prototype), "pipes", this).call(this, ctx, dist, gulp));
        }
    }]);

    return IndexBundle;
}(development_core_1.PipeTask);
IndexBundle = __decorate([development_core_1.task({
    order: 1,
    oper: development_core_1.Operation.release | development_core_1.Operation.deploy
}), __metadata('design:paramtypes', [Object])], IndexBundle);
exports.IndexBundle = IndexBundle;
//# sourceMappingURL=sourcemaps/IndexBundle.js.map
