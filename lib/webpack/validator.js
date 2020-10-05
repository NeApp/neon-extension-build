"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _find = _interopRequireDefault(require("lodash/find"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _get = _interopRequireDefault(require("lodash/get"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _set = _interopRequireDefault(require("lodash/set"));

var _validator = _interopRequireDefault(require("./plugins/validator"));

var _vorpal = _interopRequireDefault(require("../core/vorpal"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Logger = _vorpal["default"].logger;
var DependencyVersionRegex = /^\d+\.\d+\.\d+(\-\w+(\.\d+)?)?$/g;
var IgnoredPackages = ['jquery', 'react', 'react-dom', 'webpack'];

var Validator = /*#__PURE__*/function () {
  function Validator() {
    _classCallCheck(this, Validator);

    this.checked = {};
    this.dependencies = {};
    this._error = false;
  }

  _createClass(Validator, [{
    key: "validate",
    value: function validate(browser, environment, module) {
      var _this = this;

      if ((0, _isNil["default"])(browser) || (0, _isNil["default"])(environment) || (0, _isNil["default"])(module) || (0, _isNil["default"])(module.userRequest)) {
        return;
      } // Validate module reasons


      (0, _forEach["default"])(this.resolveReasons(browser, environment, module), function (_ref) {
        var module = _ref.module,
            source = _ref.source;

        if ((0, _get["default"])(_this.checked, [module.userRequest, source])) {
          return;
        } // Mark as checked


        (0, _set["default"])(_this.checked, [module.userRequest, source], true); // Validate module reason

        _this.validateReason(browser, environment, source, module.userRequest);
      });
    }
  }, {
    key: "validateReason",
    value: function validateReason(browser, environment, source, request) {
      if ((0, _isNil["default"])(browser) || (0, _isNil["default"])(environment) || (0, _isNil["default"])(request)) {
        return false;
      } // Retrieve dependency name


      var dep;

      try {
        dep = Validator.parseDependency(request);
      } catch (e) {
        Logger.warn("Unable to parse dependency: \"".concat(request, "\": ").concat(e));
        return false;
      } // Validate package information


      if ((0, _isNil["default"])(dep)) {
        Logger.warn("Unable to parse dependency: \"".concat(request, "\""));
        return false;
      } // Apply `IgnoredPackages` filter


      if (IgnoredPackages.indexOf(dep.name) >= 0) {
        return false;
      } // Find registered module matching source (if available)


      var module;

      if (!(0, _isNil["default"])(source)) {
        module = (0, _find["default"])(browser.modules, function (module) {
          return source.startsWith(module.path);
        });

        if ((0, _isNil["default"])(module)) {
          Logger.error("[".concat(dep.name, "] Unknown source: \"").concat(source, "\""));
          this._error = true;
          return false;
        }
      } // Ignore internal dependencies


      if (!(0, _isNil["default"])(module) && dep.name === module.name) {
        return true;
      } // Apply module dependency rules


      if (dep.name.startsWith('@radon-extension/') && !this._isModulePermitted(module, dep.name)) {
        Logger.error("Dependency \"".concat(dep.name, "\" is not permitted for \"").concat(module.name, "\" (request: \"").concat(request, "\")"));
        this._error = true;
        return false;
      } // Find module dependency


      var moduleDependency;

      if (!(0, _isNil["default"])(module) && module.type !== 'package') {
        var _this$validateDepende = this.validateDependency(dep, module),
            dependency = _this$validateDepende.dependency,
            valid = _this$validateDepende.valid;

        if (!valid) {
          this._error = true;
          return false;
        } // Store result


        moduleDependency = dependency;
      } else {
        Logger.error("Dependency \"".concat(dep.name, "\" should be defined"), source);
        this._error = true;
        return false;
      } // Mark module dependency


      if (!(0, _isNil["default"])(moduleDependency)) {
        (0, _set["default"])(this.dependencies, [browser.name, environment.name, module.name, dep.name], true);
      }

      return true;
    }
  }, {
    key: "validateDependency",
    value: function validateDependency(dep, module) {
      if (dep.name.indexOf('@radon-extension/') === 0) {
        return this.validateModule(dep, module);
      }

      return this.validateRequirement(dep, module);
    }
  }, {
    key: "validateRequirement",
    value: function validateRequirement(dep, module) {
      var moduleDependency = module["package"].dependencies[dep.name]; // Ensure dependency exists

      if ((0, _isNil["default"])(moduleDependency)) {
        Logger.error("Dependency \"".concat(dep.name, "\" should be defined for \"").concat(module.name, "\""));
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure development dependency isn't defined


      if (!(0, _isNil["default"])(module["package"].devDependencies[dep.name])) {
        Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" shouldn't be defined as ") + 'a development dependency');
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure peer dependency isn't defined


      if (!(0, _isNil["default"])(module["package"].peerDependencies[dep.name])) {
        Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" shouldn't be defined as ") + 'a peer dependency');
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure dependency isn't pinned to a version


      if (moduleDependency.match(DependencyVersionRegex)) {
        Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" ") + "shouldn't be pinned to a version (found: ".concat(moduleDependency, ")"));
        this._error = true;
        return false;
      }

      return {
        dependency: moduleDependency,
        valid: true
      };
    }
  }, {
    key: "validateModule",
    value: function validateModule(dep, module) {
      var moduleDependency = module["package"].peerDependencies[dep.name]; // Ensure dependency exists

      if ((0, _isNil["default"])(moduleDependency)) {
        Logger.error("Dependency \"".concat(dep.name, "\" should be defined for \"").concat(module.name, "\""));
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure development dependency isn't defined


      if (!(0, _isNil["default"])(module["package"].devDependencies[dep.name])) {
        Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" shouldn't be defined as ") + 'a development dependency');
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure dependency isn't pinned to a version


      if (moduleDependency.match(DependencyVersionRegex)) {
        Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" ") + "shouldn't be pinned to a version (found: ".concat(moduleDependency, ")"));
        this._error = true;
        return false;
      }

      return {
        dependency: moduleDependency,
        valid: true
      };
    }
  }, {
    key: "resolveModule",
    value: function resolveModule(browser, path, options) {
      options = _objectSpread({
        dependencies: true
      }, options || {});
      return (0, _find["default"])(browser.modules, function (module) {
        if (module.type === 'package' || path.indexOf(module.path) < 0) {
          return false;
        }

        if (!options.dependencies && path.indexOf(_path["default"].join(module.path, 'node_modules')) > -1) {
          return false;
        }

        return true;
      });
    }
  }, {
    key: "resolveReasons",
    value: function resolveReasons(browser, environment, module) {
      var _this2 = this;

      var reasons = [];
      (0, _forEach["default"])(module.reasons, function (reason) {
        if ((0, _isNil["default"])(reason.module) || (0, _isNil["default"])(reason.module.userRequest)) {
          return;
        }

        var source = Validator.resolveLink(browser, environment, reason.module.userRequest); // Resolve module

        if (!(0, _isNil["default"])(_this2.resolveModule(browser, source, {
          dependencies: false
        }))) {
          reasons.push({
            module: module,
            source: source
          });
          return;
        } // Resolve reasons


        reasons.push.apply(reasons, _toConsumableArray(_this2.resolveReasons(browser, environment, reason.module)));
      });
      return reasons;
    }
  }, {
    key: "finish",
    value: function finish(browser, environment) {
      var _this3 = this;

      if (this._error) {
        throw new Error('Build didn\'t pass validation');
      }

      if ((0, _isNil["default"])(this.dependencies[browser.name]) || (0, _isNil["default"])(this.dependencies[browser.name][environment.name])) {
        throw new Error('No dependencies validated');
      }

      Logger.info("Checked ".concat(Object.keys(this.checked).length, " module(s)")); // Ensure there are no unused extension dependencies

      this._checkDependencies('Dependency', browser.extension["package"].dependencies, this.dependencies[browser.name][environment.name][null]); // Ensure there are no unused module dependencies


      (0, _forEach["default"])((0, _filter["default"])(browser.modules, function (module) {
        return ['package', 'tool'].indexOf(module.type) < 0;
      }), function (module) {
        _this3._checkDependencies('Dependency', module["package"].dependencies, _this3.dependencies[browser.name][environment.name][module.name], module.name);
      });
    }
  }, {
    key: "_checkDependencies",
    value: function _checkDependencies(prefix, current, matched, moduleName) {
      if ((0, _isNil["default"])(prefix) || (0, _isNil["default"])(current)) {
        return;
      }

      matched = matched || {}; // Ensure dependencies have been matched

      for (var name in current) {
        if (!current.hasOwnProperty(name) || name.startsWith('@radon-extension/')) {
          continue;
        } // Check if module was used


        if (matched[name]) {
          continue;
        } // Display warning


        if (!(0, _isNil["default"])(moduleName)) {
          Logger.warn("".concat(prefix, " \"").concat(name, "\" for \"").concat(moduleName, "\" is not required"));
        } else {
          Logger.warn("".concat(prefix, " \"").concat(name, "\" is not required"));
        }
      }
    }
  }, {
    key: "_isModulePermitted",
    value: function _isModulePermitted(module, name) {
      if ((0, _isNil["default"])(module)) {
        return true;
      }

      return name === '@radon-extension/framework';
    }
  }], [{
    key: "createPlugin",
    value: function createPlugin(browser, environment) {
      return new _validator["default"](new Validator(), browser, environment);
    }
  }, {
    key: "registerLink",
    value: function registerLink(browser, environment, source, target) {
      var dep; // Retrieve dependency name

      try {
        dep = Validator.parseDependency(source);
      } catch (e) {
        Logger.warn("Unable to parse dependency: \"".concat(source, "\": ").concat(e));
        return;
      } // Ignore modules


      if (dep.name.indexOf('@radon-extension/') === 0) {
        return;
      } // Prefer browser package sources


      var current = (0, _get["default"])(Validator.links, [browser.name, environment.name, target]);

      if (!(0, _isNil["default"])(current)) {
        var module = _path["default"].basename(current.substring(0, current.lastIndexOf('node_modules') - 1));

        if (browser["package"] === module) {
          return;
        }
      } // Register link


      (0, _set["default"])(Validator.links, [browser.name, environment.name, target], source);
      Logger.info("Registered link: \"".concat(source, "\" -> \"").concat(target, "\""));
    }
  }, {
    key: "resolveLink",
    value: function resolveLink(browser, environment, path) {
      if ((0, _isNil["default"])(path)) {
        return path;
      } // Map linked dependency source


      (0, _forEach["default"])((0, _get["default"])(Validator.links, [browser.name, environment.name]), function (source, target) {
        var index = path.indexOf(target);

        if (index < 0) {
          return true;
        } // Update `path`


        path = source + path.substring(index + target.length);
        return false;
      });
      return path;
    }
  }, {
    key: "getDependencyName",
    value: function getDependencyName(path) {
      path = _path["default"].normalize(path);
      var pos; // Find module directory

      pos = path.lastIndexOf('node_modules'); // No module directory found

      if (pos < 0) {
        return null;
      }

      var name = path.substring(pos + 13); // Remove trailing path

      pos = name.indexOf(_path["default"].sep);

      if (pos < 0) {
        return name;
      } // Scoped package


      if (name.indexOf('@') === 0) {
        pos = name.indexOf(_path["default"].sep, pos + 1);

        if (pos < 0) {
          return name;
        }
      } // Return dependency name


      return name.substring(0, pos).replace(/\\/g, '/');
    }
  }, {
    key: "parseDependency",
    value: function parseDependency(request) {
      if (!_fsExtra["default"].existsSync(request)) {
        request = request.substring(0, request.indexOf('/')) || request;
        return {
          name: request,
          path: null
        };
      }

      var path = request; // Resolve directory

      if (_fsExtra["default"].statSync(path).isFile()) {
        path = _path["default"].dirname(path);
      } // Resolve package path


      var packagePath;

      while (true) {
        var current = _path["default"].join(path, 'package.json');

        if (_fsExtra["default"].pathExistsSync(current)) {
          packagePath = current;
          break;
        } // Go up one directory


        var next = _path["default"].resolve(path, '..');

        if (next === path) {
          return null;
        } // Set next search directory


        path = next;
      } // Retrieve package name


      var packageName = _fsExtra["default"].readJsonSync(packagePath)['name']; // Validate package name matches path


      var name = Validator.getDependencyName(packagePath);

      if (!(0, _isNil["default"])(name) && name !== packageName) {
        Logger.warn("Package \"".concat(packageName, "\" doesn't match path \"").concat(name, "\""));
      } // Return package information


      return {
        name: packageName,
        path: path
      };
    }
  }]);

  return Validator;
}();

exports["default"] = Validator;

_defineProperty(Validator, "links", {});