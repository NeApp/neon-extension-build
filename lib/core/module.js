"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createOriginRegExp = createOriginRegExp;
exports.isOriginMatch = isOriginMatch;
exports.getUniqueOrigins = getUniqueOrigins;
exports.resolve = resolve;
exports.resolveMany = resolveMany;
exports.default = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _find = _interopRequireDefault(require("lodash/find"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _keyBy = _interopRequireDefault(require("lodash/keyBy"));

var _map = _interopRequireDefault(require("lodash/map"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _omit = _interopRequireDefault(require("lodash/omit"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _remove = _interopRequireDefault(require("lodash/remove"));

var _uniq = _interopRequireDefault(require("lodash/uniq"));

var _util = _interopRequireDefault(require("util"));

var _git = _interopRequireDefault(require("./git"));

var _json = _interopRequireDefault(require("./json"));

var _version = _interopRequireDefault(require("./version"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _package = require("./package");

var _promise = require("./helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Logger = _vorpal.default.logger;
var ModuleType = {
  'core': {
    name: 'core'
  },
  'tool': {
    name: 'tool',
    directory: 'Tools/'
  },
  'packages': {
    name: 'package',
    directory: 'Packages/'
  },
  'destinations': {
    name: 'destination',
    directory: 'Plugins/',
    prefix: 'plugin'
  },
  'sources': {
    name: 'source',
    directory: 'Plugins/',
    prefix: 'plugin'
  }
};

function getModulePath(basePath, repository, type) {
  var path; // Find development module type directory

  path = _path.default.resolve(basePath, (type.directory || '') + repository);

  if (_fsExtra.default.existsSync(path)) {
    return path;
  } // Find browser package


  if (type.name === 'package' && _fsExtra.default.existsSync(basePath, 'extension.json')) {
    return _path.default.resolve(basePath);
  } // Find installed module


  path = _path.default.resolve(basePath, 'node_modules', repository);

  if (_fsExtra.default.existsSync(path)) {
    return path;
  }

  throw new Error("Unable to find \"".concat(repository, "\" module"));
}

function readContributors(path) {
  // Read contributors from file
  return _fsExtra.default.readJson(_path.default.join(path, 'contributors.json')).then(function (data) {
    if (!Array.isArray(data)) {
      return Promise.reject(new Error('Expected contributors to be an array'));
    }

    return data;
  }, function () {
    return [];
  });
}

function getContentScriptOrigins(contentScripts) {
  return (0, _reduce.default)(contentScripts, function (result, contentScript) {
    (0, _forEach.default)(contentScript.matches, function (origin) {
      if ((0, _isNil.default)(origin)) {
        throw new Error("Invalid content script origin: ".concat(origin));
      } // Include origin in result


      result.push(origin);
    });
    return result;
  }, []);
}

function createOriginRegExp(pattern) {
  // Escape regular expression tokens (except `*`)
  pattern = pattern.replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, '\\$&'); // Replace `*` with `.*`

  pattern = pattern.replace(/\*/g, '.*'); // Create regular expression

  return new RegExp(pattern);
}

function isOriginMatch(pattern, subject) {
  if (pattern === subject) {
    return true;
  } // Create regular expression from `pattern`


  var re;

  try {
    re = createOriginRegExp(pattern);
  } catch (e) {
    throw new Error("Unable to parse origin: ".concat(pattern));
  } // Check if regular expression matches `subject`


  return !(0, _isNil.default)(re.exec(subject));
}

function getUniqueOrigins(origins) {
  // Remove duplicate origins
  origins = (0, _uniq.default)(origins); // Remove matching origins

  (0, _remove.default)(origins, function (subject) {
    return !(0, _isNil.default)((0, _find.default)(origins, function (pattern) {
      if (pattern === subject) {
        return false;
      }

      return isOriginMatch(pattern, subject);
    }));
  });
  return origins;
}

function parseModuleManifest(extension, data) {
  var manifest = (0, _merge.default)({
    'title': data.name || null,
    'icons': {},
    'content_scripts': [],
    'web_accessible_resources': [],
    'origins': [],
    'permissions': [],
    'optional_origins': [],
    'optional_permissions': [],
    'webpack': {
      'alias': [],
      'babel': [],
      'modules': {}
    }
  }, data); // Include content script origins

  if (extension.features.contentScripts === 'dynamic') {
    manifest['origins'] = manifest['origins'].concat(getContentScriptOrigins(manifest['content_scripts']));
  } // Retrieve unique origins


  manifest.origins = getUniqueOrigins(manifest.origins); // Remove duplicate permissions

  manifest.permissions = (0, _uniq.default)(manifest.permissions); // Parse webpack modules

  manifest.webpack.modules = (0, _mapValues.default)(manifest.webpack.modules, function (value, name) {
    var options = {};

    if (Array.isArray(value)) {
      options = {
        modules: value
      };
    } else if ((0, _isPlainObject.default)(value)) {
      options = value;
    }

    return _objectSpread({
      entry: false,
      modules: [name]
    }, options);
  });
  return manifest;
}

function readModuleManifest(path) {
  var browser = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var name = 'module.json';

  if (!(0, _isNil.default)(browser)) {
    name = "module.".concat(browser, ".json");
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

function getModuleManifest(extension, module) {
  return readModuleManifest(module.path).then(function (manifest) {
    return parseModuleManifest(extension, manifest);
  }, function () {
    return parseModuleManifest(extension, {});
  });
}

function overlayModuleManifest(module, browser) {
  return readModuleManifest(module.path, browser).then(function (manifest) {
    return _objectSpread({}, module.manifest, manifest);
  });
}

function resolve(browser, extension, path, type, name) {
  var moduleType = ModuleType[type];

  if ((0, _isNil.default)(moduleType)) {
    return Promise.reject(new Error("Unknown module type: \"".concat(type, "\"")));
  } // Build key


  var key = name;

  if (!(0, _isNil.default)(moduleType.prefix)) {
    key = "".concat(moduleType.prefix, "-").concat(key);
  } // Build repository name


  var repository = "radon-extension-".concat(key); // Resolve module metadata

  Logger.info("Resolving module \"".concat(name, "\" (").concat(repository, ")"));
  var module = {
    key: name,
    type: moduleType.name,
    path: getModulePath(path, repository, moduleType)
  };
  return Promise.resolve(module).then(function (module) {
    return (0, _package.readPackageDetails)(module.path).then(function (pkg) {
      return _objectSpread({}, module, pkg, {
        // Package
        package: pkg
      });
    });
  }) // Resolve repository status
  .then(function (module) {
    return Promise.resolve().then(function () {
      if (module.type === 'package') {
        return extension.repository;
      } // Return repository status from the build manifest


      if (!(0, _isNil.default)(extension.build[module.name])) {
        if (!(0, _isNil.default)(extension.build[module.name].repository)) {
          return extension.build[module.name].repository;
        }

        Logger.warn(_chalk.default.yellow("[".concat((0, _padEnd.default)(module.name, 40), "] No repository status available in the build manifest")));
      } // Find repository


      var path = _path.default.join(extension.path, '.modules', module.name);

      if (!_fsExtra.default.existsSync(path)) {
        path = module.path;
      } // Resolve repository status


      return _git.default.status(path).catch(function () {
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
        return Promise.reject(new Error('Invalid repository status (no commit defined)'));
      }

      return _objectSpread({}, module, (0, _pick.default)(repository, ['branch', 'commit', 'tag', 'latestTag']), {
        // Repository
        repository: _objectSpread({}, module.repository || {}, repository)
      });
    });
  }) // Resolve travis status (for package modules)
  .then(function (module) {
    if (module.type !== 'package') {
      return module;
    }

    return _objectSpread({}, module, (0, _pick.default)(extension.travis, ['branch', 'commit', 'tag']), {
      // Travis
      travis: extension.travis
    });
  }) // Resolve contributors
  .then(function (module) {
    return readContributors(module.path).then(function (contributors) {
      return _objectSpread({}, module, {
        contributors: contributors
      });
    });
  }) // Resolve module manifest
  .then(function (module) {
    return getModuleManifest(extension, module).then(function (manifest) {
      return _objectSpread({}, module, manifest, {
        manifest: manifest
      });
    });
  }) // Resolve version
  .then(function (module) {
    return _objectSpread({}, module, _version.default.resolve(module));
  }) // Resolve module manifest overlay
  .then(function (module) {
    return overlayModuleManifest(module, browser.name).then(function (manifest) {
      return _objectSpread({}, module, manifest, {
        // Manifest
        manifest: manifest
      });
    });
  });
}

function resolveMany(path, browser, extension) {
  Logger.info("Resolving modules for \"".concat(browser.name, "\"")); // Resolve each module sequentially

  return (0, _promise.runSequential)((0, _reduce.default)(extension.modules, function (modules, names, type) {
    modules.push.apply(modules, _toConsumableArray((0, _map.default)(names, function (name) {
      return {
        type: type,
        name: name
      };
    })));
    return modules;
  }, [{
    type: 'tool',
    name: 'build'
  }]), function (_ref) {
    var type = _ref.type,
        name = _ref.name;
    return resolve(browser, extension, path, type, name);
  }).then(function (modules) {
    return (0, _keyBy.default)(modules, function (module) {
      if (['destination', 'source'].indexOf(module.type) >= 0) {
        return "".concat(module.type, "-").concat(module.key);
      }

      return module.key;
    });
  });
}

var _default = {
  resolve: resolve,
  resolveMany: resolveMany
};
exports.default = _default;