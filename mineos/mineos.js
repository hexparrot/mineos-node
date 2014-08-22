var fs = require('fs-extra');
var path = require('path');
var child_process = require('child_process');
var mineos = exports;

mineos.DIRS = {
  'servers': 'servers',
  'backup': 'backup',
  'archive': 'archive',
  'profiles': 'profiles',
  'import': 'import'
}

mineos.server_list = function(base_dir) {
  return fs.readdirSync(path.join(base_dir, mineos.DIRS['servers']));
}

mineos.server_list_up = function() {
  var cmdline, match;
  var pids = fs.readdirSync('/proc').filter(function(e) { if (/^([0-9]+)$/.test(e)) {return e} });
  var SCREEN_REGEX = /screen[^S]+S mc-([^ ]+)/i;
  var servers_found = [];

  for (var i=0; i < pids.length; i++) {
    cmdline = fs.readFileSync('/proc/{0}/cmdline'.format(pids[i]))
                              .toString('ascii')
                              .replace(/\u0000/g, ' ');
    match = SCREEN_REGEX.exec(cmdline);
    if (match && servers_found.indexOf(match[1]) == -1)
      servers_found.push(match[1])
  }
  return servers_found;
}

mineos.server_pids_up = function() {
  var cmdline, match;
  var pids = fs.readdirSync('/proc').filter(function(e) { if (/^([0-9]+)$/.test(e)) {return e} });
  var SCREEN_REGEX = /screen[^S]+S mc-([^ ]+)/i;
  var servers_found = {};

  for (var i=0; i < pids.length; i++) {
    cmdline = fs.readFileSync('/proc/{0}/cmdline'.format(pids[i]))
                              .toString('ascii')
                              .replace(/\u0000/g, ' ');
    match = SCREEN_REGEX.exec(cmdline);
    if (match && !(match[1] in servers_found))
      servers_found[match[1]] = {'screen': parseInt(pids[i])};
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

  self.env = {
    base_dir: base_dir,
    cwd: path.join(base_dir, mineos.DIRS['servers'], server_name),
    bwd: path.join(base_dir, mineos.DIRS['backup'], server_name),
    awd: path.join(base_dir, mineos.DIRS['archive'], server_name),
    sp: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.properties'),
    sc: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.config'),
  }

  self.is_server = function() {
    return fs.existsSync(self.env.sp);
  }

  self.create = function() {
    fs.mkdirSync(self.env.cwd);
    fs.createFileSync(self.env.sp);
    fs.createFileSync(self.env.sc);
  }

  self.sp = function() {
    var DEFAULTS = {
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

    if (typeof(self._sp) == 'undefined') {
      self._sp = {};
      for (var k in DEFAULTS) {
        self._sp[k] = DEFAULTS[k];
      }
    }
      
    return self._sp;
  }

  self.start = function() {
    
    fs.copySync('/var/games/minecraft/profiles/vanilla179/minecraft_server.1.7.9.jar',
                path.join(self.env.cwd, 'minecraft_server.jar'));
    
    var binary = '/usr/bin/screen';
    var args = ['-dmS', 'mc-{0}'.format(self.server_name), 
                '/usr/bin/java', '-server', '-Xmx256M', '-Xms256M',
                '-jar',  'minecraft_server.jar', 'nogui'];
    var params = {
        cwd: self.env.cwd,
        uid: 1000,
        gid: 1001
      }
    var proc = child_process.spawn(binary, args, params);

    return proc;
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
