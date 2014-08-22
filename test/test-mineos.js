var fs = require('fs-extra');
var path = require('path');
var mineos = require('../mineos/mineos');
var test = exports;
var BASE_DIR = '/var/games/minecraft';

test.tearDown = function(callback) {
  var server_list = new mineos.server_list(BASE_DIR);
  for (var i in server_list) {
    fs.removeSync(path.join(BASE_DIR, mineos.DIRS['servers'], server_list[i]));
    fs.removeSync(path.join(BASE_DIR, mineos.DIRS['backup'], server_list[i]));
    fs.removeSync(path.join(BASE_DIR, mineos.DIRS['archive'], server_list[i]));
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

test.server_list_up = function(test) {
  var servers = mineos.server_list_up();
  test.ok(servers instanceof Array);

  for (var i=0; i < servers.length; i++) {
    test.ok(/^(?!\.)[a-zA-Z0-9_\.]+$/.test(servers[i]));
  }

  test.done();
}

test.server_pids_up = function(test) {
  var servers = mineos.server_pids_up();
  test.ok(servers instanceof Object);

  for (var key in servers) {
    test.ok(servers[key].hasOwnProperty('screen'))
  }

  test.done();
}

test.is_server = function(test) {
  var instance = new mineos.mc('testing', BASE_DIR);

  test.ok(!instance.is_server(), 'non-existent path should fail');
  instance.create();
  test.ok(instance.is_server(), 'newly created path + sp should succeed');

  test.done();
}

test.create_server = function(test) {
  var server_name = 'aaa';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var uid = 1000;
  var gid = 1001;

  test.equal(mineos.server_list(BASE_DIR).length, 0);
  test.ok(!instance.is_server(instance));

  instance.create();

  test.ok(fs.existsSync(instance.env.cwd));
  test.ok(fs.existsSync(instance.env.bwd));
  test.ok(fs.existsSync(instance.env.awd));
  test.ok(fs.existsSync(instance.env.sp));
  test.ok(fs.existsSync(instance.env.sc));

  test.equal(fs.statSync(instance.env.cwd).uid, uid);
  test.equal(fs.statSync(instance.env.bwd).uid, uid);
  test.equal(fs.statSync(instance.env.awd).uid, uid);
  test.equal(fs.statSync(instance.env.sp).uid, uid);
  test.equal(fs.statSync(instance.env.sc).uid, uid);

  test.equal(fs.statSync(instance.env.cwd).gid, gid);
  test.equal(fs.statSync(instance.env.bwd).gid, gid);
  test.equal(fs.statSync(instance.env.awd).gid, gid);
  test.equal(fs.statSync(instance.env.sp).gid, gid);
  test.equal(fs.statSync(instance.env.sc).gid, gid);

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
  test.equal(instance.server_name, server_name);
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
  test.equal(instance.sp()['generate-structures'], 'false');

  instance.sp()['server-port'] = 25570;
  test.equal(instance.sp()['server-port'], '25570');

  var instance2 = new mineos.mc(server_name, BASE_DIR);
  test.equal(instance2.sp()['server-port'], '25565');

  test.notDeepEqual(instance.sp(), instance2.sp());

  test.done();
}

test.valid_server_name = function(test) {
  var regex_valid_server_name = /^(?!\.)[a-zA-Z0-9_\.]+$/;
  test.ok(mineos.valid_server_name('aaa'));
  test.ok(mineos.valid_server_name('server_1'));
  test.ok(mineos.valid_server_name('myserver'));
  test.ok(mineos.valid_server_name('1111'));
  test.ok(!mineos.valid_server_name('.aaa'));
  test.ok(!mineos.valid_server_name(''));
  test.ok(!mineos.valid_server_name('something!'));
  test.ok(!mineos.valid_server_name('#hashtag'));
  test.ok(!mineos.valid_server_name('my server'));
  test.ok(!mineos.valid_server_name('bukkit^ftb'));

  test.done();
}

test.start = function(test) {
  var server_name = 'aaa';
  var instance = new mineos.mc(server_name, BASE_DIR);
  
  instance.create();
  var proc = instance.start();

  proc.on('close', function(code) {
    setTimeout(function() {
      //console.log(mineos.server_list_up());
      test.done();
    }, 50)
  })
}

