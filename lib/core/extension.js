"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.default = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _git = _interopRequireDefault(require("./git"));

var _travis = _interopRequireDefault(require("./travis"));

var _package = require("./package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function parseExtensionManifest(name, data) {
  return (0, _merge.default)({
    'title': data.name || null,
    'origins': [],
    'permissions': [],
    'optional_origins': [],
    'optional_permissions': [],
    'modules': {
      'destinations': [],
      'sources': []
    }
  }, _extends({}, data, {
    'modules': _extends({}, data.modules, {
      'core': ['neon-extension-core', 'neon-extension-framework'],
      'browsers': ['neon-extension-browser-base'].concat(_toConsumableArray(data.modules.browsers)),
      'packages': [name]
    })
  }));
}

function readExtensionManifest(path, name) {
  // Read extension manifest from file
  return _fsExtra.default.readJson(_path.default.join(path, 'extension.json')).then(function (data) {
    if (!(0, _isPlainObject.default)(data)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    } // Parse extension manifest


    return parseExtensionManifest(name, data);
  }, function () {
    // Return default extension manifest
    return parseExtensionManifest(name, {});
  });
}

function resolve(path, name) {
  return Promise.resolve({}) // Resolve package details
  .then(function (extension) {
    return (0, _package.readPackageDetails)(path).then(function (pkg) {
      return _extends({}, extension, pkg, {
        package: pkg
      });
    });
  }) // Resolve repository status
  .then(function (extension) {
    return _git.default.status(path, extension.package.version).catch(function () {
      return {
        ahead: 0,
        dirty: false,
        branch: null,
        commit: null,
        tag: null
      };
    }).then(function (repository) {
      return _extends({}, extension, (0, _pick.default)(repository, ['branch', 'commit', 'tag']), {
        // Include repository status
        repository: repository
      });
    });
  }) // Resolve travis status
  .then(function (extension) {
    return Promise.resolve(_travis.default.status()).then(function (travis) {
      return _extends({}, extension, (0, _pick.default)(travis, ['branch', 'commit', 'tag']), {
        // Include travis status
        travis: travis
      });
    });
  }) // Resolve extension manifest
  .then(function (extension) {
    return readExtensionManifest(path, name).then(function (manifest) {
      return _extends({}, extension, manifest, {
        manifest: manifest
      });
    });
  });
}

var _default = {
  resolve: resolve
};
exports.default = _default;