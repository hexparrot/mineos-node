var fs = require('fs');
var touch = require("touch");
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

mineos.is_server = function(instance) {
  return fs.existsSync(instance.env.sp);
}

mineos.create_server = function(instance) {
  fs.mkdirSync(instance.env.cwd);
  touch.sync(instance.env.sp);
  touch.sync(instance.env.sc);
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

  return self;
}