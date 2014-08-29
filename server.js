var mineos = require('./mineos');
var chokidar = require('chokidar');
var path = require('path');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
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

server.backend = function(socket_emitter) {
  var self = this;
  self.servers = {};
  self.front_end = socket_emitter || new events.EventEmitter();

  self.front_end.on('connection', function(socket) {
    console.log('user connected');
    self.front_end.emit('server_list', Object.keys(self.servers));

    socket.on('chat', function(msg) {
      console.log('CHAT:', msg);
    })
  })

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
        console.log('tracking', server_name);
        self.front_end.emit('server_list', Object.keys(self.servers));
      }
    })
  })

  self.watcher_server_list.on('unlinkDir', function(path) {
    try {
      var server_name = server.extract_server_name(path);
    } catch (e) {
      return;
    }

    delete self.servers[server_name];
    console.log('untracking', server_name);
    self.front_end.emit('server_list', Object.keys(self.servers));
  })

  return self;
}

var be = server.backend(io);
var response_options = {root: '/home/mc'};

app.get('/', function(req, res){
  res.sendFile('index.html', response_options);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});