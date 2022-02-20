var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var mineos = require('../mineos');
var userid = require('userid');
var whoami = require('whoami');
var test = exports;

var BASE_DIR = '/home/runner/minecraft';
var FS_DELAY_MS = 200;
var PROC_START_DELAY_MS = 200;

var OWNER_CREDS = {
  uid: 1001,
  gid: 121
}

function oct2dec(octal_val) {
  return parseInt(octal_val.toString(8).slice(-3));
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

      test.equal(oct2dec(fs.statSync(instance.env.sp).mode), 664);
      test.equal(oct2dec(fs.statSync(instance.env.sc).mode), 664);
      test.equal(oct2dec(fs.statSync(instance.env.cc).mode), 664);

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
  test.equal(mineos.extract_server_name(BASE_DIR, '/home/runner/minecraft/servers/a'), 'a');
  test.equal(mineos.extract_server_name(BASE_DIR, '/home/runner/minecraft/servers/a/b'), 'a');
  test.equal(mineos.extract_server_name(BASE_DIR, '/home/runner/minecraft/servers/a/b/plugins'), 'a');
  test.throws(function(){mineos.extract_server_name(BASE_DIR, '/home/runner/minecraft/servers')}, 'no server name in path');
  test.throws(function(){mineos.extract_server_name(BASE_DIR, '/home/runner/minecraft')}, 'no server name in path');
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
    async.apply(instance.modify_sc, 'java', 'jarfile', 'Cuberite'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2], './Cuberite');
        callback(err);
      })
    }
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
        test.equal(args[6], '-Xmx2G');
        test.equal(args[7], '-XX:MaxPermSize=256M');
        test.equal(args[8], '-jar');
        test.equal(args[9], 'minecraft_server.1.7.9.jar');
        test.equal(args[10], 'nogui');
        test.equal(args.length, 11);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jar_args', ''),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms128M');
        test.equal(args[6], '-Xmx2G');
        test.equal(args[7], '-XX:MaxPermSize=256M');
        test.equal(args[8], '-jar');
        test.equal(args[9], 'minecraft_server.1.7.9.jar');
        test.equal(args[10], 'nogui');
        test.equal(args.length, 11);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jar_args', '--installServer'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms128M');
        test.equal(args[6], '-Xmx2G');
        test.equal(args[7], '-XX:MaxPermSize=256M');
        test.equal(args[8], '-jar');
        test.equal(args[9], 'minecraft_server.1.7.9.jar');
        test.equal(args[10], '--installServer');
        test.equal(args.length, 11);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jar_args', 'nogui --installServer'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-Xms128M');
        test.equal(args[6], '-Xmx2G');
        test.equal(args[7], '-XX:MaxPermSize=256M');
        test.equal(args[8], '-jar');
        test.equal(args[9], 'minecraft_server.1.7.9.jar');
        test.equal(args[10], 'nogui');
        test.equal(args[11], '--installServer');
        test.equal(args.length, 12);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.get_start_args_forge = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'forge-1.7.10-10.13.4.1492-installer.jar'),
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
        test.equal(args[7], 'forge-1.7.10-10.13.4.1492-installer.jar');
        test.equal(args[8], 'nogui');
        test.equal(args[9], '--installServer');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jarfile', 'forge-1.7.10-10.13.4.1492-universal.jar'),
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
        test.equal(args[7], 'forge-1.7.10-10.13.4.1492-universal.jar');
        test.equal(args[8], 'nogui');
        callback(err);
      })
    },
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.get_start_args_cuberite = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'Cuberite'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2], './Cuberite');
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
    },
    function(callback) {
      var php7_path = path.join(instance.env.cwd, 'bin', 'php7', 'bin');
      fs.mkdirsSync(php7_path);
      fs.ensureFileSync(path.join(php7_path, 'php'));
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2], './bin/php7/bin/php');
        test.equal(args[3], 'PocketMine-MP.phar');
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.get_start_args_unconventional = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create_unconventional_server, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'unconventional', true),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(!err); //expected error
        test.equal(err, 'Cannot start server without a designated jar/phar.');
        test.equal(args, null);
        callback(!err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jarfile', 'BungeeCord-1078.jar'),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-jar');
        test.equal(args[5], 'BungeeCord-1078.jar');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xmx', 256),
    function(callback) {
      instance.get_start_args(function(err, args) {
        test.ifError(err);
        test.equal(args[0], '-dmS');
        test.equal(args[1], 'mc-testing');
        test.equal(args[2].slice(-4), 'java');
        test.equal(args[3], '-server');
        test.equal(args[4], '-Xmx256M');
        test.equal(args[5], '-jar');
        test.equal(args[6], 'BungeeCord-1078.jar');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xms', 128),
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
        test.equal(args[7], 'BungeeCord-1078.jar');
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jar_args', ''),
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
        test.equal(args[7], 'BungeeCord-1078.jar');
        test.equal(args.length, 8);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jar_args', 'nogui'),
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
        test.equal(args[7], 'BungeeCord-1078.jar');
        test.equal(args[8], 'nogui');
        test.equal(args.length, 9);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'jar_args', 'nogui --installServer'),
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
        test.equal(args[7], 'BungeeCord-1078.jar');
        test.equal(args[8], 'nogui');
        test.equal(args[9], '--installServer');
        test.equal(args.length, 10);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
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

test.backup_exclude_dynmap = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(fs.mkdir, path.join(instance.env.cwd, 'dynmap')),
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

test.sc_deleted = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  
  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xmx, '256');
        callback(err);
      })
    },
    async.apply(fs.remove, instance.env['sc']),
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(Object.keys(dict).length, 0);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'java', 'java_xmx', '1024'),
    function(callback) {
      instance.sc(function(err, dict) {
        test.ifError(err);
        test.equal(dict.java.java_xmx, '1024');
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
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
      instance.list_increment_sizes(function(err, increments) {
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
      instance.list_increment_sizes(function(err, increments) {
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

test.check_eula = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.waterfall([
    async.apply(instance.create, OWNER_CREDS),
    function(throwaway, cb) { cb() }, //discards instance.create return so cb arguments line up below
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, undefined);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula=false\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula=true\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, true);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula = false\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula = true\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, true);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula = FALSE\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula = TRUE\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, true);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula = fals\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\neula = tru\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), '//here is something\n//heres more irrelevant lines\n'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    }
  ], function(err) {
    test.done();
  })
}

test.accept_eula = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.waterfall([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'eula.txt'), 'eula=false'),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, false);
      cb();
    },
    async.apply(instance.accept_eula),
    async.apply(instance.property, 'eula'),
    function(eula_value, cb) {
      test.equal(eula_value, true);
      cb();
    },
    async.apply(fs.stat, path.join(instance.env.cwd, 'eula.txt')),
    function(stat, cb) {
      test.equal(stat.uid, OWNER_CREDS.uid);
      test.equal(stat.gid, OWNER_CREDS.gid);
      cb();
    }
  ], function(err) {
    test.done();
  })
}

test.chown = function(test) {
  var userid = require('userid');

  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var NEW_OWNER_CREDS = {
    uid: 1001,
    gid: 121
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
    },
    function(callback) {
      instance.chown(8877, 8877, function(err) {
        test.ifError(!err);
        callback(!err);
      })
    },
    function(callback) {
      instance.property('owner', function(err, result) {
        test.ifError(err);
        test.equal(NEW_OWNER_CREDS['uid'], result['uid']);
        test.equal(NEW_OWNER_CREDS['gid'], result['gid']);
        callback(err);
      })
    },

  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.chown_recursive = function(test) {
  var userid = require('userid');

  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var NEW_OWNER_CREDS = {
    uid: 1001,
    gid: 121
  }

  var newfile = path.join(instance.env.cwd, 'newfile');

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(fs.open, newfile, 'w'),
    async.apply(fs.chown, newfile, OWNER_CREDS.uid, OWNER_CREDS.gid),
    function(callback) {
      fs.readdir(instance.env.cwd, function(err, files) {
        for (var i=0; i<files.length; i++) {
          var fp = path.join(instance.env.cwd, files[i]);

          test.equal(fs.statSync(fp).uid, OWNER_CREDS.uid);
          test.equal(fs.statSync(fp).gid, OWNER_CREDS.gid);
        }
        callback();
      });
    },
    function(callback) {
      instance.chown(NEW_OWNER_CREDS.uid, NEW_OWNER_CREDS.gid, function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    function(callback) {

      fs.readdir(instance.env.cwd, function(err, files) {
        for (var i=0; i<files.length; i++) {
          var fp = path.join(instance.env.cwd, files[i]);

          test.equal(fs.statSync(fp).uid, NEW_OWNER_CREDS.uid);
          test.equal(fs.statSync(fp).gid, NEW_OWNER_CREDS.gid);
        }
        callback();
      });
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.sync_chown = function(test) {
  var userid = require('userid');

  var server_name = 'testing';
  var server_path = path.join(BASE_DIR, mineos.DIRS['servers'], server_name);
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(fs.ensureDir, server_path),
    async.apply(fs.chown, server_path, OWNER_CREDS.uid, OWNER_CREDS.gid),
    function(callback) {
      test.equal(fs.statSync(instance.env.cwd).uid, OWNER_CREDS.uid);
      test.equal(fs.statSync(instance.env.cwd).gid, OWNER_CREDS.gid);
      callback();
    },
    async.apply(instance.sync_chown),
    function(callback) {
      test.equal(fs.statSync(instance.env.cwd).uid, OWNER_CREDS.uid);
      test.equal(fs.statSync(instance.env.cwd).gid, OWNER_CREDS.gid);

      test.equal(fs.statSync(instance.env.bwd).uid, OWNER_CREDS.uid);
      test.equal(fs.statSync(instance.env.bwd).gid, OWNER_CREDS.gid);

      test.equal(fs.statSync(instance.env.awd).uid, OWNER_CREDS.uid);
      test.equal(fs.statSync(instance.env.awd).gid, OWNER_CREDS.gid);
      callback();
    }
  ], function(err) {
    test.ifError(err);
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

test.commit_interval_property = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, null);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', 'true'),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, null);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', 'false'),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, null);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', '30'),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, 30);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', '60'),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, 60);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', '-60'),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, null);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', '0'),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, null);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'commit_interval', ''),
    function(callback) {
      instance.property('commit_interval', function(err, commit_interval) {
        test.ifError(err);
        test.equal(commit_interval, null);
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
        test.equal(server_files.length, 1);
        test.ok(server_files.indexOf('myserver.jar') >= 0);
        test.ok(server_files.indexOf('minecraft_server.1.7.9.jar') < 0);
        callback(err);
      })
    },
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
        test.equal(eula_value, undefined);
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
        callback(err);
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
    },
    function(callback) {
      async.parallel([
        async.apply(fs.stat, new_instance.env.sp),
        async.apply(fs.stat, new_instance.env.sc),
        async.apply(fs.stat, new_instance.env.cc),
        async.apply(fs.stat, new_instance.env.bwd),
        async.apply(fs.stat, new_instance.env.awd)
      ], callback)
    },
    function(callback) {
      new_instance.property('owner', function(err, result) {
        test.ifError(err);
        test.equal(OWNER_CREDS['uid'], result['uid']);
        test.equal(OWNER_CREDS['gid'], result['gid']);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.create_server_from_awd_zip = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  var archive_filepath = 'BTeam_Server_v1.0.12a.zip';

  async.series([
    function(callback) {
      instance.create_from_archive(OWNER_CREDS, archive_filepath, function(err) {
        var files = fs.readdirSync(instance.env.base_dir);
        callback();
      })
    },
    function(callback) {
      async.parallel([
        async.apply(fs.stat, instance.env.sp),
        async.apply(fs.stat, instance.env.sc),
        async.apply(fs.stat, instance.env.cc),
        async.apply(fs.stat, instance.env.bwd),
        async.apply(fs.stat, instance.env.awd)
      ], callback)
    },
    function(callback) {
      instance.property('owner', function(err, result) {
        test.ifError(err);
        test.equal(OWNER_CREDS['uid'], result['uid']);
        test.equal(OWNER_CREDS['gid'], result['gid']);
        callback(err);
      })
    },
    function(callback) {
      var files = fs.readdirSync(instance.env.cwd);
      for (var i in files) {
        var filepath = path.join(instance.env.cwd, files[i]);
        var filestat = fs.statSync(filepath);

        test.equal(OWNER_CREDS['uid'], filestat['uid']);
        test.equal(OWNER_CREDS['gid'], filestat['gid']);
      }
      callback();
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.list_increment_sizes = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.list_increment_sizes(function(err, increments) {
        test.ok(err); // testing for error
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.list_increment_sizes(function(err, increments) {
        test.ok(err); // testing for error
        callback(!err);
      })
    },
    function(callback) {
      instance.backup(function() {
        setTimeout(callback, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.modify_sp('server-port', 25570, function() {
        setTimeout(callback, FS_DELAY_MS*5);
      })
    },
    async.apply(instance.modify_sp, 'server-port', 25570),
    function(callback) {
      instance.backup(function() {
        setTimeout(callback, FS_DELAY_MS*5);
      })
    },
    function(callback) {
      instance.list_increment_sizes(function(err, increments) {
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

test.create_unconventional_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  test.equal(mineos.server_list(BASE_DIR).length, 0);

  async.series([
    async.apply(instance.create_unconventional_server, OWNER_CREDS),
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

      test.equal(oct2dec(fs.statSync(instance.env.sp).mode), 664);
      test.equal(oct2dec(fs.statSync(instance.env.sc).mode), 664);
      test.equal(oct2dec(fs.statSync(instance.env.cc).mode), 664);

      test.equal(mineos.server_list(BASE_DIR)[0], server_name);
      test.equal(mineos.server_list(BASE_DIR).length, 1);

      instance.sc(function(err, dict) {
        test.equal(Object.keys(dict).length, 1);
        test.equal(dict.minecraft.unconventional, true);
      })

      instance.sp(function(err, dict) {
        test.equal(Object.keys(dict).length, 0);
      })

      callback();
    },
    function(callback) {
      instance.create_unconventional_server(OWNER_CREDS, function(err){
        test.ifError(!err);
        callback(!err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.run_installer = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'FTBInstall.sh'), '#!/bin/sh\ntouch worked.txt'),
    async.apply(instance.run_installer),
    function(callback) {
      test.equal(fs.existsSync(path.join(instance.env.cwd, 'worked.txt')), true);
      callback(null);
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

