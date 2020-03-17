"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports["default"] = void 0;

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Logger = _vorpal["default"].logger;
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

  if (dirty || (0, _isNil["default"])(tag)) {
    return 'develop';
  }

  if (tag.indexOf('beta') >= 0) {
    return 'beta';
  }

  return 'stable';
}

function getTag(_ref2) {
  var repository = _ref2.repository,
      modules = _ref2.modules;

  if ((0, _isNil["default"])(repository.tag)) {
    return null;
  }

  for (var name in modules) {
    if (!modules.hasOwnProperty(name)) {
      continue;
    }

    if ((0, _isNil["default"])(modules[name].repository.tag)) {
      return null;
    }
  }

  return repository.tag;
}

function isDirty(_ref3) {
  var repository = _ref3.repository,
      modules = _ref3.modules;

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
  } // No dirty modules found


  return false;
}

function parseExtensionManifest(name, data) {
  return (0, _merge["default"])((0, _cloneDeep["default"])(BaseManifest), _objectSpread({}, (0, _cloneDeep["default"])(data), {
    'modules': _objectSpread({}, (0, _cloneDeep["default"])(data.modules), {
      'core': ['core', 'framework'],
      'packages': [name]
    })
  }));
}

function readExtensionManifest(extension, path) {
  var channel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var name = 'extension.json';

  if (!(0, _isNil["default"])(channel)) {
    name = "extension.".concat(channel, ".json");
  } // Read manifest from file


  return _json["default"].read(_path["default"].join(path, name), {}).then(function (manifest) {
    if (!(0, _isPlainObject["default"])(manifest)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    }

    return manifest;
  }, function () {
    return {};
  });
}

function getExtensionManifest(extension, path) {
  return readExtensionManifest(extension, path).then(function (manifest) {
    return parseExtensionManifest(extension.key, manifest);
  }, function () {
    return parseExtensionManifest(extension.key, {});
  });
}

function overlayExtensionManifest(extension, path) {
  return readExtensionManifest(extension, path, extension.channel).then(function (manifest) {
    if (!(0, _isNil["default"])(manifest.modules)) {
      return Promise.reject(new Error('"modules" in manifest overlays are not permitted'));
    }

    return _objectSpread({}, extension.manifest, {}, manifest);
  });
}

function getBuildManifest(path) {
  return _json["default"].read(_path["default"].join(path, 'build.json'), {}).then(function (manifest) {
    if (!(0, _isPlainObject["default"])(manifest)) {
      return Promise.reject(new Error('Expected build manifest to be a plain object'));
    }

    return manifest;
  });
}

function resolve(packageDir, browser) {
  Logger.info("Resolving extension for browser \"".concat(browser.name, "\""));
  var extension = {
    key: browser.name,
    type: 'package',
    path: browser.path
  };
  return Promise.resolve(extension) // Resolve package details
  .then(function (extension) {
    return (0, _package.readPackageDetails)(browser.path).then(function (pkg) {
      if (pkg.name !== browser["package"]) {
        return Promise.reject(new Error("Invalid package: ".concat(pkg.name, " (expected: ").concat(browser["package"], ")")));
      }

      return _objectSpread({}, extension, {}, pkg, {
        // Package
        "package": pkg
      });
    });
  }) // Resolve extension manifest
  .then(function (extension) {
    return getExtensionManifest(extension, browser.path).then(function (manifest) {
      return _objectSpread({}, extension, {}, (0, _omit["default"])(manifest, ['key']), {
        manifest: manifest
      });
    });
  }) // Resolve build manifest
  .then(function (extension) {
    return getBuildManifest(browser.path).then(function (build) {
      return _objectSpread({}, extension, {
        build: build
      });
    });
  }) // Resolve repository status
  .then(function (extension) {
    return Promise.resolve().then(function () {
      // Return repository status from the build manifest
      if (!(0, _isNil["default"])(extension.build[browser["package"]])) {
        if (!(0, _isNil["default"])(extension.build[browser["package"]].repository)) {
          return extension.build[browser["package"]].repository;
        }

        Logger.warn(_chalk["default"].yellow("[".concat((0, _padEnd["default"])(browser["package"], 40), "] No repository status available in the build manifest")));
      } // Resolve repository status


      return _git["default"].status(browser.path)["catch"](function () {
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
      Logger.debug("[".concat((0, _padEnd["default"])(browser["package"], 40), "] Repository: ").concat(_util["default"].inspect(repository)));

      if ((0, _isNil["default"])(repository.commit) && !repository.dirty) {
        return Promise.reject(new Error('Invalid repository status (no commit defined)'));
      }

      return _objectSpread({}, extension, {}, (0, _pick["default"])(repository, ['branch', 'commit', 'tag', 'latestTag']), {
        // Repository
        repository: _objectSpread({}, extension.repository || {}, {}, repository)
      });
    });
  }) // Resolve travis status
  .then(function (extension) {
    return Promise.resolve().then(function () {
      if (!(0, _isNil["default"])(extension.travis)) {
        return extension.travis;
      } // Return travis status from the build manifest


      if (!(0, _isNil["default"])(extension.build[browser["package"]])) {
        if (!(0, _isNil["default"])(extension.build[browser["package"]].travis)) {
          return extension.build[browser["package"]].travis;
        }

        Logger.warn(_chalk["default"].yellow("[".concat((0, _padEnd["default"])(browser["package"], 40), "] No travis status available in the build manifest")));
      } // Resolve travis status


      return _travis["default"].status();
    }).then(function (travis) {
      Logger.debug("[".concat((0, _padEnd["default"])(browser["package"], 40), "] Travis: ").concat(_util["default"].inspect(travis)));
      return _objectSpread({}, extension, {}, (0, _pick["default"])(travis, ['branch', 'commit', 'tag']), {
        // Travis
        travis: travis
      });
    });
  }) // Resolve modules
  .then(function (extension) {
    return _module["default"].resolveMany(packageDir, browser, extension).then(function (modules) {
      return _objectSpread({}, extension, {
        modules: modules
      });
    });
  }) // Resolve extension state
  .then(function (extension) {
    return _objectSpread({}, extension, {
      dirty: isDirty(extension),
      tag: getTag(extension)
    });
  }) // Resolve build channel
  .then(function (extension) {
    return _objectSpread({}, extension, {
      channel: getBuildChannel(extension)
    });
  }) // Resolve extension manifest overlay
  .then(function (extension) {
    return overlayExtensionManifest(extension, browser.path).then(function (manifest) {
      return _objectSpread({}, extension, {}, (0, _omit["default"])(manifest, ['key', 'modules']), {
        // Manifest
        manifest: manifest
      });
    });
  }) // Display extension details
  .then(function (extension) {
    Logger.info("\"".concat(_chalk["default"].green(extension.manifest.title), "\" [").concat(_chalk["default"].green(extension.name), "]"));
    Logger.info(" - ".concat(_chalk["default"].cyan('Branch'), ": ").concat(extension.branch));
    Logger.info(" - ".concat(_chalk["default"].cyan('Channel'), ": ").concat(extension.channel));
    Logger.info(" - ".concat(_chalk["default"].cyan('Commit:'), " ").concat(extension.commit));
    Logger.info(" - ".concat(_chalk["default"].cyan('Dirty'), ": ").concat(extension.dirty));
    Logger.info(" - ".concat(_chalk["default"].cyan('Tag / Current'), ": ").concat(extension.tag));
    Logger.info(" - ".concat(_chalk["default"].cyan('Tag / Latest'), ": ").concat(extension.latestTag));
    return extension;
  });
}

var _default = {
  resolve: resolve
};
exports["default"] = _default;