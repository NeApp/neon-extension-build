"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createChunks = createChunks;

var _chalk = _interopRequireDefault(require("chalk"));

var _fs = _interopRequireDefault(require("fs"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _map = _interopRequireDefault(require("lodash/map"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _sortBy = _interopRequireDefault(require("lodash/sortBy"));

var _vorpal = _interopRequireDefault(require("../core/vorpal"));

var _constants = require("../core/constants");

var _path2 = require("../core/helpers/path");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var Logger = _vorpal.default.logger;

function parseServiceId(id) {
  var name = null;
  var type = null; // Ensure service exists

  if (_constants.ServiceIds.indexOf(id) < 0) {
    return {
      name: name,
      type: type
    };
  } // Split service identifier into name and type


  var parts = id.split(':');

  if (parts.length === 1) {
    name = parts[0];
  } else if (parts.length === 2) {
    name = parts[1];
    type = parts[0];
  } else {
    throw new Error("Invalid service identifier: ".concat(id));
  }

  return {
    name: name,
    type: type
  };
}

function getServices(modules, id, options) {
  options = (0, _merge.default)({
    includeComponents: false
  }, options); // Parse service identifier

  var _parseServiceId = parseServiceId(id),
      name = _parseServiceId.name;

  if ((0, _isNil.default)(name)) {
    throw new Error("Unknown service: ".concat(id));
  } // Find matching services


  var items = [];
  (0, _forEach.default)((0, _sortBy.default)(modules, 'name'), function (module) {
    // Ensure module has services
    if (typeof module.services === 'undefined') {
      return;
    } // Ensure module has the specified service


    if (module.services.indexOf(id) === -1) {
      return;
    } // Resolve service path


    var servicePath = (0, _path2.resolvePath)([_path.default.resolve(module.path, "Services/".concat(name, "/").concat(name, ".js")), _path.default.resolve(module.path, "Services/".concat(name, ".js"))]);

    if ((0, _isNil.default)(servicePath)) {
      Logger.error(_chalk.default.red("Unable to find \"".concat(name, "\" service for \"").concat(module.name, "\"")));
      return;
    } // Include service


    items.push(servicePath); // Include components (if enabled)
    // TODO Scan directory, and include components individually

    var componentsPath = _path.default.resolve(module.path, "Components/".concat(name, "/index.js"));

    if (_fs.default.existsSync(componentsPath) && options.includeComponents) {
      items.push(componentsPath);
    }
  });
  return items;
}

function getModuleServices(browser, environment, module) {
  if (typeof module === 'undefined' || module === null) {
    return [];
  }

  if (typeof module.services === 'undefined' || module.services === null) {
    return [];
  } // Retrieve framework module


  var framework = browser.modules['neon-extension-framework']; // Find module services

  var items = [];

  for (var i = 0; i < module.services.length; i++) {
    var id = module.services[i]; // Parse service identifier

    var _parseServiceId2 = parseServiceId(id),
        name = _parseServiceId2.name,
        type = _parseServiceId2.type;

    if ((0, _isNil.default)(name)) {
      Logger.error(_chalk.default.red("Unknown service \"".concat(name, "\" for \"").concat(module.name, "\"")));
      continue;
    } // Ignore excluded services


    if (_constants.ServiceOptions[id] && _constants.ServiceOptions[id].include === false) {
      continue;
    } // Resolve service path


    var servicePath = (0, _path2.resolvePath)([_path.default.resolve(module.path, "Services/".concat(name, "/").concat(name, ".js")), _path.default.resolve(module.path, "Services/".concat(name, ".js"))]);

    if ((0, _isNil.default)(servicePath)) {
      Logger.error(_chalk.default.red("Unable to find \"".concat(name, "\" service for \"").concat(module.name, "\"")));
      continue;
    } // Only include the plugin configuration service


    if (id === _constants.Services.Configuration) {
      items.push(servicePath);
      continue;
    } // Resolve bootstrap path


    var mainPath = (0, _path2.resolvePath)([_path.default.resolve(framework.path, "Bootstrap/".concat(type, "/").concat(name, "/").concat(name, ".js")), _path.default.resolve(framework.path, "Bootstrap/".concat(type, "/").concat(name, ".js"))]);

    if ((0, _isNil.default)(mainPath)) {
      Logger.error(_chalk.default.red("Unable to find \"".concat(type, "/").concat(name, "\" bootstrap module for the \"").concat(name, "\" service")));
      continue;
    } // Found service


    items.push(servicePath);
    items.push(mainPath);
  }

  return items;
}

function createModule(browser, environment, module) {
  return _defineProperty({}, "Modules/".concat(module.name, "/Main"), _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices([browser.modules['neon-extension-core']], _constants.Services.Configuration)), _toConsumableArray(getModuleServices(browser, environment, module))));
}

function createModuleChunks(browser, module) {
  if (typeof module === 'undefined' || module === null) {
    Logger.error(_chalk.default.red("Invalid value provided for the \"module\" parameter: ".concat(module)));
    return null;
  }

  if (typeof module.name === 'undefined' || module.name === null) {
    Logger.error(_chalk.default.red("Invalid value provided for the \"module\" parameter: ".concat(module)));
    return null;
  }

  if (!(0, _isNil.default)(module.webpack.chunks)) {
    Logger.error(_chalk.default.red("Unsupported option \"webpack.chunks\" found for ".concat(module.name)));
    return null;
  } // Create module chunks


  var result = {};
  (0, _forEach.default)(module.webpack.modules || {}, function (_ref2, name) {
    var modules = _ref2.modules;

    if (!(0, _isString.default)(name) || name.length < 1) {
      Logger.warn(_chalk.default.yellow("Ignoring module with an invalid name \"".concat(name, "\" for ").concat(module.name)));
      return;
    } // Ensure an array of modules have been provided


    if (!Array.isArray(modules) || modules.length < 1) {
      Logger.warn(_chalk.default.yellow("Ignoring invalid module definition \"".concat(name, "\" for ").concat(module.name)));
      return;
    } // Create module


    result["Modules/".concat(module.name, "/").concat(name)] = _toConsumableArray(browser.webpack.common).concat(_toConsumableArray((0, _map.default)(modules, function (name) {
      return _path.default.resolve(module.path, "".concat(name));
    })));
  });
  return result;
}

function createChunks(browser, environment) {
  var modules = (0, _filter.default)(browser.modules, function (module) {
    return module.type !== 'package';
  });
  var destinations = (0, _filter.default)(browser.modules, {
    type: 'destination'
  });
  var sources = (0, _filter.default)(browser.modules, {
    type: 'source'
  }); // Create modules

  return _objectSpread({
    'Background/Messaging': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), ['neon-extension-core/Messaging']),
    //
    // Services
    //
    'Background/Services/App': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), ['neon-extension-core/Services/App']),
    'Background/Services/Callback': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), ['neon-extension-core/Services/Callback']),
    'Background/Services/ContentScript': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), ['neon-extension-core/Services/ContentScript']),
    'Background/Services/Library': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), ['neon-extension-core/Services/Library']),
    'Background/Services/Migrate': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), _toConsumableArray(getServices(modules, _constants.Services.Migrate)), ['neon-extension-core/Services/Migrate']),
    'Background/Services/Scrobble': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, _constants.Services.Configuration)), _toConsumableArray(getServices(destinations, _constants.Services.Destination.Scrobble)), ['neon-extension-core/Services/Scrobble']),
    //
    // Application
    //
    'Application': [// Ensure CSS Dependencies are bundled first
    'neon-extension-core/App/App.Dependencies.scss'].concat(_toConsumableArray(browser.webpack.common), _toConsumableArray(getServices(modules, _constants.Services.Configuration, {
      includeComponents: true
    })), [// Bootstrap
    'neon-extension-core/App'])
  }, Object.assign.apply(Object, [{}].concat(_toConsumableArray(destinations.map(function (module) {
    return createModuleChunks(browser, module) || {};
  })))), Object.assign.apply(Object, [{}].concat(_toConsumableArray(sources.map(function (module) {
    return _objectSpread({}, createModule(browser, environment, module), createModuleChunks(browser, module));
  })))));
}