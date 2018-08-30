"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.LinkModules = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _keys = _interopRequireDefault(require("lodash/keys"));

var _path = _interopRequireDefault(require("path"));

var _link = _interopRequireDefault(require("../../core/link"));

var _helpers = require("../../core/helpers");

var _package = require("../../core/package");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var LinkModules = _helpers.Task.create({
  name: 'module:link',
  description: 'Link modules.'
}, function (log, browser, environment) {
  if (environment.name !== 'development') {
    return Promise.reject(new Error('Only development environments are supported'));
  } // Link module requirements


  return (0, _promise.runSequential)((0, _package.getBrowserModules)(browser), function (module) {
    return (// Link required modules
      (0, _promise.runSequential)((0, _package.orderModules)(_toConsumableArray((0, _keys.default)(module.package['dependencies'])).concat(_toConsumableArray((0, _keys.default)(module.package['peerDependencies'])))), function (name) {
        if (name.indexOf('@radon-extension/') !== 0) {
          return Promise.resolve();
        }

        var key = name.replace('@radon-extension/', ''); // Retrieve dependency

        var dependency = browser.modules[key];

        if ((0, _isNil.default)(dependency)) {
          return Promise.reject(new Error("Unknown module: ".concat(name, " (").concat(key, ")")));
        }

        log.info("[".concat(module.name, "] \"").concat(name, "\" -> \"").concat(dependency.path, "\"")); // Create link to dependency

        return _link.default.create("".concat(module.path, "/node_modules/").concat(name), dependency.path, [_path.default.resolve(dependency.path, '../'), "".concat(module.path, "/node_modules/")]);
      })
    );
  });
});

exports.LinkModules = LinkModules;
var _default = LinkModules;
exports.default = _default;