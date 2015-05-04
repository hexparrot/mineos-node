var mineos = require('./mineos');
var async = require('async');
var chokidar = require('chokidar');
var path = require('path');
var events = require('events');
var introspect = require('introspect');
var tail = require('tail').Tail;
var uuid = require('node-uuid');
var os = require('os');
var CronJob = require('cron').CronJob;
var dgram = require('dgram');
var server = exports;

server.backend = function(base_dir, socket_emitter, dir_owner) {
  var self = this;

  self.servers = {};
  self.profiles = {};
  self.watches = {};
  self.front_end = socket_emitter || new events.EventEmitter();
  

  (function() {
    //thanks to https://github.com/flareofghast/node-advertiser/blob/master/advert.js
    var udp_broadcaster = dgram.createSocket('udp4');
    var udp_dest = '255.255.255.255';
    var udp_port = 4445;
    var broadcast_delay_ms = 2000;

    udp_broadcaster.bind();
    udp_broadcaster.on("listening", function () {
      udp_broadcaster.setBroadcast(true);
      async.forever(
        function(next) {
          for (var s in self.servers) {
            var instance = self.servers[s].instance;
            if (instance) {
              async.waterfall([
                async.apply(instance.verify, 'exists'),
                async.apply(instance.verify, 'up'),
                async.apply(instance.sc),
                function(sc_data, cb) {
                  cb(!sc_data.minecraft.broadcast) //logically notted to make broadcast:true pass err cb
                },
                async.apply(instance.sp)
              ], function(err, sp_data) {
                if (!err) {
                  var msg = new Buffer("[MOTD]" + sp_data.motd + "[/MOTD][AD]" + sp_data['server-port'] + "[/AD]");
                  udp_broadcaster.send(msg, 0, msg.length, udp_port, udp_dest);
                }
              })
            }
          }
          setTimeout(next, broadcast_delay_ms)
        },
        function(err) {
          //shouldn't really ever happen;
        }
      )
    });
  })();

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers']);
    var regex_servers = new RegExp('{0}\/[^\/]+\/.+'.format(server_path));
    self.watches['servers'] = chokidar.watch(server_path, { persistent: true, ignored: regex_servers });
    // ignores event updates from servers that have more path beyond the /servers/<dirhere>/<filehere>

    self.watches['servers']
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

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers']);
    self.watches['eula'] = chokidar.watch(server_path, { persistent: true, depth: 1 });
    // ignores event updates from servers that have more path beyond the /servers/<dirhere>/<filehere>

    self.watches['eula']
      .on('add', function(dirpath) {
        // event to trigger when new eula.txt detected, e.g., /var/games/minecraft/servers/<newdirhere>

        if (path.basename(dirpath) == 'eula.txt') {
          try {
            var server_name = mineos.extract_server_name(base_dir, dirpath);
          } catch (e) { return }

          var ini = require('ini');
          var fs = require('fs-extra');

          async.waterfall([
            async.apply(fs.readFile, dirpath),
            function(file_contents, cb) {
              cb(null, ini.parse(file_contents.toString()));
            },
            function(parsed_ini, cb) {
              var accepted = parsed_ini['eula'] == true; //minecraft accepts 'true' case-insensitive
              if (!accepted)
                accepted = parsed_ini['eula'] && parsed_ini['eula'].toString().toLowerCase() == 'true';

              console.log('[{0}] eula.txt detected: {1} (eula={2})'.format(server_name,
                                                                           (accepted ? 'ACCEPTED' : 'NOT YET ACCEPTED'),
                                                                           parsed_ini['eula']));
              self.servers[server_name].nsp.emit('eula', accepted);
            }
          ])
        }
      })
  })();

  (function() {
    var profile_path = path.join(base_dir, mineos.DIRS['profiles']);
    var regex_profiles = new RegExp('{0}\/[^\/]+\/.+'.format(profile_path));
    self.watches['profiles'] = chokidar.watch(profile_path, { persistent: true, ignored: regex_profiles });
    // ignores event updates from profiles that have more path beyond the /profiles/<dirhere>/<filehere>

    //FIXME: on initial start, this will trigger for each profile, triggering x self.send_profile_lists (and x downloads)

    self.watches['profiles']
      .on('addDir', function(dirpath) {
        // event to trigger when new profile detected, e.g., /var/games/minecraft/profiles/<newdirhere>
        console.log('[WEBUI] new profile detected: {0}'.format(dirpath));
        self.send_profile_list();
      })
      .on('unlinkDir', function(dirpath) {
        // event to trigger when profile directory deleted
        console.log('[WEBUI] profile directory deletion detected: {0}'.format(dirpath));
        self.send_profile_list();
      })
  })();

  function host_heartbeat() {
    self.front_end.emit('host_heartbeat', {
      'uptime': os.uptime(),
      'freemem': os.freemem(),
      'loadavg': os.loadavg()
    })
  }

  setInterval(host_heartbeat, 1000);

  function track_server(server_name) {
    /* when evoked, creates a permanent 'mc' instance, namespace, and place for file tails/watches. 
       track_server should only happen in response to the above chokidar watcher.
    */
    var instance = new mineos.mc(server_name, base_dir),
        nsp;

    function setup() {
      var HEARTBEAT_INTERVAL_MS = 5000;
      nsp = self.front_end.of('/{0}'.format(server_name));

      self.servers[server_name] = {
        instance: instance,
        nsp: nsp,
        tails: {},
        watches: {},
        notices: [],
        cron: {}
      }

      async.forever(
        function(next) {
          async.series({
            'up': function(cb) {
              instance.property('up', function(err, is_up) {
                cb(null, is_up);
              })
            },
            'memory': function(cb) {
              instance.property('memory', function(err, mem_info) {
                cb(null, err ? {} : mem_info);
              })
            },
            'ping': function(cb) {
              instance.property('ping', function(err, ping_info) {
                cb(null, err ? {} : ping_info);
              })
            }
          }, function(err, retval) {
            if (server_name in self.servers) {
              nsp.emit('heartbeat', {
                'server_name': server_name,
                'timestamp': Date.now(),
                'payload': retval
              })
              //console.log('[{0}] Heartbeat transmitted.'.format(server_name))
              setTimeout(next, HEARTBEAT_INTERVAL_MS);
            }
            else {
              next(true);
            }
          })
        },
        function(err) {
          console.log('[{0}] Heartbeats ceased.'.format(server_name))
        }
      )

      console.info('Discovered server: {0}'.format(server_name));
      self.front_end.emit('track_server', server_name);
      make_tail('logs/latest.log');

      make_watch('server.properties', broadcast_sp);
      make_watch('server.config', broadcast_sc);

      function broadcast_sp() {
        instance.sp(function(err, sp_data) {
          nsp.emit('server.properties', sp_data);
        })
      }

      function broadcast_sc() {
        instance.sc(function(err, sc_data) {
          nsp.emit('server.config', sc_data);
        })
      }

      nsp.on('connection', function(socket) {
        var ip_address = socket.request.connection.remoteAddress;

        function produce_receipt(args) {
          /* when a command is received, immediately respond to client it has been received */
          console.info('[{0}] {1} issued command : "{2}"'.format(server_name, ip_address, args.command))
          args.uuid = uuid.v1();
          args.time_initiated = Date.now();
          nsp.emit('server_ack', args)
          server_dispatcher(args);
        }

        function get_file_contents(rel_filepath) {
          if (rel_filepath in self.servers[server_name].tails) { //this is the protection from malicious client
            // a tail would only exist for a file the server itself has opened
            var fs = require('fs');
            var abs_filepath = path.join(self.servers[server_name].instance.env['cwd'], rel_filepath);

            fs.readFile(abs_filepath, function (err, data) {
              if (!err) {
                console.info('[{0}] {1} transmittting existing file contents: {2} ({3} bytes)'.format(server_name, ip_address, rel_filepath, data.length));
                nsp.emit('file head', {filename: rel_filepath, payload: data.toString()});
              }
              else 
                console.log('what', err)
            });
          }
        }

        function get_prop(requested) {
          console.info('[{0}] {1} requesting property: {2}'.format(server_name, ip_address, requested.property));
          instance.property(requested.property, function(err, retval) {
            console.info('[{0}] returned to {1}: {2}'.format(server_name, ip_address, retval));
            nsp.emit('server_fin', {'server_name': server_name, 'property': requested.property, 'payload': retval});
          })
        }

        function get_page_data(page) {
          switch (page) {
            case 'glance':
              console.info('[{0}] {1} requesting server at a glance info'.format(server_name, ip_address));

              async.parallel({
                'increments': async.apply(instance.list_increments),
                'archives': async.apply(instance.list_archives),
                'du_awd': async.apply(instance.property, 'du_awd'),
                'du_bwd': async.apply(instance.property, 'du_bwd'),
                'du_cwd': async.apply(instance.property, 'du_cwd'),
                'owner': async.apply(instance.property, 'owner')
              }, function(err, results) {
                nsp.emit('page_data', {page: page, payload: results});
              })
              break;
            case 'cron':
              console.info('[{0}] {1} requesting cron info'.format(server_name, ip_address));
              var cron_table = {};
              for (var hash in self.servers[server_name].cron) 
                cron_table[hash] = self.servers[server_name].cron[hash].definition;

              nsp.emit('page_data', {page: page, payload: cron_table});
              break;
            default:
              nsp.emit('page_data', {page: page});
              break;
          }
        }

        function manage_cron(opts) {
          var operation = opts.operation;
          delete opts.operation;

          switch (operation) {
            case 'create':
              var hash = require('object-hash');
              console.log('[{0}] {1} requests cron creation:'.format(server_name, ip_address), opts);

              try {
                var cronjob = new CronJob(opts.source, function (){
                  server_dispatcher(opts);
                }, null, false);
              } catch (e) {
                console.log('[{0}] rejected invalid cron format: "{1}"'.format(server_name, opts.source));
                opts.uuid = uuid.v1();
                opts.time_initiated = Date.now();
                opts.command = '{0} cron'.format(operation);
                opts.success = false;
                opts.err = 'invalid cron format: "{0}"'.format(opts.source);
                opts.time_resolved = Date.now();
                nsp.emit('server_fin', opts);
                return;
              }

              self.servers[server_name].cron[hash(opts)] = {
                definition: opts,
                instance: cronjob
              }
              break;
            case 'delete':
              console.log('[{0}] {1} requests cron deletion: {2}'.format(server_name, ip_address, opts.hash));

              self.servers[server_name].cron[opts.hash].instance.stop();
              delete self.servers[server_name].cron[opts.hash];
              break;
            case 'start':
              console.log('[{0}] {1} starting cron: {2}'.format(server_name, ip_address, opts.hash));

              self.servers[server_name].cron[opts.hash].instance.start();
              break;
            case 'suspend':
              console.log('[{0}] {1} suspending cron: {2}'.format(server_name, ip_address, opts.hash));

              self.servers[server_name].cron[opts.hash].instance.stop();
              break;
            default:
              console.warn('[{0}] {1} requested unexpected cron operation: {2}'.format(server_name, ip_address, operation), opts);
          }
          get_page_data('cron');
        }

        console.info('[{0}] {1} connected to namespace'.format(server_name, ip_address));
        socket.on('command', produce_receipt);
        socket.on('property', get_prop);
        socket.on('page_data', get_page_data);
        socket.on('get_file_contents', get_file_contents);
        socket.on('cron', manage_cron);
        console.info('[{0}] broadcasting {1} previous notices'.format(server_name, self.servers[server_name].notices.length));
        nsp.emit('notices', self.servers[server_name].notices);

        broadcast_sp();
        broadcast_sc();
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
        args.time_resolved = Date.now();
        nsp.emit('server_fin', args);
        console.error('server_fin', args);
        self.servers[server_name].notices.push(args);
        return;
      }

      for (var i in required_args) {
        // all callbacks expected to follow the pattern (success, payload).
        if (required_args[i] == 'callback') 
          arg_array.push(function(err, payload) {
            args.success = !err;
            args.err = err;
            args.time_resolved = Date.now();
            nsp.emit('server_fin', args);
            console.log('server_fin', args)

            if (args.command != 'delete')
              self.servers[server_name].notices.push(args);
          })
        else if (required_args[i] in args) {
          arg_array.push(args[required_args[i]])
        } else {
          args.success = false;
          console.error('Provided values missing required argument', required_args[i]);
          args.error = 'Provided values missing required argument: {0}'.format(required_args[i]);
          nsp.emit('server_fin', args);
          return;
        }
      }

      if (args.command == 'delete' && server_name in self.servers) {
        for (var t in self.servers[server_name].tails) 
          self.servers[server_name].tails[t].unwatch();

        for (var w in self.servers[server_name].watches) 
          self.servers[server_name].watches[w].close();
      }

      console.info('[{0}] received request "{1}"'.format(server_name, args.command))
      fn.apply(instance, arg_array);
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
          nsp.emit('tail_data', {'filepath': rel_filepath, 'payload': data});
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
          callback();
        })
        console.info('[{0}] Started watch on {1}'.format(server_name, rel_filepath));
        self.servers[server_name].watches[rel_filepath] = watcher;
      } catch (e) {
        console.log(e)
        //handle error or ignore
      }

    }

    async.nextTick(setup);

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

    self.front_end.emit('untrack_server', server_name);
    console.info('Server removed: {0}'.format(server_name));
  }

  self.shutdown = function() {
    /* cleans up all servers that are open, including all tails and watches */
    self.watches['servers'].close();
    self.watches['profiles'].close();
    self.watches['eula'].close();

    for (var s in self.servers)
      self.untrack_server(s);
  }

  self.webui_dispatcher = function(args) {
    console.info('[WEBUI] Received emit command', args);
    switch (args.command) {
      case 'create':
        if (args.server_name in self.servers) {
          var ERROR = '[{0}] Ignored attempt to create server -- server name already exists.'.format(args.server_name)
          console.error(ERROR);
          self.front_end.emit('error', ERROR);
        } else {
          var instance = new mineos.mc(args.server_name, base_dir);

          async.series([
            async.apply(instance.create, dir_owner),
            async.apply(instance.overlay_sp, args.properties),
          ], function(err, results) {
            if (err) {
              var ERROR = '[{0}] Attempt to create server failed in the backend.'.format(args.server_name);
              console.error(ERROR, err);
              self.front_end.emit('error', ERROR);
            } else {
              console.info('[{0}] Server created in filesystem.'.format(args.server_name))
            }
          })
        }
        break;
      case 'mojang_download':
        var request = require('request');
        var fs = require('fs-extra');

        var dest_dir = '/var/games/minecraft/profiles/{0}'.format(args.profile.id);
        var filename = 'minecraft_server.{0}.jar'.format(args.profile.id);
        var dest_filepath = path.join(dest_dir, filename);

        var url = 'https://s3.amazonaws.com/Minecraft.Download/versions/{0}/{1}'.format(args.profile.id, filename);

        fs.ensureDir(dest_dir, function(err) {
          if (err) {
            console.error('[WEBUI] Error attempting download:', err);
          } else {
            request(url)
              .on('complete', function(response) {
                if (response.statusCode == 200) {
                  console.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
                  args['dest_dir'] = dest_dir;
                  args['filename'] = filename;
                  args['success'] = true;
                  args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                  self.front_end.emit('file_download', args);
                } else {
                  console.error('[WEBUI] Server was unable to download file:', url);
                  console.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                  args['success'] = false;
                  args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                  self.front_end.emit('file_download', args);
                }
              })
              .pipe(fs.createWriteStream(dest_filepath))
          }
        });
        break;
      case 'ftb_download':
        var request = require('request');
        var fs = require('fs-extra');
        var unzip = require('unzip');

        var dir_concat = '{0}-{1}'.format(args.profile.dir, args.profile.version);
        var dest_dir = '/var/games/minecraft/profiles/{0}'.format(dir_concat);
        var filename = args.profile.serverPack;
        var dest_filepath = path.join(dest_dir, filename);

        var url = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(args.profile.dir, args.profile.version.replace(/\./g, '_'), args.profile.serverPack);

        fs.ensureDir(dest_dir, function(err) {
          if (err) {
            console.error('[WEBUI] Error attempting download:', err);
          } else {
            request(url)
              .on('complete', function(response) {
                if (response.statusCode == 200) {
                  console.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
                  args['dest_dir'] = dest_dir;
                  args['filename'] = filename;
                  args['success'] = true;
                  args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);

                  fs.createReadStream(dest_filepath)
                    .pipe(unzip.Extract({ path: dest_dir }).on('close', function() {
                      self.front_end.emit('file_download', args);
                    }));
                } else {
                  console.error('[WEBUI] Server was unable to download file:', url);
                  console.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                  args['success'] = false;
                  args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                  self.front_end.emit('file_download', args);
                }
              })
              .pipe(fs.createWriteStream(dest_filepath))
          }
        });
        break;
      case 'notices':
        for (var server_name in self.servers) 
          self.servers[server_name].nsp.emit('notices', self.servers[server_name].notices);
      default:
        break;
    }
  }

  self.send_profile_list = function() {
    async.parallel([
      async.apply(self.check_profiles.mojang),
      async.apply(self.check_profiles.ftb)
    ], function(err, results) {
      //http://stackoverflow.com/a/10865042/1191579
      var merged = [];
      merged = merged.concat.apply(merged, results);
      self.front_end.emit('profile_list', merged);
    })
  }

  self.check_profiles = {
    mojang: function(callback) {
      var request = require('request');
      var fs = require('fs');

      var MOJANG_VERSIONS_URL = 'http://s3.amazonaws.com/Minecraft.Download/versions/versions.json';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && response.statusCode === 200)
          for (var index in body.versions) {
            var item = body.versions[index];
            item['group'] = 'mojang';
            item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, 'minecraft_server.{0}.jar'.format(item.id)));
            item['webui_desc'] = 'Official Mojang Jar';

            p.push(item);
          }

        callback(err, p);
      }
      request({ url: MOJANG_VERSIONS_URL, json: true }, handle_reply);
    },
    ftb: function(callback) {
      var request = require('request');
      var xml_parser = require('xml2js');
      var fs = require('fs');

      var FTB_VERSIONS_URL = 'http://ftb.cursecdn.com/FTB2/static/modpacks.xml';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && response.statusCode === 200)
          xml_parser.parseString(body, function(inner_err, result) {
            var packs = result['modpacks']['modpack'];

            for (var index in packs) {
              var item = packs[index]['$'];
              var dir_concat = '{0}-{1}'.format(item['dir'], item['version']);
              item['group'] = 'ftb';
              item['type'] = 'release';
              item['id'] = dir_concat;
              item['webui_desc'] = '{0} {1}'.format(item['name'], item['version']);
              item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], dir_concat, item['serverPack']));
              p.push(item);

              var old_versions = item['oldVersions'].split(';');
              for (var idx in old_versions) {
                var new_item = JSON.parse(JSON.stringify(item)); //deep copy object
                var dir_concat = '{0}-{1}'.format(new_item['dir'], old_versions[idx]);

                if (old_versions[idx].length > 0 && old_versions[idx] != item['version']) {
                  new_item['type'] = 'old_version';
                  new_item['id'] = dir_concat;
                  new_item['webui_desc'] = '{0} {1}'.format(new_item['name'], old_versions[idx]);
                  new_item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], dir_concat, new_item['serverPack']));
                  p.push(new_item);
                }
              }
            }
            callback(err || inner_err, p);
          })
        else
          callback(null, p);
      }
      request({ url: FTB_VERSIONS_URL, json: false }, handle_reply);
    }
  }

  self.send_user_list = function() {
    var passwd = require('etc-passwd');
    var users = [];
    var groups = [];

    var gu = passwd.getUsers()
      .on('user', function(user_data) {
        if (user_data.uid >= 1000 && user_data.gid >= 1000)
          users.push({
            username: user_data.username,
            uid: user_data.uid,
            gid: user_data.gid,
            home: user_data.home
          })
      })
      .on('end', function() {
        self.front_end.emit('user_list', users);
      })

    var gg = passwd.getGroups()
      .on('group', function(group_data) {

        if (group_data.gid >= 1000)
          groups.push({
            groupname: group_data.groupname,
            gid: group_data.gid,
            users: group_data.users
          })
      })
      .on('end', function() {
        self.front_end.emit('group_list', groups);
      })
  }
    
  self.front_end.on('connection', function(socket) {
    console.info('[WEBUI] User connected from', socket.request.connection.remoteAddress);
    self.front_end.emit('server_list', Object.keys(self.servers));
    socket.on('command', self.webui_dispatcher);
    self.send_profile_list();
    self.send_user_list();
  })

  return self;
}