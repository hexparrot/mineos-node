var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var userid = require('userid');
var whoami = require('whoami');
var mineos = require('../mineos');
var server = require('../server');
var events = require('events');
var test = exports;
var BASE_DIR = '/home/runner/minecraft';

test.setUp = function(callback) {
  fs.removeSync(BASE_DIR);
  callback();
}

test.tearDown = function(callback) {
  callback();
}

test.start_backend = function(test) {
  async.waterfall([
    function(cb) {
      fs.stat(BASE_DIR, function(err) {
        test.equal(err.code, 'ENOENT');
        test.ok(err);
        cb(!err);
      })
    }
  ])

  var be = server.backend(BASE_DIR, new events.EventEmitter);

  async.waterfall([
    function(cb) {
      fs.stat(BASE_DIR, function(err) {
        test.ifError(err);
        cb(err);
      })
    }
  ])

  test.ok(be.servers instanceof Object);
  test.ok(be.front_end instanceof events.EventEmitter);

  be.shutdown();
  test.done();
}
