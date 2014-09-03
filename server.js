var mineos = require('./mineos');
var chokidar = require('chokidar');
var path = require('path');
var events = require('events');
var introspect = require('introspect');
var tail = require('tail').Tail;
var uuid = require('node-uuid');
var server = exports;

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

    function dispatcher(args) {
      var fn, required_args;
      var arg_array = [];

      try {
        fn = instance[args.command];
        required_args = introspect(fn);
      } catch (e) { 
        args.success = false;
        args.error = e;
        nsp.emit('result', args);
        return;
      }

      

      for (var i in required_args) {
        if (required_args[i] == 'callback') 
          arg_array.push(function(success, payload) {
            args.success = success;
            nsp.emit('result', args);
          })
        else if (required_args[i] in args)
          arg_array.push(args[required_args[i]])
        else
          return;
      }

      fn.apply(instance, arg_array);
      console.info('{0} received request {1}: {2}'.format(server_name, 
                                                          args.command, 
                                                          args.success))
    }

    function execute(args) {
      switch (args.command) {
        case 'server_overview':
          instance.sp(function(sp_data) {
            console.log('Broadcasting server.properties');
            nsp.emit('server.properties', sp_data);
          })
          break;
        case 'tail':
          var file_path = path.join(instance.env.cwd, args.filepath);
          var room = args.filepath;
          args.socket.join(room);

          if (!(file_path in tails)) {
            try {
              tails[file_path] = new tail(file_path);
            } catch (e) {
              console.error('Creating tail on {0} failed.'.format(file_path));
              console.log('Watching for file generation: {0}'.format(args.filepath));
              var tailer = chokidar.watch(instance.env.cwd, {persistent: true, ignoreInitial: true});

              tailer
                .on('add', function(fp) {
                  var file = path.basename(fp);
                  if (path.basename(args.filepath) == file) {
                    tailer.close();
                    console.log('{0} created! Watchfile {1} closed.'.format(file, args.filepath));
                    execute(args);
                  }
                })
              return;
            }
          }

          console.info('Creating tail "{0}" on {1}'.format(room, file_path));

          tails[file_path].on("line", function(data) {
            args.socket.emit('tail_data', data);
          })
          
          args.socket.on('disconnect', function() {
            tails[file_path].unwatch();
            delete tails[file_path];
            console.info('Dropping tail: {0}'.format(room));
          })
          break;
        case 'watch':
          var file_path = path.join(instance.env.cwd, args.filepath);
          var watcher = chokidar.watch(file_path, {persistent: true});

          watcher
            .on('change', function(filepath) {
              switch (args.filepath) {
                case 'server.properties':
                  instance.sp(function(sp_data) {
                    nsp.emit('server.properties', sp_data);
                    console.info('Rebroadcasting', args.filepath)
                  })
                  break;
              }
            })

          nsp.on('disconnect', function() {
            watcher.close();
            console.info('Stopping watch: {0}'.format(room));
          })
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
            args.uuid = uuid.v1();
            nsp.emit('receipt', args)
            dispatcher(args);
          })

          execute({
            command: 'tail',
            filepath: 'logs/latest.log',
            socket: socket
          })

          execute({
            command: 'watch',
            filepath: 'server.properties'
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

  var server_path = path.join(base_dir, mineos.DIRS['servers']);
  var regex_servers = new RegExp('{0}\/[a-zA-Z0-9_\.]+\/.+'.format(server_path));
  var watcher = chokidar.watch(server_path, { persistent: true, ignored: regex_servers });

  watcher
    .on('addDir', function(dirpath) {
      try {
        var server_name = mineos.extract_server_name(base_dir, dirpath);
      } catch (e) { return }
      if (server_name == path.basename(dirpath))
        track_server(server_name);
    })
    .on('unlinkDir', function(dirpath) {
      try {
        var server_name = mineos.extract_server_name(base_dir, dirpath);
      } catch (e) { return }
      if (server_name == path.basename(dirpath))
        untrack_server(server_name);
    })

  return self;
}