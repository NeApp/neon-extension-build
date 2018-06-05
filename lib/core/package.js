"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPackageModules = getPackageModules;
exports.readPackageDetails = readPackageDetails;
exports.default = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function getPackageModules(path) {
  return _fsExtra.default.readJson(path).then(function (pkg) {
    var match = /^neon-extension-(\w+)$/.exec(pkg.name);

    if ((0, _isNil.default)(match) || ['build', 'core', 'framework'].indexOf(match[1]) >= 0) {
      return Promise.reject(new Error("Invalid package: ".concat(pkg.name, " (expected current directory to contain a browser package)")));
    } // Find package modules


    var modules = (0, _filter.default)(Object.keys(pkg.dependencies), function (name) {
      return name.indexOf('neon-extension-') === 0 && ['neon-extension-build', 'neon-extension-core', 'neon-extension-framework'].indexOf(name) < 0;
    }); // Return ordered modules

    return ['neon-extension-framework', 'neon-extension-core'].concat(_toConsumableArray(modules));
  });
}

function parsePackageDetails(data) {
  return (0, _merge.default)({
    name: null,
    version: null,
    description: null,
    keywords: null,
    homepage: null,
    author: null,
    license: null,
    main: null,
    private: null,
    bugs: null,
    engines: null,
    repository: null,
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    bin: null,
    scripts: null
  }, data);
}

function readPackageDetails(path) {
  // Read package details from file
  return _fsExtra.default.readJson(_path.default.join(path, 'package.json')).then(function (data) {
    if (!(0, _isPlainObject.default)(data)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    } // Parse package details


    return parsePackageDetails(data);
  });
}

var _default = {
  getPackageModules: getPackageModules,
  readPackageDetails: readPackageDetails
};
exports.default = _default;