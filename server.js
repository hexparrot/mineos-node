var mineos = require('./mineos');
var chokidar = require('chokidar');
var path = require('path');
/*var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);*/
var events = require('events');
var server = exports;
var BASE_DIR = '/var/games/minecraft';

server.extract_server_name = function(path) {
  try {
    return path.match(/\/servers\/(?!\.)([a-zA-Z0-9_\.]+)/)[1];
  } catch(e) {
    throw new Error('no server name in path');
  }
}

server.backend = function() {
  var self = this;
  self.servers = {};
  self.front_end = new events.EventEmitter();

  self.watcher_server_list = chokidar.watch(path.join(BASE_DIR, mineos.DIRS['servers']),
                                            {persistent: true});

  self.watcher_server_list.on('addDir', function(path) {
    try {
      var server_name = server.extract_server_name(path);
    } catch (e) {
      return;
    }

    var throwaway = new mineos.mc(server_name, BASE_DIR);
    throwaway.is_server(function(is_server) {
      if (is_server) {
        self.servers[server_name] = throwaway;
        self.front_end.emit('tracking', server_name);
      }
    })
  })

  return self;
}


