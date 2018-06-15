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

var _util = _interopRequireDefault(require("util"));

var _git = _interopRequireDefault(require("./git"));

var _json = _interopRequireDefault(require("./json"));

var _module = _interopRequireDefault(require("./module"));

var _travis = _interopRequireDefault(require("./travis"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _package = require("./package");

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

function parseExtensionManifest(name, data) {
  return (0, _merge.default)((0, _cloneDeep.default)(BaseManifest), _objectSpread({}, (0, _cloneDeep.default)(data), {
    'modules': _objectSpread({}, (0, _cloneDeep.default)(data.modules), {
      'core': ['neon-extension-core', 'neon-extension-framework'],
      'packages': [name]
    })
  }));
}

function readExtensionManifest(extension, path) {
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

function getExtensionManifest(extension, path) {
  return readExtensionManifest(extension, path).then(function (manifest) {
    return parseExtensionManifest(extension.name, manifest);
  }, function () {
    return parseExtensionManifest(extension.name, {});
  });
}

function overlayExtensionManifest(extension, path) {
  return readExtensionManifest(extension, path, extension.channel).then(function (manifest) {
    if (!(0, _isNil.default)(manifest.modules)) {
      return Promise.reject(new Error('"modules" in manifest overlays are not permitted'));
    }

    return _objectSpread({}, extension.manifest, manifest);
  });
}

function getBuildManifest(path) {
  return _json.default.read(_path.default.join(path, 'build.json'), {}).then(function (manifest) {
    if (!(0, _isPlainObject.default)(manifest)) {
      return Promise.reject(new Error('Expected build manifest to be a plain object'));
    }

    return manifest;
  });
}

function resolve(packageDir, path, name) {
  return Promise.resolve({
    type: 'package',
    path: path
  }) // Resolve package details
  .then(function (extension) {
    return (0, _package.readPackageDetails)(path).then(function (pkg) {
      if (pkg.name !== name) {
        return Promise.reject(new Error("Invalid package: ".concat(pkg.name, " (expected: ").concat(name, ")")));
      }

      return _objectSpread({}, extension, (0, _omit.default)(pkg, ['repository']), {
        // Package
        package: pkg
      });
    });
  }) // Resolve extension manifest
  .then(function (extension) {
    return getExtensionManifest(extension, path).then(function (manifest) {
      return _objectSpread({}, extension, manifest, {
        manifest: manifest
      });
    });
  }) // Resolve build manifest
  .then(function (extension) {
    return getBuildManifest(path).then(function (build) {
      return _objectSpread({}, extension, {
        build: build
      });
    });
  }) // Resolve repository status
  .then(function (extension) {
    return Promise.resolve().then(function () {
      if (!(0, _isNil.default)(extension.repository)) {
        return extension.repository;
      } // Return repository status from the build manifest


      if (!(0, _isNil.default)(extension.build[name])) {
        if (!(0, _isNil.default)(extension.build[name].repository)) {
          return extension.build[name].repository;
        }

        Logger.warn(_chalk.default.yellow("[".concat((0, _padEnd.default)(name, 40), "] No repository status available in the build manifest")));
      } // Resolve repository status


      return _git.default.status(path, extension.package.version).catch(function () {
        return {
          ahead: 0,
          dirty: false,
          branch: null,
          commit: null,
          tag: null,
          latestTag: null
        };
      });
    }).then(function (repository) {
      Logger.debug("[".concat((0, _padEnd.default)(name, 40), "] Repository: ").concat(_util.default.inspect(repository)));

      if ((0, _isNil.default)(repository.commit) && !repository.dirty) {
        Logger.error(_chalk.default.red("[".concat((0, _padEnd.default)(name, 40), "] Invalid repository status (no commit defined)")));
        return Promise.reject();
      }

      return _objectSpread({}, extension, (0, _pick.default)(repository, ['branch', 'commit', 'tag', 'latestTag']), {
        // Repository
        repository: repository
      });
    });
  }) // Resolve travis status
  .then(function (extension) {
    return Promise.resolve().then(function () {
      if (!(0, _isNil.default)(extension.travis)) {
        return extension.travis;
      } // Return travis status from the build manifest


      if (!(0, _isNil.default)(extension.build[name])) {
        if (!(0, _isNil.default)(extension.build[name].travis)) {
          return extension.build[name].travis;
        }

        Logger.warn(_chalk.default.yellow("[".concat((0, _padEnd.default)(name, 40), "] No travis status available in the build manifest")));
      } // Resolve travis status


      return _travis.default.status();
    }).then(function (travis) {
      Logger.debug("[".concat((0, _padEnd.default)(name, 40), "] Travis: ").concat(_util.default.inspect(travis)));
      return _objectSpread({}, extension, (0, _pick.default)(travis, ['branch', 'commit', 'tag']), {
        // Travis
        travis: travis
      });
    });
  }) // Resolve modules
  .then(function (extension) {
    return _module.default.resolveMany(packageDir, extension).then(function (modules) {
      return _objectSpread({}, extension, {
        modules: modules
      });
    });
  }) // Resolve extension "dirty" state
  .then(function (extension) {
    return _objectSpread({}, extension, {
      dirty: isDirty(extension)
    });
  }) // Resolve build channel
  .then(function (extension) {
    return _objectSpread({}, extension, {
      channel: getBuildChannel(extension)
    });
  }) // Resolve extension manifest overlay
  .then(function (extension) {
    return overlayExtensionManifest(extension, path).then(function (manifest) {
      return _objectSpread({}, extension, (0, _omit.default)(manifest, ['modules']), {
        // Manifest
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