var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var mineos = require('../mineos');
var test = exports;

var BASE_DIR = '/var/games/minecraft';
var FS_DELAY_MS = 200;

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

  instance.create(function(err, did_create) {
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
      instance.is_server(function(err, is_server) {
        test.ifError(err);
        test.ok(!is_server);
        callback(err);
      })
    },
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(err);
      })
    },
    function(callback) {
      instance.is_server(function(err, is_server) {
        test.ifError(err);
        test.ok(is_server);
        callback(err);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.create_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var uid = 1000;
  var gid = 1001;

  test.equal(mineos.server_list(BASE_DIR).length, 0);

  async.series([
    function(callback) {
      instance.create(function(err, did_create){
        test.ifError(err);
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
        callback(null);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.delete_server = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.is_server(function(err, is_server) {
        test.ifError(err);
        test.ok(is_server);
        callback(null);
      })
    },
    function(callback) {
      instance.delete(function(err, did_delete) {
        test.ifError(err);
        test.ok(did_delete);
        callback(null);
      })
    },
    function(callback) {
      instance.is_server(function(err, is_server) {
        test.ifError(err);
        test.ok(!is_server);
        callback(null);
      })
    }
  ], function(err, results) {
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

test.start = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.stuff('stop', function(err, proc) {
        test.ifError(err);
        callback(null);
      })
    },
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.start(function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          callback(null);
        })
      })
    },
    function(callback) {
      instance.property('screen_pid', function(pid) {
        test.equal(typeof(pid), 'number');
        test.ok(pid > 0);
        callback(null);
      })
    },
    function(callback) {
      instance.property('java_pid', function(pid) {
        test.equal(typeof(pid), 'number');
        test.ok(pid > 0);
        callback(null);
      })
    },
    function(callback) {
      instance.stuff('stop', function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          callback(null);
        })
      })
    },
    function(callback) {
      instance.delete(function(err, did_delete) {
        test.ifError(err);
        test.ok(did_delete);
        callback(null);
      })
    },
    function(callback) {
      instance.is_server(function(err, is_server) {
        test.ifError(err);
        test.ok(!is_server);
        callback(null);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.archive = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.archive(function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          setTimeout(function() {
            test.equal(fs.readdirSync(instance.env.awd).length, 1);
            callback(null);
          }, FS_DELAY_MS)
        })
        
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.backup = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.backup(function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          setTimeout(function() {
            test.equal(fs.readdirSync(instance.env.bwd).length, 2);
            callback(null);
          }, FS_DELAY_MS)
        })
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.restore = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.backup(function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          setTimeout(function() {
            test.equal(fs.readdirSync(instance.env.bwd).length, 2);
            callback(null);
          }, FS_DELAY_MS)
        })
      })
    },
    function(callback) {
      fs.removeSync(instance.env.cwd);
      instance.is_server(function(err, is_server) {
        test.ifError(err);
        test.ok(!is_server);
        callback(null);
      })
    },
    function(callback) {
      instance.restore('now', function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          setTimeout(function() {
            test.equal(fs.readdirSync(instance.env.cwd).length, 1);
            callback(null);
          }, FS_DELAY_MS)
        })
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.sp = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.sp(function(err, dict) {
        test.ifError(err);
        test.equal(dict['server-port'], '25565');
        callback(null);
      })
    },
    function(callback) {
      instance._sp.modify('server-port', '25570', function(err) {
        test.ifError(err);
        callback(null);
      })
    },
    function(callback) {
      instance.sp(function(err, dict) {
        test.ifError(err);
        test.equal(dict['server-port'], '25570');
        callback(null);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.properties = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.property('java_pid', function(java_pid) {
        test.equal(java_pid, null);
        callback(null);
      })
    },
    function(callback) {
      instance.property('screen_pid', function(screen_pid) {
        test.equal(screen_pid, null);
        callback(null);
      })
    },
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.property('up', function(up) {
        test.equal(up, false);
        callback(null);
      })
    },
    function(callback) {
      instance.property('server-port', function(port) {
        test.equal(port, 25565);
        callback(null);
      })
    },
    function(callback) {
      instance.property('server-ip', function(ip) {
        test.equal(ip, '0.0.0.0');
        callback(null);
      })
    },
    function(callback) {
      instance.property('memory', function(memory) {
        test.equal(Object.keys(memory).length, 0);
        callback(null);
      })
    },
    function(callback) {
      instance.property('ping', function(ping) {
        test.equal(Object.keys(ping).length, 5);

        test.equal(ping.protocol, null);
        test.equal(ping.server, null);
        test.equal(ping.motd, null);
        test.equal(ping.players_online, null);
        test.equal(ping.players_max, null);

        callback(null);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.ping = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.start(function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          callback(null);
        })
      })
    },
    function(callback) {
      setTimeout(function() {
        instance.ping(function(err, pingback) {
          test.ifError(err);
          test.equal(pingback.protocol, 127);
          test.equal(pingback.server_version, '1.7.9');
          test.equal(pingback.motd, 'A Minecraft Server');
          test.equal(pingback.players_online, 0);
          test.equal(pingback.players_max, 20);
          callback(null);
        })
      }, 15000)
    },
    function(callback) {
      instance.kill(function(err, did_kill) {
        test.ifError(err);
        if (did_kill)
          callback(null);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.memory = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);
  var memory_regex = /(\d+) kB/

  async.series([
    function(callback) {
      instance.create(function(err, did_create) {
        test.ifError(err);
        test.ok(did_create);
        callback(null);
      })
    },
    function(callback) {
      instance.start(function(err, proc) {
        test.ifError(err);
        proc.once('close', function(code) {
          callback(null);
        })
      })
    },
    function(callback) {
      instance.property('memory', function(memory_obj) {
        test.equal(memory_obj.Name, 'java');
        test.ok(memory_regex.test(memory_obj.VmPeak));
        test.ok(memory_regex.test(memory_obj.VmSize));
        test.ok(memory_regex.test(memory_obj.VmRSS));
        test.ok(memory_regex.test(memory_obj.VmSwap));
        callback(null);
      })
    }
  ], function(err, results) {
    test.done();
  })  
}