"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseLines = parseLines;
exports.writeLines = writeLines;
exports.run = run;
exports.spawn = spawn;
exports.createHandler = createHandler;
exports.encodeOptions = encodeOptions;
exports.dedupe = dedupe;
exports.install = install;
exports.list = list;
exports.pack = pack;
exports["default"] = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _child_process = _interopRequireWildcard(require("child_process"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _map = _interopRequireDefault(require("lodash/map"));

var _stream = require("./helpers/stream");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function parseLines(lines) {
  if ((0, _isNil["default"])(lines) || lines.length < 1) {
    return [];
  }

  return (0, _map["default"])(lines.split('\n'), function (line) {
    line = line.trim(); // Retrieve level

    var level = 'info';

    if (line.indexOf('npm notice') === 0) {
      level = 'notice';
      line = line.substring(10);
    } else if (line.indexOf('npm WARN') === 0) {
      level = 'warn';
      line = line.substring(8);
    } else if (line.indexOf('npm ERR!') === 0) {
      level = 'error';
      line = line.substring(8);
    } // Clean line


    line = line.trim(); // Return parsed line

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

  if (!(0, _isNil["default"])(options.prefix) && options.prefix.length > 0) {
    prefix = "".concat(options.prefix, " ");
  } // Write lines to logger


  (0, _forEach["default"])(parseLines(lines), function (_ref) {
    var level = _ref.level,
        line = _ref.line;

    if (line.length < 1) {
      return;
    }

    if (level === 'notice') {
      log.debug(prefix + line);
    } else if (level === 'warn') {
      log.warn(prefix + _chalk["default"].yellow(line));
    } else if (level === 'error') {
      log.error(prefix + _chalk["default"].red(line));
    } else if (!(0, _isNil["default"])(options.defaultColour)) {
      log.info(prefix + _chalk["default"][options.defaultColour](line));
    } else {
      log.info(prefix + line);
    }
  });
}

function run(cwd, cmd, options) {
  options = _objectSpread({
    cwd: cwd
  }, options || {});
  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)("npm ".concat(cmd), options, function (err, stdout, stderr) {
      var result = {
        err: err || null,
        stdout: stdout && stdout.trim(),
        stderr: stderr && stderr.trim()
      };

      if (!(0, _isNil["default"])(err)) {
        reject(result);
        return;
      } // Resolve promise


      resolve(result);
    });
  });
}

function spawn(cwd, args) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  options = _objectSpread({
    logger: null,
    prefix: null
  }, options || {});
  return new Promise(function (resolve, reject) {
    var proc = _child_process["default"].spawn('npm', args, {
      shell: true,
      cwd: cwd
    }); // Listen for "error" events


    proc.on('error', function (err) {
      reject(new Error("Unable to start process: ".concat(err && err.message ? err.message : err)));
    }); // Listen for "close" events

    proc.on('close', function (code) {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Process exited with code: ".concat(code)));
      }
    }); // Ensure logger is enabled

    if ((0, _isNil["default"])(options.logger)) {
      return;
    } // Configure streams to emit "line" events


    (0, _stream.emitLines)(proc.stdout);
    (0, _stream.emitLines)(proc.stderr); // Write stdout lines to logger

    proc.stdout.on('line', function (line) {
      return writeLines(options.logger, line, {
        prefix: options.prefix
      });
    }); // Write stderr lines to logger

    proc.stderr.on('line', function (line) {
      return writeLines(options.logger, line, {
        defaultColour: 'cyan',
        prefix: options.prefix
      });
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
  return (0, _filter["default"])((0, _map["default"])(options, function (value, name) {
    if (value === false) {
      return null;
    }

    if (value === true) {
      return name;
    }

    return "".concat(name, " ").concat(value);
  }), function (arg) {
    return !(0, _isNil["default"])(arg);
  }).join(' ');
}

function dedupe(cwd, options) {
  return run(cwd, 'dedupe', options);
}

function install(cwd, name, options) {
  if ((0, _isNil["default"])(options) && (0, _isPlainObject["default"])(name)) {
    options = name;
    name = null;
  }

  options = _objectSpread({
    cwd: cwd
  }, options || {});
  return new Promise(function (resolve, reject) {
    var cmd = 'npm install';

    if (!(0, _isNil["default"])(name)) {
      cmd = "npm install \"".concat(name, "\"");
    }

    (0, _child_process.exec)(cmd, options, function (err, stdout, stderr) {
      if (!(0, _isNil["default"])(err)) {
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

function list(cwd, options) {
  var cmd = 'ls';

  if (!(0, _isNil["default"])(options)) {
    cmd += " ".concat(encodeOptions(options));
  }

  return run(cwd, cmd, {
    maxBuffer: 1024 * 1024 // 1 MB

  });
}

function pack(cwd, path, options) {
  options = _objectSpread({
    cwd: cwd
  }, options || {});
  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)("npm pack \"".concat(path, "\""), options, function (err, stdout, stderr) {
      if (!(0, _isNil["default"])(err)) {
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
  list: list,
  pack: pack,
  run: run,
  spawn: spawn
};
exports["default"] = _default;