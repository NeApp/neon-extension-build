"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports["default"] = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _environments = _interopRequireDefault(require("./constants/environments"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function getBuildPath(environment, browser, options) {
  if (browser.local) {
    return _path["default"].join(options['build-dir'], environment.title);
  }

  return _path["default"].join(options['build-dir'], browser.title, environment.title);
}

function resolveEnvironment(environment, browser, options) {
  var buildPath = getBuildPath(environment, browser, options);
  return (0, _merge["default"])((0, _cloneDeep["default"])(environment), {
    output: {
      source: _path["default"].join(buildPath, 'source')
    },
    outputPath: _path["default"].join(buildPath, 'unpacked'),
    buildPath: buildPath,
    builderPath: _path["default"].resolve(__dirname, '../../'),
    packagePath: options['package-dir'],
    options: options,
    tasks: {},
    webpack: {
      extracted: {}
    }
  });
}

function resolve(name, browser, options) {
  if (!(0, _isNil["default"])(_environments["default"][name])) {
    return resolveEnvironment(_environments["default"][name], browser, options);
  }

  throw new Error("Invalid environment: \"".concat(name, "\""));
}

var _default = {
  resolve: resolve
};
exports["default"] = _default;