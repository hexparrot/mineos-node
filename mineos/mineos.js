var fs = require('fs-extra');
var path = require('path');
var events = require('events');
var async = require('async');
var child_process = require('child_process');
var cf = require('../mineos/config_file');
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
    cmdline = fs.readFileSync('/proc/{0}/cmdline'.format(pids[i]))
                              .toString('ascii')
                              .replace(/\u0000/g, ' ');
    screen_match = SCREEN_REGEX.exec(cmdline);

    if (screen_match) {
      if (screen_match[1] in servers_found)
        servers_found[screen_match[1]]['screen'] = parseInt(pids[i]);
      else
        servers_found[screen_match[1]] = {'screen': parseInt(pids[i])}
    } else {
      environ = fs.readFileSync('/proc/{0}/environ'.format(pids[i]))
                                .toString('ascii')
                                .replace(/\u0000/g, ' ');
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

mineos.mc = function(server_name, base_dir) {
  var self = this;
  self.server_name = server_name;
  self.ev = new events.EventEmitter();

  self.env = {
    base_dir: base_dir,
    cwd: path.join(base_dir, mineos.DIRS['servers'], server_name),
    bwd: path.join(base_dir, mineos.DIRS['backup'], server_name),
    awd: path.join(base_dir, mineos.DIRS['archive'], server_name),
    sp: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.properties'),
    sc: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.config'),
  }

  self.broadcast = function(action, success, start_time, payload) {
    self.ev.emit(action, {
      action: action,
      success: success,
      time_start: start_time,
      time_end: Date.now(),
      payload: payload
    });
  }

  self.is_server = function() {
    var now = Date.now();
    fs.exists(self.env.sp, function(exists) {
      self.broadcast('is_server', exists, now, null);
    });
  }

  self.create_sp = function() {
    var sp = new cf.config_file(self.env.sp, mineos.SP_DEFAULTS);
    sp.ev.once('commit', function() {
      self.ev.emit('sp-created', true);
    })
    sp.commit();
  }

  self.create_sc = function() {
    var sc = new cf.config_file(self.env.sc, mineos.SP_DEFAULTS);
    sc.ev.once('commit', function() {
      self.ev.emit('sc-created', true);
    })
    sc.commit();
  }

  self.create = function() {
    function new_sp(callback) {
      self.ev.once('sp-created', function() { callback(); })
      self.create_sp();
    }

    function new_sc(callback) {
      self.ev.once('sc-created', function() { callback(); })
      self.create_sc();
    }
    var now = Date.now();

    async.each([self.env.cwd, self.env.bwd, self.env.awd], fs.mkdirs, function(err) {
      async.series([new_sp, new_sc], function(err) {
        if (!err) {
          var dest = [self.env.cwd, self.env.bwd, self.env.awd, self.env.sp, self.env.sc];
          for (var i=0; i < dest.length; i++) {
            fs.chown(dest[i], 1000, 1001);
          }
          self.broadcast('create', true, now, null);
        }
      })
    })
  }

  self.delete = function() {
    var now = Date.now();
    async.each([self.env.cwd, self.env.bwd, self.env.awd], fs.remove, function(err) {
      self.broadcast('delete', true, now, null);
    });
  }

  self.sp = function() {
    if (typeof(self._sp) == 'undefined') {
      self._sp = {};
      for (var k in mineos.SP_DEFAULTS) {
        self._sp[k] = mineos.SP_DEFAULTS[k];
      }
    }
      
    return self._sp;
  }

  self.start = function() {
    var now = Date.now();
    var binary = '/usr/bin/screen';
    var args = ['-dmS', 'mc-{0}'.format(self.server_name), 
                '/usr/bin/java', '-server', '-Xmx256M', '-Xms256M',
                '-jar',  'minecraft_server.jar', 'nogui'];
    var params = {
        cwd: self.env.cwd,
        uid: 1000,
        gid: 1001
      }

    fs.copy('/var/games/minecraft/profiles/vanilla179/minecraft_server.1.7.9.jar',
            path.join(self.env.cwd, 'minecraft_server.jar'), function(err) {
              self.broadcast('start', true, now, child_process.spawn(binary, args, params));
            });
  }

  self.kill = function() {
    var now = Date.now();
    process.kill(mineos.server_pids_up()[self.server_name].java);
    self.broadcast('kill', true, now, null);
  }

  self.stuff = function(msg) {
    var params = {
      cwd: self.env.cwd,
      uid: 1000,
      gid: 1001
    }
    return child_process.spawn('/usr/bin/screen', 
                               ['-S', 'mc-{0}'.format(self.server_name), 
                                '-p', '0', '-X', 'eval', 'stuff "{0}\012"'.format(msg)], 
                               params);
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
