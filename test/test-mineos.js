var fs = require('fs');
var path = require('path');
var touch = require("touch");
var mineos = require('../mineos/mineos');

var test = exports;

test.tearDown = function(callback) {
  var server_list = mineos.server_list('/var/games/minecraft');
  for (var i in server_list) {
    fs.unlink( path.join('/var/games/minecraft/servers', server_list[i], 'server.properties') );
    fs.unlink( path.join('/var/games/minecraft/servers', server_list[i], 'server.config') );
    fs.rmdirSync(path.join('/var/games/minecraft/servers', server_list[i]));
  }
  callback();
}

test.server_list = function (test) {
    test.ok(mineos.server_list('/var/games/minecraft') instanceof Array, "server returns an array");
    test.done();
};

test.is_server = function(test) {
  var server_name = 'testing';
  var base_dir = '/var/games/minecraft';
  var server_path = path.join(base_dir, server_name);
  var sp_path = path.join(server_path, 'server.properties');

  test.ok(!mineos.is_server(server_path), 'non-existent path should fail');
  fs.mkdirSync(server_path);
  touch.sync(sp_path);
  test.ok(mineos.is_server(server_path), 'newly created path + sp should succeed');

  test.done();
}

test.create_server = function(test) {
  var server_name = 'ccc';
  var base_dir = '/var/games/minecraft';
  var server_path = path.join(base_dir, 'servers', server_name);

  test.equal(mineos.server_list(base_dir).length, 0);

  test.ok(!mineos.is_server(server_path));
  fs.mkdirSync(server_path);
  touch.sync(path.join(server_path, 'server.properties'));
  touch.sync(path.join(server_path, 'server.config'));

  test.equal(mineos.server_list(base_dir)[0], server_name);
  test.equal(mineos.server_list(base_dir).length, 1);
  test.done();
}
