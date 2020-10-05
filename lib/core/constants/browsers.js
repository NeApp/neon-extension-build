"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var BaseBrowser = {
  name: null,
  title: null,
  "package": null,
  includeVersionName: false,
  webpack: {
    common: ['whatwg-fetch']
  }
};

var ChromeBrowser = _objectSpread(_objectSpread({}, (0, _cloneDeep["default"])(BaseBrowser)), {}, {
  name: 'chrome',
  title: 'Chrome',
  "package": '@radon-extension/chrome',
  repository: 'radon-extension-chrome',
  includeVersionName: true
});

var FirefoxBrowser = _objectSpread(_objectSpread({}, (0, _cloneDeep["default"])(BaseBrowser)), {}, {
  name: 'firefox',
  title: 'Firefox',
  "package": '@radon-extension/firefox',
  repository: 'radon-extension-firefox'
});

var OperaBrowser = _objectSpread(_objectSpread({}, (0, _cloneDeep["default"])(BaseBrowser)), {}, {
  name: 'opera',
  title: 'Opera',
  "package": '@radon-extension/opera',
  repository: 'radon-extension-opera',
  includeVersionName: true
});

var _default = {
  chrome: ChromeBrowser,
  firefox: FirefoxBrowser,
  opera: OperaBrowser
};
exports["default"] = _default;