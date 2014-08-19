var fs = require('fs.extra');
var path = require('path');
var touch = require("touch");
var mineos = require('../mineos/mineos');
var test = exports;
var BASE_DIR = '/var/games/minecraft';

test.tearDown = function(callback) {
  var server_list = mineos.server_list(BASE_DIR);
  for (var i in server_list) {
    fs.rmrfSync(path.join(BASE_DIR, 'servers', server_list[i]));
  }
  callback();
}

test.server_list = function (test) {
    test.ok(mineos.server_list(BASE_DIR) instanceof Array, "server returns an array");
    test.done();
};

test.is_server = function(test) {
  var server_name = 'testing';
  var server_path = path.join(BASE_DIR, 'servers', server_name);
  var sp_path = path.join(server_path, 'server.properties');

  test.ok(!mineos.is_server(server_path), 'non-existent path should fail');
  fs.mkdirSync(server_path);
  touch.sync(sp_path);
  test.ok(mineos.is_server(server_path), 'newly created path + sp should succeed');

  test.done();
}

test.create_server = function(test) {
  var server_name = 'ccc';
  var server_path = path.join(BASE_DIR, 'servers', server_name);

  test.equal(mineos.server_list(BASE_DIR).length, 0);

  test.ok(!mineos.is_server(server_path));
  fs.mkdirSync(server_path);
  touch.sync(path.join(server_path, 'server.properties'));
  touch.sync(path.join(server_path, 'server.config'));

  test.equal(mineos.server_list(BASE_DIR)[0], server_name);
  test.equal(mineos.server_list(BASE_DIR).length, 1);
  
  test.done();
}
