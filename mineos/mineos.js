var fs = require('fs');
var path = require('path');
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

mineos.mc = function(server_name, base_dir) {
  var self = this;

  self.env = {
    server_name: server_name,
    base_dir: base_dir,
    cwd: path.join(base_dir, mineos.DIRS['servers'], server_name),
    bwd: path.join(base_dir, mineos.DIRS['backup'], server_name),
    awd: path.join(base_dir, mineos.DIRS['archive'], server_name),
    sp: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.properties'),
    sc: path.join(base_dir, mineos.DIRS['servers'], server_name, 'server.config'),
  }

  self.create = function() {
    var touch = require("touch");

    fs.mkdirSync(self.env.cwd);
    touch.sync(self.env.sp);
    touch.sync(self.env.sc);
  }

  self.is_server = function() {
    return fs.existsSync(self.env.sp);
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

  return self;
}
