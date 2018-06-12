"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.orderModules = orderModules;
exports.getBrowserModules = getBrowserModules;
exports.getPackageModules = getPackageModules;
exports.readPackageDetails = readPackageDetails;
exports.default = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _without = _interopRequireDefault(require("lodash/without"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _values = _interopRequireDefault(require("lodash/values"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function orderModules(modules) {
  var result = [];
  (0, _forEach.default)(['neon-extension-build', 'neon-extension-framework', 'neon-extension-core'], function (name) {
    if (modules.indexOf(name) < 0) {
      return;
    }

    result.push(name);
  }); // Append remaining modules

  return result.concat(_without.default.apply(void 0, [modules].concat(result)));
}

function getBrowserModules(browser) {
  return [browser.modules['neon-extension-build'], browser.modules['neon-extension-framework'], browser.modules['neon-extension-core']].concat(_toConsumableArray((0, _filter.default)((0, _values.default)(browser.modules), function (module) {
    return ['neon-extension-build', 'neon-extension-framework', 'neon-extension-core'].indexOf(module.name) < 0;
  })));
}

function getPackageModules(path) {
  return _fsExtra.default.readJson(path).then(function (pkg) {
    if (pkg.name.indexOf('neon-extension-') !== 0) {
      return Promise.reject(new Error("Invalid module: ".concat(pkg.name)));
    }

    return orderModules((0, _filter.default)(_toConsumableArray(Object.keys(pkg.dependencies || {})).concat(_toConsumableArray(Object.keys(pkg.peerDependencies || {}))), function (name) {
      return name.indexOf('neon-extension-') === 0;
    }));
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
  getBrowserModules: getBrowserModules,
  getPackageModules: getPackageModules,
  orderModules: orderModules,
  readPackageDetails: readPackageDetails
};
exports.default = _default;