var fs = require('fs');
var path = require('path');

exports.server_list = function(base_dir) {
  return fs.readdirSync(path.join(base_dir, 'servers'));
}

exports.is_server = function(server_path) {
  return fs.existsSync(path.join(server_path, 'server.properties'));
}