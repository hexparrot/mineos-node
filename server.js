var mineos = require('./mineos');
var chokidar = require('chokidar');
var path = require('path');
var events = require('events');
var tail = require('tail').Tail;
var server = exports;

server.extract_server_name = function(base_dir, server_path) {
  var re = new RegExp('{0}/([a-zA-Z0-9_\.]+)'.format(path.join(base_dir, mineos.DIRS['servers'])));
  try {
    return re.exec(server_path)[1];
  } catch(e) {
    throw new Error('no server name in path');
  }
}

server.backend = function(base_dir, socket_emitter) {
  var self = this;
  self.servers = {};
  self.channels = {};
  self.front_end = socket_emitter || new events.EventEmitter();

  self.front_end.on('connection', function(socket) {
    console.info('User connected');
    self.front_end.emit('server_list', Object.keys(self.servers));

    socket.on('command', function(args) {
      console.log('Received emit command', args);
      switch (args.command) {
        case 'create':
          var instance = new mineos.mc(args.server_name, base_dir);
          instance.create(function(did_create) {
            if (did_create){
              console.info('Server created: {0}'.format(args.server_name));
            }
          })
          break;
      }
    })
  })

  function track_server(server_name) {
    var instance = new mineos.mc(server_name, base_dir);
    var nsp = self.front_end.of('/{0}'.format(server_name));
    var tails = {};

    function execute(args) {
      switch (args.command) {
        case 'start':
          instance.start(function(did_start) {
            if (did_start){
              console.info('Server started: {0}'.format(server_name));
            }
          })
          break;
        case 'server_overview':
          instance.sp(function(sp_data) {
            nsp.emit('server.properties', sp_data);
          })
          break;
        case 'stuff':
          instance.stuff(args.message, function(did_stuff, proc) {
            if (did_stuff){
              console.info('Server {0} sent command: {1}'.format(server_name, args.message));
            } else {
              console.warn('Ignored attempt to send "{0}" to {1}'.format(args.message, server_name));
            }
          })
          break;
        case 'tail':
          var file_path = path.join(instance.env.cwd, args.filepath);
          var room = args.filepath;
          args.socket.join(room);

          var ft;
          try {
            ft = new tail(file_path);
          } catch (e) {
            console.error('Creating tail on {0} failed.'.format(file_path));
            return;
          }
          
          console.info('Creating tail "{0}" on {1}'.format(room, file_path));

          ft.on("line", function(data) {
            nsp.in(room).emit('tail_data', data);
          })
          
          args.socket.on('disconnect', function() {
            ft.unwatch();
            console.info('Dropping tail: {0}'.format(room));
          })
          break;
      }
    }

    instance.is_server(function(is_server) {
      if (is_server) {
        self.channels[server_name] = nsp;
        self.servers[server_name] = instance;
        
        self.front_end.emit('track_server', server_name);
        console.info('Discovered server: {0}'.format(server_name));

        nsp.on('connection', function(socket) {
          socket.on('command', function(args) {
            execute(args);
          })

          execute({
            command: 'tail',
            filepath: 'logs/latest.log',
            socket: socket
          })


            
        })
      }
    })
  }

  function untrack_server(server_name) {
    var instance = new mineos.mc(server_name, base_dir);

    delete self.servers[server_name];
    delete self.channels[server_name];

    self.front_end.emit('server_list', Object.keys(self.servers));
    console.info('Server removed: {0}'.format(server_name));
  }

  var watcher = chokidar.watch(path.join(base_dir, mineos.DIRS['servers']),
                               {persistent: true});

  watcher
    .on('addDir', function(dirpath) {
      try {
        var server_name = server.extract_server_name(base_dir, dirpath);
      } catch (e) { return }
      if (server_name == path.basename(dirpath))
        track_server(server_name);
    })
    .on('unlinkDir', function(dirpath) {
      console.log(dirpath)
      try {
        var server_name = server.extract_server_name(base_dir, dirpath);
      } catch (e) { return }
      console.log(server_name)
      if (server_name == path.basename(dirpath))
        untrack_server(server_name);
    })

  return self;
}