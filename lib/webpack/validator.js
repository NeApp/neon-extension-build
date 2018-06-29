"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Validator = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _find = _interopRequireDefault(require("lodash/find"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _get = _interopRequireDefault(require("lodash/get"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _set = _interopRequireDefault(require("lodash/set"));

var _uniqBy = _interopRequireDefault(require("lodash/uniqBy"));

var _validator = _interopRequireDefault(require("./plugins/validator"));

var _vorpal = _interopRequireDefault(require("../core/vorpal"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Logger = _vorpal.default.logger;
var DependencyVersionRegex = /^\d+\.\d+\.\d+(\-\w+(\.\d+)?)?$/g;
var IgnoredPackages = ['jquery', 'react', 'react-dom', 'webpack'];

var Validator =
/*#__PURE__*/
function () {
  function Validator() {
    _classCallCheck(this, Validator);

    this.checked = {};
    this.dependencies = {};
    this.links = {};
    this._error = false;
  }

  _createClass(Validator, [{
    key: "createPlugin",
    value: function createPlugin(browser, environment) {
      return new _validator.default(this, browser, environment);
    }
  }, {
    key: "validate",
    value: function validate(browser, environment, module) {
      var _this = this;

      if ((0, _isNil.default)(browser) || (0, _isNil.default)(environment) || (0, _isNil.default)(module) || (0, _isNil.default)(module.userRequest)) {
        return;
      } // Validate module reasons


      (0, _forEach.default)(this.resolveReasons(browser, environment, module), function (_ref) {
        var module = _ref.module,
            source = _ref.source;

        if ((0, _get.default)(_this.checked, [module.userRequest, source])) {
          return;
        } // Mark as checked


        (0, _set.default)(_this.checked, [module.userRequest, source], true); // Validate module reason

        _this.validateReason(browser, environment, source, module.userRequest);
      });
    }
  }, {
    key: "validateReason",
    value: function validateReason(browser, environment, source, request) {
      if ((0, _isNil.default)(browser) || (0, _isNil.default)(environment) || (0, _isNil.default)(request)) {
        return false;
      } // Retrieve dependency name


      var dep;

      try {
        dep = this._parseDependency(request);
      } catch (e) {
        Logger.warn("Unable to parse dependency: \"".concat(request, "\": ").concat(e));
        return false;
      } // Validate package information


      if ((0, _isNil.default)(dep)) {
        Logger.warn("Unable to parse dependency: \"".concat(request, "\""));
        return false;
      } // Apply `IgnoredPackages` filter


      if (IgnoredPackages.indexOf(dep.name) >= 0) {
        return false;
      } // Find registered module matching source (if available)


      var module;

      if (!(0, _isNil.default)(source)) {
        module = (0, _find.default)(browser.modules, function (module) {
          return source.startsWith(module.path);
        });

        if ((0, _isNil.default)(module)) {
          Logger.error("[".concat(dep.name, "] Unknown source: \"").concat(source, "\""));
          this._error = true;
          return false;
        }
      } // Ignore internal dependencies


      if (!(0, _isNil.default)(module) && dep.name === module.name) {
        return true;
      } // Apply module dependency rules


      if (dep.name.startsWith('neon-extension-') && !this._isModulePermitted(module, dep.name)) {
        Logger.error("Dependency \"".concat(dep.name, "\" is not permitted for \"").concat(module.name, "\" (request: \"").concat(request, "\")"));
        this._error = true;
        return false;
      } // Find module dependency


      var moduleDependency;

      if (!(0, _isNil.default)(module) && module.type !== 'package') {
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


      if (!(0, _isNil.default)(moduleDependency)) {
        (0, _set.default)(this.dependencies, [browser.name, environment.name, module.name, dep.name], true);
      }

      return true;
    }
  }, {
    key: "validateDependency",
    value: function validateDependency(dep, module) {
      if (dep.name.indexOf('neon-extension-') === 0) {
        return this.validateModule(dep, module);
      }

      return this.validateRequirement(dep, module);
    }
  }, {
    key: "validateRequirement",
    value: function validateRequirement(dep, module) {
      var moduleDependency = module.package.dependencies[dep.name]; // Ensure dependency exists

      if ((0, _isNil.default)(moduleDependency)) {
        Logger.error("Dependency \"".concat(dep.name, "\" should be defined for \"").concat(module.name, "\""));
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure development dependency isn't defined


      if (!(0, _isNil.default)(module.package.devDependencies[dep.name])) {
        Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" shouldn't be defined as ") + 'a development dependency');
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure peer dependency isn't defined


      if (!(0, _isNil.default)(module.package.peerDependencies[dep.name])) {
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
      var moduleDependency = module.package.peerDependencies[dep.name]; // Ensure dependency exists

      if ((0, _isNil.default)(moduleDependency)) {
        Logger.error("Dependency \"".concat(dep.name, "\" should be defined for \"").concat(module.name, "\""));
        return {
          dependency: moduleDependency,
          valid: false
        };
      } // Ensure development dependency isn't defined


      if (!(0, _isNil.default)(module.package.devDependencies[dep.name])) {
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
    key: "registerLink",
    value: function registerLink(browser, environment, source, target) {
      if (_path.default.basename(source).indexOf('neon-extension-') === 0) {
        return;
      } // Prefer browser package sources


      var current = (0, _get.default)(this.links, [browser.name, environment.name, target]);

      if (!(0, _isNil.default)(current)) {
        var module = _path.default.basename(current.substring(0, current.lastIndexOf('node_modules') - 1));

        if (browser.package === module) {
          return;
        }
      } // Register link


      (0, _set.default)(this.links, [browser.name, environment.name, target], source);
    }
  }, {
    key: "resolveLink",
    value: function resolveLink(browser, environment, path) {
      if ((0, _isNil.default)(path)) {
        return path;
      } // Map linked dependency source


      (0, _forEach.default)((0, _get.default)(this.links, [browser.name, environment.name]), function (source, target) {
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
    key: "resolveModule",
    value: function resolveModule(browser, path, options) {
      options = _objectSpread({
        dependencies: true
      }, options || {});
      return (0, _find.default)(browser.modules, function (module) {
        if (module.type === 'package' || path.indexOf(module.path) < 0) {
          return false;
        }

        if (!options.dependencies && path.indexOf(_path.default.join(module.path, 'node_modules')) > -1) {
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
      (0, _forEach.default)(module.reasons, function (reason) {
        if ((0, _isNil.default)(reason.module) || (0, _isNil.default)(reason.module.userRequest)) {
          return;
        }

        var source = _this2.resolveLink(browser, environment, reason.module.userRequest); // Resolve module


        if (!(0, _isNil.default)(_this2.resolveModule(browser, source, {
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

      if ((0, _isNil.default)(this.dependencies[browser.name]) || (0, _isNil.default)(this.dependencies[browser.name][environment.name])) {
        throw new Error('No dependencies validated');
      }

      Logger.info("Checked ".concat(Object.keys(this.checked).length, " module(s)")); // Ensure there are no unused extension dependencies

      this._checkDependencies('Dependency', browser.extension.package.dependencies, this.dependencies[browser.name][environment.name][null]); // Ensure there are no unused module dependencies


      (0, _forEach.default)((0, _filter.default)(browser.modules, function (module) {
        return ['package', 'tool'].indexOf(module.type) < 0;
      }), function (module) {
        _this3._checkDependencies('Dependency', module.package.dependencies, _this3.dependencies[browser.name][environment.name][module.name], module.name);
      });
    }
  }, {
    key: "_checkDependencies",
    value: function _checkDependencies(prefix, current, matched, moduleName) {
      if ((0, _isNil.default)(prefix) || (0, _isNil.default)(current)) {
        return;
      }

      matched = matched || {}; // Ensure dependencies have been matched

      for (var name in current) {
        if (!current.hasOwnProperty(name) || name.startsWith('neon-extension-')) {
          continue;
        } // Check if module was used


        if (matched[name]) {
          continue;
        } // Display warning


        if (!(0, _isNil.default)(moduleName)) {
          Logger.warn("".concat(prefix, " \"").concat(name, "\" for \"").concat(moduleName, "\" is not required"));
        } else {
          Logger.warn("".concat(prefix, " \"").concat(name, "\" is not required"));
        }
      }
    }
  }, {
    key: "_getSources",
    value: function _getSources(browser, environment, source) {
      if ((0, _isNil.default)(source.module.userRequest)) {
        return [source];
      } // Build list of sources


      var result = [];

      for (var i = 0; i < source.module.reasons.length; i++) {
        result.push.apply(result, source.module.reasons[i]);
      }

      return (0, _uniqBy.default)(result, function (source) {
        return source.module.userRequest || source.module.name;
      });
    }
  }, {
    key: "_isModulePermitted",
    value: function _isModulePermitted(module, name) {
      if ((0, _isNil.default)(module)) {
        return true;
      }

      return name === 'neon-extension-framework';
    }
  }, {
    key: "_parseDependency",
    value: function _parseDependency(request) {
      if (!_fsExtra.default.existsSync(request)) {
        request = request.substring(0, request.indexOf('/')) || request;
        return {
          name: request,
          path: null
        };
      }

      var path = _path.default.dirname(request);

      var packagePath;

      while (true) {
        var current = _path.default.join(path, 'package.json');

        if (_fsExtra.default.pathExistsSync(current)) {
          packagePath = current;
          break;
        } // Go up one directory


        var next = _path.default.resolve(path, '..');

        if (next === path) {
          return null;
        } // Set next search directory


        path = next;
      } // Retrieve package name


      var name = _fsExtra.default.readJsonSync(packagePath)['name']; // Return package information


      return {
        name: name,
        path: path
      };
    }
  }]);

  return Validator;
}();

exports.Validator = Validator;

var _default = new Validator();

exports.default = _default;