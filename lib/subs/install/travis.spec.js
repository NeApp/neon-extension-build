"use strict";

var Travis = _interopRequireWildcard(require("./travis"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

describe('Commands', function () {
  describe('install:travis', function () {
    describe('getBranches', function () {
      it('should handle default branches', function () {
        expect(Travis.getBranches('develop')).toEqual(['develop', 'master']);
        expect(Travis.getBranches('master')).toEqual(['master', 'develop']);
      });
      it('should handle unknown branches', function () {
        expect(Travis.getBranches('feature/test')).toEqual(['feature/test', 'develop', 'master']);
      });
      it('should handle version tags', function () {
        expect(Travis.getBranches('v1.0.0')).toEqual(['v1.0.0', 'master']);
      });
    });
  });
});