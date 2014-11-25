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
    // ignores event updates from servers that have more path beyond the /servers/<dirhere>/<filehere>

    self.watcher
      .on('addDir', function(dirpath) {
        // event to trigger when new server detected, e.g., /var/games/minecraft/servers/<newdirhere>
        try {
          var server_name = mineos.extract_server_name(base_dir, dirpath);
        } catch (e) { return }
        if (server_name == path.basename(dirpath))
          track_server(server_name);
      })
      .on('unlinkDir', function(dirpath) {
        // event to trigger when server directory deleted
        try {
          var server_name = mineos.extract_server_name(base_dir, dirpath);
        } catch (e) { return }
        if (server_name == path.basename(dirpath))
          self.untrack_server(server_name);
      })
  })();

  function track_server(server_name) {
    /* when evoked, creates a permanant 'mc' instance, namespace, and place for file tails/watches. 
       track_server should only happen in response to the above chokidar watcher.
    */
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
        instance.sp(function(err, sp_data) {
          console.info('[{0}] server.properties changed'.format(server_name));
          nsp.in(rel_filepath).emit('server.properties', sp_data);
        })
      });

      nsp.on('connection', function(socket) {
        function produce_receipt(args) {
          /* when a command is received, immediately respond to client it has been received */
          console.info('command received', args.command)
          args.uuid = uuid.v1();
          nsp.emit('receipt', args)
          server_dispatcher(args);
        }

        function start_watch(rel_filepath) {
          /* can put a tail/watch on any file, and joins a room for all future communication */
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
          /* removes a tail/watch for a given file, and leaves the room */
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
        // receives an array of all expected arguments, using introspection.
        // they are in order as listed by the function definition, which makes iteration possible.
      } catch (e) { 
        args.success = false;
        args.error = e;
        nsp.emit('result', args);
        return;
      }

      for (var i in required_args) {
        // all callbacks expected to follow the pattern (success, payload).
        if (required_args[i] == 'callback') 
          arg_array.push(function(err, payload) {
            args.success = !err;
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

      switch (args.command) {
        case 'start':
          if (server_name in self.servers)
            self.servers[server_name].instance.property('up', function(err, is_up) {
              if (is_up) {
                console.warn('Ignored attempt to start already-started server: {0}'.format(server_name));
              } else {
                fn.apply(instance, arg_array);
                console.info('{0} received request {1}'.format(server_name, args.command))
              }
            })
          break;
        case 'stuff':
          if (server_name in self.servers)
            self.servers[server_name].instance.property('up', function(err, is_up) {
              if (is_up) {
                fn.apply(instance, arg_array);
                console.info('{0} received request {1}'.format(server_name, args.command))
              } else {
                console.warn('Ignored attempt to send command to downed server: {0}'.format(server_name));
              }
            })
          break;
        case 'delete':
          // preemptively close tails/watches to let unlinkDir/untrackserver
          // do all the real cleanup work without latest.log file open error
          if (server_name in self.servers) {
            for (var t in self.servers[server_name].tails) 
              self.servers[server_name].tails[t].unwatch();

            for (var w in self.servers[server_name].watches) 
              self.servers[server_name].watches[w].close();

            fn.apply(instance, arg_array);
            console.info('{0} received request {1}'.format(server_name, args.command))
          } else {
            console.warn('Ignored attempt to delete previously-deleted server: {0}'.format(server_name));
            //this will occur if the socket item exists on the client-side
            //and pretty much only after deleted during same session,
            //i.e., consecutive attempts to delete.  will not happen under
            //normal circumstances
          }
          break;
        default:
          //default fallback. all named commands from this switch() must manually invoke the
          //following lines where appropriate.
          fn.apply(instance, arg_array);
          console.info('{0} received request {1}'.format(server_name, args.command))
          break;
      }
    }

    function make_tail(rel_filepath) {
      /* makes a file tail relative to the CWD, e.g., /var/games/minecraft/servers/myserver.

         tails are used to get live-event reads on files.

         if the server does not exist, a watch is made in the interim, waiting for its creation.  
         once the watch is satisfied, the watch is closed and a tail is finally created.
      */
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
      /* creates a watch for a file relative to the CWD, e.g., /var/games/minecraft/servers/myserver.

         watches are used for detecting file creation and changes.
      */
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

    instance.property('exists', function(err, result) {
      if (result)
        setup();
    })
  }

  self.untrack_server = function(server_name) {
    /* closes all watches and tails for a server and 
       deletes the server from the master container self.servers
    */
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
    /* cleans up all servers that are open, including all tails and watches */
    self.watcher.close();

    for (var s in self.servers)
      self.untrack_server(s);
  }

  self.front_end.on('connection', function(socket) {
    function webui_dispatcher(args) {
      console.info('[WEBUI] Received emit command', args);
      switch (args.command) {
        case 'create':
          if (args.server_name in self.servers) {
            console.error('Ignored attempt to create server "{0}"; Servername already in use.'.format(args.server_name));
          } else {
            var instance = new mineos.mc(args.server_name, base_dir);
            instance.create(function(err, did_create) {
              if (did_create) {
                //self.front_end.emit('track_server', args.server_name); //inexplicably not working. try:
                //global.emit('command', {command: 'create', 'server_name': 'aaa'})
                //channels['aaa'].emit('command', {command: 'start'})
                //fails, except when index.html refreshed after global emit.

                self.front_end.emit('server_list', Object.keys(self.servers)); //temp workaround
                //not preferable because it clears clients server list
                console.info('Server created: {0}'.format(args.server_name));
              }
            })
          }
          break;
      }
    }

    console.info('User connected to webui');
    self.front_end.emit('server_list', Object.keys(self.servers));
    socket.on('command', webui_dispatcher);
  })

  return self;
}