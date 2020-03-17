"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPackages = getPackages;

var _pickBy = _interopRequireDefault(require("lodash/pickBy"));

var _values = _interopRequireDefault(require("lodash/values"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function getPackages(browser) {
  return [browser.modules['build'], // Core
  browser.modules['framework'], browser.modules['core']].concat(_toConsumableArray((0, _values["default"])((0, _pickBy["default"])(browser.modules, function (module) {
    return ['core', 'tool', 'package'].indexOf(module.type) < 0;
  }))), [// Extension
  browser.extension]);
}