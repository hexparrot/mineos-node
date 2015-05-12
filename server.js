var mineos = require('./mineos');
var async = require('async');
var chokidar = require('chokidar');
var path = require('path');
var events = require('events');
var os = require('os');
var server = exports;

server.backend = function(base_dir, socket_emitter, dir_owner) {
  var self = this;

  self.servers = {};
  self.profiles = {};
  self.watches = {};
  self.front_end = socket_emitter;

  var HEARTBEAT_INTERVAL_MS = 5000;

  /* insert udp4 here */

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers'], '*', 'server.properties');
    self.watches['server_added'] = chokidar.watch(server_path, { 
                                                  persistent: true, 
                                                  depth: 1});
    // ignores all events if string does not include 'server.properties'

    self.watches['server_added']
      .on('add', function(dirpath) {
        // event to trigger when new server detected, e.g., /var/games/minecraft/servers/asdf/server.properties
        var server_name = path.basename(path.dirname(dirpath));
        async.nextTick(function() {
          self.servers[server_name] = new server_container(server_name, base_dir, self.front_end);
        });
      })
  })();

  /* insert chokidar: server removal detection here */

  /* insert chokidar: eula detection here */

  /* insert host heartbeat here */

  self.front_end.on('connection', function(socket) {
    var ip_address = socket.request.connection.remoteAddress;

    function webui_dispatcher (args) {
      console.info('[WEBUI] Received emit command', args);
      switch (args.command) {
        case 'create':
          var instance = new mineos.mc(args.server_name, base_dir);

          async.series([
            async.apply(instance.verify, '!exists'),
            async.apply(instance.create, dir_owner),
            async.apply(instance.overlay_sp, args.properties),
          ], function(err, results) {
            if (!err)
              console.info('[{0}] Server created in filesystem.'.format(args.server_name));
            else
              console.error(err);
          })
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
                    self.send_profile_list();
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
                        self.send_profile_list();
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
        case 'ftb_third_party_download':
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
                        self.send_profile_list();
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

    console.info('[WEBUI] User connected from {0}'.format(ip_address));

    for (var server_name in self.servers)
      socket.emit('track_server', server_name);

    socket.on('command', webui_dispatcher);
    //self.send_profile_list();
    //self.send_user_list();
  })
}

function server_container(server_name, base_dir, socket_io) {
  // when evoked, creates a permanent 'mc' instance, namespace, and place for file tails/watches. 
  var self = this;
  self.instance = new mineos.mc(server_name, base_dir);
  self.nsp = socket_io.of('/{0}'.format(server_name));
  self.tails = {};
  self.watches = {};
  self.notices = {};
  self.cron = {};

  /* insert heartbeat here */

  console.log('Discovered server: {0}'.format(server_name));
  make_tail('logs/latest.log');

  make_watch('server.properties', broadcast_sp);
  make_watch('server.config', broadcast_sc);

  function broadcast_sp() {
    self.instance.sp(function(err, sp_data) {
      //console.log('[{0}] broadcasting server.properties'.format(server_name));
      self.nsp.emit('server.properties', sp_data);
    })
  }

  function broadcast_sc() {
    self.instance.sc(function(err, sc_data) {
      //console.log('[{0}] broadcasting server.config'.format(server_name));
      self.nsp.emit('server.config', sc_data);
    })
  }

  function make_tail(rel_filepath) {
    /* makes a file tail relative to the CWD, e.g., /var/games/minecraft/servers/myserver.
       tails are used to get live-event reads on files.

       if the server does not exist, a watch is made in the interim, waiting for its creation.  
       once the watch is satisfied, the watch is closed and a tail is finally created.
    */
    var tail = require('tail').Tail;
    var abs_filepath = path.join(self.instance.env.cwd, rel_filepath);

    if (rel_filepath in self.tails) {
      console.warn('[{0}] Tail already exists for {1}'.format(server_name, rel_filepath));
      return;
    }

    try {
      var new_tail = new tail(abs_filepath);
      console.info('[{0}] Created tail on {1}'.format(server_name, rel_filepath));
      new_tail.on('line', function(data) {
        //console.info('[{0}] {1}: transmitting new tail data'.format(server_name, rel_filepath));
        self.nsp.emit('tail_data', {'filepath': rel_filepath, 'payload': data});
      })
      self.tails[rel_filepath] = new_tail;
    } catch (e) {
      console.error('[{0}] Create tail on {1} failed'.format(server_name, rel_filepath));
      console.info('[{0}] Watching for file generation: {1}'.format(server_name, rel_filepath));

      var tail_lookout = chokidar.watch(self.instance.env.cwd, {persistent: true, ignoreInitial: true});
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
    var abs_filepath = path.join(self.instance.env.cwd, rel_filepath);

    if (rel_filepath in self.watches) {
      console.warn('[{0}] Watch already exists for {1}'.format(server_name, rel_filepath));
      return;
    }

    try {
      var watcher = chokidar.watch(abs_filepath, {persistent: true});
      watcher.on('change', function(fp) {
        callback();
      })
      console.info('[{0}] Started watch on {1}'.format(server_name, rel_filepath));
      self.watches[rel_filepath] = watcher;
    } catch (e) {
      console.log(e) //handle error or ignore
    }
  }

  self.nsp.on('connection', function(socket) {
    var ip_address = socket.request.connection.remoteAddress;

    console.info('[{0}] {1} connected to namespace'.format(server_name, ip_address));
    broadcast_sp();
    broadcast_sc();
  })
}