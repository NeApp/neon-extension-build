"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.Manifest = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _map = _interopRequireDefault(require("lodash/map"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _remove = _interopRequireDefault(require("lodash/remove"));

var _uniq = _interopRequireDefault(require("lodash/uniq"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function getExtensionManifest(browser) {
  var permissions = [].concat(_toConsumableArray(browser.extension.manifest.origins), _toConsumableArray(browser.extension.manifest.permissions));
  var optionalPermissions = [].concat(_toConsumableArray(browser.extension.manifest.optional_origins), _toConsumableArray(browser.extension.manifest.optional_permissions));
  return _objectSpread({
    'manifest_version': 2,
    'name': browser.extension.title,
    'version': browser.version,
    'version_name': null,
    'description': null,
    'applications': null,
    'icons': {},
    'permissions': permissions,
    'optional_permissions': optionalPermissions,
    'background': {},
    'content_scripts': [],
    'options_ui': {},
    'web_accessible_resources': []
  }, browser.includeVersionName && {
    'version_name': browser.versionName
  }, {}, (0, _pick["default"])(browser.extension.manifest, ['applications', 'key', 'description', 'icons', 'background', 'options_ui', 'web_accessible_resources']));
}

function buildManifest(browser, environment, manifests) {
  var current = (0, _cloneDeep["default"])(getExtensionManifest(browser)); // Merge module manifests

  for (var i = 0; i < manifests.length; i++) {
    var manifest = manifests[i];
    current = _objectSpread({}, current, {}, manifest, {
      'icons': _objectSpread({}, current.icons, {}, manifest.icons),
      'content_scripts': [].concat(_toConsumableArray(current.content_scripts), _toConsumableArray(manifest.content_scripts)),
      'web_accessible_resources': [].concat(_toConsumableArray(current.web_accessible_resources), _toConsumableArray(manifest.web_accessible_resources)),
      'permissions': [].concat(_toConsumableArray(current.permissions), _toConsumableArray(manifest.permissions)),
      'optional_permissions': [].concat(_toConsumableArray(current.optional_permissions), _toConsumableArray(manifest.optional_permissions))
    });
  } // Remove background scripts that don't exist


  if (!(0, _isNil["default"])(current['background'].scripts)) {
    (0, _remove["default"])(current['background'].scripts, function (path) {
      return !_fsExtra["default"].existsSync(_path["default"].join(environment.outputPath, path));
    });
  } // Sort arrays


  current['permissions'] = (0, _uniq["default"])(current.permissions).sort();
  current['optional_permissions'] = (0, _uniq["default"])(current.optional_permissions).sort();
  current['web_accessible_resources'] = current.web_accessible_resources.sort();
  return (0, _omitBy["default"])(current, _isNil["default"]);
}

function buildModulePermissions(browser, module) {
  var permissions = [].concat(_toConsumableArray(module.manifest.origins), _toConsumableArray(module.manifest.permissions));
  var optionalPermissions = [].concat(_toConsumableArray(module.manifest.optional_origins), _toConsumableArray(module.manifest.optional_permissions)); // Destination / Source

  if (['destination', 'source'].indexOf(module.type) >= 0) {
    if (browser.features.permissions === 'dynamic') {
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
  if ((0, _isNil["default"])(contentScript) || (0, _isNil["default"])(contentScript.conditions)) {
    throw new Error('Invalid content script definition');
  }

  return {
    css: (0, _filter["default"])(contentScript.css || [], function (path) {
      return _fsExtra["default"].existsSync(_path["default"].join(environment.outputPath, path));
    }),
    js: (0, _filter["default"])(contentScript.js || [], function (path) {
      return _fsExtra["default"].existsSync(_path["default"].join(environment.outputPath, path));
    }),
    matches: contentScript.conditions.map(function (condition) {
      if ((0, _isNil["default"])(condition) || (0, _isNil["default"])(condition.pattern)) {
        throw new Error('Invalid content script condition');
      }

      return condition.pattern;
    })
  };
}

function buildModuleManifest(browser, environment, module) {
  var manifest = _objectSpread({
    'icons': {},
    'content_scripts': [],
    'web_accessible_resources': []
  }, (0, _pick["default"])(module.manifest, ['icons', 'web_accessible_resources']), {}, buildModulePermissions(browser, module)); // Content Scripts (if the browser doesn't support declarative content)


  if (browser.features.contentScripts !== 'dynamic' || browser.features.permissions !== 'dynamic') {
    manifest['content_scripts'] = module.manifest['content_scripts'].map(function (contentScript) {
      return createContentScript(browser, environment, contentScript);
    });
  }

  return manifest;
}

function buildModuleManifests(browser, environment) {
  return Promise.all((0, _map["default"])((0, _filter["default"])(browser.modules, function (module) {
    return module.type !== 'package';
  }), function (module) {
    return buildModuleManifest(browser, environment, module);
  }));
}

var Manifest = _helpers.Task.create({
  name: 'build:manifest',
  description: 'Build extension manifest.',
  required: ['clean', 'module:validate', 'build:extension']
}, function (log, browser, environment) {
  // Build manifest from modules
  return buildModuleManifests(browser, environment).then(function (manifests) {
    return buildManifest(browser, environment, manifests);
  }).then(function (manifest) {
    return _fsExtra["default"].writeJson(_path["default"].join(environment.outputPath, 'manifest.json'), manifest, {
      spaces: 2
    });
  });
});

exports.Manifest = Manifest;
var _default = Manifest;
exports["default"] = _default;