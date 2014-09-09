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
  })();

  function track_server(server_name) {
    var instance = new mineos.mc(server_name, base_dir),
        nsp;

    function setup() {
      instance.is_server(function(is_server) {
        nsp = self.front_end.of('/{0}'.format(server_name));

        self.servers[server_name] = {
          instance: instance,
          nsp: nsp,
          tails: {},
          watches: {}
        }

        console.info('Discovered server: {0}'.format(server_name));
        make_tail('logs/latest.log');
        make_watch('server.properties');

        nsp.on('connection', function(socket) {
          console.info('User connected to namespace: {0}'.format(server_name));
          socket.on('command', function(args) {
            console.info('command received', args.command)
            args.uuid = uuid.v1();
            nsp.emit('receipt', args)
            server_dispatcher(args);
          })
        })
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

    function make_watch(rel_filepath) {
      var abs_filepath = path.join(instance.env.cwd, rel_filepath);

      if (rel_filepath in self.servers[server_name].watches) {
        console.warn('[{0}] Watch already exists for {1}'.format(server_name, rel_filepath));
        return;
      }

      try {
        var watcher = chokidar.watch(abs_filepath, {persistent: true});
        watcher
          .on('change', function(fp) {
            switch (rel_filepath) {
              case 'server.properties':
                instance.sp(function(sp_data) {
                  console.info('[{0}] server.properties changed'.format(server_name));
                  nsp.in(rel_filepath).emit('server.properties', sp_data);
                })
                break;
            }
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

  function untrack_server(server_name) {
    var instance = new mineos.mc(server_name, base_dir);

    for (var t in self.servers[server_name].tails) {
      self.servers[server_name].tails[t].unwatch();
    }

    for (var w in self.servers[server_name].watches) {
      self.servers[server_name].watches[t].close();
    }

    delete self.servers[server_name];

    self.front_end.emit('server_list', Object.keys(self.servers));
    console.info('Server removed: {0}'.format(server_name));
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