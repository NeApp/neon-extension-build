"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var DevelopmentEnvironment = {
  name: 'development',
  title: 'Development',
  webpack: {
    debug: true,
    minimize: false,
    validate: true,
    devtool: 'cheap-module-source-map'
  }
};
var ProductionEnvironment = {
  name: 'production',
  title: 'Production',
  webpack: {
    debug: false,
    minimize: true,
    validate: false,
    devtool: 'hidden-source-map'
  }
};
var _default = {
  dev: DevelopmentEnvironment,
  development: DevelopmentEnvironment,
  prod: ProductionEnvironment,
  production: ProductionEnvironment
};
exports.default = _default;