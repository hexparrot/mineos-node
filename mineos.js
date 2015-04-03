var fs = require('fs-extra');
var path = require('path');
var events = require('events');
var async = require('async');
var which = require('which');
var cf = require('./config_file');
var child_process = require('child_process');
var mineos = exports;

mineos.DIRS = {
  'servers': 'servers',
  'backup': 'backup',
  'archive': 'archive',
  'profiles': 'profiles',
  'import': 'import'
}

mineos.SP_DEFAULTS = {
  'server-port': 25565,
  'max-players': 20,
  'level-seed': '',
  'gamemode': 0,
  'difficulty': 1,
  'level-type': 'DEFAULT',
  'level-name': 'world',
  'max-build-height': 256,
  'generate-structures': 'false',
  'generator-settings': '',
  'server-ip': '0.0.0.0',
}

var JAR_PATH = process.env['HOME'];

mineos.server_list = function(base_dir) {
  return fs.readdirSync(path.join(base_dir, mineos.DIRS['servers']));
}

mineos.server_list_up = function() {
  return Object.keys(mineos.server_pids_up());
}

mineos.server_pids_up = function() {
  var cmdline, environ, match;
  var pids = fs.readdirSync('/proc').filter(function(e) { if (/^([0-9]+)$/.test(e)) {return e} });
  var SCREEN_REGEX = /screen[^S]+S mc-([^ ]+)/i;
  var JAVA_REGEX = /\.mc-([^ ]+)/i;
  var servers_found = {};

  for (var i=0; i < pids.length; i++) {
    try {
      cmdline = fs.readFileSync('/proc/{0}/cmdline'.format(pids[i]))
                              .toString('ascii')
                              .replace(/\u0000/g, ' ');
    } catch (e) {
      continue;
    }

    screen_match = SCREEN_REGEX.exec(cmdline);

    if (screen_match) {
      if (screen_match[1] in servers_found)
        servers_found[screen_match[1]]['screen'] = parseInt(pids[i]);
      else
        servers_found[screen_match[1]] = {'screen': parseInt(pids[i])}
    } else {
      try {
        environ = fs.readFileSync('/proc/{0}/environ'.format(pids[i]))
                                .toString('ascii')
                                .replace(/\u0000/g, ' ');
      } catch (e) {
        continue;
      }

      java_match = JAVA_REGEX.exec(environ);

      if (java_match) {
        if (java_match[1] in servers_found)
          servers_found[java_match[1]]['java'] = parseInt(pids[i]);
        else
          servers_found[java_match[1]] = {'java': parseInt(pids[i])}
      }
    }
  }
  return servers_found;
}

mineos.valid_server_name = function(server_name) {
  var regex_valid_server_name = /^(?!\.)[a-zA-Z0-9_\.]+$/;
  return regex_valid_server_name.test(server_name);
}

mineos.extract_server_name = function(base_dir, server_path) {
  var re = new RegExp('{0}/([a-zA-Z0-9_\.]+)'.format(path.join(base_dir, mineos.DIRS['servers'])));
  try {
    return re.exec(server_path)[1];
  } catch(e) {
    throw new Error('no server name in path');
  }
}

mineos.mc = function(server_name, base_dir) {
  var self = this;
  self.server_name = server_name;

  self.env = {
    base_dir: base_dir,
    cwd: path.join(base_dir, mineos.DIRS['servers'], server_name),
    bwd: path.join(base_dir, mineos.DIRS['backup'], server_name),
    awd: path.join(base_dir, mineos.DIRS['archive'], server_name),
    sp: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.properties')
  }

  self._sp = new cf.config_file(self.env.sp);

  self.sp = function(callback) {
    self._sp.load(function(err) {
      callback(err, self._sp.props);
    })
  }

  self.modify_sp = function(property, new_value, callback) {
    self._sp.modify(property, new_value, function(err) {
      callback(err);
    }) 
  }

  self.create = function(owner, callback) {
    async.series([
      async.apply(self.verify, ['!exists', '!up']),
      async.apply(fs.ensureDir, self.env.cwd),
      async.apply(fs.ensureDir, self.env.bwd),
      async.apply(fs.ensureDir, self.env.awd),
      async.apply(self._sp.write, mineos.SP_DEFAULTS),
      async.apply(fs.chown, self.env.cwd, owner['uid'], owner['gid']),
      async.apply(fs.chown, self.env.bwd, owner['uid'], owner['gid']),
      async.apply(fs.chown, self.env.awd, owner['uid'], owner['gid']),
      async.apply(fs.chown, self.env.sp, owner['uid'], owner['gid'])

    ], callback)
  }

  self.delete = function(callback) {
    async.series([
      async.apply(self.verify, ['exists', '!up']),
      async.apply(fs.remove, self.env.cwd),
      async.apply(fs.remove, self.env.bwd),
      async.apply(fs.remove, self.env.awd)
    ], callback)
  }

  self.start = function(callback) {
    var binary = which.sync('screen');
    var java_binary = which.sync('java');
    var args = ['-dmS', 'mc-{0}'.format(self.server_name), 
                java_binary, '-server', '-Xmx256M', '-Xms256M',
                '-jar',  'minecraft_server.jar', 'nogui'];

    var params = { cwd: self.env.cwd };
    var orig_filepath = path.join(JAR_PATH, 'minecraft_server.1.7.9.jar');
    var dest_filename = 'minecraft_server.jar';

    async.series([
      async.apply(self.verify, ['exists', '!up']),
      async.apply(fs.copy, orig_filepath, path.join(self.env.cwd, dest_filename)),
      function(cb) {
        self.property('owner', function(err, result) {
          params['uid'] = result['uid'];
          params['gid'] = result['gid'];
          cb(err);
        })
      },
      function(cb) {
        var proc = child_process.spawn(binary, args, params);
        proc.once('close', function(code) {
          callback(code);
        })
      }
    ], callback);
  }

  self.stop = function(callback) {
    self.stuff('stop', function(err, proc) {
      if (err) {
        callback(err);
      } else {
         async.whilst(
          function() { return (self.server_name in mineos.server_pids_up()) },
          function(callback) {
            setTimeout(callback, 200);
          },
          function(ignored_err) {
            if (self.server_name in mineos.server_pids_up())
              callback(true); //error, stop succeeded: false
            else
              callback(null); //no error, stop succeeded: true
          }
        );  
      }
       
    })
  }

  self.stop_and_backup = function(callback) {
    async.series([
      async.apply(self.stop),
      async.apply(self.backup)
    ], callback)
  }

  self.kill = function(callback) {
    var pids = mineos.server_pids_up();

    if (!(self.server_name in pids)) {
      callback(true);
    } else {
      process.kill(pids[self.server_name].java);

      async.doWhilst(
        function(callback) {
          setTimeout(callback, 100);
        },
        function() { 
          return (self.server_name in mineos.server_pids_up())
        },
        function(ignored_err) {
          if (self.server_name in mineos.server_pids_up())
            callback(true); //error, stop succeeded: false
          else
            callback(null); //no error, stop succeeded: true
        }
      ) 
    }
  }

  self.stuff = function(msg, callback) {
    var params = { cwd: self.env.cwd };
    var binary = which.sync('screen');

    async.waterfall([
      async.apply(self.verify, ['exists', 'up']),
      function(cb) {
        self.property('owner', function(err, result) {
          params['uid'] = result['uid'];
          params['gid'] = result['gid'];
          cb(err);
        })
      },
      function(cb) {
        cb(null, child_process.spawn(binary, 
                                     ['-S', 'mc-{0}'.format(self.server_name),
                                      '-p', '0', '-X', 'eval', 'stuff "{0}\012"'.format(msg)],
                                     params));
      }
    ], callback);
  }

  self.archive = function(callback) {
    var strftime = require('strftime');
    var binary = which.sync('tar');
    var filename = 'server-{0}_{1}.tgz'.format(self.server_name, strftime('%Y-%m-%d_%H:%M:%S'));
    var args = ['czf', path.join(self.env.awd, filename), self.env.cwd];

    var params = { cwd: self.env.awd }; //awd!

    async.series([
      function(cb) {
        self.property('owner', function(err, result) {
          params['uid'] = result['uid'];
          params['gid'] = result['gid'];
          cb(err);
        })
      },
      function(cb) {
        var proc = child_process.spawn(binary, args, params);
        proc.once('close', function(code) {
          callback(code);
        })
      }
    ], callback);
  }

  self.backup = function(callback) {
    var binary = which.sync('rdiff-backup');
    var args = ['{0}/'.format(self.env.cwd), self.env.bwd];
    var params = { cwd: self.env.bwd } //bwd!

    async.series([
      function(cb) {
        self.property('owner', function(err, result) {
          params['uid'] = result['uid'];
          params['gid'] = result['gid'];
          cb(err);
        })
      },
      function(cb) {
        var proc = child_process.spawn(binary, args, params);
        proc.once('close', function(code) {
          callback(code);
        })
      }
    ], callback)
  }

  self.restore = function(step, callback) {
    var binary = which.sync('rdiff-backup');
    var args = ['--restore-as-of', step, '--force', self.env.bwd, self.env.cwd];
    var params = { cwd: self.env.bwd };

    var proc = child_process.spawn(binary, args, params);
    proc.once('close', function(code) {
      callback(code);
    })
  }

  self.list_increments = function(callback) {
    var binary = which.sync('rdiff-backup');
    var args = ['--list-increment-sizes', self.env.bwd];
    var params = { cwd: self.env.bwd };
    var regex = /^(\w.*?) {3,}(.*?) {2,}([^ ]+ \w*)/
    var increment_lines = [];

    var rdiff = child_process.spawn(binary, args, params);

    rdiff.stdout.on('data', function(data) {
      var buffer = new Buffer(data, 'ascii');
      var lines = buffer.toString('ascii').split('\n');
      var incrs = 0;

      for (var i=0; i < lines.length; i++) {
        var match = lines[i].match(regex);
        if (match) {
          increment_lines.push({
            step: '{0}B'.format(incrs),
            time: match[1],
            size: match[2],
            cum: match[3]
          });
          incrs += 1;
        }
      }
    });

    rdiff.on('error', function(code) {
      // branch if path does not exist
      if (code != 0)
        callback(true, []);
    });

    rdiff.on('exit', function(code) {
      if (code == 0) // branch if all is well
        callback(code, increment_lines);
      else // branch if dir exists, not an rdiff-backup dir
        callback(true, []);
    });
  }

  self.list_archives = function(callback) {
    var fs = require('fs');
    var awd = self.env['awd'];
    var all_info = [];

    fs.readdir(awd, function(err, files) {
      if (!err) {
        var fullpath = files.map(function(value, index) {
          return path.join(awd, value);
        });

        var stat = fs.stat;
        async.map(fullpath, stat, function(inner_err, results){
          results.forEach(function(value, index) {
            all_info.push({
              time: value.mtime,
              size: value.size,
              filename: files[index]
            })
          })

          all_info.sort(function(a, b) {
            return a.time.getTime() - b.time.getTime();
          });

          callback(err || inner_err, all_info);
        }); 
      } else {
        callback(err, all_info);
      }
    }) 
  }

  self.delete_archive = function(filename, callback) {
    var fs = require('fs-extra');
    var archive_path = path.join(self.env['awd'], filename);

    fs.delete(archive_path, function(err) {
      callback(err);
    })
  }

  self.property = function(property, callback) {
    switch(property) {
      case 'owner':
        var userid = require('userid');
        fs.stat(self.env.cwd, function(err, stat_info) {
          if (err)
            callback(err, {});
          else {
            callback(err, {
              uid: stat_info['uid'],
              gid: stat_info['gid'],
              username: userid.username(stat_info['uid']),
              groupname: userid.groupname(stat_info['gid'])
            });
          }
        })
        break;
      case 'owner_uid':
        fs.stat(self.env.cwd, function(err, stat_info) {
          if (err)
            callback(err, null);
          else
            callback(err, stat_info['uid']);
        })
        break;
      case 'owner_gid':
        fs.stat(self.env.cwd, function(err, stat_info) {
          if (err)
            callback(err, null);
          else
            callback(err, stat_info['gid']);
        })
        break;
      case 'exists': 
        fs.exists(self.env.sp, function(exists) {
          callback(null, exists);
        });
        break;
      case '!exists': 
        fs.exists(self.env.sp, function(exists) {
          callback(null, !exists);
        });
        break;
      case 'up':
        var pids = mineos.server_pids_up();
        callback(null, self.server_name in pids);
        break;
      case '!up':
        var pids = mineos.server_pids_up();
        callback(null, !(self.server_name in pids));
        break;
      case 'java_pid':
        var pids = mineos.server_pids_up();
        try {
          callback(null, pids[self.server_name]['java']);
        } catch (e) {
          callback(true, null);
        }
        break;
      case 'screen_pid':
        var pids = mineos.server_pids_up();
        try {
          callback(null, pids[self.server_name]['screen']);
        } catch (e) {
          callback(true, null);
        }
        break;
      case 'server-port':
        var sp = self.sp(function(err, dict) {
          callback(err, dict['server-port']);
        })
        break;
      case 'server-ip':
        var sp = self.sp(function(err, dict) {
          callback(err, dict['server-ip']);
        })
        break;
      case 'memory':
        var pids = mineos.server_pids_up();
        if (self.server_name in pids) {
          var procfs = require('procfs-stats');
          var ps = procfs(pids[self.server_name]['java']);
          ps.status(function(err, data){
            callback(err, data);
          })
        } else {
          callback(true, null);
        }
        break;
      case 'ping':
        var pids = mineos.server_pids_up();
        if (self.server_name in pids) {
          self.ping(function(err, ping){
            callback(null, ping);
          })
        } else {
          callback(true, null);
        }
        break;
      case 'server.properties':
        self.sp(function(err, dict) {
          callback(err, dict);
        })
        break;
      case 'du_awd':
        var du = require('du');
        du(self.env.awd, { disk: true }, function (err, size) {
          callback(err, size);
        })
        break;
      case 'du_bwd':
        var du = require('du');
        du(self.env.bwd, { disk: true }, function (err, size) {
          callback(err, size);
        })
        break;
      case 'du_cwd':
        var du = require('du');
        du(self.env.cwd, { disk: true }, function (err, size) {
          callback(err, size);
        })
        break;
    }
  }

  self.verify = function(tests, callback) {
    async.map(tests, self.property, function(err, result) {
      callback(!result.every(function(val) { return !!val === true })); //double '!' converts any value to bool, then result negated
    })
  }

  self.ping = function(callback) {
    function swapBytes(buffer) {
      /*http://stackoverflow.com/a/7460958/1191579*/
      var l = buffer.length;
      if (l & 0x01) {
        throw new Error('Buffer length must be even');
      }
      for (var i = 0; i < l; i += 2) {
        var a = buffer[i];
        buffer[i] = buffer[i+1];
        buffer[i+1] = a;
      }
      return buffer; 
    }

    function send_query_packet(port) {
      var net = require('net');
      var socket = net.connect({port: port});
      socket.setTimeout(2500);

      socket.on('connect', function() {
        var query = '\xfe\x01',
            buf = new Buffer(2);

        buf.write(query, 0, query.length, 'binary');
        socket.write(buf);
      });

      socket.on('data', function(data) {
        socket.end();
        var split = swapBytes(data.slice(3)).toString('ucs2').split('\u0000').splice(1);
        callback(null, {
          protocol: parseInt(parseInt(split[0])),
          server_version: split[1],
          motd: split[2],
          players_online: parseInt(split[3]),
          players_max: parseInt(split[4])
        });
      });

      socket.on('error', function(err) {
        console.error('error:', err);
        callback(err, null);
      })
    }

    self.sp(function(err, dict) {
      send_query_packet(dict['server-port']);
    })  
  }

  self.previous_version = function(filepath, restore_as_of, callback) {
    var tmp = require('tmp');
    var binary = which.sync('rdiff-backup');
    var abs_filepath = path.join(self.env.bwd, filepath);

    tmp.file(function (err, new_file_path, fd, cleanupCallback) {
      if (err) throw err;

      var args = ['--force', '--restore-as-of', restore_as_of, abs_filepath, new_file_path];
      var params = { cwd: self.env.bwd };
      var proc = child_process.spawn(binary, args, params);

      proc.on('error', function(code) {
        callback(code, null);
      })

      proc.on('exit', function(code) {
        if (code == 0) {
          fs.readFile(new_file_path, function (inner_err, data) {
            callback(inner_err, data.toString());
          })
        } else {
          callback(code, null);
        }
      })
    });
  }

  self.previous_property = function(restore_as_of, callback) {
    self.previous_version('server.properties', restore_as_of, function(err, file_contents) {
      
      if (err) {
        callback(err, null)
      } else {
        var ini = require('ini');
        callback(err, ini.decode(file_contents));
      }
    });
  }

  return self;
}

String.prototype.format = function() {
  var s = this;
  for(var i = 0, iL = arguments.length; i<iL; i++) {
    s = s.replace(new RegExp('\\{'+i+'\\}', 'gm'), arguments[i]);
  }
  return s;
};
