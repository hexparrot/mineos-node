var fs = require('fs');
var touch = require("touch");
var path = require('path');
var mineos = exports;
var BASE_DIR = '/var/games/minecraft';

mineos.server_list = function(base_dir) {
  return fs.readdirSync(path.join(base_dir, 'servers'));
}

mineos.is_server = function(server_name) {
  return fs.existsSync(path.join(BASE_DIR, 'servers', server_name, 'server.properties'));
}

mineos.create_server = function(server_name) {
  var server_path = path.join(BASE_DIR, 'servers', server_name);

  fs.mkdirSync(server_path);
  touch.sync(path.join(server_path, 'server.properties'));
  touch.sync(path.join(server_path, 'server.config'));
}