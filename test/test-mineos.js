var fs = require('fs.extra');
var path = require('path');
var touch = require("touch");
var mineos = require('../mineos/mineos');
var test = exports;
var BASE_DIR = '/var/games/minecraft';
var DIRS = {
  'servers': 'servers',
  'backup': 'backup',
  'archive': 'archive',
  'profiles': 'profiles',
  'import': 'import'
}

test.tearDown = function(callback) {
  var server_list = mineos.server_list(BASE_DIR);
  for (var i in server_list) {
    fs.rmrfSync(path.join(BASE_DIR, DIRS['servers'], server_list[i]));
  }
  callback();
}

test.server_list = function (test) {
  var servers = mineos.server_list(BASE_DIR);
  test.ok(servers instanceof Array, "server returns an array");

  mineos.create_server(mineos.env('testing', BASE_DIR));
  servers = mineos.server_list(BASE_DIR);

  for (var i=0; i < servers.length; i++) {
    test.ok(mineos.is_server(mineos.env(servers[i], BASE_DIR)));
  }
  test.done();
};

test.is_server = function(test) {
  var instance = mineos.env('testing', BASE_DIR);

  test.ok(!mineos.is_server(instance), 'non-existent path should fail');
  mineos.create_server(instance);
  test.ok(mineos.is_server(instance), 'newly created path + sp should succeed');

  test.done();
}

test.create_server = function(test) {
  var server_name = 'testing';
  var instance = mineos.env(server_name, BASE_DIR);
  var server_path = path.join(BASE_DIR, DIRS['servers'], server_name);

  test.equal(mineos.server_list(BASE_DIR).length, 0);
  test.ok(!mineos.is_server(instance));

  mineos.create_server(instance);
  
  test.ok(fs.existsSync(server_path));
  test.ok(fs.existsSync(path.join(server_path, 'server.properties')));
  test.ok(fs.existsSync(path.join(server_path, 'server.config')));

  test.equal(mineos.server_list(BASE_DIR)[0], server_name);
  test.equal(mineos.server_list(BASE_DIR).length, 1);
  
  test.done();
}

test.environment = function(test) {
  var server_name = 'aaa';
  var instance = mineos.env(server_name, BASE_DIR);

  test.equal(instance.cwd, path.join(BASE_DIR, DIRS['servers'], server_name));
  test.equal(instance.bwd, path.join(BASE_DIR, DIRS['backup'], server_name));
  test.equal(instance.awd, path.join(BASE_DIR, DIRS['archive'], server_name));
  test.equal(instance.base_dir, BASE_DIR);
  test.equal(instance.server_name, server_name);
  test.equal(instance.sp, path.join(BASE_DIR, DIRS['servers'], server_name, 'server.properties'));
  test.equal(instance.sc, path.join(BASE_DIR, DIRS['servers'], server_name, 'server.config'));
  test.done();
}