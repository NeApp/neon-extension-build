"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseLines = parseLines;
exports.writeLines = writeLines;
exports.createHandler = createHandler;
exports.encodeOptions = encodeOptions;
exports.dedupe = dedupe;
exports.install = install;
exports.link = link;
exports.linkToGlobal = linkToGlobal;
exports.list = list;
exports.pack = pack;
exports.default = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _map = _interopRequireDefault(require("lodash/map"));

var _child_process = require("child_process");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function parseLines(lines) {
  if ((0, _isNil.default)(lines) || lines.length < 1) {
    return [];
  }

  return (0, _map.default)(lines.split('\n'), function (line) {
    line = line.trim(); // Retrieve level

    var level = 'info';

    if (line.indexOf('npm WARN ') === 0) {
      level = 'warn';
      line = line.substring(9);
    } else if (line.indexOf('npm ERR! ') === 0) {
      level = 'error';
      line = line.substring(9);
    } // Return parsed line


    return {
      level: level,
      line: line
    };
  });
}

function writeLines(log, lines) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  options = _objectSpread({
    defaultColour: null,
    prefix: null
  }, options || {});
  var prefix = '';

  if (!(0, _isNil.default)(options.prefix) && options.prefix.length > 0) {
    prefix = "".concat(options.prefix, " ");
  } // Write lines to logger


  (0, _forEach.default)(parseLines(lines), function (_ref) {
    var level = _ref.level,
        line = _ref.line;

    if (level === 'warn') {
      log.warn(prefix + _chalk.default.yellow(line));
    } else if (level === 'error') {
      log.error(prefix + _chalk.default.red(line));
    } else if (!(0, _isNil.default)(options.defaultColour)) {
      log.info(prefix + _chalk.default[options.defaultColour](line));
    } else {
      log.info(prefix + line);
    }
  });
}

function run(cmd, options) {
  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)("npm ".concat(cmd), options, function (err, stdout, stderr) {
      var result = {
        err: err || null,
        stdout: stdout && stdout.trim(),
        stderr: stderr && stderr.trim()
      };

      if (!(0, _isNil.default)(err)) {
        reject(result);
        return;
      } // Resolve promise


      resolve(result);
    });
  });
}

function createHandler(log) {
  var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return function (_ref2) {
    var stdout = _ref2.stdout,
        stderr = _ref2.stderr;
    writeLines(log, stderr, {
      defaultColour: 'cyan',
      prefix: prefix
    });
    writeLines(log, stdout, {
      prefix: prefix
    });
  };
}

function encodeOptions(options) {
  return (0, _filter.default)((0, _map.default)(options, function (value, name) {
    if (value === false) {
      return null;
    }

    if (value === true) {
      return name;
    }

    return "".concat(name, " ").concat(value);
  }), function (arg) {
    return !(0, _isNil.default)(arg);
  }).join(' ');
}

function dedupe(options) {
  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)('npm dedupe', options, function (err, stdout, stderr) {
      if (!(0, _isNil.default)(err)) {
        reject(err);
        return;
      } // Resolve promise


      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

function install(cwd, name, options) {
  if ((0, _isNil.default)(options) && (0, _isPlainObject.default)(name)) {
    options = name;
    name = null;
  }

  options = _objectSpread({
    cwd: cwd
  }, options || {});
  return new Promise(function (resolve, reject) {
    var cmd = 'npm install';

    if (!(0, _isNil.default)(name)) {
      cmd = "npm install \"".concat(name, "\"");
    }

    (0, _child_process.exec)(cmd, options, function (err, stdout, stderr) {
      if (!(0, _isNil.default)(err)) {
        reject(err);
        return;
      } // Resolve promise


      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

function link(pkgs, options) {
  if ((0, _isNil.default)(pkgs)) {
    return Promise.reject(new Error('Invalid value provided for the "name" parameter (expected array or string)'));
  }

  if ((0, _isString.default)(pkgs)) {
    pkgs = [pkgs];
  }

  if (!Array.isArray(pkgs)) {
    return Promise.reject(new Error('Invalid value provided for the "name" parameter (expected array or string)'));
  }

  if (pkgs.length < 1) {
    return Promise.resolve();
  }

  return run("link ".concat(pkgs.join(' ')), options);
}

function linkToGlobal(options) {
  return run('link', options);
}

function list(path, options) {
  var cmd = 'ls';

  if (!(0, _isNil.default)(options)) {
    cmd += " ".concat(encodeOptions(options));
  }

  return run(cmd, {
    cwd: path,
    maxBuffer: 1024 * 1024 // 1 MB

  });
}

function pack(cwd, path, options) {
  options = _objectSpread({
    cwd: cwd
  }, options || {});
  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)("npm pack \"".concat(path, "\""), options, function (err, stdout, stderr) {
      if (!(0, _isNil.default)(err)) {
        reject(err);
        return;
      } // Resolve promise


      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

var _default = {
  createHandler: createHandler,
  parseLines: parseLines,
  writeLines: writeLines,
  dedupe: dedupe,
  install: install,
  link: link,
  linkToGlobal: linkToGlobal,
  list: list,
  pack: pack
};
exports.default = _default;