var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var mineos = require('../mineos');
var userid = require('userid');
var whoami = require('whoami');
var test = exports;

var BASE_DIR = '/var/games/minecraft';
var FS_DELAY_MS = 200;
var PROC_START_DELAY_MS = 200;

var OWNER_CREDS = {
  uid: userid.uid(process.env.USER) || 1000,
  gid: userid.gid(process.env.USER) || 1000
}

function delete_everything(callback) {
  var server_list = new mineos.server_list(BASE_DIR);

  function delete_server(server_name, cb) {
    var instance = new mineos.mc(server_name, BASE_DIR);

    async.series([
      function(c) { instance.kill(function(err) { c() }) },
      async.apply(fs.remove, instance.env.cwd),
      async.apply(fs.remove, instance.env.bwd),
      async.apply(fs.remove, instance.env.awd)
    ], cb)
  }

  async.each(server_list, delete_server, callback)
}

test.setUp = function(callback) {
  async.parallel([
    async.apply(fs.ensureDir, path.join(BASE_DIR, mineos.DIRS['servers'])),
    async.apply(fs.ensureDir, path.join(BASE_DIR, mineos.DIRS['archive'])),
    async.apply(fs.ensureDir, path.join(BASE_DIR, mineos.DIRS['backup'])),
    async.apply(fs.ensureDir, path.join(BASE_DIR, mineos.DIRS['profiles'])),
  ], function() {
    delete_everything(callback);
  })
}

test.tearDown = function(callback) {
  delete_everything(callback);
}

test.dependencies_met = function(test) {
  async.series([
    async.apply(mineos.dependencies)
  ], function(err, results) {
    test.ifError(err);
    test.done();
  })
}

test.server_list = function (test) {
  var servers = mineos.server_list(BASE_DIR);
  var instance = new mineos.mc('testing', BASE_DIR);

  instance.create(OWNER_CREDS, function(err, did_create) {
    servers = mineos.server_list(BASE_DIR);
    test.ifError(err);
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

  async.series([
    function(callback) {
      instance.property('!exists', function(err, result) {
        test.ifError(err);
        test.ok(result);
        callback(err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('exists', function(err, result) {
        test.ifError(err);
        test.ok(result);
        callback(err);
      })
    },
  ], function(err) {
    test.ifError(err);
    test.expect(5);
    test.done();
  })
}

test.create_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  test.equal(mineos.server_list(BASE_DIR).length, 0);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(fs.stat, instance.env.cwd),
    async.apply(fs.stat, instance.env.bwd),
    async.apply(fs.stat, instance.env.awd),
    async.apply(fs.stat, instance.env.sp),
    async.apply(fs.stat, instance.env.sc),
    async.apply(fs.stat, instance.env.cc),
    function(callback) {
      test.equal(fs.statSync(instance.env.cwd).uid, OWNER_CREDS['uid']);
      test.equal(fs.statSync(instance.env.bwd).uid, OWNER_CREDS['uid']);
      test.equal(fs.statSync(instance.env.awd).uid, OWNER_CREDS['uid']);
      test.equal(fs.statSync(instance.env.sp).uid, OWNER_CREDS['uid']);
      test.equal(fs.statSync(instance.env.sc).uid, OWNER_CREDS['uid']);
      test.equal(fs.statSync(instance.env.cc).uid, OWNER_CREDS['uid']);

      test.equal(fs.statSync(instance.env.cwd).gid, OWNER_CREDS['gid']);
      test.equal(fs.statSync(instance.env.bwd).gid, OWNER_CREDS['gid']);
      test.equal(fs.statSync(instance.env.awd).gid, OWNER_CREDS['gid']);
      test.equal(fs.statSync(instance.env.sp).gid, OWNER_CREDS['gid']);
      test.equal(fs.statSync(instance.env.sc).gid, OWNER_CREDS['gid']);
      test.equal(fs.statSync(instance.env.cc).gid, OWNER_CREDS['gid']);

      test.equal(mineos.server_list(BASE_DIR)[0], server_name);
      test.equal(mineos.server_list(BASE_DIR).length, 1);

      instance.sc(function(err, dict) {
        test.equal(dict.java.java_xmx, '256');
        test.equal(dict.onreboot.start, false);
      })

      callback();
    },
    function(callback) {
      instance.create(OWNER_CREDS, function(err){
        test.ifError(!err);
        callback(!err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.server_ownership = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.property('owner', function(err, result) {
        test.ifError(!err);
        test.equal(Object.keys(result).length, 0);
        callback(!err);
      })
    },
    function(callback) {
      instance.property('owner_uid', function(err, result) {
        test.ifError(!err);
        test.equal(result, null);
        callback(!err);
      })
    },
    function(callback) {
      instance.property('owner_gid', function(err, result) {
        test.ifError(!err);
        test.equal(result, null);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('owner_uid', function(err, result) {
        test.ifError(err);
        test.equal(result, OWNER_CREDS['uid']);
        callback(err);
      })
    },
    function(callback) {
      instance.property('owner_gid', function(err, result) {
        test.ifError(err);
        test.equal(result, OWNER_CREDS['gid']);
        callback(err);
      })
    },
    function(callback) {
      instance.property('owner', function(err, result) {
        test.ifError(err);
        test.equal(result['uid'], OWNER_CREDS['uid']);
        test.equal(result['gid'], OWNER_CREDS['gid']);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.expect(14);
    test.done();
  })
}

test.delete_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.delete(function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.verify, 'exists'),
    async.apply(instance.delete),
    async.apply(instance.verify, '!exists'),
  ], function(err) {
    test.ifError(err);
    test.expect(2);
    test.done();
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

test.extract_server_name = function(test) {
  test.equal(mineos.extract_server_name(BASE_DIR, '/var/games/minecraft/servers/a'), 'a');
  test.equal(mineos.extract_server_name(BASE_DIR, '/var/games/minecraft/servers/a/b'), 'a');
  test.equal(mineos.extract_server_name(BASE_DIR, '/var/games/minecraft/servers/a/b/plugins'), 'a');
  test.throws(function(){mineos.extract_server_name(BASE_DIR, '/var/games/minecraft/servers')}, 'no server name in path');
  test.throws(function(){mineos.extract_server_name(BASE_DIR, '/var/games/minecraft')}, 'no server name in path');
  test.done();
}

test.get_start_args = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(!err); //expected error
        test.equal(err, 'Cannot start server without a designated jar/phar.');
        test.equal(args, null);
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jarfile', 'PocketMine-MP.phar'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2], './bin/php5/bin/php');
        test.equal(args[3], 'PocketMine-MP.phar');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms256M');
        test.equal(args[6], '-jar');
        test.equal(args[7], 'minecraft_server.1.7.9.jar');
        test.equal(args[8], 'nogui');
        callback(err);
      })
    },
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.get_start_args_java = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'java', 'java_xmx', '-256'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(!err); //testing for positive error
        test.equal(args, null);
        test.equal(err, 'Cannot start server without a designated jar/phar.');
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xmx', '256'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(!err); //testing for positive error
        test.equal(args, null);
        test.equal(err, 'Cannot start server without a designated jar/phar.');
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms256M');
        test.equal(args[6], '-jar');
        test.equal(args[7], 'minecraft_server.1.7.9.jar');
        test.equal(args[8], 'nogui');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xms', '-256'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(!err); //testing for positive error
        test.equal(Object.keys(args).length, 0);
        test.equal(err, 'XMS heapsize must be positive integer where XMX >= XMS > 0');
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xms', '128'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms128M');
        test.equal(args[6], '-jar');
        test.equal(args[7], 'minecraft_server.1.7.9.jar');
        test.equal(args[8], 'nogui');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_tweaks', '-Xmx2G -XX:MaxPermSize=256M'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms128M');
        test.equal(args[6], '-Xmx2G -XX:MaxPermSize=256M');
        test.equal(args[7], '-jar');
        test.equal(args[8], 'minecraft_server.1.7.9.jar');
        test.equal(args[9], 'nogui');
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.get_start_args_phar = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'PocketMine-MP.phar'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2], './bin/php5/bin/php');
        test.equal(args[3], 'PocketMine-MP.phar');
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.start = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.stuff('stop', function(err, proc) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      instance.property('screen_pid', function(err, pid) {
        test.ifError(err);
        test.equal(typeof(pid), 'number');
        test.ok(pid > 0);
        callback(err);
      })
    },
    function(callback) {
      instance.property('java_pid', function(err, pid) {
        test.ifError(err);
        test.equal(typeof(pid), 'number');
        test.ok(pid > 0);
        callback(err);
      })
    },
    function(callback) {
      instance.start(function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.kill)
  ], function(err, results) {
    test.ifError(err);
    test.expect(9);
    test.done();
  })
}

test.stop = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.stop(function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    async.apply(instance.verify, 'up'),
    async.apply(instance.stop),
    async.apply(instance.verify, '!up')
  ], function(err, results) {
    test.ifError(err);
    test.expect(2);
    test.done();
  })
}

test.stop_and_backup = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    async.apply(instance.stop_and_backup),
    async.apply(instance.verify, '!up'),
    function(callback) {
      test.ok(fs.readdirSync(instance.env.bwd).length > 2);
      callback(null);
    }
  ], function(err) {
    test.ifError(err);
    test.expect(2);
    test.done();
  })
}

test.restart = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      setTimeout(callback, 10000);
    },
    async.apply(instance.verify, 'up'),
    async.apply(instance.restart),
    async.apply(instance.verify, 'up'),
  ], function(err) {
    test.ifError(err);
    test.expect(1);
    test.done();
  })
}

test.kill = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.kill(function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.kill(function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    async.apply(instance.verify, 'up'),
    async.apply(instance.kill),
    async.apply(instance.verify, '!up'),
    function(callback) {
      instance.kill(function(err) {
        test.ifError(!err);
        callback(!err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.expect(4);
    test.done();
  })
}

test.archive = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.archive),
    function(callback) {
      test.equal(fs.readdirSync(instance.env.awd).length, 1);
      callback(null);
    }
  ], function(err) {
    test.ifError(err);
    test.expect(2);
    test.done();
  })
}

test.backup = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.backup),
    function(callback) {
      test.equal(fs.readdirSync(instance.env.bwd).length, 4);
      callback(null);
    }
  ], function(err) {
    test.ifError(err);
    test.expect(2);
    test.done();
  })
}

test.restore = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.backup),
    async.apply(fs.remove, instance.env.cwd),
    async.apply(instance.verify, '!exists'),
    async.apply(instance.restore, 'now'),
    function(callback) {
      test.equal(fs.readdirSync(instance.env.cwd).length, 3);
      callback(null);
    }
  ], function(err) {
    test.ifError(err);
    test.expect(2);
    test.done();
  })
}

test.sc = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'java', 'java_xmx', '512'),
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xmx, '512');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xms', '256'),
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xms, '256');
        test.equal(dict.java.java_xmx, '512');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xmx', '1024'),
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xms, '256');
        test.equal(dict.java.java_xmx, '1024');
        callback(err);
      })
    },
  ], function(err) {
    test.ifError(err);
    test.expect(9);
    test.done();
  })
}

test.sp = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.sp(function(err, dict) {
        test.ifError(err);
        test.equal(dict['server-port'], '25565');
        callback(err);
      })
    },
    async.apply(instance.modify_sp, 'server-port', '25570'),
    function(callback) {
      instance.sp(function(err, dict) {
        test.ifError(err);
        test.equal(dict['server-port'], '25570');
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.expect(5);
    test.done();
  })
}

test.properties = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.property('exists', function(err, does_exist) {
        test.ifError(err);
        test.ok(!does_exist);
        callback(err);
      })
    },
    function(callback) {
      instance.property('java_pid', function(err, java_pid) {
        test.ok(err); //looking for positive error
        test.equal(java_pid, null);
        callback(!err);
      })
    },
    function(callback) {
      instance.property('screen_pid', function(err, screen_pid) {
        test.ok(err); //looking for positive error
        test.equal(screen_pid, null);
        callback(!err);
      })
    },
    function(callback) {
      instance.create(OWNER_CREDS, function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    function(callback) {
      instance.property('exists', function(err, does_exist) {
        test.ifError(err);
        test.ok(does_exist);
        callback(err);
      })
    },
    function(callback) {
      instance.property('owner', function(err, owner_info) {
        test.ifError(err);
        test.ok('uid' in owner_info);
        test.ok('gid' in owner_info);
        test.ok('username' in owner_info);
        test.ok('groupname' in owner_info);
        callback(err);
      })
    },
    function(callback) {
      instance.property('up', function(err, up) {
        test.ifError(err);
        test.equal(up, false);
        callback(err);
      })
    },
    function(callback) {
      instance.property('server-port', function(err, port) {
        test.ifError(err);
        test.equal(port, 25565);
        callback(err);
      })
    },
    function(callback) {
      instance.property('server-ip', function(err, ip) {
        test.ifError(err);
        test.equal(ip, '0.0.0.0');
        callback(err);
      })
    },
    function(callback) {
      instance.property('memory', function(err, memory) {
        test.ok(err); //testing for error
        test.equal(memory, null);
        callback(!err);
      })
    },
    function(callback) {
      instance.property('ping', function(err, ping) {
        test.ok(err); //testing for error
        test.equal(ping, null)
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    function(callback) {
      instance.start(function(err) {
        test.ifError(err);
        setTimeout(function() {callback(err)}, PROC_START_DELAY_MS)
      })
    },
    function(callback) {
      instance.property('java_pid', function(err, java_pid) {
        test.ifError(err);
        test.equal(typeof(java_pid), 'number');
        callback(err);
      })
    },
    function(callback) {
      instance.property('screen_pid', function(err, screen_pid) {
        test.ifError(err);
        test.equal(typeof(screen_pid), 'number');
        callback(err);
      })
    },
    function(callback) {
      instance.property('exists', function(err, does_exist) {
        test.ifError(err);
        test.ok(does_exist);
        callback(err);
      })
    },
    function(callback) {
      instance.property('up', function(err, up) {
        test.ifError(err);
        test.equal(up, true);
        callback(err);
      })
    },
    function(callback) {
      instance.property('server-port', function(err, port) {
        test.ifError(err);
        test.equal(port, 25565);
        callback(err);
      })
    },
    function(callback) {
      instance.property('server-ip', function(err, ip) {
        test.ifError(err);
        test.equal(ip, '0.0.0.0');
        callback(err);
      })
    },
    function(callback) {
      instance.property('memory', function(err, memory) {
        test.ifError(err);
        test.ok(memory);
        test.ok('VmRSS' in memory);
        callback(err);
      })
    },
    function(callback) {
      instance.property('du_awd', function(err, bytes) {
        test.ifError(err);
        test.ok(!isNaN(bytes));
        callback(err);
      })
    },function(callback) {
      instance.property('du_bwd', function(err, bytes) {
        test.ifError(err);
        test.ok(!isNaN(bytes));
        callback(err);
      })
    },
    function(callback) {
      instance.property('du_cwd', function(err, bytes) {
        test.ifError(err);
        test.ok(!isNaN(bytes));
        callback(err);
      })
    },
    function(callback) {
      setTimeout(function() {
        instance.kill(function(err) {
          test.ifError(err);
          callback(err);
        })
      }, 200)
    }
  ], function(err) {
    test.ifError(err);
    test.expect(48);
    test.done();
  })
}

test.verify = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  
  async.series([
    async.apply(instance.verify, '!exists'),
    function(callback) {
      instance.verify('exists', function(err) {
        test.ifError(!err);
        test.equal(err, 'exists');
        callback(!err);
      })
    },
    async.apply(instance.verify, '!up'),
    function(callback) {
      instance.verify('up', function(err) {
        test.ifError(!err);
        test.equal(err, 'up');
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.verify('!exists', function(err) {
        test.ifError(!err);
        test.equal(err, '!exists');
        callback(!err);
      })
    },
    async.apply(instance.verify, 'exists'),
    async.apply(instance.verify, '!up'),
    function(callback) {
      instance.verify('up', function(err) {
        test.ifError(!err);
        test.equal(err, 'up');
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.start),
    function(callback) {
      instance.verify('!exists', function(err) {
        test.ifError(!err);
        test.equal(err, '!exists');
        callback(!err);
      })
    },
    async.apply(instance.verify, 'exists'),
    function(callback) {
      instance.verify('!up', function(err) {
        test.ifError(!err);
        test.equal(err, '!up');
        callback(!err);
      })
    },
    async.apply(instance.verify, 'up'),
    async.apply(instance.kill)
  ], function(err) {
    test.expect(12);
    test.done();
  })
}

test.ping = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      setTimeout(function() {
        instance.ping(function(err, pingback) {
          test.ifError(err);
          test.equal(pingback.protocol, 127);
          test.equal(pingback.server_version, '1.7.9');
          test.equal(pingback.motd, 'A Minecraft Server');
          test.equal(pingback.players_online, 0);
          test.equal(pingback.players_max, 20);
          callback(err);
        })
      }, 15000)
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.expect(7);
    test.done();
  })
}

test.ping_legacy = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.2.5'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.2.5.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      setTimeout(function() {
        instance.ping(function(err, pingback) {
          test.ifError(err);
          test.equal(pingback.protocol, '');
          test.equal(pingback.server_version, '');
          test.equal(pingback.motd, 'A Minecraft Server');
          test.equal(pingback.players_online, 0);
          test.equal(pingback.players_max, 20);
          callback(err);
        })
      }, 10000)
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.expect(7);
    test.done();
  })
}

test.ping_phar = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'pocketmine.phar'),
    function(callback) {
      instance.property('ping', function(err, pingback) {
        test.ifError(!err); //expected error
        test.equal(pingback, null);
        callback(!err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.memory = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var memory_regex = /(\d+) kB/

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      instance.start(function() {
        setTimeout(callback, 400);
      })
    },
    function(callback) {
      instance.property('memory', function(err, memory_obj) {
        test.ifError(err);
        test.equal(memory_obj.Name, 'java');
        test.ok(memory_regex.test(memory_obj.VmPeak));
        test.ok(memory_regex.test(memory_obj.VmSize));
        test.ok(memory_regex.test(memory_obj.VmRSS));
        test.ok(memory_regex.test(memory_obj.VmSwap));
        callback(err);
      })
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.expect(7);
    test.done();
  })  
}

test.prune = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var saved_increment = null;

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sp, 'server-port', 25570),
    function(callback) {
      instance.backup(function() {
        setTimeout(callback, FS_DELAY_MS*5);
      })
    },
    async.apply(instance.modify_sp, 'server-port', 25575),
    function(callback) {
      instance.backup(function() {
        setTimeout(callback, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.list_increments(function(err, increments) {
        test.equal(increments.length, 2);
        test.equal(increments[0].step, '0B');
        test.equal(increments[1].step, '1B');
        saved_increment = increments[0].time;
        setTimeout(function() { callback(err) }, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.prune('0B', function(err) {
        test.ifError(err);
        callback();
      })
    },
    function(callback) {
      instance.list_increments(function(err, increments) {
        test.equal(increments.length, 1);
        test.equal(increments[0].step, '0B');
        test.equal(saved_increment, increments[0].time);
        setTimeout(function() { callback(err) }, FS_DELAY_MS*5);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.done();
  })  
}

test.list_increments = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.list_increments(function(err, increments) {
        test.ok(err); // testing for error
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.list_increments(function(err, increments) {
        test.ok(err); // testing for error
        callback(!err);
      })
    },
    function(callback) {
      instance.backup(function() {
        setTimeout(callback, 400);
      })
    },
    function(callback) {
      instance.modify_sp('server-port', 25570, function() {
        setTimeout(callback, 400);
      })
    },
    async.apply(instance.modify_sp, 'server-port', 25570),
    function(callback) {
      instance.backup(function() {
        setTimeout(callback, 400);
      })
    },
    function(callback) {
      instance.list_increments(function(err, increments) {
        test.equal(increments[0].step, '0B');
        test.equal(increments[1].step, '1B');
        for (var i in increments) {
          test.ok('step' in increments[i]);
          test.ok('time' in increments[i]);
          test.ok('size' in increments[i]);
          test.ok('cum' in increments[i]);
        }
        setTimeout(function() { callback(err) }, FS_DELAY_MS*3);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.expect(13);
    test.done();
  })  
}

test.modify_sp = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.sp(function(err, props) {
        test.ifError(err);
        test.equal(props['server-port'], 25565);
        callback(err);
      })
    },
    async.apply(instance.modify_sp, 'server-port', 25570),
    function(callback) {
      instance.sp(function(err, props) {
        test.ifError(err);
        test.equal(props['server-port'], 25570);
        callback(err);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.expect(5);
    test.done();
  })  
}

test.list_archive = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.list_archives(function(err, archives) {
        test.ifError(!err);
        test.equal(archives.length, 0);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.archive),
    function(callback) {
      setTimeout(function() {callback()}, 1000);
    },
    async.apply(instance.archive),
    function(callback) {
      instance.list_archives(function(err, archives) {
        test.ifError(err);
        test.equal(archives.length, 2);
        callback(err);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.expect(5);
    test.done();
  })  
}

test.delete_archive = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.waterfall([
    function(callback) {
      instance.create(OWNER_CREDS, function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    function(callback) {
      instance.archive(function(err) {
        test.ifError(err);
        setTimeout(function() { callback(err) }, FS_DELAY_MS*6);
      })
    },
    function(callback) {
      instance.archive(function(err) {
        test.ifError(err);
        setTimeout(function() { callback(err) }, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.list_archives(function(err, archives) {
        test.ifError(err);
        test.equal(archives.length, 2);
        callback(err, archives[1].filename, archives[0].filename);
      })
    },
    function(archive_to_delete, archive_to_remain, callback) {
      instance.delete_archive(archive_to_delete, function(err) {
        test.ifError(err);
        callback(err, archive_to_remain);
      })
    },
    function(archive_to_remain, callback) {
      instance.list_archives(function(err, archives) {
        test.ifError(err);
        test.equal(archives[0].filename, archive_to_remain);
        test.equal(archives.length, 1);
        callback(err);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.expect(10);
    test.done();
  })  
}

test.previous_version = function(test) {
  var ini = require('ini');
  
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.backup(function(err) {
        test.ifError(err);
        setTimeout(function() { callback(err) }, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.modify_sp('server-port', 25570, function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    function(callback) {
      instance.previous_version('server.properties', '0B', function(err, file_contents) {
        var decoded = ini.decode(file_contents);
        test.equal(decoded['server-port'], 25565); 
        callback(err);
      })
    },
    function(callback) {
      instance.backup(function(err) {
        test.ifError(err);
        setTimeout(function() { callback(err) }, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.previous_version('server.properties', '1B', function(err, file_contents) {
        var decoded = ini.decode(file_contents);
        test.equal(decoded['server-port'], 25565); 
        callback(err);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.expect(6);
    test.done();
  }) 
}

test.previous_property = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.previous_property('1B', function(err, psp) {
        test.ifError(!err); //testing for error
        test.equal(psp, null);
        callback(!err);
      })
    },
    function(callback) {
      instance.backup(function(err) {
        test.ifError(err);
        setTimeout(function() { callback(err) }, FS_DELAY_MS*3);
      })
    },
    function(callback) {
      instance.modify_sp('server-port', 25570, function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    function(callback) {
      instance.previous_property('0B', function(err, psp) {
        test.ifError(err);
        test.equal(psp['server-port'], '25565');
        callback(err);
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.expect(7);
    test.done();
  })
}

test.stuff = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.stuff('op hexparrot', function(err, proc) {
        test.ok(err); //looking for positive error
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.stuff('op hexparrot', function(err, proc) {
        test.ok(err); //looking for positive error
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      setTimeout(callback, 10000);
    },
    async.apply(instance.stuff, 'op hexparrot'),
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.expect(3);
    test.done();
  })
}

test.accept_eula = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.waterfall([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), 'eula=false'),
    async.apply(instance.accept_eula),
    async.apply(fs.readFile, path.join(instance.env.cwd, 'eula.txt')),
    function(eula_text, callback) {
      test.equal(eula_text.toString(), 'eula=true');
      callback(null);
    }
  ], function(err) {
    test.expect(1);
    test.done();
  })
}

test.chown = function(test) {
  test.done();
  return;
  var userid = require('userid');

  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var NEW_OWNER_CREDS = {
    uid: 1001,
    gid: 1001
  }

  if (userid.uid(process.env.USER) != 0) {
    NEW_OWNER_CREDS = {
      uid: userid.uid(process.env.USER),
      gid: userid.uid(process.env.USER)
    }
  }

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('owner', function(err, result) {
        test.ifError(err);
        test.equal(OWNER_CREDS['uid'], result['uid']);
        test.equal(OWNER_CREDS['gid'], result['gid']);
        callback(err);
      })
    },
    async.apply(instance.chown, NEW_OWNER_CREDS.uid, NEW_OWNER_CREDS.gid),
    function(callback) {
      instance.property('owner', function(err, result) {
        test.ifError(err);
        test.equal(NEW_OWNER_CREDS['uid'], result['uid']);
        test.equal(NEW_OWNER_CREDS['gid'], result['gid']);
        callback(err);
      })
    }
  ], function(err) {
    test.expect(6);
    test.done();
  })
}

test.broadcast_property = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('broadcast', function(err, will_broadcast) {
        test.ifError(err);
        test.ok(!will_broadcast);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'broadcast', 'true'),
    function(callback) {
      instance.property('broadcast', function(err, will_broadcast) {
        test.ifError(err);
        test.ok(true);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.server_files_property = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(!err);
        test.equal(server_files.length, 0);
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 0);
        callback(err);
      })
    },
    async.apply(fs.ensureFile, path.join(instance.env.cwd, 'myserver.jar')),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 1);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 2);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') >= 0);
        callback(err);
      })
    },
    async.apply(instance.copy_profile),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 2);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') >= 0);
        callback(err);
      })
    },
    async.apply(fs.ensureFile, path.join(instance.env.cwd, 'pocket.phar')),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 3);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('pocket.phar') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') >= 0);
        callback(err);
      })
    },
    async.apply(fs.ensureFile, path.join(instance.env.cwd, 'pocket.PHAR')),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 4);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('pocket.phar') >= 0);
        test.ok(server_files.indexOf('pocket.PHAR') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') >= 0);
        callback(err);
      })
    },
    async.apply(fs.ensureFile, path.join(instance.env.cwd, 'another.JAR')),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 5);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('pocket.phar') >= 0);
        test.ok(server_files.indexOf('pocket.PHAR') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') >= 0);
        test.ok(server_files.indexOf('another.JAR') >= 0);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', 'Pocketmine-1.4.1'),
    function(callback) {
      instance.property('server_files', function(err, server_files) {
        test.ifError(err);
        test.equal(server_files.length, 6);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('pocket.phar') >= 0);
        test.ok(server_files.indexOf('pocket.PHAR') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') >= 0);
        test.ok(server_files.indexOf('another.JAR') >= 0);
        test.ok(server_files.indexOf('PocketMine-MP_1.4.1.phar') >= 0);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.copy_profile = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var jar_filepath = path.join(instance.env.cwd, 'minecraft_server.1.7.9.jar')

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.copy_profile),
    function(callback) {
      fs.stat(jar_filepath, function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(fs.stat, jar_filepath),
    async.apply(instance.modify_sc, 'minecraft', 'profile', 'madeupprofile'),
    function(callback) {
      instance.copy_profile(function(err) {
        test.equal(err, 23); // [Error: rsync exited with code 23] (for source dir not existing)
        callback();
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.eula_false = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('eula', function(err, eula_value) {
        test.ifError(err);
        test.ok(eula_value);
        callback(err);
      })
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), 'eula=true'),
    function(callback) {
      instance.property('eula', function(err, eula_value) {
        test.ifError(err);
        test.ok(eula_value);
        callback(err);
      })
    },
    async.apply(instance.verify, 'eula'),
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), 'eula=false'),
    function(callback) {
      instance.property('eula', function(err, eula_value) {
        test.ifError(err);
        test.ok(!eula_value);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.crons = function(test) {
  var hash = require('object-hash');

  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var cron_def1 = {
    action: 'stuff',
    source: '* * * * * *',
    msg: 'hello everybody'
  }

  var cron_def2 = {
    action: 'stuff',
    source: '* * * * * *',
    msg: 'killing everything!'
  }

  var cron_hash1 = hash(cron_def1);
  var cron_hash2 = hash(cron_def2);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.add_cron, cron_hash1, cron_def1),
    function(callback) {
      instance.crons(function(err, dict) {
        test.ifError(err);
        test.equal(dict[cron_hash1].action, cron_def1.action);
        test.equal(dict[cron_hash1].source, cron_def1.source);
        test.equal(dict[cron_hash1].msg, cron_def1.msg);
        callback(err);
      })
    },
    async.apply(instance.add_cron, hash(cron_def2), cron_def2),
    function(callback) {
      instance.crons(function(err, dict) {
        test.ifError(err);
        test.equal(dict[cron_hash2].action, cron_def2.action);
        test.equal(dict[cron_hash2].source, cron_def2.source);
        test.equal(dict[cron_hash2].msg, cron_def2.msg);
        callback(err);
      })
    },
    async.apply(instance.delete_cron, cron_hash2),
    function(callback) {
      instance.crons(function(err, dict) {
        test.ifError(err);
        test.equal(cron_hash1 in dict, true);
        test.equal(cron_hash2 in dict, false);
        test.equal(Object.keys(dict).length, 1);
        callback(err);
      })
    },
    function(callback) {
      instance.crons(function(err, dict) {
        test.ifError(err);
        test.equal(cron_hash1 in dict, true);
        test.equal(dict[cron_hash1].enabled, false);
        callback(err);
      })
    },
    async.apply(instance.set_cron, cron_hash1, true),
    function(callback) {
      instance.crons(function(err, dict) {
        test.ifError(err);
        test.equal(cron_hash1 in dict, true);
        test.equal(dict[cron_hash1].enabled, true);
        callback(err);
      })
    },
    async.apply(instance.set_cron, cron_hash1, false),
    function(callback) {
      instance.crons(function(err, dict) {
        test.ifError(err);
        test.equal(cron_hash1 in dict, true);
        test.equal(dict[cron_hash1].enabled, false);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.create_server_from_awd = function(test) {
  var server_name = 'testing';
  var temporary_instance = new mineos.mc(server_name, BASE_DIR);
  var new_instance = new mineos.mc('testing_server_2', BASE_DIR);

  var archive_filepath = null;

  async.series([
    async.apply(temporary_instance.create, OWNER_CREDS),
    function(callback) {
      var servers = mineos.server_list(BASE_DIR);
      test.equal(servers.length, 1);
      callback();
    },
    async.apply(temporary_instance.modify_sc, 'java', 'java_xmx', '1024'),
    function(callback) {
      temporary_instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xmx, '1024');
        callback(err);
      })
    },
    async.apply(temporary_instance.archive),
    function(callback) {
      var created_archive = fs.readdirSync(temporary_instance.env.awd)[0];
      archive_filepath = path.join(temporary_instance.env.awd, created_archive);
      callback(null);
    },
    function(callback) {
      new_instance.create_from_archive(OWNER_CREDS, archive_filepath, function(err) {
        callback();
      })
    },
    function(callback) {
      new_instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xmx, '1024');
        callback(err);
      })
    },
    function(callback) {
      var servers = mineos.server_list(BASE_DIR);
      test.equal(servers.length, 2);
      test.ok(servers.indexOf('testing') >= 0);
      test.ok(servers.indexOf('testing_server_2') >= 0);
      callback();
    },
    function(callback) {
      new_instance.create_from_archive(OWNER_CREDS, archive_filepath, function(err){
        test.ifError(!err);
        callback(!err);
      });
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.create_server_from_awd_zip = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var archive_filepath = 'jm36.zip';

  async.series([
    function(callback) {
      instance.create_from_archive(OWNER_CREDS, archive_filepath, function(err) {
        var files = fs.readdir(instance.env.base_dir)
        callback();
      })
    },
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xmx, 'MaxRAM');
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.profile_delta = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.profile_delta('1.7.9', function(err, profile_delta) {
        test.ifError(err);
        test.equal(profile_delta.length, 1);
        test.equal(profile_delta[0], 'minecraft_server.1.7.9.jar');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.copy_profile),
    function(callback) {
      instance.profile_delta('1.7.9', function(err, profile_delta) {
        test.ifError(err);
        test.equal(profile_delta.length, 0);
        callback(err);
      })
    },
    function(callback) {
      instance.profile_delta('madeupprofile', function(err, profile_delta) {
        test.equal(err, 23); // [Error: rsync exited with code 23] (for source dir not existing)
        callback();
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.onreboot = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('onreboot_start', function(err, val) {
        test.ifError(err);
        test.equal(val, false);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'onreboot', 'start', 'false'),
    function(callback) {
      instance.property('onreboot_start', function(err, val) {
        test.ifError(err);
        test.equal(val, false);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'onreboot', 'start', 'true'),
    function(callback) {
      instance.property('onreboot_start', function(err, val) {
        test.ifError(err);
        test.equal(val, true);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}