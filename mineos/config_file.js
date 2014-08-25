var fs = require('fs-extra');
var path = require('path');
var events = require('events');
var cf = exports;

cf.config_file = function(file_path, initial_properties) {
  var self = this;
  self.file_path = file_path;
  self.ev = new events.EventEmitter();
  self.props = initial_properties || {};

  self.read = function() {
    fs.readFile(self.file_path, 'utf8', function(err, lines) {
      if (!err) {
        var p = {};
        var row;
        lines = lines.split('\n');
        for (var i=0; i < lines.length; i++) {
          row = lines[i].split('=');
          p[row[0]] = row[1];
        }
        self.props = p;
        self.ev.emit('read', true);
      }
    });
  }

  self.commit = function() {
    var lines = [];
    for (var key in self.props) {
      lines.push(key + '=' + self.props[key]);
    }
    fs.writeFile(self.file_path, lines.join('\n'), function() {
      self.ev.emit('commit', true);
    });
  }

  if (!Object.keys(self.props).length) {
    self.read();
  }
}