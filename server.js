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

  self.servers = {}
  self.front_end = socket_emitter || new events.EventEmitter();

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers']);
    var regex_servers = new RegExp('{0}\/[a-zA-Z0-9_\.]+\/.+'.format(server_path));
    self.watcher = chokidar.watch(server_path, { persistent: true, ignored: regex_servers });

    self.watcher
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
          self.untrack_server(server_name);
      })
  })();

  function track_server(server_name) {
    var instance = new mineos.mc(server_name, base_dir),
        nsp;

    function setup() {
      nsp = self.front_end.of('/{0}'.format(server_name));

      self.servers[server_name] = {
        instance: instance,
        nsp: nsp,
        tails: {},
        watches: {}
      }

      console.info('Discovered server: {0}'.format(server_name));
      self.front_end.emit('track_server', server_name);
      make_tail('logs/latest.log');
      make_watch('server.properties', function(rel_filepath) {
        instance.sp(function(sp_data) {
          console.info('[{0}] server.properties changed'.format(server_name));
          nsp.in(rel_filepath).emit('server.properties', sp_data);
        })
      });

      nsp.on('connection', function(socket) {
        function produce_receipt(args) {
          console.info('command received', args.command)
          args.uuid = uuid.v1();
          nsp.emit('receipt', args)
          server_dispatcher(args);
        }

        function start_watch(rel_filepath) {
          if (rel_filepath in self.servers[server_name].tails) {
            socket.join(rel_filepath);
            console.info('[{0}] user following tail: {1}'.format(server_name, rel_filepath));
          } else if (rel_filepath in self.servers[server_name].watches) { 
            socket.join(rel_filepath);
            console.info('[{0}] user watching file: {1}'.format(server_name, rel_filepath));
          } else {
            console.error('no room by found for', rel_filepath);
          }
        }

        function unwatch(rel_filepath) {
          if (rel_filepath in self.servers[server_name].tails) {
            socket.leave(rel_filepath);
            console.info('[{0}] user dropping tail: {1}'.format(server_name, rel_filepath));
          } else if (rel_filepath in self.servers[server_name].watches) {
            socket.leave(rel_filepath);
            console.info('[{0}] user stopped watching file: {1}'.format(server_name, rel_filepath));
          } else {
            console.error('no room by found for', rel_filepath);
          }
        }

        console.info('User connected to namespace: {0}'.format(server_name));
        socket.on('command', produce_receipt);
        socket.on('watch', start_watch);
        socket.on('unwatch', unwatch);

      })
    }

    function server_dispatcher(args) {
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
        else if (required_args[i] in args) {
          arg_array.push(args[required_args[i]])
        } else {
          args.success = false;
          console.error('Provided values missing required argument', required_args[i]);
          args.error = 'Provided values missing required argument: {0}'.format(required_args[i]);
          nsp.emit('result', args);
          return;
        }
      }

      if (args.command == 'delete') {
        // preemptively close tails/watches to let unlinkDir/untrackserver
        // do all the real cleanup work without latest.log file open error
        if (server_name in self.servers) {
          for (var t in self.servers[server_name].tails) 
            self.servers[server_name].tails[t].unwatch();

          for (var w in self.servers[server_name].watches) 
            self.servers[server_name].watches[w].close();
        } else {
          console.log('Ignored attempt to delete previously-deleted server: {0}'.format(server_name));
          //this will occur if the socket item exists on the client-side
          //and pretty much only after deleted during same session,
          //i.e., consecutive attempts to delete.  will not happen under
          //normal circumstances
          return;
        }
      }

      fn.apply(instance, arg_array);
      console.info('{0} received request {1}'.format(server_name, 
                                                     args.command))
    }

    function make_tail(rel_filepath) {
      var abs_filepath = path.join(instance.env.cwd, rel_filepath);

      if (rel_filepath in self.servers[server_name].tails) {
        console.warn('[{0}] Tail already exists for {1}'.format(server_name, rel_filepath));
        return;
      }

      try {
        var new_tail = new tail(abs_filepath);
        console.info('[{0}] Created tail on {1}'.format(server_name, rel_filepath));
        new_tail.on('line', function(data) {
          //console.info('[{0}] {1}: transmitting new tail data'.format(server_name, rel_filepath));
          nsp.in(rel_filepath).emit('tail_data', data);
        })
        self.servers[server_name].tails[rel_filepath] = new_tail;
      } catch (e) {
        console.error('[{0}] Create tail on {1} failed'.format(server_name, rel_filepath));
        console.info('[{0}] Watching for file generation: {1}'.format(server_name, rel_filepath));

        var tail_lookout = chokidar.watch(instance.env.cwd, {persistent: true, ignoreInitial: true});
        tail_lookout
          .on('add', function(fp) {
            var file = path.basename(fp);
            if (path.basename(rel_filepath) == file) {
              tail_lookout.close();
              console.info('[{0}] {1} created! Watchfile {2} closed'.format(server_name, file, rel_filepath));
              make_tail(rel_filepath);
            }
          })
      }
    }

    function make_watch(rel_filepath, callback) {
      var abs_filepath = path.join(instance.env.cwd, rel_filepath);

      if (rel_filepath in self.servers[server_name].watches) {
        console.warn('[{0}] Watch already exists for {1}'.format(server_name, rel_filepath));
        return;
      }

      try {
        var watcher = chokidar.watch(abs_filepath, {persistent: true});
        watcher.on('change', function(fp) {
          callback(rel_filepath);
        })
        console.info('[{0}] Started watch on {1}'.format(server_name, rel_filepath));
        self.servers[server_name].watches[rel_filepath] = watcher;
      } catch (e) {
        console.log(e)
        //handle error or ignore
      }

    }

    instance.is_server(function(is_server) {
      setup();
    })
  }

  self.untrack_server = function(server_name) {
    var instance = new mineos.mc(server_name, base_dir);

    for (var t in self.servers[server_name].tails) 
      self.servers[server_name].tails[t].unwatch();

    for (var w in self.servers[server_name].watches) 
      self.servers[server_name].watches[w].close();

    self.servers[server_name].nsp.removeAllListeners();
    delete self.servers[server_name];

    self.front_end.emit('server_list', Object.keys(self.servers));
    console.info('Server removed: {0}'.format(server_name));
  }

  self.shutdown = function() {
    self.watcher.close();

    for (var s in self.servers)
      self.untrack_server(s);
  }

  self.front_end.on('connection', function(socket) {
    function webui_dispatcher(args) {
      console.info('[WEBUI] Received emit command', args);
      switch (args.command) {
        case 'create':
          var instance = new mineos.mc(args.server_name, base_dir);
          instance.create(function(did_create) {
            if (did_create){
              self.front_end.emit('track_server', args.server_name);
              console.info('Server created: {0}'.format(args.server_name));
            }
          })
          break;
      }
    }

    console.info('User connected to webui');
    self.front_end.emit('server_list', Object.keys(self.servers));
    socket.on('command', webui_dispatcher);
  })

  return self;
}