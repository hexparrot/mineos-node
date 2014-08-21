var fs = require('fs.extra');
var path = require('path');
var touch = require("touch");
var mineos = require('../mineos/mineos');
var test = exports;
var BASE_DIR = '/var/games/minecraft';

test.tearDown = function(callback) {
  var server_list = new mineos.server_list(BASE_DIR);
  for (var i in server_list) {
    fs.rmrfSync(path.join(BASE_DIR, mineos.DIRS['servers'], server_list[i]));
  }
  callback();
}

test.server_list = function (test) {
  var servers = mineos.server_list(BASE_DIR);
  test.ok(servers instanceof Array, "server returns an array");

  var instance = new mineos.mc('testing', BASE_DIR);
  instance.create();
  servers = mineos.server_list(BASE_DIR);

  for (var i=0; i < servers.length; i++) {
    instance = new mineos.mc(servers[i], BASE_DIR);
    test.ok(instance.is_server());
  }
  test.done();
};

test.is_server = function(test) {
  var instance = new mineos.mc('testing', BASE_DIR);

  test.ok(!instance.is_server(), 'non-existent path should fail');
  instance.create();
  test.ok(instance.is_server(), 'newly created path + sp should succeed');

  test.done();
}

test.create_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var server_path = path.join(BASE_DIR, mineos.DIRS['servers'], server_name);

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
  var instance = new mineos.mc(server_name, BASE_DIR);

  test.ok(instance.env instanceof Object);
  test.done();
}

test.mc_instance = function(test) {
  var server_name = 'aaa';
  var instance = new mineos.mc(server_name, BASE_DIR);

  test.equal(instance.env.cwd, path.join(BASE_DIR, mineos.DIRS['servers'], server_name));
  test.equal(instance.env.bwd, path.join(BASE_DIR, mineos.DIRS['backup'], server_name));
  test.equal(instance.env.awd, path.join(BASE_DIR, mineos.DIRS['archive'], server_name));
  test.equal(instance.env.base_dir, BASE_DIR);
  test.equal(instance.env.server_name, server_name);
  test.equal(instance.env.sp, path.join(BASE_DIR, mineos.DIRS['servers'], server_name, 'server.properties'));
  test.equal(instance.env.sc, path.join(BASE_DIR, mineos.DIRS['servers'], server_name, 'server.config'));
  test.done();
}

test.sp = function(test) {
  var server_name = 'aaa';
  var instance = new mineos.mc(server_name, BASE_DIR);

  test.equal(instance.sp()['server-port'], '25565');
  test.equal(instance.sp()['max-players'], '20');
  test.equal(instance.sp()['level-seed'], '');
  test.equal(instance.sp()['gamemode'], '0');
  test.equal(instance.sp()['difficulty'], '1');
  test.equal(instance.sp()['level-type'], 'DEFAULT');
  test.equal(instance.sp()['level-name'], 'world');
  test.equal(instance.sp()['max-build-height'], '256');
  test.equal(instance.sp()['generate-structures'], 'false');
  test.equal(instance.sp()['generator-settings'], '');
  test.equal(instance.sp()['server-ip'], '0.0.0.0');

  instance.sp()['server-port'] = 25570;
  test.equal(instance.sp()['server-port'], '25570');

  var instance2 = new mineos.mc(server_name, BASE_DIR);
  test.equal(instance2.sp()['server-port'], '25565');

  test.notDeepEqual(instance.sp(), instance2.sp());

  test.done();
}