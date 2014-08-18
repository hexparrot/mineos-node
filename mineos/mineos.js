var fs = require('fs');
var path = require('path');
var mineos = exports;

mineos.server_list = function(base_dir) {
  return fs.readdirSync(path.join(base_dir, 'servers'));
}

mineos.is_server = function(server_path) {
  return fs.existsSync(path.join(server_path, 'server.properties'));
}