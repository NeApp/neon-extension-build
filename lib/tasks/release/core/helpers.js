"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPackages = getPackages;

var _pickBy = _interopRequireDefault(require("lodash/pickBy"));

var _values = _interopRequireDefault(require("lodash/values"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function getPackages(browser) {
  return [browser.modules['neon-extension-build'], // Core
  browser.modules['neon-extension-framework'], browser.modules['neon-extension-core']].concat(_toConsumableArray((0, _values.default)((0, _pickBy.default)(browser.modules, function (module) {
    return ['core', 'tool', 'package'].indexOf(module.type) < 0;
  }))), [// Extension
  browser.extension]);
}