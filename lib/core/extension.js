"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.default = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _git = _interopRequireDefault(require("./git"));

var _json = _interopRequireDefault(require("./json"));

var _travis = _interopRequireDefault(require("./travis"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _package = require("./package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var Logger = _vorpal.default.logger;

function getBuildChannel(_ref) {
  var dirty = _ref.dirty,
      tag = _ref.tag;

  if (dirty || (0, _isNil.default)(tag)) {
    return 'develop';
  }

  if (tag.indexOf('beta') >= 0) {
    return 'beta';
  }

  return 'stable';
}

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
  }, _extends({}, (0, _cloneDeep.default)(data), {
    'modules': _extends({}, (0, _cloneDeep.default)(data.modules), {
      'core': ['neon-extension-core', 'neon-extension-framework'],
      'browsers': ['neon-extension-browser-base'].concat(_toConsumableArray(data.modules.browsers)),
      'packages': [name]
    })
  }));
}

function readExtensionManifest(extension, path) {
  return Promise.resolve({}) // Read extension manifest
  .then(function (manifest) {
    return _json.default.read(_path.default.join(path, 'extension.json'), {}).then(function (data) {
      return _extends({}, manifest, data);
    });
  }) // Overlay with channel manifest
  .then(function (manifest) {
    return _json.default.read(_path.default.join(path, "extension.".concat(extension.channel, ".json")), {}).then(function (data) {
      return _extends({}, manifest, data);
    });
  }) // Parse extension manifest
  .then(function (manifest) {
    if (!(0, _isPlainObject.default)(manifest)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    }

    return parseExtensionManifest(extension.name, manifest);
  }, function () {
    return parseExtensionManifest(extension.name, {});
  });
}

function resolve(path, name) {
  return Promise.resolve({}) // Resolve package details
  .then(function (extension) {
    return (0, _package.readPackageDetails)(path).then(function (pkg) {
      if (pkg.name !== name) {
        return Promise.reject(new Error("Invalid package: ".concat(pkg.name, " (expected: ").concat(name, ")")));
      }

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
        tag: null,
        latestTag: null
      };
    }).then(function (repository) {
      return _extends({}, extension, (0, _pick.default)(repository, ['branch', 'commit', 'tag', 'latestTag']), {
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
  }) // Resolve build channel
  .then(function (extension) {
    return _extends({}, extension, {
      channel: getBuildChannel(extension)
    });
  }) // Resolve extension manifest
  .then(function (extension) {
    return readExtensionManifest(extension, path).then(function (manifest) {
      return _extends({}, extension, manifest, {
        manifest: manifest
      });
    });
  }) // Display extension details
  .then(function (extension) {
    Logger.info("".concat(_chalk.default.green(extension.name), ":"));
    Logger.info(" - ".concat(_chalk.default.cyan('Branch'), ": ").concat(extension.branch));
    Logger.info(" - ".concat(_chalk.default.cyan('Commit:'), " ").concat(extension.commit));
    Logger.info(" - ".concat(_chalk.default.cyan('Current Tag'), ": ").concat(extension.tag));
    Logger.info(" - ".concat(_chalk.default.cyan('Latest Tag'), ": ").concat(extension.latestTag));
    Logger.info(" - ".concat(_chalk.default.cyan('Channel'), ": ").concat(extension.channel));
    return extension;
  });
}

var _default = {
  resolve: resolve
};
exports.default = _default;