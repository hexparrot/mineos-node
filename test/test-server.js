var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var mineos = require('../mineos');
var server = require('../server');
var events = require('events');
var test = exports;
var BASE_DIR = '/var/games/minecraft';

test.tearDown = function(callback) {
  var server_list = new mineos.server_list(BASE_DIR);

  for (var i in server_list) {
    var instance = new mineos.mc(server_list[i], BASE_DIR);

    fs.removeSync(instance.env.cwd);
    fs.removeSync(instance.env.bwd);
    fs.removeSync(instance.env.awd);
  }
  callback();
}

test.start_backend = function(test) {
  var be = server.backend(BASE_DIR);

  test.ok(be.servers instanceof Object);
  test.ok(be.front_end instanceof events.EventEmitter);

  be.shutdown();

  test.done();
}

test.backend_cleanup = function(test) {
  var be = server.backend(BASE_DIR);

  be.front_end.of = function() { 
    return new events.EventEmitter;
  }

  be.front_end.on = function(event, fn) {
    return new events.EventEmitter;
  }

  test.equal(Object.keys(be.servers).length, 0);

  var instance = new mineos.mc('testing', BASE_DIR);
  var owner = {
    uid: 1000,
    gid: 1001
  }

  async.series([
    function(callback) {
      instance.create(owner, function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(err);
      })
    },
    function(callback) {
      instance.property('exists', function(err, result) {
        test.ifError(err);
        test.ok(result);
        callback(err);
      })
    },
    function(callback) {
      setTimeout(function() {
        be.shutdown();
        callback(true);
      }, 10)
    }
  ], function(err, results) {
    test.equal(Object.keys(be.servers).length, 0);
    test.done();
  })

}