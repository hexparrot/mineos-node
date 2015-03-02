var ini = require('ini');
var fs = require('fs');
var cf = exports;

cf.config_file = function(file_path) {
  var self = this;
  self.props = {};
  self.file_path = file_path;

  self.write = function(dict, callback) {
    var new_dict = {};
    for (var key in dict)
      new_dict[key] = dict[key];
    
    self.props = new_dict;
    fs.writeFile(self.file_path, ini.stringify(self.props), 'utf8', function(err) {
      callback(err);
    })
  }

  self.modify = function(property, value, callback) {
    self.props[property] = value;
    self.write(self.props, function(err) {
      callback(err);
    })
  }

  self.overlay = function(dict, callback) {
    for (var key in dict)
      self.props[key] = dict[key];

    fs.writeFile(self.file_path, ini.stringify(self.props), 'utf8', function(err) {
      callback(err);
    })
  }

  self.load = function(callback) {
    fs.readFile(file_path, 'utf8', function(err, data) {
      if (!err) {
        self.props = ini.parse(data);
      }
      callback(err);
    })
  }
}

