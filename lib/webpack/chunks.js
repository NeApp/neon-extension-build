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

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _sortBy = _interopRequireDefault(require("lodash/sortBy"));

var _vorpal = _interopRequireDefault(require("../core/vorpal"));

var _path2 = require("../core/helpers/path");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Logger = _vorpal.default.logger;

function getServices(modules, type, options) {
  options = (0, _merge.default)({
    includeComponents: false
  }, options); // Build service name

  var name = type.substring(type.indexOf('/') + 1); // Find matching services

  var items = [];
  (0, _forEach.default)((0, _sortBy.default)(modules, 'name'), function (module) {
    // Ensure module has services
    if (typeof module.services === 'undefined') {
      return;
    } // Ensure module has the specified service


    if (module.services.indexOf(type) === -1) {
      return;
    } // Build service directory path


    var serviceBasePath = _path.default.resolve(module.path, "src/services/".concat(name)); // Resolve service path


    var servicePath = (0, _path2.resolvePath)([_path.default.resolve(serviceBasePath, 'index.js'), "".concat(serviceBasePath, ".js")]);

    if ((0, _isNil.default)(servicePath)) {
      Logger.error(_chalk.default.red("Unable to find \"".concat(name, "\" service for module \"").concat(module.name, "\"")));
      return;
    } // Include service


    items.push(servicePath); // Include react components (if enabled)

    if ((0, _path2.isDirectory)(serviceBasePath) && options.includeComponents) {
      var componentsPath = _path.default.resolve(serviceBasePath, 'components/index.js'); // Ensure service components exist


      if (_fs.default.existsSync(componentsPath)) {
        items.push(componentsPath);
      }
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
  } // Retrieve core module


  var coreModule = browser.modules['neon-extension-core']; // Find module services

  var items = [];

  for (var i = 0; i < module.services.length; i++) {
    var type = module.services[i]; // Ignore migrate service

    if (type === 'migrate') {
      continue;
    } // Build service name


    var name = type.substring(type.indexOf('/') + 1); // Build service directory path

    var serviceBasePath = _path.default.resolve(module.path, "src/services/".concat(name)); // Resolve service path


    var servicePath = (0, _path2.resolvePath)([_path.default.resolve(serviceBasePath, 'index.js'), "".concat(serviceBasePath, ".js")]);

    if ((0, _isNil.default)(servicePath)) {
      Logger.error(_chalk.default.red("Unable to find \"".concat(name, "\" service for module \"").concat(module.name, "\"")));
      continue;
    } // Only include the plugin configuration service


    if (type === 'configuration') {
      items.push(servicePath);
      continue;
    } // Build main module path


    var mainPath = _path.default.resolve(coreModule.path, "src/modules/".concat(type, "/index.js")); // Ensure main module exists


    if (!_fs.default.existsSync(mainPath)) {
      Logger.error(_chalk.default.red("Ignoring service \"".concat(name, "\" for module \"").concat(module.name, "\", ") + "unable to find main module at: \"".concat(mainPath, "\"")));
      continue;
    } // Found service


    items.push(servicePath);
    items.push(mainPath);
  }

  return items;
}

function createModule(browser, environment, module) {
  // Parse module name
  var moduleName = module.name.replace('neon-extension-', '');
  var splitAt = moduleName.indexOf('-');

  if (splitAt < 0) {
    Logger.error(_chalk.default.red("Invalid value provided for the \"module.name\" parameter: ".concat(module.name)));
    return null;
  }

  var type = moduleName.substring(0, splitAt);
  var plugin = moduleName.substring(splitAt + 1); // Build module entry

  var result = {};
  result["".concat(type, "/").concat(plugin, "/").concat(plugin)] = _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices([browser.modules['neon-extension-core']], 'configuration')), _toConsumableArray(getModuleServices(browser, environment, module)));
  return result;
}

function createModuleChunks(browser, module) {
  // Validate `module` object
  if (typeof module === 'undefined' || module === null) {
    Logger.error(_chalk.default.red("Invalid value provided for the \"module\" parameter: ".concat(module)));
    return null;
  }

  if (typeof module.name === 'undefined' || module.name === null) {
    Logger.error(_chalk.default.red("Invalid value provided for the \"module\" parameter: ".concat(module)));
    return null;
  } // Parse module name


  var moduleName = module.name.replace('neon-extension-', '');
  var splitAt = moduleName.indexOf('-');

  if (splitAt < 0) {
    Logger.error(_chalk.default.red("Invalid value provided for the \"module.name\" parameter: ".concat(module.name)));
    return null;
  }

  var type = moduleName.substring(0, splitAt);
  var plugin = moduleName.substring(splitAt + 1); // Create module chunks

  var result = {};
  (module.webpack.chunks || []).forEach(function (name) {
    result["".concat(type, "/").concat(plugin, "/").concat(name, "/").concat(name)] = _toConsumableArray(browser.webpack.common).concat(["".concat(module.name, "/").concat(name)]);
  });
  (module.webpack.modules || []).forEach(function (name) {
    result["".concat(type, "/").concat(plugin, "/").concat(name, "/").concat(name)] = _toConsumableArray(browser.webpack.common).concat(["".concat(module.name, "/").concat(name)]);
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

  return _extends({
    'background/main/main': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, 'configuration')), ['neon-extension-core/modules/background/main']),
    'background/migrate/migrate': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, 'configuration')), _toConsumableArray(getServices(modules, 'migrate')), ['neon-extension-core/modules/background/migrate']),
    //
    // Messaging
    //
    'background/messaging/messaging': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, 'configuration')), ['neon-extension-core/modules/background/messaging']),
    'background/messaging/services/library': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, 'configuration')), ['neon-extension-core/modules/background/messaging/services/library']),
    'background/messaging/services/scrobble': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, 'configuration')), _toConsumableArray(getServices(destinations, 'destination/scrobble')), ['neon-extension-core/modules/background/messaging/services/scrobble']),
    'background/messaging/services/storage': _toConsumableArray(browser.webpack.common).concat(_toConsumableArray(getServices(modules, 'configuration')), ['neon-extension-core/modules/background/messaging/services/storage']),
    //
    // Configuration
    //
    'configuration/configuration': [// Ensure CSS Dependencies are bundled first
    'neon-extension-core/modules/configuration/dependencies.scss'].concat(_toConsumableArray(browser.webpack.common), _toConsumableArray(getServices(modules, 'configuration', {
      includeComponents: true
    })), ['neon-extension-core/modules/configuration'])
  }, Object.assign.apply(Object, [{}].concat(_toConsumableArray(destinations.map(function (module) {
    return createModuleChunks(browser, module) || {};
  })))), Object.assign.apply(Object, [{}].concat(_toConsumableArray(sources.map(function (module) {
    return _extends({}, createModule(browser, environment, module), createModuleChunks(browser, module));
  })))));
}