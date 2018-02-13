"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var BaseBrowser = {
  name: null,
  package: null,
  includeVersionName: false,
  webpack: {
    common: ['whatwg-fetch']
  }
};

var ChromeBrowser = _extends({}, (0, _cloneDeep.default)(BaseBrowser), {
  name: 'chrome',
  package: 'neon-extension-chrome',
  includeVersionName: true
});

var FirefoxBrowser = _extends({}, (0, _cloneDeep.default)(BaseBrowser), {
  name: 'firefox',
  package: 'neon-extension-firefox'
});

var _default = {
  chrome: ChromeBrowser,
  firefox: FirefoxBrowser
};
exports.default = _default;