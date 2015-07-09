var mineos = require('./mineos');
var async = require('async');
var path = require('path');
var events = require('events');
var os = require('os');
var logging = require('winston');
var fs = require('fs-extra');
var server = exports;

logging.add(logging.transports.File, {
  filename: '/var/log/mineos.log',
  handleExceptions: true
});

server.backend = function(base_dir, socket_emitter) {
  var self = this;

  self.servers = {};
  self.profiles = [];
  self.front_end = socket_emitter;

  fs.ensureDirSync(base_dir);
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['servers']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['backup']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['archive']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['import']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['profiles']));

  (function() {
    //thanks to https://github.com/flareofghast/node-advertiser/blob/master/advert.js
    var dgram = require('dgram');
    var udp_broadcaster = dgram.createSocket('udp4');
    var UDP_DEST = '255.255.255.255';
    var UDP_PORT = 4445;
    var BROADCAST_DELAY_MS = 4000;

    udp_broadcaster.bind();
    udp_broadcaster.on("listening", function () {
      udp_broadcaster.setBroadcast(true);
      async.forever(
        function(next) {
          for (var s in self.servers) {
            self.servers[s].broadcast_to_lan(function(msg) {
              if (msg)
                udp_broadcaster.send(msg, 0, msg.length, UDP_PORT, UDP_DEST);
            })
          }
          setTimeout(next, BROADCAST_DELAY_MS);
        }
      )
    });
  })();

  (function() {
    var HOST_HEARTBEAT_DELAY_MS = 1000;

    function host_heartbeat() {
      self.front_end.emit('host_heartbeat', {
        'uptime': os.uptime(),
        'freemem': os.freemem(),
        'loadavg': os.loadavg()
      })
    }

    setInterval(host_heartbeat, HOST_HEARTBEAT_DELAY_MS);
  })();

  (function() {
    var fireworm = require('fireworm');
    var server_path = path.join(base_dir, mineos.DIRS['servers']);
    
    var fw = fireworm(server_path);
    fw.add('**/server.properties');

    fw
      .on('add', function(fp){
        var server_name = path.basename(path.dirname(fp));
        if (!(server_name in self.servers))
          async.nextTick(function() {
            self.servers[server_name] = new server_container(server_name, base_dir, self.front_end);
            self.front_end.emit('track_server', server_name);
          });
      })
      .on('remove', function(fp) {
        var server_name = path.basename(path.dirname(fp));
        try {
          self.servers[server_name].cleanup();
          delete self.servers[server_name];
        } catch (e) {
          //if server has already been deleted and this is running for reasons unknown, catch and ignore
        }
        self.front_end.emit('untrack_server', server_name);
      })
  })();

  (function() {
    var fireworm = require('fireworm');
    var importable_archives = path.join(base_dir, mineos.DIRS['import']);

    var fw = fireworm(importable_archives);
    fw.add('**/*.zip');
    fw.add('**/*.tar');
    fw.add('**/*.tgz');
    fw.add('**/*.tar.gz');
    
    fw
      .on('add', function(fp) {
        logging.info('[WEBUI] New file found in import directory', fp);
        self.send_importable_list();
      })
      .on('remove', function(fp) {
        logging.info('[WEBUI] File removed from import directory', fp);
        self.send_importable_list();
      })
  })();

  self.start_servers = function() {
    var MS_TO_PAUSE = 10000;

    async.eachLimit(
      Object.keys(self.servers),
      1,
      function(server_name, callback) {
        self.servers[server_name].onreboot_start(function(err) {
          if (err)
            logging.error('[{0}] Aborted server startup; condition not met:'.format(server_name), err);
          else
            logging.info('[{0}] Server started. Waiting {1} ms...'.format(server_name, MS_TO_PAUSE));
            
          setTimeout(callback, (err ? 1 : MS_TO_PAUSE));
        });
      },
      function(err) {}
    )
  }

  self.shutdown = function() {
    for (var server_name in self.servers)
      self.servers[server_name].cleanup();
  }

  self.front_end.on('connection', function(socket) {
    var userid = require('userid');
    var request = require('request');
    var progress = require('request-progress');
    var fs = require('fs-extra');

    var ip_address = socket.request.connection.remoteAddress;
    var username = socket.request.user.username;
   
    var OWNER_CREDS = {
      uid: userid.uid(username),
      gid: userid.gid(username)
    } 

    function webui_dispatcher (args) {
      logging.info('[WEBUI] Received emit command from {0}:{1}'.format(ip_address, username), args);
      switch (args.command) {
        case 'create':
          var instance = new mineos.mc(args.server_name, base_dir);

          async.series([
            async.apply(instance.verify, '!exists'),
            async.apply(instance.create, OWNER_CREDS),
            async.apply(instance.overlay_sp, args.properties),
          ], function(err, results) {
            if (!err)
              logging.info('[{0}] Server created in filesystem.'.format(args.server_name));
            else
              logging.error(err);
          })
          break;
        case 'refresh_server_list':
          for (var s in self.servers)
            self.front_end.emit('track_server', s);
          break;
        case 'refresh_profile_list':
          self.send_profile_list(true);
          break;
        case 'create_from_archive':
          var instance = new mineos.mc(args.new_server_name, base_dir);

          if (args.awd_dir)
            var filepath = path.join(instance.env.base_dir, mineos.DIRS['archive'], args.awd_dir, args.filename);
          else
            var filepath = path.join(instance.env.base_dir, mineos.DIRS['import'], args.filename);

          async.series([
            async.apply(instance.verify, '!exists'),
            async.apply(instance.create_from_archive, OWNER_CREDS, filepath)
          ], function(err, results) {
            if (!err)
              logging.info('[{0}] Server created in filesystem.'.format(args.new_server_name));
            else
              logging.error(err);
          })
          break;
        case 'mojang_download':
          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(args.profile.id);
          var filename = 'minecraft_server.{0}.jar'.format(args.profile.id);
          var dest_filepath = path.join(dest_dir, filename);

          var url = 'https://s3.amazonaws.com/Minecraft.Download/versions/{0}/{1}'.format(args.profile.id, filename);

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              progress(request(url), {
                throttle: 1000,
                delay: 100
              })
                .on('complete', function(response) {
                  if (response.statusCode == 200) {
                    logging.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
                    args['dest_dir'] = dest_dir;
                    args['filename'] = filename;
                    args['success'] = true;
                    args['progress']['percent'] = 100;
                    args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                    self.front_end.emit('file_download', args);
                    self.send_profile_list();
                  } else {
                    logging.error('[WEBUI] Server was unable to download file:', url);
                    logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                    args['success'] = false;
                    args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                    self.front_end.emit('file_download', args);
                  }
                })
                .on('progress', function(state) {
                  args['progress'] = state;
                  self.front_end.emit('file_progress', args);
                })
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        case 'ftb_download':
          var unzip = require('unzip');

          var dir_concat = '{0}-{1}'.format(args.profile.dir, args.profile.version);
          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(dir_concat);
          var filename = args.profile.serverPack;
          var dest_filepath = path.join(dest_dir, filename);

          var url = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(args.profile.dir, args.profile.version.replace(/\./g, '_'), args.profile.serverPack);

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              progress(request(url), {
                throttle: 1000,
                delay: 100
              })
                .on('complete', function(response) {
                  if (response.statusCode == 200) {
                    logging.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
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
                    logging.error('[WEBUI] Server was unable to download file:', url);
                    logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                    args['success'] = false;
                    args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                    self.front_end.emit('file_download', args);
                  }
                })
                .on('progress', function(state) {
                  args['progress'] = state;
                  self.front_end.emit('file_progress', args);
                })
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        case 'ftb_third_party_download':
          var unzip = require('unzip');

          var dir_concat = '{0}-{1}'.format(args.profile.dir, args.profile.version);
          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(dir_concat);
          var filename = args.profile.serverPack;
          var dest_filepath = path.join(dest_dir, filename);

          var url = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(args.profile.dir, args.profile.version.replace(/\./g, '_'), args.profile.serverPack);

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              progress(request(url), {
                throttle: 1000,
                delay: 100
              })
                .on('complete', function(response) {
                  if (response.statusCode == 200) {
                    logging.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
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
                    logging.error('[WEBUI] Server was unable to download file:', url);
                    logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                    args['success'] = false;
                    args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                    self.front_end.emit('file_download', args);
                  }
                })
                .on('progress', function(state) {
                  args['progress'] = state;
                  self.front_end.emit('file_progress', args);
                })
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        case 'pocketmine_download':
          var dir_concat = args.profile.id;
          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(dir_concat);
          var filename = args.profile.filename;
          var dest_filepath = path.join(dest_dir, filename);

          var URL_STABLE = 'https://github.com/PocketMine/PocketMine-MP/releases/download/{0}/{1}';
          var URL_DEVELOPMENT = 'http://jenkins.pocketmine.net/job/PocketMine-MP/{0}/artifact/{1}';

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              var url_to_use = '';

              if (args.profile.channel == 'stable')
                url_to_use = URL_STABLE.format(args.profile.short_version, args.profile.filename);
              else
                url_to_use = URL_DEVELOPMENT.format(args.profile.build, args.profile.filename);

              progress(request(url_to_use), {
                throttle: 1000,
                delay: 100
              })
                .on('complete', function(response) {
                  if (response.statusCode == 200) {
                    logging.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
                    args['dest_dir'] = dest_dir;
                    args['filename'] = filename;
                    args['success'] = true;
                    args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                    self.front_end.emit('file_download', args);
                    self.send_profile_list();
                  } else {
                    logging.error('[WEBUI] Server was unable to download file:', url);
                    logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                    args['success'] = false;
                    args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                    self.front_end.emit('file_download', args);
                  }
                })
                .on('progress', function(state) {
                  args['progress'] = state;
                  self.front_end.emit('file_progress', args);
                })
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        case 'php_download':
          var tarball = require('tarball-extract')

          var dir_concat = args.profile.id;
          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(dir_concat);
          var filename = '{0}.tar.gz'.format(args.profile.id);
          var dest_filepath = path.join(dest_dir, filename);

          var url = 'https://dl.bintray.com/pocketmine/PocketMine/{0}'.format(filename);

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              progress(request(url), {
                throttle: 1000,
                delay: 100
              })
                .on('complete', function(response) {
                  if (response.statusCode == 200) {
                    logging.log('[WEBUI] Successfully downloaded {0} to {1}'.format(url, dest_filepath));
                    args['dest_dir'] = dest_dir;
                    args['filename'] = filename;
                    args['success'] = true;
                    args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);

                    async.series([
                      async.apply(tarball.extractTarball, dest_filepath, dest_dir),
                      function(cb) {
                        self.front_end.emit('file_download', args);
                        self.send_profile_list();
                      }
                    ])
                  } else {
                    logging.error('[WEBUI] Server was unable to download file:', url);
                    logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                    args['success'] = false;
                    args['help_text'] = 'Remote server did not return {0} (status {1})'.format(filename, response.statusCode);
                    self.front_end.emit('file_download', args);
                  }
                })
                .on('progress', function(state) {
                  args['progress'] = state;
                  self.front_end.emit('file_progress', args);
                })
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        default:
          logging.warning('Command ignored: no such command {0}'.format(args.command));
          break;
      }
    }

    self.send_user_list = function() {
      var passwd = require('etc-passwd');
      var users = [];
      var groups = [];

      var gu = passwd.getUsers()
        .on('user', function(user_data) {
          if (user_data.username == username)
            users.push({
              username: user_data.username,
              uid: user_data.uid,
              gid: user_data.gid,
              home: user_data.home
            })
        })
        .on('end', function() {
          socket.emit('user_list', users);
        })

      var gg = passwd.getGroups()
        .on('group', function(group_data) {
          if (group_data.users.indexOf(username) >= 0 || group_data.gid == userid.gid(username)) {
            if (group_data.gid > 0) {
              groups.push({
                groupname: group_data.groupname,
                gid: group_data.gid
              })
            }
          }
        })
        .on('end', function() {
          socket.emit('group_list', groups);
        })
    }

    logging.info('[WEBUI] {0} connected from {1}'.format(username, ip_address));
    socket.emit('whoami', username);

    for (var server_name in self.servers)
      socket.emit('track_server', server_name);

    socket.on('command', webui_dispatcher);
    self.send_user_list();
    self.send_profile_list();
    self.send_importable_list();

  })

  self.send_importable_list = function() {
    var importable_archives = path.join(base_dir, mineos.DIRS['import']);
    var all_info = [];

    fs.readdir(importable_archives, function(err, files) {
      if (!err) {
        var fullpath = files.map(function(value, index) {
          return path.join(importable_archives, value);
        });

        var stat = fs.stat;
        async.map(fullpath, stat, function(inner_err, results){
          results.forEach(function(value, index) {
            all_info.push({
              time: value.mtime,
              size: value.size,
              filename: files[index]
            })
          })

          all_info.sort(function(a, b) {
            return a.time.getTime() - b.time.getTime();
          });

          self.front_end.emit('archive_list', all_info);
        }); 
      }
    })
  }

  self.send_profile_list = function(force_redownload) {
    if (force_redownload || !self.profiles.length)
      check_profiles(base_dir, function(all_profiles) {
        self.profiles = all_profiles;
        self.front_end.emit('profile_list', self.profiles);
      })
    else
      self.front_end.emit('profile_list', self.profiles);
  }

  return self;
}

function server_container(server_name, base_dir, socket_io) {
  // when evoked, creates a permanent 'mc' instance, namespace, and place for file tails. 
  var self = this;
  var instance = new mineos.mc(server_name, base_dir),
      nsp = socket_io.of('/{0}'.format(server_name)),
      tails = {},
      notices = [],
      cron = {},
      heartbeat_interval = null,
      HEARTBEAT_INTERVAL_MS = 5000;

  logging.info('[{0}] Discovered server'.format(server_name));
  make_tail('logs/latest.log');
  make_tail('server.log');

  (function() {
    var fireworm = require('fireworm');
    var fw = fireworm(instance.env.cwd);

    fw.add('**/server.properties');
    fw.add('**/server.config');
    fw.add('**/cron.config');
    fw.add('**/eula.txt');
    fw.add('**/server-icon.png');
    
    function handle_event(fp) {
      var FS_DELAY = 250; 
      // because it is unknown when fw triggers on add/change and
      // further because if it catches DURING the write, it will find
      // the file has 0 size, adding arbitrary delay.
      // process.nexttick didnt work.
      var file_name = path.basename(fp);
      switch (file_name) {
        case 'server.properties':
          setTimeout(broadcast_sp, FS_DELAY);
          break;
        case 'server.config':
          setTimeout(broadcast_sc, FS_DELAY);
          break;
        case 'cron.config':
          setTimeout(broadcast_cc, FS_DELAY);
          break;
        case 'eula.txt':
          setTimeout(emit_eula, FS_DELAY);
          break;
        case 'server-icon.png':
          setTimeout(broadcast_icon, FS_DELAY);
          break;
      }
    }
    
    fw.on('add', handle_event);
    fw.on('change', handle_event);
  })();

  heartbeat_interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  function heartbeat() {
    async.series({
      'up': function(cb) { instance.property('up', function(err, is_up) { cb(null, is_up) }) },
      'memory': function(cb) { instance.property('memory', function(err, mem) { cb(null, err ? {} : mem) }) },
      'ping': function(cb) { instance.property('ping', function(err, ping) { cb(null, err ? {} : ping) }) }
    }, function(err, retval) {
      nsp.emit('heartbeat', {
        'server_name': server_name,
        'timestamp': Date.now(),
        'payload': retval
      })
    })
  }

  (function() {
    var CronJob = require('cron').CronJob;

    function cron_dispatcher(args) {
      var introspect = require('introspect');
      var fn, required_args;
      var arg_array = [];

      fn = instance[args.command];
      required_args = introspect(fn);

      for (var i in required_args) {
        // all callbacks expected to follow the pattern (success, payload).
        if (required_args[i] == 'callback') 
          arg_array.push(function(err, payload) {
            args.success = !err;
            args.err = err;
            args.time_resolved = Date.now();
            if (err)
              logging.error('[{0}] command "{1}" errored out:'.format(server_name, args.command), args);
          })
        else if (required_args[i] in args) {
          arg_array.push(args[required_args[i]])
        }
      }

      fn.apply(instance, arg_array);
    }

    instance.crons(function(err, cron_dict) {
      for (var cronhash in cron_dict) {
        if (cron_dict[cronhash].enabled) {
          cron[cronhash] = new CronJob({
            cronTime: cron_dict[cronhash].source,
            onTick: function() {
              cron_dispatcher(this);
            },
            start: true,
            context: cron_dict[cronhash]
          });
        }
      }
    })
  })();

  self.broadcast_to_lan = function(callback) {
    async.waterfall([
      async.apply(instance.verify, 'exists'),
      async.apply(instance.verify, 'up'),
      async.apply(instance.sc),
      function(sc_data, cb) {
        var broadcast_value = (sc_data.minecraft || {}).broadcast;
        cb(!broadcast_value) //logically notted to make broadcast:true pass err cb
      },
      async.apply(instance.sp)
    ], function(err, sp_data) {
      if (err)
        callback(null);
      else {
        var msg = new Buffer("[MOTD]" + sp_data.motd + "[/MOTD][AD]" + sp_data['server-port'] + "[/AD]");
        callback(msg);
      }
    })
  }

  self.onreboot_start = function(callback) {
    async.waterfall([
      async.apply(instance.property, 'onreboot_start'),
      function(autostart, cb) {
        logging.info('[{0}] autostart = {1}'.format(server_name, autostart));
        cb(!autostart); //logically NOT'ing so that autostart = true continues to next func
      },
      async.apply(instance.start)
    ], function(err) {
      callback(err);
    })
  }

  self.cleanup = function () {
    for (var t in tails)
      tails[t].unwatch();

    clearInterval(heartbeat_interval);
    nsp.removeAllListeners();
  }

  function emit_eula() {
    var ini = require('ini');
    var fs = require('fs-extra');
    var eula_path = path.join(instance.env.cwd, 'eula.txt');

    async.waterfall([
      async.apply(fs.readFile, eula_path),
      function(file_contents, cb) {
        cb(null, ini.parse(file_contents.toString()));
      },
      function(parsed_ini, cb) {
        var accepted = parsed_ini['eula'] == true; //minecraft accepts 'true' case-insensitive
        if (!accepted)
          accepted = parsed_ini['eula'] && parsed_ini['eula'].toString().toLowerCase() == 'true';

        logging.info('[{0}] eula.txt detected: {1} (eula={2})'.format(server_name,
                                                                     (accepted ? 'ACCEPTED' : 'NOT YET ACCEPTED'),
                                                                     parsed_ini['eula']));
        nsp.emit('eula', accepted);
      }
    ])
  }

  function broadcast_icon() {
    // function to encode file data to base64 encoded string
    //http://www.hacksparrow.com/base64-encoding-decoding-in-node-js.html
    var fs = require('fs');
    var filepath = path.join(instance.env.cwd, 'server-icon.png');
    fs.readFile(filepath, function(err, data) {
      if (!err && data.toString('hex',0,4) == '89504e47') //magic number for png first 4B
        nsp.emit('server-icon.png', new Buffer(data).toString('base64'));
    });
  }

  function broadcast_notices() {
    nsp.emit('notices', notices);
  }

  function broadcast_sp() {
    instance.sp(function(err, sp_data) {
      logging.debug('[{0}] broadcasting server.properties'.format(server_name));
      nsp.emit('server.properties', sp_data);
    })
  }

  function broadcast_sc() {
    instance.sc(function(err, sc_data) {
      logging.debug('[{0}] broadcasting server.config'.format(server_name));
      if (!err)
        nsp.emit('server.config', sc_data);
    })
  }

  function broadcast_cc() {
    instance.crons(function(err, cc_data) {
      logging.debug('[{0}] broadcasting cron.config'.format(server_name));
      if (!err)
        nsp.emit('cron.config', cc_data);
    })
  }

  function make_tail(rel_filepath) {
    /* makes a file tail relative to the CWD, e.g., /var/games/minecraft/servers/myserver.
       tails are used to get live-event reads on files.

       if the server does not exist, a watch is made in the interim, waiting for its creation.  
       once the watch is satisfied, the watch is closed and a tail is finally created.
    */
    var tail = require('tail').Tail;
    var abs_filepath = path.join(instance.env.cwd, rel_filepath);

    if (rel_filepath in tails) {
      logging.warn('[{0}] Tail already exists for {1}'.format(server_name, rel_filepath));
      return;
    }

    try {
      var new_tail = new tail(abs_filepath);
      logging.info('[{0}] Created tail on {1}'.format(server_name, rel_filepath));
      new_tail.on('line', function(data) {
        //logging.info('[{0}] {1}: transmitting new tail data'.format(server_name, rel_filepath));
        nsp.emit('tail_data', {'filepath': rel_filepath, 'payload': data});
      })
      tails[rel_filepath] = new_tail;
    } catch (e) {
      logging.error('[{0}] Create tail on {1} failed'.format(server_name, rel_filepath));
      logging.info('[{0}] Watching for file generation: {1}'.format(server_name, rel_filepath));
      
      var fireworm = require('fireworm');
      var fw = fireworm(instance.env.cwd);

      fw.add('**/{0}'.format(rel_filepath));
      fw.on('add', function(fp) {
        fw.clear();
        logging.info('[{0}] {1} created! Watchfile {2} closed'.format(server_name, path.basename(fp), rel_filepath));
        make_tail(rel_filepath);
      })
    }
  }

  nsp.on('connection', function(socket) {
    var ip_address = socket.request.connection.remoteAddress;
    var username = socket.request.user.username;
    var NOTICES_QUEUE_LENGTH = 10; // 0 < q <= 10

    function server_dispatcher(args) {
      var introspect = require('introspect');
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
        logging.error('server_fin', args);
        
        while (notices.length > NOTICES_QUEUE_LENGTH)
          notices.shift();
        notices.push(args);
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
            if (err)
              logging.error('[{0}] command "{1}" errored out:'.format(server_name, args.command), args);
            logging.log('server_fin', args)

            while (notices.length > NOTICES_QUEUE_LENGTH)
              notices.shift();

            if (args.command != 'delete')
              notices.push(args);
          })
        else if (required_args[i] in args) {
          arg_array.push(args[required_args[i]])
        } else {
          args.success = false;
          logging.error('Provided values missing required argument', required_args[i]);
          args.error = 'Provided values missing required argument: {0}'.format(required_args[i]);
          nsp.emit('server_fin', args);
          return;
        }
      }

      if (args.command == 'delete')
        self.cleanup();

      logging.info('[{0}] received request "{1}"'.format(server_name, args.command))
      fn.apply(instance, arg_array);
    }

    function produce_receipt(args) {
      /* when a command is received, immediately respond to client it has been received */
      var uuid = require('node-uuid');
      logging.info('[{0}] {1} issued command : "{2}"'.format(server_name, ip_address, args.command))
      args.uuid = uuid.v1();
      args.time_initiated = Date.now();
      nsp.emit('server_ack', args);

      switch (args.command) {
        case 'chown':
          async.waterfall([
            async.apply(instance.property, 'owner'),
            function(owner_data, cb) {
              if (owner_data.username != username)
                cb('Only the current user owner may reassign server ownership.');
              else if (owner_data.uid != args.uid)
                cb('You may not change the user owner of the server.');
              else
                cb();
            }
          ], function(err) {
            if (err) {
              args.success = false;
              args.err = err;
              args.time_resolved = Date.now();
              logging.error('[{0}] command "{1}" errored out:'.format(server_name, args.command), args);
              nsp.emit('server_fin', args);
            } else {
              server_dispatcher(args);
            }
          })
          break;
        default:
          server_dispatcher(args);
          break;
      }
      
    }

    function get_file_contents(rel_filepath) {
      if (rel_filepath in tails) { //this is the protection from malicious client
        // a tail would only exist for a file the server itself has opened
        var fs = require('fs');
        var abs_filepath = path.join(instance.env['cwd'], rel_filepath);
        var FILESIZE_LIMIT_THRESHOLD = 256000;

        async.waterfall([
          async.apply(fs.stat, abs_filepath),
          function(stat_data, cb) {
            cb(stat_data.size > FILESIZE_LIMIT_THRESHOLD)
          },
          async.apply(fs.readFile, abs_filepath),
          function(data, cb) {
            logging.info('[{0}] transmittting existing file contents: {1} ({2} bytes)'.format(server_name, rel_filepath, data.length));
            nsp.emit('file head', {filename: rel_filepath, payload: data.toString()});
            cb();
          }
        ], function(err) {
          if (err) {
            var msg = "File is too large (> {0} KB).  Only newly added lines will appear here.".format(FILESIZE_LIMIT_THRESHOLD/1000);
            nsp.emit('file head', {filename: rel_filepath, payload: msg });
          }
        })
      }
    }

    function get_prop(requested) {
      logging.info('[{0}] {1} requesting property: {2}'.format(server_name, ip_address, requested.property));
      instance.property(requested.property, function(err, retval) {
        logging.info('[{0}] returned to {1}: {2}'.format(server_name, ip_address, retval));
        nsp.emit('server_fin', {'server_name': server_name, 'property': requested.property, 'payload': retval});
      })
    }

    function get_page_data(page) {
      switch (page) {
        case 'glance':
          logging.debug('[{0}] {1} requesting server at a glance info'.format(server_name, username));

          async.parallel({
            'increments': async.apply(instance.list_increments),
            'archives': async.apply(instance.list_archives),
            'du_awd': async.apply(instance.property, 'du_awd'),
            'du_bwd': async.apply(instance.property, 'du_bwd'),
            'du_cwd': async.apply(instance.property, 'du_cwd'),
            'owner': async.apply(instance.property, 'owner'),
            'server_files': async.apply(instance.property, 'server_files'),
            'base_dir': function(cb) {
              cb(null, base_dir)
            }
          }, function(err, results) {
            if (err instanceof Object)
              logging.error('[{0}] Error with get_page_data'.format(server_name), err, results);
            nsp.emit('page_data', {page: page, payload: results});
          })
          break;
        default:
          nsp.emit('page_data', {page: page});
          break;
      }
    }

    function manage_cron(opts) {
      var uuid = require('node-uuid');
      var hash = require('object-hash');
      var CronJob = require('cron').CronJob;

      function reload_cron(callback) {
        for (var c in cron) {
          try {
            cron[c].stop();
          } catch (e) {}
        }
        cron = {};

        instance.crons(function(err, cron_dict) {
          for (var cronhash in cron_dict) {
            if (cron_dict[cronhash].enabled) {
              cron[cronhash] = new CronJob({
                cronTime: cron_dict[cronhash].source,
                onTick: function() {
                  server_dispatcher(this);
                },
                start: true,
                context: cron_dict[cronhash]
              });
            }
          }
          callback();
        })
      }

      var operation = opts.operation;
      delete opts.operation;

      switch (operation) {
        case 'create':
          var cron_hash = hash(opts);
          logging.log('[{0}] {1} requests cron creation:'.format(server_name, ip_address), cron_hash, opts);

          opts['enabled'] = false;

          async.series([
            async.apply(instance.add_cron, cron_hash, opts),
            async.apply(reload_cron)
          ])
          break;
        case 'delete':
          logging.log('[{0}] {1} requests cron deletion: {2}'.format(server_name, ip_address, opts.hash));

          try {
            cron[opts.hash].stop();
          } catch (e) {}

          try {
            delete cron[opts.hash];
          } catch (e) {}

          async.series([
            async.apply(instance.delete_cron, opts.hash),
            async.apply(reload_cron)
          ])
          break;
        case 'start':
          logging.log('[{0}] {1} starting cron: {2}'.format(server_name, ip_address, opts.hash));
          
          async.series([
            async.apply(instance.set_cron, opts.hash, true),
            async.apply(reload_cron)
          ])
          break;
        case 'suspend':
          logging.log('[{0}] {1} suspending cron: {2}'.format(server_name, ip_address, opts.hash));

          async.series([
            async.apply(instance.set_cron, opts.hash, false),
            async.apply(reload_cron)
          ])
          break;
        default:
          logging.warn('[{0}] {1} requested unexpected cron operation: {2}'.format(server_name, ip_address, operation), opts);
      }
    }

    async.waterfall([
      async.apply(instance.property, 'owner'),
      function(ownership_data, cb) {
        var auth = require('./auth');
        auth.test_membership(username, ownership_data.groupname, function(is_valid) {
          cb(null, is_valid);
        });
      },
      function(is_valid, cb) {
        cb(!is_valid); //logical NOT'ted:  is_valid ? falsy error, !is_valid ? truthy error
      }
    ], function(err) {
      if (err)
        socket.disconnect();
      else {
        logging.info('[{0}] {1} ({2}) joined server namespace'.format(server_name, username, ip_address));

        socket.on('command', produce_receipt);
        socket.on('get_file_contents', get_file_contents);
        socket.on('property', get_prop);
        socket.on('page_data', get_page_data);
        socket.on('cron', manage_cron);
        socket.on('server.properties', broadcast_sp);
        socket.on('server.config', broadcast_sc);
        socket.on('cron.config', broadcast_cc);
        socket.on('server-icon.png', broadcast_icon);
        socket.on('req_server_activity', broadcast_notices);
      }
    })

  }) //nsp on connect container ends
}



function check_profiles(base_dir, callback) {
  /**
   * Returns list of all available profiles and denotes which are present on the system
   * @param {String} base_dir, likely /var/games/minecraft
   * @return {Array} all profile definitions
   */
  var request = require('request');
  var fs = require('fs');

  var SOURCES = {
    mojang: function(callback) {
      var MOJANG_VERSIONS_URL = 'http://s3.amazonaws.com/Minecraft.Download/versions/versions.json';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode === 200)
          for (var index in body.versions) {
            var item = body.versions[index];
            item['group'] = 'mojang';
            item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, 'minecraft_server.{0}.jar'.format(item.id)));
            item['webui_desc'] = 'Official Mojang Jar';
            item['weight'] = 0;

            p.push(item);
          }

        callback(err, p);
      }
      request({ url: MOJANG_VERSIONS_URL, json: true }, handle_reply);
    },
    ftb: function(callback) {
      var xml_parser = require('xml2js');

      var FTB_VERSIONS_URL = 'http://ftb.cursecdn.com/FTB2/static/modpacks.xml';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode === 200)
          xml_parser.parseString(body, function(inner_err, result) {
            var packs = result['modpacks']['modpack'];

            for (var index in packs) {
              var item = packs[index]['$'];
              var dir_concat = '{0}-{1}'.format(item['dir'], item['version']);
              item['group'] = 'ftb';
              item['type'] = 'release';
              item['id'] = dir_concat;
              item['webui_desc'] = '{0} {1}'.format(item['name'], item['version']);
              item['weight'] = 5;
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
    },
    ftb_third_party: function(callback) {
      var xml_parser = require('xml2js');

      var FTB_VERSIONS_URL = 'http://ftb.cursecdn.com/FTB2/static/thirdparty.xml';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode == 200)
          xml_parser.parseString(body, function(inner_err, result) {
            var packs = result['modpacks']['modpack'];

            for (var index in packs) {
              var item = packs[index]['$'];
              var dir_concat = '{0}-{1}'.format(item['dir'], item['version']);
              item['group'] = 'ftb_third_party';
              item['type'] = 'release';
              item['id'] = dir_concat;
              item['webui_desc'] = '{0} {1}'.format(item['name'], item['version']);
              item['weight'] = 10;
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
    },
    pocketmine: function(callback) {
      var URL_DEVELOPMENT = "http://www.pocketmine.net/api/?channel=development";
      var URL_STABLE = "http://www.pocketmine.net/api/?channel=stable";

      var p = [];

      function handle_reply(err, retval) {
        for (var r in retval) 
          if ((retval[r] || {}).statusCode == 200) {
            var releases = JSON.parse(retval[r].body);

            var item = releases;
            var version = releases.version;
            var dir_concat = 'Pocketmine-{0}'.format(version);
            item['channel'] = r;
            item['filename'] = path.basename(item.download_url);
            item['group'] = 'pocketmine';
            item['id'] = dir_concat;
            item['version'] = version;
            switch (item.channel) {
              case 'stable':
                item['short_version'] = path.basename(item.details_url);
                item['type'] = 'release';
                break;
              case 'development':
                item['short_version'] = version;
                item['type'] = 'snapshot';
                break;
            }
            item['webui_desc'] = 'phar build {0}, api {1}'.format(item.build, item.api_version);
            item['weight'] = 10;
            item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], dir_concat, item.filename));
            p.push(item);

          }
        callback(null, p)
      }

      async.auto({
        'stable': async.retry(2, async.apply(request, URL_STABLE)),
        'development': async.retry(2, async.apply(request, URL_DEVELOPMENT)),
      }, handle_reply)
    },
    php: function(callback) {
      BUILD_REGEX = /^[\w]+BUILD="([^"]+)"/
      var p = [];

      function handle_reply(err, response, body) {
        if (!err && (response || {}).statusCode == 200) {
          var lines = body.split('\n');
          for (var i in lines) {
            var matching = lines[i].match(BUILD_REGEX);
            if (matching) {
              var item = {};
              item['group'] = 'php';
              item['type'] = 'release';
              item['id'] = matching[1];
              item['webui_desc'] = 'PHP binary for Pocketmine';
              item['weight'] = 12;
              item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], matching[1], '{0}.tar.gz'.format(matching[1])));
              p.push(item);
            }
          }
        }
        callback(err, p);
      }
      request('http://get.pocketmine.net', handle_reply);
    }
  } //end sources

  logging.info('[WEBUI] Downloading official profiles.');
  async.auto({
    'mojang': async.retry(2, SOURCES.mojang),
    'ftb': async.retry(2, SOURCES.ftb),
    'ftb_3rd': async.retry(2, SOURCES.ftb_third_party),
    'pocketmine': async.retry(2, SOURCES.pocketmine),
    'php': async.retry(2, SOURCES.php)
  }, function(err, results) {
    var merged = [];
    for (var source in results)
      merged = merged.concat.apply(merged, results[source]);

    callback(merged);
  })
} // end check_profiles