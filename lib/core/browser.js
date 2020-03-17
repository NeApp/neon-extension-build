"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findBrowser = findBrowser;
exports.getBrowser = getBrowser;
exports.isBrowser = isBrowser;
exports.getBrowsers = getBrowsers;
exports.resolve = resolve;
exports["default"] = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _find = _interopRequireDefault(require("lodash/find"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _browsers = _interopRequireDefault(require("./constants/browsers"));

var _extension = _interopRequireDefault(require("./extension"));

var _version = _interopRequireDefault(require("./version"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Logger = _vorpal["default"].logger;

function findBrowser(basePath, browser) {
  if (_fsExtra["default"].existsSync(_path["default"].join(basePath, 'extension.json'))) {
    return {
      local: true,
      path: basePath
    };
  } // Find development package directory


  var path = _path["default"].join(basePath, 'Packages');

  if (!_fsExtra["default"].existsSync(path)) {
    throw new Error('Invalid package directory (expected development root directory, or browser package directory)');
  } // Find development package


  path = _path["default"].join(path, browser.repository);

  if (!_fsExtra["default"].existsSync(path)) {
    throw new Error("Unable to find \"".concat(browser.repository, "\" repository"));
  }

  return {
    local: false,
    path: path
  };
}

function getBrowser(name) {
  return (0, _find["default"])(_browsers["default"], function (browser) {
    return browser.name === name || browser["package"] === name;
  });
}

function isBrowser(name) {
  return !(0, _isNil["default"])(getBrowser(name));
}

function resolveFeatures(features) {
  return (0, _merge["default"])({
    contentScripts: 'static',
    permissions: 'static'
  }, features);
}

function getBrowsers(name) {
  if (name === 'all') {
    return Object.values(_browsers["default"]);
  }

  if (!(0, _isNil["default"])(_browsers["default"][name])) {
    return [_browsers["default"][name]];
  }

  throw new Error("Invalid browser: \"".concat(name, "\""));
}

function resolve(packageDir, browser) {
  Logger.info("Resolving browser \"".concat(browser.name, "\""));
  return Promise.resolve((0, _cloneDeep["default"])(browser)).then(function (browser) {
    return _objectSpread({}, browser, {}, findBrowser(packageDir, browser));
  }) // Resolve extension
  .then(function (browser) {
    return _extension["default"].resolve(packageDir, browser).then(function (extension) {
      return _objectSpread({}, browser, {
        features: resolveFeatures(extension.features),
        modules: extension.modules,
        extension: extension
      });
    });
  }) // Resolve browser version
  .then(function (browser) {
    return _objectSpread({}, browser, {}, _version["default"].resolveBrowser(browser));
  });
}

var _default = {
  getBrowsers: getBrowsers,
  resolve: resolve
};
exports["default"] = _default;