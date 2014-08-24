var fs = require('fs-extra');
var path = require('path');
var events = require('events');
var cf = exports;

cf.config_file = function(file_path) {
  var self = this;
  self.file_path = file_path;
  self.ev = new events.EventEmitter();
  self.props = {};

  self.read = function() {
    fs.readFile(self.file_path, 'utf8', function(err, lines) {
      if (err) {
        self.props = {};
      } else {
        var p = {};
        var row;
        for (var i=0; i < lines.length; i++) {
          row = lines[i].split('=');
          p[row[0]] = row[1];
        }
        self.props = p;
      }
    });
  }

  self.commit = function() {
    var writer = fs.createWriteStream(self.file_path);
    writer.on('finish', function() {
      self.ev.emit('commit', true);
    })

    for (var key in self.props) {
      writer.write(self.props[key] + '\n');
    }
    writer.end();
  }

}