var fs = require('fs');
var path = require('path');
var mineos = exports;
var BASE_DIR = '/var/games/minecraft';
var DIRS = {
  'servers': 'servers',
  'backup': 'backup',
  'archive': 'archive',
  'profiles': 'profiles',
  'import': 'import'
}

mineos.server_list = function(base_dir) {
  return fs.readdirSync(path.join(base_dir, DIRS['servers']));
}

mineos.mc = function(server_name, base_dir) {
  var self = this;

  self.env = {
    server_name: server_name,
    base_dir: base_dir,
    cwd: path.join(base_dir, DIRS['servers'], server_name),
    bwd: path.join(base_dir, DIRS['backup'], server_name),
    awd: path.join(base_dir, DIRS['archive'], server_name),
    sp: path.join(base_dir, DIRS['servers'], server_name, 'server.properties'),
    sc: path.join(base_dir, DIRS['servers'], server_name, 'server.config'),
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

  return self;
}