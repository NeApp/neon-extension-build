"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.LinkModules = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _keys = _interopRequireDefault(require("lodash/keys"));

var _path = _interopRequireDefault(require("path"));

var _link = _interopRequireDefault(require("../../core/link"));

var _helpers = require("../../core/helpers");

var _package = require("../../core/package");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var LinkModules = _helpers.Task.create({
  name: 'module:link',
  description: 'Link modules.'
}, function (log, browser, environment) {
  if (environment.name !== 'development') {
    return Promise.reject(new Error('Only development environments are supported'));
  } // Link module requirements


  return (0, _promise.runSequential)((0, _package.getBrowserModules)(browser), function (module) {
    return (// Link required modules
      (0, _promise.runSequential)((0, _package.orderModules)([].concat(_toConsumableArray((0, _keys["default"])(module["package"]['dependencies'])), _toConsumableArray((0, _keys["default"])(module["package"]['peerDependencies'])))), function (name) {
        if (name.indexOf('@radon-extension/') !== 0) {
          return Promise.resolve();
        }

        var key = name.replace('@radon-extension/', ''); // Retrieve dependency

        var dependency = browser.modules[key];

        if ((0, _isNil["default"])(dependency)) {
          return Promise.reject(new Error("Unknown module: ".concat(name, " (").concat(key, ")")));
        }

        log.info("[".concat(module.name, "] \"").concat(name, "\" -> \"").concat(dependency.path, "\"")); // Create link to dependency

        return _link["default"].create("".concat(module.path, "/node_modules/").concat(name), dependency.path, [_path["default"].resolve(dependency.path, '../'), "".concat(module.path, "/node_modules/")]);
      })
    );
  });
});

exports.LinkModules = LinkModules;
var _default = LinkModules;
exports["default"] = _default;