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

  var instance = mineos.mc('testing', BASE_DIR);
  instance.create();
  servers = mineos.server_list(BASE_DIR);

  for (var i=0; i < servers.length; i++) {
    instance = mineos.mc(servers[i], BASE_DIR);
    test.ok(instance.is_server());
  }
  test.done();
};

test.is_server = function(test) {
  var instance = mineos.mc('testing', BASE_DIR);

  test.ok(!instance.is_server(), 'non-existent path should fail');
  instance.create();
  test.ok(instance.is_server(), 'newly created path + sp should succeed');

  test.done();
}

test.create_server = function(test) {
  var server_name = 'testing';
  var instance = mineos.mc(server_name, BASE_DIR);
  var server_path = path.join(BASE_DIR, DIRS['servers'], server_name);

  test.equal(mineos.server_list(BASE_DIR).length, 0);
  test.ok(!instance.is_server(instance));

  instance.create();

  test.ok(fs.existsSync(server_path));
  test.ok(fs.existsSync(path.join(server_path, 'server.properties')));
  test.ok(fs.existsSync(path.join(server_path, 'server.config')));

  test.equal(mineos.server_list(BASE_DIR)[0], server_name);
  test.equal(mineos.server_list(BASE_DIR).length, 1);
  
  test.done();
}

test.instance = function(test) {
  var server_name = 'aaa';
  var instance = mineos.mc(server_name, BASE_DIR);

  test.ok(instance.env instanceof Object);
  test.done();
}

test.mc_instance = function(test) {
  var server_name = 'aaa';
  var instance = mineos.mc(server_name, BASE_DIR);

  test.equal(instance.env.cwd, path.join(BASE_DIR, DIRS['servers'], server_name));
  test.equal(instance.env.bwd, path.join(BASE_DIR, DIRS['backup'], server_name));
  test.equal(instance.env.awd, path.join(BASE_DIR, DIRS['archive'], server_name));
  test.equal(instance.env.base_dir, BASE_DIR);
  test.equal(instance.env.server_name, server_name);
  test.equal(instance.env.sp, path.join(BASE_DIR, DIRS['servers'], server_name, 'server.properties'));
  test.equal(instance.env.sc, path.join(BASE_DIR, DIRS['servers'], server_name, 'server.config'));
  test.done();
}