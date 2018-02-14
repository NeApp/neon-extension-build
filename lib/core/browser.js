"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.default = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _browsers = _interopRequireDefault(require("./constants/browsers"));

var _extension = _interopRequireDefault(require("./extension"));

var _module = _interopRequireDefault(require("./module"));

var _version = _interopRequireDefault(require("./version"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function findBrowser(basePath, browser) {
  if (_fsExtra.default.existsSync(_path.default.join(basePath, 'extension.json'))) {
    return {
      local: true,
      path: basePath
    };
  } // Find development package directory


  var path = _path.default.join(basePath, 'Packages');

  if (!_fsExtra.default.existsSync(path)) {
    throw new Error('Invalid package directory (expected development root directory, or browser package directory)');
  } // Find development package


  path = _path.default.join(path, browser.package);

  if (!_fsExtra.default.existsSync(path)) {
    throw new Error("Unable to find \"".concat(browser.name, "\" browser package"));
  }

  return {
    local: false,
    path: path
  };
}

function resolveBrowser(packageDir, browser) {
  return Promise.resolve((0, _cloneDeep.default)(browser)).then(function (browser) {
    return _extends({}, browser, findBrowser(packageDir, browser));
  }) // Resolve extension
  .then(function (browser) {
    return _extension.default.resolve(browser.path, browser.package).then(function (extension) {
      return _extends({}, browser, {
        extension: extension
      });
    });
  }) // Resolve modules
  .then(function (browser) {
    return _module.default.resolveMany(packageDir, browser.extension.modules).then(function (modules) {
      return _extends({}, browser, {
        modules: modules
      });
    });
  }) // Retrieve supported browser features
  .then(function (browser) {
    return _extends({}, browser, {
      supports: browser.modules["neon-extension-browser-".concat(browser.name)].browser
    });
  }) // Resolve browser version
  .then(function (browser) {
    return _extends({}, browser, _version.default.resolveBrowser(browser));
  });
}

function resolve(packageDir, name) {
  var browsers;

  if (name === 'all') {
    browsers = Object.values(_browsers.default);
  } else if (!(0, _isNil.default)(_browsers.default[name])) {
    browsers = [_browsers.default[name]];
  } else {
    throw new Error("Invalid browser: \"".concat(name, "\""));
  } // Resolve browsers


  return Promise.all(browsers.map(function (browser) {
    return resolveBrowser(packageDir, browser);
  }));
}

var _default = {
  resolve: resolve
};
exports.default = _default;