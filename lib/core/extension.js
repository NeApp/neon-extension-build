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

var _omit = _interopRequireDefault(require("lodash/omit"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _git = _interopRequireDefault(require("./git"));

var _json = _interopRequireDefault(require("./json"));

var _module = _interopRequireDefault(require("./module"));

var _travis = _interopRequireDefault(require("./travis"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _package = require("./package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var Logger = _vorpal.default.logger;
var BaseManifest = {
  'title': null,
  'origins': [],
  'permissions': [],
  'optional_origins': [],
  'optional_permissions': [],
  'modules': {
    'destinations': [],
    'sources': []
  }
};

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

function isDirty(_ref2) {
  var repository = _ref2.repository,
      modules = _ref2.modules;

  if (repository.dirty) {
    return true;
  }

  for (var name in modules) {
    if (!modules.hasOwnProperty(name)) {
      continue;
    }

    if (modules[name].repository.dirty) {
      return true;
    }
  }

  return false;
}

function parseManifest(name, data) {
  return (0, _merge.default)((0, _cloneDeep.default)(BaseManifest), _extends({}, (0, _cloneDeep.default)(data), {
    'modules': _extends({}, (0, _cloneDeep.default)(data.modules), {
      'core': ['neon-extension-core', 'neon-extension-framework'],
      'browsers': ['neon-extension-browser-base'].concat(_toConsumableArray(data.modules.browsers)),
      'packages': [name]
    })
  }));
}

function readManifest(extension, path) {
  var channel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var name = 'extension.json';

  if (!(0, _isNil.default)(channel)) {
    name = "extension.".concat(channel, ".json");
  } // Read manifest from file


  return _json.default.read(_path.default.join(path, name), {}).then(function (manifest) {
    if (!(0, _isPlainObject.default)(manifest)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    }

    return manifest;
  }, function () {
    return {};
  });
}

function getManifest(extension, path) {
  return readManifest(extension, path).then(function (manifest) {
    return parseManifest(extension.name, manifest);
  }, function () {
    return parseManifest(extension.name, {});
  });
}

function overlayManifest(extension, path) {
  return readManifest(extension, path, extension.channel).then(function (manifest) {
    if (!(0, _isNil.default)(manifest.modules)) {
      return Promise.reject(new Error('"modules" in manifest overlays are not permitted'));
    }

    return _extends({}, extension.manifest, manifest);
  });
}

function resolve(packageDir, path, name) {
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
  }) // Resolve extension manifest
  .then(function (extension) {
    return getManifest(extension, path).then(function (manifest) {
      return _extends({}, extension, manifest, {
        manifest: manifest
      });
    });
  }) // Resolve modules
  .then(function (extension) {
    return _module.default.resolveMany(packageDir, extension.modules).then(function (modules) {
      return _extends({}, extension, {
        modules: modules
      });
    });
  }) // Resolve extension "dirty" state
  .then(function (extension) {
    return _extends({}, extension, {
      dirty: isDirty(extension)
    });
  }) // Resolve build channel
  .then(function (extension) {
    return _extends({}, extension, {
      channel: getBuildChannel(extension)
    });
  }) // Resolve extension manifest overlay
  .then(function (extension) {
    return overlayManifest(extension, path).then(function (manifest) {
      return _extends({}, extension, (0, _omit.default)(manifest, ['modules']), {
        manifest: manifest
      });
    });
  }) // Display extension details
  .then(function (extension) {
    Logger.info("\"".concat(_chalk.default.green(extension.manifest.title), "\" [").concat(_chalk.default.green(extension.name), "]"));
    Logger.info(" - ".concat(_chalk.default.cyan('Branch'), ": ").concat(extension.branch));
    Logger.info(" - ".concat(_chalk.default.cyan('Channel'), ": ").concat(extension.channel));
    Logger.info(" - ".concat(_chalk.default.cyan('Commit:'), " ").concat(extension.commit));
    Logger.info(" - ".concat(_chalk.default.cyan('Dirty'), ": ").concat(extension.dirty));
    Logger.info(" - ".concat(_chalk.default.cyan('Tag / Current'), ": ").concat(extension.tag));
    Logger.info(" - ".concat(_chalk.default.cyan('Tag / Latest'), ": ").concat(extension.latestTag));
    return extension;
  });
}

var _default = {
  resolve: resolve
};
exports.default = _default;