"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Manifest = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _map = _interopRequireDefault(require("lodash/map"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _remove = _interopRequireDefault(require("lodash/remove"));

var _uniq = _interopRequireDefault(require("lodash/uniq"));

var _clean = _interopRequireDefault(require("../clean"));

var _extension = _interopRequireDefault(require("./extension"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function getExtensionManifest(browser) {
  var permissions = _toConsumableArray(browser.extension.manifest.origins).concat(_toConsumableArray(browser.extension.manifest.permissions));

  var optionalPermissions = _toConsumableArray(browser.extension.manifest.optional_origins).concat(_toConsumableArray(browser.extension.manifest.optional_permissions));

  return _extends({
    'manifest_version': 2,
    'applications': null,
    'name': browser.extension.title,
    'version': browser.version,
    'version_name': null,
    'description': null,
    'icons': {},
    'permissions': permissions,
    'optional_permissions': optionalPermissions,
    'background': {},
    'content_scripts': [],
    'options_ui': {},
    'web_accessible_resources': []
  }, browser.includeVersionName && {
    'version_name': browser.versionName
  }, (0, _pick.default)(browser.extension.manifest, ['applications', 'description', 'icons', 'background', 'options_ui', 'web_accessible_resources']));
}

function buildManifest(browser, environment, manifests) {
  var current = (0, _cloneDeep.default)(getExtensionManifest(browser)); // Merge module manifests

  for (var i = 0; i < manifests.length; i++) {
    var manifest = manifests[i];
    current = _extends({}, current, manifest, {
      'icons': _extends({}, current.icons, manifest.icons),
      'content_scripts': _toConsumableArray(current.content_scripts).concat(_toConsumableArray(manifest.content_scripts)),
      'web_accessible_resources': _toConsumableArray(current.web_accessible_resources).concat(_toConsumableArray(manifest.web_accessible_resources)),
      'permissions': _toConsumableArray(current.permissions).concat(_toConsumableArray(manifest.permissions)),
      'optional_permissions': _toConsumableArray(current.optional_permissions).concat(_toConsumableArray(manifest.optional_permissions))
    });
  } // Remove background scripts that don't exist


  if (!(0, _isNil.default)(current['background'].scripts)) {
    (0, _remove.default)(current['background'].scripts, function (path) {
      return !_fsExtra.default.existsSync(_path.default.join(environment.outputPath, path));
    });
  } // Sort arrays


  current['permissions'] = (0, _uniq.default)(current.permissions).sort();
  current['optional_permissions'] = (0, _uniq.default)(current.optional_permissions).sort();
  current['web_accessible_resources'] = current.web_accessible_resources.sort();
  return (0, _omitBy.default)(current, _isNil.default);
}

function getContentScriptPatterns(module) {
  return (0, _reduce.default)(module.manifest.content_scripts, function (result, contentScript) {
    (0, _forEach.default)(contentScript.conditions, function (condition) {
      if ((0, _isNil.default)(condition) || (0, _isNil.default)(condition.pattern)) {
        throw new Error('Invalid content script condition');
      } // Include pattern in result


      result.push(condition.pattern);
    });
    return result;
  }, []);
}

function buildModulePermissions(browser, module) {
  var permissions = _toConsumableArray(module.manifest.origins).concat(_toConsumableArray(module.manifest.permissions));

  var optionalPermissions = _toConsumableArray(module.manifest.optional_origins).concat(_toConsumableArray(module.manifest.optional_permissions)); // Declarative Content


  if (browser.supports.api['declarativeContent'] && browser.supports.api['permissions']) {
    optionalPermissions = optionalPermissions.concat(getContentScriptPatterns(module));
  } // Destination / Source


  if (['destination', 'source'].indexOf(module.type) >= 0) {
    if (browser.supports.api['permissions']) {
      // Request permissions when the module is enabled
      return {
        'permissions': [],
        'optional_permissions': optionalPermissions.concat(permissions)
      };
    } // Request permissions on extension installation


    return {
      'permissions': permissions.concat(optionalPermissions),
      'optional_permissions': []
    };
  } // Unknown Module


  return {
    'permissions': permissions,
    'optional_permissions': optionalPermissions
  };
}

function createContentScript(browser, environment, contentScript) {
  if ((0, _isNil.default)(contentScript) || (0, _isNil.default)(contentScript.conditions)) {
    throw new Error('Invalid content script definition');
  }

  return {
    css: (0, _filter.default)(contentScript.css || [], function (path) {
      return _fsExtra.default.existsSync(_path.default.join(environment.outputPath, path));
    }),
    js: (0, _filter.default)(contentScript.js || [], function (path) {
      return _fsExtra.default.existsSync(_path.default.join(environment.outputPath, path));
    }),
    matches: contentScript.conditions.map(function (condition) {
      if ((0, _isNil.default)(condition) || (0, _isNil.default)(condition.pattern)) {
        throw new Error('Invalid content script condition');
      }

      return condition.pattern;
    })
  };
}

function buildModuleManifest(browser, environment, module) {
  var manifest = _extends({
    'icons': {},
    'content_scripts': [],
    'web_accessible_resources': []
  }, (0, _pick.default)(module.manifest, ['icons', 'web_accessible_resources']), buildModulePermissions(browser, module)); // Content Scripts (if the browser doesn't support declarative content)


  if (!browser.supports.api['declarativeContent'] || !browser.supports.api['permissions']) {
    manifest['content_scripts'] = module.manifest['content_scripts'].map(function (contentScript) {
      return createContentScript(browser, environment, contentScript);
    });
  }

  return manifest;
}

function buildModuleManifests(browser, environment) {
  return Promise.all((0, _map.default)((0, _filter.default)(browser.modules, function (module) {
    return module.type !== 'package';
  }), function (module) {
    return buildModuleManifest(browser, environment, module);
  }));
}

var Manifest = _helpers.Task.create({
  name: 'build:manifest',
  description: 'Build extension manifest.',
  required: [_clean.default, _extension.default]
}, function (log, browser, environment) {
  // Build manifest from modules
  return buildModuleManifests(browser, environment).then(function (manifests) {
    return buildManifest(browser, environment, manifests);
  }).then(function (manifest) {
    return _fsExtra.default.writeJson(_path.default.join(environment.outputPath, 'manifest.json'), manifest, {
      spaces: 2
    });
  });
});

exports.Manifest = Manifest;
var _default = Manifest;
exports.default = _default;