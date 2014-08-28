var fs = require('fs-extra');
var path = require('path');
var mineos = require('../mineos');
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

test.server_list = function (test) {
  var servers = mineos.server_list(BASE_DIR);
  var instance = new mineos.mc('testing', BASE_DIR);

  instance.create(function(did_create) {
    servers = mineos.server_list(BASE_DIR);
    test.ok(servers instanceof Array, "server returns an array");
    test.done();
  })
};

test.server_list_up = function(test) {
  var servers = mineos.server_list_up();
  test.ok(servers instanceof Array);

  for (var i=0; i < servers.length; i++) {
    test.ok(/^(?!\.)[a-zA-Z0-9_\.]+$/.test(servers[i]));
  }

  test.done();
}

test.is_server = function(test) {
  //tests if sp exists
  var instance = new mineos.mc('testing', BASE_DIR);

  instance.is_server(function(bool_one) {
    test.ok(!bool_one);
    instance.create(function(bool_two) {
      test.ok(bool_two);
      instance.is_server(function(bool_three) {
        test.ok(bool_three);
        test.done();
      })
    })
  })
}

test.create_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var uid = 1000;
  var gid = 1001;

  test.equal(mineos.server_list(BASE_DIR).length, 0);

  instance.create(function(did_create) {
    test.ok(did_create);
    test.ok(fs.existsSync(instance.env.cwd));
    test.ok(fs.existsSync(instance.env.bwd));
    test.ok(fs.existsSync(instance.env.awd));
    test.ok(fs.existsSync(instance.env.sp));

    test.equal(fs.statSync(instance.env.cwd).uid, uid);
    test.equal(fs.statSync(instance.env.bwd).uid, uid);
    test.equal(fs.statSync(instance.env.awd).uid, uid);
    test.equal(fs.statSync(instance.env.sp).uid, uid);

    test.equal(fs.statSync(instance.env.cwd).gid, gid);
    test.equal(fs.statSync(instance.env.bwd).gid, gid);
    test.equal(fs.statSync(instance.env.awd).gid, gid);
    test.equal(fs.statSync(instance.env.sp).gid, gid);

    test.equal(mineos.server_list(BASE_DIR)[0], server_name);
    test.equal(mineos.server_list(BASE_DIR).length, 1);
    test.done();
  })
}

test.delete_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  instance.create(function(did_create) {
    test.ok(did_create);
    instance.delete(function(did_delete) {
      test.ok(did_delete);
      test.ok(!fs.existsSync(instance.env.cwd));
      test.ok(!fs.existsSync(instance.env.bwd));
      test.ok(!fs.existsSync(instance.env.awd));
      test.ok(!fs.existsSync(instance.env.sp));
      test.done();
    })
  })
}

test.mc_instance = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  test.ok(instance.env instanceof Object);

  test.equal(instance.env.cwd, path.join(BASE_DIR, mineos.DIRS['servers'], server_name));
  test.equal(instance.env.bwd, path.join(BASE_DIR, mineos.DIRS['backup'], server_name));
  test.equal(instance.env.awd, path.join(BASE_DIR, mineos.DIRS['archive'], server_name));
  test.equal(instance.env.base_dir, BASE_DIR);
  test.equal(instance.server_name, server_name);
  test.equal(instance.env.sp, path.join(BASE_DIR, mineos.DIRS['servers'], server_name, 'server.properties'));
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
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  instance.create(function(did_create) {
    test.ok(did_create);

    instance.start(function(did_start, proc) {
      test.ok(did_start);
      proc.once('close', function(code) {
        setTimeout(function() {
          var servers = mineos.server_pids_up();
          for (var key in servers) {
            test.ok(servers[key].hasOwnProperty('screen'));
            test.ok(servers[key].hasOwnProperty('java'));
          }
          instance.kill(function(did_kill) {
            test.ok(did_kill);
            test.done();
          });
        }, 200)
      })
    })
  })
}

test.archive = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  instance.create(function(did_create) {
    test.ok(did_create);
    instance.archive(function(did_archive, proc) {
      test.ok(did_archive);
      proc.once('close', function(code) {
        setTimeout(function() {
          test.equal(fs.readdirSync(instance.env.awd).length, 1);
          test.done();
        }, 200)
      })
    })
  })
}

test.backup = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  instance.create(function(did_create) {
    instance.backup(function(did_backup, proc) {
      test.ok(did_backup);
      proc.once('close', function(code) {
        setTimeout(function() {
          test.equal(fs.readdirSync(instance.env.bwd).length, 2); //+ridd-backup-data
          test.done();
        }, 200)
      })
    })
  })
}

/*
test.restore = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  instance.create(function(did_create) {
    instance.backup(function(did_backup, proc) {
      test.ok(did_backup);
      proc.once('close', function(code) {
        setTimeout(function() {
          test.equal(fs.readdirSync(instance.env.bwd).length, 2); //+ridd-backup-data
          instance.delete(function(did_delete) {
            test.ok(did_delete);
            instance.restore(function(did_restore, proc2) {
              test.ok(did_restore);
              proc2.once('close', function(code2, signal2) {
                setTimeout(function() {
                  test.equal(fs.readdirSync(instance.env.cwd).length, 1); //+rdiff-backup-data
                  test.done();
                }, 200)
              })
            })
          })
        }, 200)
      })
    })
  })
}

test.sp = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  instance.create(function(did_create) {
    test.ok(did_create);
    instance.sp(function(props) {
      test.equal(instance.sp()['server-port'], '25565');
      instance._sp.modify('server-port', '25570', function(err) {
        if (!err) {
          test.equal(instance.sp()['server-port'], '25570');
          test.done();
        }
      })
    })
  })
}
*/