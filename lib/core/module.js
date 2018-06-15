"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.resolveMany = resolveMany;
exports.default = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _keyBy = _interopRequireDefault(require("lodash/keyBy"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _omit = _interopRequireDefault(require("lodash/omit"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _uniq = _interopRequireDefault(require("lodash/uniq"));

var _git = _interopRequireDefault(require("./git"));

var _version = _interopRequireDefault(require("./version"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _package = require("./package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
    directory: 'Destinations/'
  },
  'sources': {
    name: 'source',
    directory: 'Sources/'
  }
};

function getModulePath(basePath, name, type) {
  var path; // Find development module type directory

  path = _path.default.resolve(basePath, (type.directory || '') + name);

  if (_fsExtra.default.existsSync(path)) {
    return path;
  } // Find browser package


  if (type.name === 'package' && _fsExtra.default.existsSync(basePath, 'extension.json')) {
    return _path.default.resolve(basePath);
  } // Find installed module


  path = _path.default.resolve(basePath, 'node_modules', name);

  if (_fsExtra.default.existsSync(path)) {
    return path;
  }

  throw new Error("Unable to find \"".concat(name, "\" module"));
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
  } // Remove duplicate origins


  manifest.origins = (0, _uniq.default)(manifest.origins); // Remove duplicate permissions

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

function readModuleManifest(extension, path) {
  // Read module manifest from file
  return _fsExtra.default.readJson(_path.default.join(path, 'module.json')).then(function (data) {
    if (!(0, _isPlainObject.default)(data)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    } // Parse module manifest


    return parseModuleManifest(extension, data);
  }, function () {
    // Return default module manifest
    return parseModuleManifest(extension, {});
  });
}

function resolve(extension, path, type, name) {
  var moduleType = ModuleType[type];

  if ((0, _isNil.default)(moduleType)) {
    return Promise.reject(new Error("Unknown module type: \"".concat(type, "\"")));
  } // Build module key


  var key = name.substring(name.lastIndexOf('-') + 1);

  if (key.length < 1) {
    return Promise.reject(new Error("Invalid module name: \"".concat(name, "\"")));
  } // Build module


  var module = {
    key: key,
    type: moduleType.name,
    path: getModulePath(path, name, moduleType)
  }; // Resolve module metadata

  return Promise.resolve(module).then(function (module) {
    return (0, _package.readPackageDetails)(module.path).then(function (pkg) {
      return _objectSpread({}, module, (0, _omit.default)(pkg, ['repository']), {
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


      return _git.default.status(path, module.package.version).catch(function () {
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
      return _objectSpread({}, module, (0, _pick.default)(repository, ['branch', 'commit', 'tag', 'latestTag']), {
        // Repository
        repository: repository
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
    return readModuleManifest(extension, module.path).then(function (manifest) {
      return _objectSpread({}, module, manifest, {
        manifest: manifest
      });
    });
  }) // Resolve version
  .then(function (module) {
    return _objectSpread({}, module, _version.default.resolve(module));
  });
}

function resolveMany(path, extension) {
  // Resolve each module
  return Promise.all((0, _reduce.default)(extension.modules, function (promises, names, type) {
    promises.push(resolve(extension, path, 'tool', 'neon-extension-build')); // Add enabled modules

    (0, _forEach.default)(names, function (name) {
      promises.push(resolve(extension, path, type, name));
    });
    return promises;
  }, [])).then(function (modules) {
    return (0, _keyBy.default)(modules, 'name');
  });
}

var _default = {
  resolve: resolve,
  resolveMany: resolveMany
};
exports.default = _default;