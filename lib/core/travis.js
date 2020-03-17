"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.Travis = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _process = _interopRequireDefault(require("process"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Travis = /*#__PURE__*/function () {
  function Travis() {
    _classCallCheck(this, Travis);
  }

  _createClass(Travis, [{
    key: "status",
    value: function status() {
      if ((0, _isNil["default"])(this.number)) {
        return {};
      }

      var result = {
        commit: this.commit,
        tag: this.tag,
        number: this.number
      };

      if (this.branch !== this.tag) {
        result.branch = this.branch;
      }

      return result;
    }
  }, {
    key: "branch",
    get: function get() {
      var branch = _process["default"].env['TRAVIS_BRANCH'] || null;

      if ((0, _isNil["default"])(branch) || branch === this.tag) {
        return null;
      }

      return branch;
    }
  }, {
    key: "commit",
    get: function get() {
      return _process["default"].env['TRAVIS_COMMIT'] || null;
    }
  }, {
    key: "tag",
    get: function get() {
      return _process["default"].env['TRAVIS_TAG'] || null;
    }
  }, {
    key: "number",
    get: function get() {
      return _process["default"].env['TRAVIS_BUILD_NUMBER'] || null;
    }
  }]);

  return Travis;
}();

exports.Travis = Travis;

var _default = new Travis();

exports["default"] = _default;