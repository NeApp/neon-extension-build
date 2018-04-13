"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readPackageDetails = readPackageDetails;
exports.default = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
  }, function () {
    // Return default package details
    return parsePackageDetails({});
  });
}

var _default = {
  readPackageDetails: readPackageDetails
};
exports.default = _default;