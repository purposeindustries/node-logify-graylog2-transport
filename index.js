'use strict';

var dgram = require('dgram');
var zlib = require('zlib');
var util = require('util');

function populate(obj, prefix, subject, key) {
  if (typeof subject[key] == 'object') {
    return Object.keys(subject[key]).forEach(
      populate.bind(
        null,
        obj,
        prefix ? prefix + '.' + key : '_' + key,
        subject[key]
      )
    );
  }
  obj[prefix ? prefix + '.' + key : '_' + key] = subject[key];
}

function Graylog2Transport(opts) {
  opts = opts || {};
  this.client = dgram.createSocket('udp4');
  this.port = opts.port || 12201;
  this.host = opts.host || 'localhost';
  this.compress = opts.compress === undefined
                ? true
                : opts.compress;
  this.level = opts.level === undefined
             ? 6
             : opts.level;
}

Graylog2Transport.prototype.log = function log(message) {
  var msg = {
    version: '1.1',
    host: message.context.host,
    short_message: util.format.apply(null, [message.msg].concat(message.args)),
    full_message: message.err ? message.err.stack : undefined,
    timestamp: message.date / 1000,
    level: message.level.code,
  };
  Object.keys(message.context).forEach(
    populate.bind(null, msg, null, message.context)
  );
  var buf = new Buffer(JSON.stringify(msg));
  if (!this.compress) {
    return this.client.send(buf, 0, buf.length, this.port, this.host);
  }
  zlib.gzip(buf, function(err, buf) {
    this.client.send(buf, 0, buf.length, this.port, this.host);
  }.bind(this));
};

module.exports = function create(opts) {
  return new Graylog2Transport(opts);
};
