"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.CreditsTask = exports.BaseAuthor = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _credits = _interopRequireDefault(require("@fuzeman/credits"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _get = _interopRequireDefault(require("lodash/get"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isNumber = _interopRequireDefault(require("lodash/isNumber"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _keyBy = _interopRequireDefault(require("lodash/keyBy"));

var _map = _interopRequireDefault(require("lodash/map"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _orderBy = _interopRequireDefault(require("lodash/orderBy"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _uniq = _interopRequireDefault(require("lodash/uniq"));

var _json = _interopRequireDefault(require("../../core/json"));

var _helpers = require("../../core/helpers");

var _value = require("../../core/helpers/value");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var BaseAuthor = {
  name: null,
  email: null,
  type: null,
  commits: 0,
  modules: [],
  packages: []
};
exports.BaseAuthor = BaseAuthor;

function mergeContributor(a, b) {
  return (0, _merge["default"])(a, _objectSpread(_objectSpread({}, b), {}, {
    commits: a.commits + b.commits,
    modules: (0, _uniq["default"])([].concat(_toConsumableArray(a.modules), _toConsumableArray(b.modules))),
    packages: (0, _uniq["default"])([].concat(_toConsumableArray(a.packages), _toConsumableArray(b.packages)))
  }));
}

function getLibraries(modules) {
  var libraries = {};

  for (var i = 0; i < modules.length; i++) {
    for (var key in modules[i]) {
      if (!modules[i].hasOwnProperty(key)) {
        continue;
      }

      var credit = modules[i][key];
      var creditKey = (0, _value.sortKey)(credit.name);

      if ((0, _isNil["default"])(credit.name) || credit.name.length < 1) {
        continue;
      }

      if ((0, _isNil["default"])(credit.packages)) {
        continue;
      }

      for (var h = 0; h < credit.packages.length; h++) {
        var library = credit.packages[h];
        var libraryKey = (0, _value.sortKey)(library);

        if ((0, _isNil["default"])(library)) {
          continue;
        } // Ignore radon libraries


        if (library.indexOf('radon-extension/') === 0) {
          continue;
        } // Ensure library exists


        if ((0, _isNil["default"])(libraries[libraryKey])) {
          libraries[libraryKey] = {
            name: library,
            credits: {}
          };
        } // Add `credit` to library


        libraries[libraryKey].credits[creditKey] = {
          name: credit.name,
          email: credit.email
        };
      }
    }
  } // Order libraries by name


  return (0, _orderBy["default"])((0, _map["default"])(Object.values(libraries), function (library) {
    return _objectSpread(_objectSpread({}, library), {}, {
      credits: Object.values(library.credits)
    });
  }), [function (library) {
    return (0, _value.sortKey)(library.name);
  }], ['asc']);
}

function getPeople(modules) {
  var credits = {};

  for (var i = 0; i < modules.length; i++) {
    for (var key in modules[i]) {
      if (!modules[i].hasOwnProperty(key)) {
        continue;
      } // Merge module contributor with existing data


      credits[key] = mergeContributor(_objectSpread(_objectSpread({}, (0, _cloneDeep["default"])(BaseAuthor)), credits[key]), _objectSpread(_objectSpread({}, (0, _cloneDeep["default"])(BaseAuthor)), (0, _pick["default"])(modules[i][key], Object.keys(BaseAuthor))));
    }
  } // Sort credits


  var result = (0, _orderBy["default"])(Object.values(credits), [// Contributors
  'modules.length', 'commits', // Package Authors and Maintainers
  'packages.length', function (credit) {
    return (0, _value.sortKey)(credit.name);
  }], ['desc', 'desc', 'desc', 'asc']); // Remove credits without any commits, modules or packages

  result = (0, _omitBy["default"])(result, function (credit) {
    return credit.commits < 1 && credit.modules.length < 1 && credit.packages.length < 1;
  }); // Remove credit properties with values: [], 0, null, undefined

  return (0, _map["default"])(result, function (credit) {
    return (0, _omitBy["default"])(credit, function (value) {
      return (0, _isNil["default"])(value) || Array.isArray(value) && value.length < 1 || (0, _isNumber["default"])(value) && value === 0;
    });
  });
}

function fetchPackageCredits(path) {
  function process(credits, initial) {
    return (0, _reduce["default"])(credits, function (result, value) {
      if (Array.isArray(value)) {
        process(value, initial);
      } else {
        result.push(value);
      }

      return result;
    }, initial);
  }

  return (0, _credits["default"])(path).then(function (credits) {
    return {
      bower: process(credits.bower, []),
      jspm: process(credits.jspm, []),
      npm: process(credits.npm, [])
    };
  });
}

function fetchCredits(name, path) {
  return _json["default"].read(_path["default"].join(path, 'contributors.json'), []).then(function (contributors) {
    var result = (0, _keyBy["default"])((0, _map["default"])(contributors, function (contributor) {
      return _objectSpread(_objectSpread({}, contributor), {}, {
        modules: [name],
        packages: []
      });
    }), 'name'); // Fetch package credits

    return fetchPackageCredits(path).then(function (credits) {
      for (var type in credits) {
        if (!credits.hasOwnProperty(type)) {
          continue;
        }

        for (var i = 0; i < credits[type].length; i++) {
          var person = credits[type][i];

          if (!(0, _isPlainObject["default"])(person)) {
            continue;
          }

          if ((0, _isNil["default"])(person.name) || person.name.length < 1) {
            continue;
          } // Move radon packages to modules


          person.modules = (0, _filter["default"])(person.packages, function (name) {
            return name.indexOf('radon-extension/') === 0;
          });
          person.packages = (0, _filter["default"])(person.packages, function (name) {
            return name.indexOf('radon-extension/') < 0;
          });
          var key = person.name; // Include `person` in `result`

          if ((0, _isNil["default"])(result[key])) {
            result[key] = person;
          } else {
            result[key] = _objectSpread(_objectSpread(_objectSpread({}, (0, _get["default"])(result, [key], {})), person), {}, {
              modules: [].concat(_toConsumableArray((0, _get["default"])(result, [key, 'modules'], [])), _toConsumableArray((0, _get["default"])(person, 'modules', []))),
              packages: [].concat(_toConsumableArray((0, _get["default"])(result, [key, 'packages'], [])), _toConsumableArray((0, _get["default"])(person, 'packages', [])))
            });
          }
        }
      }

      return result;
    });
  });
}

var CreditsTask = _helpers.Task.create({
  name: 'build:credits',
  description: 'Build extension credits.',
  required: ['clean', 'module:validate']
}, function (log, browser, environment) {
  var basePath = _path["default"].join(environment.outputPath, 'Resources'); // Ensure output directory exists


  _mkdirp["default"].sync(basePath); // Fetch module credits


  return Promise.all((0, _map["default"])(browser.modules, function (pkg) {
    log.debug("Fetching credits for \"".concat(pkg.name, "\"..."));
    return fetchCredits(pkg.name, pkg.path);
  })).then(function (modules) {
    var credits = {
      libraries: getLibraries(modules),
      people: getPeople(modules)
    };
    log.debug("Writing credits for ".concat(modules.length, " module(s) ") + "[".concat(credits.libraries.length, " libraries, ").concat(credits.people.length, " people]")); // Write credits to build directory

    return _fsExtra["default"].writeJson(_path["default"].join(basePath, 'credits.json'), credits, {
      spaces: 2
    });
  });
});

exports.CreditsTask = CreditsTask;
var _default = CreditsTask;
exports["default"] = _default;