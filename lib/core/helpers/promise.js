"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveOne = resolveOne;
exports.runSequential = runSequential;

function resolveOne(items, target) {
  return new Promise(function (resolve, reject) {
    var position = 0;

    function next() {
      if (position >= items.length) {
        resolve(null);
        return;
      } // Run next promise


      target(items[position++]).then(function (result) {
        resolve(result);
      }, function () {
        next();
      });
    }

    next();
  });
}

function runSequential(items, target) {
  return new Promise(function (resolve, reject) {
    var position = 0;
    var results = [];

    function next() {
      if (position >= items.length) {
        resolve(results);
        return;
      } // Run next promise


      target(items[position++]).then(function (result) {
        results.push(result);
        next();
      }, function (err) {
        reject(err);
      });
    }

    next();
  });
}