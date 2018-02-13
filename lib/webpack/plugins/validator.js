"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var ValidatorPlugin =
/*#__PURE__*/
function () {
  function ValidatorPlugin(validator, browser, environment) {
    _classCallCheck(this, ValidatorPlugin);

    this.validator = validator;
    this.browser = browser;
    this.environment = environment;
  }

  _createClass(ValidatorPlugin, [{
    key: "apply",
    value: function apply(compiler) {
      var _this = this;

      compiler.plugin('compilation', function (compilation) {
        compilation.plugin('after-optimize-chunks', function (chunks) {
          // Process named chunks
          var count = 0;
          chunks.forEach(function (chunk) {
            if ((0, _isNil.default)(chunk.name)) {
              return;
            } // Process modules


            chunk.modules.forEach(function (module) {
              return _this.validator.processModule(_this.browser, _this.environment, module);
            });
            count++;
          }); // Finish module validation

          if (count > 0) {
            _this.validator.finish(_this.browser, _this.environment);
          }
        });
      });
    }
  }]);

  return ValidatorPlugin;
}();

exports.default = ValidatorPlugin;