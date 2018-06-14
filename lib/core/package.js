"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDependencyTree = createDependencyTree;
exports.getDependencyTree = getDependencyTree;
exports.orderModules = orderModules;
exports.getBrowserModules = getBrowserModules;
exports.getPackageModules = getPackageModules;
exports.readPackageModules = readPackageModules;
exports.readPackageDetails = readPackageDetails;
exports.updatePackageVersions = updatePackageVersions;
exports.writePackageVersions = writePackageVersions;
exports.updatePackageLockVersions = updatePackageLockVersions;
exports.writePackageLockVersions = writePackageLockVersions;
exports.default = exports.Dependency = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _pickBy = _interopRequireDefault(require("lodash/pickBy"));

var _without = _interopRequireDefault(require("lodash/without"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _values = _interopRequireDefault(require("lodash/values"));

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

var Dependency =
/*#__PURE__*/
function () {
  function Dependency(values) {
    _classCallCheck(this, Dependency);

    // Parse values
    var _name$version$require = _objectSpread({
      name: null,
      version: null,
      requires: {},
      parent: null
    }, values || {}),
        name = _name$version$require.name,
        version = _name$version$require.version,
        requires = _name$version$require.requires,
        parent = _name$version$require.parent; // Validate values


    if ((0, _isNil.default)(name)) {
      throw new Error('Missing required "name" value');
    }

    if ((0, _isNil.default)(version)) {
      throw new Error('Missing required "version" value');
    } // Set values


    this.name = name;
    this.version = version;
    this.requires = requires;
    this.parent = parent;
    this.dependencies = {};
  }

  _createClass(Dependency, [{
    key: "get",
    value: function get(name) {
      return this.dependencies[name] || null;
    }
  }, {
    key: "resolve",
    value: function resolve(name) {
      var dependency = this.get(name);

      if (!(0, _isNil.default)(dependency)) {
        return dependency;
      } // Try resolve in parent


      if ((0, _isNil.default)(this.parent)) {
        return null;
      }

      return this.parent.resolve(name);
    }
  }]);

  return Dependency;
}();

exports.Dependency = Dependency;

function createDependencyTree(dependency) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  options = _objectSpread({
    name: null,
    parent: null
  }, options || {}); // Parse dependency

  var _name$version$require2 = _objectSpread({
    name: options.name,
    version: null,
    requires: {},
    dependencies: {}
  }, dependency),
      name = _name$version$require2.name,
      version = _name$version$require2.version,
      requires = _name$version$require2.requires,
      dependencies = _name$version$require2.dependencies; // Create dependency node


  var node = new Dependency({
    name: name,
    version: version,
    requires: requires,
    parent: options.parent
  }); // Parse dependencies

  node.dependencies = (0, _mapValues.default)(dependencies, function (dep, name) {
    return createDependencyTree(dep, {
      parent: node,
      name: name
    });
  });
  return node;
}

function getDependencyTree(path) {
  return _fsExtra.default.readJson(_path.default.join(path, 'package-lock.json')).then(function (dependency) {
    return createDependencyTree(dependency);
  });
}

function orderModules(modules) {
  var result = [];
  (0, _forEach.default)(['neon-extension-build', 'neon-extension-framework', 'neon-extension-core'], function (name) {
    if (modules.indexOf(name) < 0) {
      return;
    }

    result.push(name);
  }); // Append remaining modules

  return result.concat(_without.default.apply(void 0, [modules].concat(result)));
}

function getBrowserModules(browser) {
  return [browser.modules['neon-extension-build'], browser.modules['neon-extension-framework'], browser.modules['neon-extension-core']].concat(_toConsumableArray((0, _filter.default)((0, _values.default)(browser.modules), function (module) {
    return ['neon-extension-build', 'neon-extension-framework', 'neon-extension-core'].indexOf(module.name) < 0;
  })));
}

function getPackageModules(pkg) {
  if (pkg.name.indexOf('neon-extension-') !== 0) {
    return Promise.reject(new Error("Invalid module: ".concat(pkg.name)));
  }

  return orderModules((0, _filter.default)(_toConsumableArray(Object.keys(pkg.dependencies || {})).concat(_toConsumableArray(Object.keys(pkg.peerDependencies || {}))), function (name) {
    return name.indexOf('neon-extension-') === 0;
  }));
}

function readPackageModules(path) {
  return _fsExtra.default.readJson(path).then(function (pkg) {
    return getPackageModules(pkg);
  });
}

function parsePackageDetails(data) {
  return (0, _merge.default)({
    name: null,
    version: null,
    description: null,
    keywords: null,
    homepage: null,
    author: null,
    license: null,
    main: null,
    private: null,
    bugs: null,
    engines: null,
    repository: null,
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    bin: null,
    scripts: null
  }, data);
}

function readPackageDetails(path) {
  // Read package details from file
  return _fsExtra.default.readJson(_path.default.join(path, 'package.json')).then(function (data) {
    if (!(0, _isPlainObject.default)(data)) {
      return Promise.reject(new Error('Expected manifest to be a plain object'));
    } // Parse package details


    return parsePackageDetails(data);
  });
}

function updatePackageVersions(pkg, versions) {
  function updateVersions(dependencies) {
    if ((0, _isNil.default)(dependencies)) {
      return dependencies;
    }

    return _objectSpread({}, dependencies, (0, _pickBy.default)(versions, function (_, name) {
      return !(0, _isNil.default)(dependencies[name]);
    }));
  }

  if (!(0, _isNil.default)(pkg.dependencies)) {
    pkg.dependencies = updateVersions(pkg.dependencies);
  }

  if (!(0, _isNil.default)(pkg.peerDependencies)) {
    pkg.peerDependencies = updateVersions(pkg.peerDependencies);
  }

  return pkg;
}

function writePackageVersions(path, versions) {
  if (_fsExtra.default.statSync(path).isDirectory()) {
    path = _path.default.join('package.json');
  } // Read package details


  return _fsExtra.default.readFile(path).then(function (data) {
    var pkg = JSON.parse(data); // Write package details

    return _fsExtra.default.writeJson(path, updatePackageVersions(pkg, versions), {
      EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
      spaces: 2
    });
  });
}

function updatePackageLockVersions(locks, versions) {
  return _objectSpread({}, locks, {
    dependencies: _objectSpread({}, locks.dependencies, (0, _mapValues.default)((0, _pickBy.default)(versions, function (_, name) {
      return !(0, _isNil.default)(locks.dependencies[name]);
    }), function (version, name) {
      return _objectSpread({}, locks.dependencies[name], {
        version: version
      });
    }))
  });
}

function writePackageLockVersions(path, versions) {
  if (_fsExtra.default.statSync(path).isDirectory()) {
    path = _path.default.join('package-lock.json');
  } // Read package locks


  return _fsExtra.default.readFile(path).then(function (data) {
    var locks = JSON.parse(data); // Write package locks

    return _fsExtra.default.writeJson(path, updatePackageLockVersions(locks, versions), {
      EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
      spaces: 2
    });
  });
}

var _default = {
  getBrowserModules: getBrowserModules,
  getPackageModules: getPackageModules,
  orderModules: orderModules,
  readPackageDetails: readPackageDetails,
  readPackageModules: readPackageModules,
  updatePackageVersions: updatePackageVersions,
  updatePackageLockVersions: updatePackageLockVersions,
  writePackageVersions: writePackageVersions,
  writePackageLockVersions: writePackageLockVersions
};
exports.default = _default;