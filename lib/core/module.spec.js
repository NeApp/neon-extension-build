"use strict";

var _module = require("./module");

describe('core/module', function () {
  describe('getUniqueOrigins', function () {
    it('should remove duplicate origins', function () {
      expect((0, _module.getUniqueOrigins)(['*://www.amazon.com/*', '*://www.amazon.com/*'])).toEqual(['*://www.amazon.com/*']);
    });
    it('should remove matching origins', function () {
      expect((0, _module.getUniqueOrigins)(['*://amazon.com/*', '*://www.amazon.com/*', '*://www.amazon.com/b?*', '*://www.amazon.com/gp/video/storefront', '*://www.amazon.com/gp/video/storefront/*'])).toEqual(['*://amazon.com/*', '*://www.amazon.com/*']);
    });
  });
  describe('isOriginMatch', function () {
    it('should match same origin', function () {
      expect((0, _module.isOriginMatch)('*://www.amazon.com/*', '*://www.amazon.com/*')).toBeTruthy();
    });
    it('should match path', function () {
      expect((0, _module.isOriginMatch)('*://www.amazon.com/*', '*://www.amazon.com/gp/video/storefront')).toBeTruthy();
    });
    it('should match path with wildcards', function () {
      expect((0, _module.isOriginMatch)('*://www.amazon.com/*', '*://www.amazon.com/gp/video/storefront/*')).toBeTruthy();
    });
  });
});