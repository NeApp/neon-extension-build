"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var BaseBrowser = {
  name: null,
  title: null,
  package: null,
  includeVersionName: false,
  webpack: {
    common: ['whatwg-fetch']
  }
};

var ChromeBrowser = _objectSpread({}, (0, _cloneDeep.default)(BaseBrowser), {
  name: 'chrome',
  title: 'Chrome',
  package: 'neon-extension-chrome',
  includeVersionName: true
});

var FirefoxBrowser = _objectSpread({}, (0, _cloneDeep.default)(BaseBrowser), {
  name: 'firefox',
  title: 'Firefox',
  package: 'neon-extension-firefox'
});

var OperaBrowser = _objectSpread({}, (0, _cloneDeep.default)(BaseBrowser), {
  name: 'opera',
  title: 'Opera',
  package: 'neon-extension-opera',
  includeVersionName: true
});

var _default = {
  chrome: ChromeBrowser,
  firefox: FirefoxBrowser,
  opera: OperaBrowser
};
exports.default = _default;