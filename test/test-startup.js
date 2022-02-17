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
      instance.property('unconventional', function(err, retval) {
        test.ifError(err);
        test.equal(retval, false);
        callback(err);
      })
    },
    function(callback) {
      instance.property('madeup', function(err, retval) {
        test.ok(err);  //testing positive error
        test.equal(retval, undefined);
        callback(!err);
      })
    },
    function(callback) {
      setTimeout(function() {
        instance.kill(function(err) {
          test.ifError(err);
          callback(err);
        })
      }, 200)
    },
    function(callback) {
      instance.property('FTBInstall.sh', function(err, retval) {
        test.ifError(err);
        test.equal(retval, false);
        callback(err);
      }) //part 1/3
    },
    async.apply(fs.outputFile, path.join(instance.env.cwd, 'FTBInstall.sh'), "\n"), //part 2/3
    function(callback) {
      instance.property('FTBInstall.sh', function(err, retval) {
        test.ifError(err);
        test.equal(retval, true);
        callback(err);
      }) //part 3/3
    }
  ], function(err) {
    test.ifError(err);
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
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
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
      }, 22000)
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

test.query = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    function(callback) {
      instance.query(function(err, pingback) {
        test.ifError(err);
        test.equal(Object.keys(pingback).length, 0);
        callback();
      })
    },
    async.apply(instance.start),
    function(callback) {
      setTimeout(function() {
        instance.query(function(err, pingback) {
          test.ifError(err);
          test.equal(Object.keys(pingback).length, 0);
          callback(err);
        })
      }, 16000)
    },
    async.apply(instance.kill),
    async.apply(instance.modify_sp, 'enable-query', 'true'),
    async.apply(instance.start),
    function(callback) {
      setTimeout(function() {
        instance.query(function(err, pingback) {
          test.ifError(err);
          test.equal(pingback.hostname, 'A Minecraft Server');
          test.equal(pingback.gametype, 'SMP');
          test.equal(pingback.game_id, 'MINECRAFT');
          test.equal(pingback.version, '1.7.9');
          test.equal(pingback.plugins, '');
          test.equal(pingback.map, 'world');
          test.equal(pingback.numplayers, '0');
          test.equal(pingback.maxplayers, '20');
          test.equal(pingback.hostport, '25565');
          test.equal(pingback.player_.length, 0);
          callback(err);
        })
      }, 6000)
    },
    async.apply(instance.kill)
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
      instance.property('memory', function(err, memory_obj) {
        test.ifError(err);
        test.equal(memory_obj.Name, 'java');
        //test.ok(memory_regex.test(memory_obj.VmPeak)); //not used, fails freebsd
        test.ok(memory_regex.test(memory_obj.VmSize));
        test.ok(memory_regex.test(memory_obj.VmRSS));
        //test.ok(memory_regex.test(memory_obj.VmSwap)); //not used, fails freebsd
        callback(err);
      })
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
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

test.saveall = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      var DELAY_SECONDS = 5;
      var start = new Date().getTime();

      instance.saveall(DELAY_SECONDS, function(err) {
        var end = new Date().getTime();
        var time = end - start;

        test.ok(time < 100);
        callback(); 
        //with server not up, it should complete nearly instantly
      })
    },
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.start),
    function(callback) {
      setTimeout(callback, 10000);
    },
    function(callback) {
      var DELAY_SECONDS = 3;
      var start = new Date().getTime();

      instance.saveall(DELAY_SECONDS, function(err) {
        var end = new Date().getTime();
        var time = end - start;

        test.ok(time > DELAY_SECONDS * 1000);
        test.ok(time < (DELAY_SECONDS+1) * 1000);
        callback(); //if true, error!
        //this function should be (seconds * 1000) + (time to execute screen stuff).
      })
    },
    function(callback) {
      var DELAY_SECONDS = null;
      var start = new Date().getTime();

      instance.saveall(DELAY_SECONDS, function(err) {
        var end = new Date().getTime();
        var time = end - start;

        test.ok(time > 5000);
        test.ok(time < 6000);
        callback(); //if true, error!
        //with no specified delay, default to 5000
      })
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.saveall_latest_log = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.7.9'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.7.9.jar'),
    async.apply(instance.copy_profile),
    function(callback) {
      instance.saveall_latest_log(function(err) {
        test.ok(err); //there should be an error here, server is down
        callback(!err);
      })
    },
    async.apply(instance.start),
    function(callback) {
      setTimeout(callback, 10000);
    },
    function(callback) {
      instance.saveall_latest_log(function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.property_autosave_179 = function(test) {
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
    function(callback) {
      instance.property('autosave', function(err, autosave_enabled) {
        test.ifError(err);
        test.ok(autosave_enabled);
        callback(err);
      })
    },
    async.apply(instance.stuff, 'save-on'),
    function(callback) {
      instance.property('autosave', function(err, autosave_enabled) {
        test.ifError(err);
        test.ok(autosave_enabled);
        callback(err);
      })
    },
    async.apply(instance.stuff, 'save-off'),
    function(callback) {
      instance.property('autosave', function(err, autosave_enabled) {
        test.ifError(err);
        test.ok(!autosave_enabled);
        callback(err);
      })
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.property_autosave_1102 = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    async.apply(instance.create, OWNER_CREDS),
    async.apply(instance.modify_sc, 'minecraft', 'profile', '1.10.2'),
    async.apply(instance.modify_sc, 'java', 'jarfile', 'minecraft_server.1.10.2.jar'),
    async.apply(instance.copy_profile),
    async.apply(instance.accept_eula),
    async.apply(instance.start),
    function(callback) {
      setTimeout(callback, 10000);
    },
    function(callback) {
      instance.property('autosave', function(err, autosave_enabled) {
        test.ifError(err);
        test.ok(autosave_enabled);
        callback(err);
      })
    },
    async.apply(instance.stuff, 'save-on'),
    function(callback) {
      instance.property('autosave', function(err, autosave_enabled) {
        test.ifError(err);
        test.ok(autosave_enabled);
        callback(err);
      })
    },
    async.apply(instance.stuff, 'save-off'),
    function(callback) {
      instance.property('autosave', function(err, autosave_enabled) {
        test.ifError(err);
        test.ok(!autosave_enabled);
        callback(err);
      })
    },
    async.apply(instance.kill)
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
    },
    async.apply(instance.modify_sc, 'onreboot', 'start', true),
    function(callback) {
      instance.property('onreboot_start', function(err, val) {
        test.ifError(err);
        test.equal(val, true);
        callback(err);
      })
    },
    async.apply(instance.modify_sc, 'onreboot', 'start', false),
    function(callback) {
      instance.property('onreboot_start', function(err, val) {
        test.ifError(err);
        test.equal(val, false);
        callback(err);
      })
    }
  ], function(err) {
    test.ifError(err);
    test.done();
  })
}

test.renice = function(test) {
  var server_name = 'testing';
  var instance = new mineos.mc(server_name, BASE_DIR);

  async.series([
    function(callback) {
      instance.renice(5, function(err) {
        test.ok(err); //looking for positive error
        callback(!err);
      })
    },
    async.apply(instance.create, OWNER_CREDS),
    function(callback) {
      instance.renice(5, function(err) {
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
    function(callback) {
      instance.renice(5, function(err) {
        test.ifError(err);
        callback(err);
      })
    },
    function(callback) {
      var nice_matches = false;

      instance.property('java_pid', function(err, pid) {
        var child_process = require('child_process');
        var ps = child_process.spawn('ps', ['-p', pid, '-o', 'ni']);
        ps.stdout.on('data', function(data) {
          var second_line = parseInt(data.toString().split('\n')[1]);
          test.equal(5, second_line)
        })
        ps.on('exit', callback);
      })
    },
    async.apply(instance.kill)
  ], function(err) {
    test.ifError(err);
    test.expect(5);
    test.done();
  })
}

