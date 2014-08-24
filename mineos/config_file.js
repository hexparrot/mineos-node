var fs = require('fs-extra');
var path = require('path');
var events = require('events');
var cf = exports;

cf.config_file = function(file_path) {
  var self = this;
  self.ev = events.EventEmitter();
  self.props = {};

  self.read = function() {
    fs.readFile(file_path, 'utf8', function(err, lines) {
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

  /*self.lines = fs.readFile(file_path, 'utf8').split('\n');

  self.commit = function() {

  }*/
}