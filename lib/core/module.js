"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.resolveMany = resolveMany;
exports.default = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _keyBy = _interopRequireDefault(require("lodash/keyBy"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _git = _interopRequireDefault(require("./git"));

var _version = _interopRequireDefault(require("./version"));

var _package = require("./package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var ModuleType = {
  'core': {
    name: 'core'
  },
  'browsers': {
    name: 'browser',
    directory: 'Browsers/'
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

function getModulePath(basePath, directory, name) {
  var path; // Find development module type directory

  path = _path.default.join(basePath, directory, name);

  if (_fsExtra.default.existsSync(path)) {
    return path;
  } // Find installed module


  path = _path.default.join(basePath, 'node_modules', name);

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

function parseModuleManifest(data) {
  return (0, _merge.default)({
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
      'chunks': [],
      'modules': []
    }
  }, data);
}

function readModuleManifest(path) {
  // Read module manifest from file
  return _fsExtra.default.readJson(_path.default.join(path, 'module.json')).then(function (data) {
    if (!(0, _isPlainObject.default)(data)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    } // Parse module manifest


    return parseModuleManifest(data);
  }, function () {
    // Return default module manifest
    return parseModuleManifest({});
  });
}

function resolve(path, type, name) {
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
    path: getModulePath(path, moduleType.directory, name)
  }; // Resolve module metadata

  return Promise.resolve(module).then(function (module) {
    return (0, _package.readPackageDetails)(module.path).then(function (pkg) {
      return _extends({}, module, pkg, {
        package: pkg
      });
    });
  }) // Resolve repository status
  .then(function (module) {
    return _git.default.status(module.path, module.package.version).catch(function () {
      return {
        ahead: 0,
        dirty: false,
        branch: null,
        commit: null,
        tag: null
      };
    }).then(function (repository) {
      return _extends({}, module, (0, _pick.default)(repository, ['branch', 'commit', 'tag']), {
        repository: repository
      });
    });
  }) // Resolve contributors
  .then(function (module) {
    return readContributors(module.path).then(function (contributors) {
      return _extends({}, module, {
        contributors: contributors
      });
    });
  }) // Resolve module manifest
  .then(function (module) {
    return readModuleManifest(module.path).then(function (manifest) {
      return _extends({}, module, manifest, {
        manifest: manifest
      });
    });
  }) // Resolve version
  .then(function (module) {
    return _extends({}, module, _version.default.resolve(module));
  });
}

function resolveMany(path, modules) {
  // Resolve each module
  return Promise.all((0, _reduce.default)(modules, function (promises, names, type) {
    (0, _forEach.default)(names, function (name) {
      promises.push(resolve(path, type, name));
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