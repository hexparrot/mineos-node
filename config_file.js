var ini = require('ini');
var fs = require('fs');
var cf = exports;

cf.config_file = function(file_path) {
  var self = this;
  self.props = {};
  self.file_path = file_path;

  self.write_ini = function(dict, callback) {
    self.props = dict;
    fs.writeFile(self.file_path, ini.stringify(self.props), 'utf8', function(err) {
      if (!err)
        callback(false);
      callback(true);
    })
  }

  self.modify = function(property, value, callback) {
    self.props[property] = value;
    self.write_ini(self.props, function(err) {
      if (!err)
        callback(false);
      callback(true);
    })
  }

  self.load = function(callback) {
    fs.readFile(file_path, 'utf8', function(err, data) {
      if (!err) {
        self.props = ini.parse(data);
        callback(false);
      }
      callback(true);
    })
  }
}

