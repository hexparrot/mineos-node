var path = require('path');
var fs = require('fs');
var async = require('async');
var mineos = require('../mineos');
var server = require('../server');
var test = exports;
var BASE_DIR = '/var/games/minecraft';

test.start_backend = function(test) {
  var events = require('events');
  var be = server.backend(BASE_DIR);

  test.ok(be.servers instanceof Object);
  test.ok(be.front_end instanceof events.EventEmitter);

  var throwaway = new mineos.mc('testing', BASE_DIR);

  async.series([
    function(callback) {
      throwaway.create(function(did_create) {
        if (did_create) {
          setTimeout(function(){
            callback(null);
          }, 200)
        }
      })
    },
    function(callback) {
      throwaway.delete(function(did_delete) {
        if (did_delete)
          callback(null);
      })
    }
  ], function(err, results) {
    be.watcher_server_list.close();
    test.done()
  })


}