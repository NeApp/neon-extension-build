"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.ServiceOptions = exports.ServiceIds = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Services = {
  Configuration: 'Configuration',
  Migrate: 'Migrate',
  Destination: {
    Scrobble: 'Destination:Scrobble',
    Sync: 'Destination:Sync'
  },
  Source: {
    Activity: 'Source:Activity',
    Library: 'Source:Library',
    Sync: 'Source:Sync'
  }
};
var ServiceIds = [Services.Configuration, Services.Migrate, Services.Destination.Scrobble, Services.Destination.Sync, Services.Source.Activity, Services.Source.Library, Services.Source.Sync];
exports.ServiceIds = ServiceIds;

var ServiceOptions = _defineProperty({}, Services.Migrate, {
  include: false
});

exports.ServiceOptions = ServiceOptions;
var _default = Services;
exports["default"] = _default;