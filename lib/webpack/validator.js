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

var _semver = _interopRequireDefault(require("semver"));

var _set = _interopRequireDefault(require("lodash/set"));

var _uniqBy = _interopRequireDefault(require("lodash/uniqBy"));

var _validator = _interopRequireDefault(require("./plugins/validator"));

var _vorpal = _interopRequireDefault(require("../core/vorpal"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Logger = _vorpal.default.logger;
var DependencyVersionRegex = /^\d+\.\d+\.\d+(\-\w+(\.\d+)?)?$/g;
var IgnoredPackages = ['webpack'];

var Validator =
/*#__PURE__*/
function () {
  function Validator() {
    _classCallCheck(this, Validator);

    this.dependencies = {};
    this.peerDependencies = {};
    this.links = {};
    this._error = false;
  }

  _createClass(Validator, [{
    key: "createPlugin",
    value: function createPlugin(browser, environment) {
      return new _validator.default(this, browser, environment);
    }
  }, {
    key: "processModule",
    value: function processModule(browser, environment, module) {
      var _this = this;

      if ((0, _isNil.default)(browser) || (0, _isNil.default)(environment) || (0, _isNil.default)(module) || (0, _isNil.default)(module.userRequest)) {
        return;
      } // Validate each module source


      module.reasons.forEach(function (source) {
        var sourcePath = source.module.userRequest;

        if (!(0, _isNil.default)(sourcePath)) {
          // Map linked dependency source
          (0, _forEach.default)((0, _get.default)(_this.links, [browser.name, environment.name]), function (source, target) {
            var index = sourcePath.indexOf(target);

            if (index < 0) {
              return;
            } // Update `sourcePath`


            sourcePath = source + sourcePath.substring(index + target.length);
          });
        } // Process dependency


        _this.processModuleDependency(browser, environment, sourcePath, module.userRequest);
      });
    }
  }, {
    key: "processModuleDependency",
    value: function processModuleDependency(browser, environment, source, request) {
      if ((0, _isNil.default)(browser) || (0, _isNil.default)(environment) || (0, _isNil.default)(request)) {
        return false;
      } // Retrieve dependency name


      var dep;

      try {
        dep = this._parseDependency(request);
      } catch (e) {
        console.log("Unable to parse dependency: \"".concat(request, "\": ").concat(e));
        return false;
      } // Validate package information


      if ((0, _isNil.default)(dep)) {
        console.log("Unable to parse dependency: \"".concat(request, "\""));
        return false;
      } // Ignore neon modules


      if (dep.name.startsWith('neon-extension-')) {
        return false;
      } // Apply `IgnoredPackages` filter


      if (IgnoredPackages.indexOf(dep.name) >= 0) {
        return false;
      } // Search for dependency definition


      var extensionDependency = browser.extension.package.devDependencies[dep.name]; // Find registered module matching source (if available)

      var module;
      var moduleDependency;

      if (!(0, _isNil.default)(source)) {
        module = (0, _find.default)(browser.modules, function (module) {
          return source.startsWith(module.path);
        });

        if ((0, _isNil.default)(module)) {
          Logger.error("[".concat(dep.name, "] Unknown source: \"").concat(source, "\""));
          this._error = true;
          return false;
        }
      }

      if (!(0, _isNil.default)(module) && module.type !== 'package') {
        moduleDependency = module.package.dependencies[dep.name];
      } // Pick definition


      var dependency = moduleDependency || extensionDependency; // Ensure dependency definition was found

      if ((0, _isNil.default)(dependency)) {
        if (!(0, _isNil.default)(module)) {
          Logger.error("Unable to find \"".concat(dep.name, "\" dependency for \"").concat(module.name, "\""));
        } else {
          Logger.error("Unable to find \"".concat(dep.name, "\" dependency"));
        }

        this._error = true;
        return false;
      } // Ensure dependency is pinned to a version


      if (!dependency.match(DependencyVersionRegex)) {
        if (!(0, _isNil.default)(moduleDependency)) {
          Logger.error("Dependency \"".concat(dep.name, "\" for \"").concat(module.name, "\" ") + "should be pinned to a version (found: ".concat(dependency, ")"));
        } else {
          Logger.error("Dependency \"".concat(dep.name, "\" ") + "should be pinned to a version (found: ".concat(dependency, ")"));
        }

        this._error = true;
        return false;
      } // Ensure dependencies aren't duplicated


      if (!(0, _isNil.default)(moduleDependency) && !(0, _isNil.default)(extensionDependency)) {
        Logger.error("Dependency \"".concat(dep.name, "\" has been duplicated ") + "(extension: ".concat(extensionDependency, ", ").concat(module.name, ": ").concat(moduleDependency, ")"));
        this._error = true;
        return false;
      } // Mark dependency


      if (!(0, _isNil.default)(moduleDependency)) {
        (0, _set.default)(this.dependencies, [browser.name, environment.name, module.name, dep.name], true);
      } else {
        (0, _set.default)(this.dependencies, [browser.name, environment.name, null, dep.name], true);
      } // Validate module dependency


      if (!(0, _isNil.default)(module) && module.type !== 'package') {
        var modulePeerDependency = module.package.peerDependencies[dep.name]; // Mark peer dependency

        (0, _set.default)(this.peerDependencies, [browser.name, environment.name, module.name, dep.name], true); // Ensure peer dependency is defined

        if (!(0, _isNil.default)(extensionDependency) && (0, _isNil.default)(modulePeerDependency)) {
          Logger.error("\"".concat(dep.name, "\" should be defined as a peer dependency in \"").concat(module.name, "\""));
          this._error = true;
          return false;
        } // Ensure peer dependency is a caret range


        if (!(0, _isNil.default)(extensionDependency) && modulePeerDependency.indexOf('^') !== 0) {
          Logger.error("\"".concat(dep.name, "\" peer dependency in \"").concat(module.name, "\" should be a caret range"));
          this._error = true;
          return false;
        } // Ensure extension dependency matches peer dependency range


        if (!(0, _isNil.default)(extensionDependency) && !_semver.default.satisfies(extensionDependency, modulePeerDependency)) {
          Logger.error("\"".concat(dep.name, "\" peer dependency in \"").concat(module.name, "\" (").concat(modulePeerDependency, ") ") + "is not satisfied by extension version: ".concat(extensionDependency));
          this._error = true;
          return false;
        }
      }

      return true;
    }
  }, {
    key: "registerLink",
    value: function registerLink(browser, environment, source, target) {
      (0, _set.default)(this.links, [browser.name, environment.name, target], source);
    }
  }, {
    key: "finish",
    value: function finish(browser, environment) {
      var _this2 = this;

      if (this._error) {
        throw new Error('Build didn\'t pass validation');
      }

      if ((0, _isNil.default)(this.dependencies[browser.name]) || (0, _isNil.default)(this.dependencies[browser.name][environment.name])) {
        return;
      }

      if ((0, _isNil.default)(this.peerDependencies[browser.name]) || (0, _isNil.default)(this.peerDependencies[browser.name][environment.name])) {
        return;
      } // Ensure there are no unused extension dependencies


      this._checkDependencies('Dependency', browser.extension.package.dependencies, this.dependencies[browser.name][environment.name][null]); // Ensure there are no unused module dependencies


      (0, _forEach.default)((0, _filter.default)(browser.modules, function (module) {
        return module.type !== 'package';
      }), function (module) {
        _this2._checkDependencies('Dependency', module.package.dependencies, _this2.dependencies[browser.name][environment.name][module.name], module.name);

        _this2._checkDependencies('Peer dependency', module.package.peerDependencies, _this2.peerDependencies[browser.name][environment.name][module.name], module.name);
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
    key: "_parseDependency",
    value: function _parseDependency(request) {
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