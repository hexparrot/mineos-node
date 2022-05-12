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

server.backend = function(base_dir, socket_emitter, user_config) {
  var self = this;

  self.servers = {};
  self.profiles = [];
  self.front_end = socket_emitter;
  self.commit_msg = '';

  process.umask(0002);

  fs.ensureDirSync(base_dir);
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['servers']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['backup']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['archive']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['import']));
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['profiles']));

  fs.chmod(path.join(base_dir, mineos.DIRS['import']), 0777);

  (function() {
    var which = require('which');

    async.waterfall([
      async.apply(which, 'git'),
      function(path, cb) {
        var child = require('child_process');
        var opts = {cwd: __dirname};
        child.execFile(path, [ 'show', '--oneline', '-s' ], opts, cb);
      },
      function(stdout, stderr, cb) {
        self.commit_msg = (stdout ? stdout : '');
        logging.info('Starting up server, using commit:', self.commit_msg);
        cb();
      }
    ])
  })();

  (function() {
    //thanks to https://github.com/flareofghast/node-advertiser/blob/master/advert.js
    var dgram = require('dgram');
    var udp_broadcaster = {};
    var UDP_DEST = '255.255.255.255';
    var UDP_PORT = 4445;
    var BROADCAST_DELAY_MS = 4000;

    async.forever(
      function(next) {
        for (var s in self.servers) {
          self.servers[s].broadcast_to_lan(function(msg, server_ip) {
            if (msg) {
              if (udp_broadcaster[server_ip]) {
                udp_broadcaster[server_ip].send(msg, 0, msg.length, UDP_PORT, UDP_DEST);
              } else {
                udp_broadcaster[server_ip] = dgram.createSocket('udp4');
                udp_broadcaster[server_ip].bind(UDP_PORT, server_ip);
                udp_broadcaster[server_ip].on("listening", function () {
                  udp_broadcaster[server_ip].setBroadcast(true);
                  udp_broadcaster[server_ip].send(msg, 0, msg.length, UDP_PORT, UDP_DEST);
                });
                udp_broadcaster[server_ip].on("error", function (err) {
                  logging.error("Cannot bind broadcaster to ip " + server_ip);
                });
              }
            }
          })
        }
        setTimeout(next, BROADCAST_DELAY_MS);
      }
    )
  })();

  (function() {
    var procfs = require('procfs-stats');
    var HOST_HEARTBEAT_DELAY_MS = 1000;

    function host_heartbeat() {
      async.waterfall([
        async.apply(procfs.meminfo)
      ], function(err, meminfo) {
        self.front_end.emit('host_heartbeat', {
          'uptime': os.uptime(),
          'freemem': ((meminfo && meminfo['MemAvailable']) ? meminfo['MemAvailable'] * 1024 : os.freemem()),
          'loadavg': os.loadavg()
        })
      })
    }

    setInterval(host_heartbeat, HOST_HEARTBEAT_DELAY_MS);
  })();

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers']);

    function discover() {
      //http://stackoverflow.com/a/24594123/1191579
      return fs.readdirSync(server_path).filter(function(p) {
        try {
          return fs.statSync(path.join(server_path, p)).isDirectory();
        } catch (e) {
          logging.warn("Filepath {0} does not point to an existing directory".format(path.join(server_path,p)));
        }
      });
    }

    function track(sn) {
      self.servers[sn] = null;
      //if new server_container() isn't instant, double broadcast might trigger this if/then twice
      //setting to null is immediate and prevents double execution
      self.servers[sn] = new server_container(sn, user_config, self.front_end);
      self.front_end.emit('track_server', sn);
    }

    function untrack(sn) {
      try {
        self.servers[sn].cleanup();
        delete self.servers[sn];
      } catch (e) {
        //if server has already been deleted and this is running for reasons unknown, catch and ignore
      } finally {
        self.front_end.emit('untrack_server', sn);
      }
    }

    var discovered_servers = discover();
    for (var i in discovered_servers)
      track(discovered_servers[i]);

    fs.watch(server_path, function() {
      var current_servers = discover();

      for (var i in current_servers)
        if (!(current_servers[i] in self.servers)) //if detected directory not a discovered server, track
          track(current_servers[i]);

      for (var s in self.servers)
        if (current_servers.indexOf(s) < 0)
          untrack(s);

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

  setTimeout(self.start_servers, 5000);

  self.shutdown = function() {
    for (var server_name in self.servers)
      self.servers[server_name].cleanup();
  }

  self.send_profile_list = function(send_existing) {
    if (send_existing && self.profiles.length) //if requesting to just send what you already have AND they are already present
      self.front_end.emit('profile_list', self.profiles);
    else {
      var request = require('request');
      var profile_dir = path.join(base_dir, mineos.DIRS['profiles']);
      var SIMULTANEOUS_DOWNLOADS = 3;
      var SOURCES = [];
      var profiles = [];

      try {
        SOURCES = require('./profiles.js')['profile_manifests'];
      } catch (e) {
        logging.error('Unable to parse profiles.js--no profiles loaded!');
        logging.error(e);
        return; // just bail out if profiles.js cannot be required for syntax issues
      }

      async.forEachOfLimit(
        SOURCES,
        SIMULTANEOUS_DOWNLOADS,
        function(collection, key, outer_cb) {
          if ('request_args' in collection) {
            async.waterfall([
              async.apply(request, collection.request_args),
              function(response, body, cb) {
                cb(response.statusCode != 200, body)
              },
              function(body, cb) {
                collection.handler(profile_dir, body, cb);
              }
            ], function(err, output) {
              if (err || typeof output == 'undefined')
                logging.error("Unable to retrieve profile: {0}. The definition for this profile may be improperly formed or is pointing to an invalid URI.".format(key));
              else {
                logging.info("Downloaded information for collection: {0} ({1} entries)".format(collection.name, output.length));
                profiles = profiles.concat(output);
              }
              outer_cb();
            }); //end waterfall
          } else { //for profiles like paperspigot which are hardcoded
            async.waterfall([
              function(cb) {
                collection.handler(profile_dir, cb);
              }
            ], function(err, output) {
              if (err || typeof output == 'undefined')
                logging.error("Unable to retrieve profile: {0}. The definition for this profile may be improperly formed or is pointing to an invalid URI.".format(key));
              else {
                logging.info("Downloaded information for collection: {0} ({1} entries)".format(collection.name, output.length));
                profiles = profiles.concat(output);
              }
              outer_cb();
            }); //end waterfall
          }
        },
        function(err) {
          self.profiles = profiles;
          self.front_end.emit('profile_list', self.profiles);
        }
      ) //end forEachOfLimit
    }
  }

  self.send_spigot_list = function() {
    var profiles_dir = path.join(base_dir, mineos.DIRS['profiles']);
    var spigot_profiles = {};

    async.waterfall([
      async.apply(fs.readdir, profiles_dir),
      function(listing, cb) {
        for (var i in listing) {
          var match = listing[i].match(/(paper)?spigot_([\d\.]+)/);
          if (match)
            spigot_profiles[match[0]] = {
              'directory': match[0],
              'jarfiles': fs.readdirSync(path.join(profiles_dir, match[0])).filter(function(a) { return a.match(/.+\.jar/i) })
            }
        }
        cb();
      }
    ], function(err) {
      self.front_end.emit('spigot_list', spigot_profiles);
    })
  }

  self.send_locale_list = function() {
    async.waterfall([
      async.apply(fs.readdir, path.join(__dirname, 'html', 'locales')),
      function (locale_paths, cb) {
        var locales = locale_paths.map(function(r) {
          return r.match(/^locale-([a-z]{2}_[A-Z]{2}).json$/)[1];
        })
        cb(null, locales);
      }
    ], function(err, output) {
      logging.info(output);
      if (!err)
        self.front_end.emit('locale_list', output);
      else
        self.front_end.emit('locale_list', ['en_US']);
    })
  }

  self.front_end.on('connection', function(socket) {
    var userid = require('userid');
    var fs = require('fs-extra');

    var ip_address = socket.request.connection.remoteAddress;
    var username = socket.request.user.username;

    var OWNER_CREDS = {
      uid: userid.uid(username),
      gid: userid.gids(username)[0]
    }

    function webui_dispatcher (args) {
      logging.info('[WEBUI] Received emit command from {0}:{1}'.format(ip_address, username), args);
      switch (args.command) {
        case 'create':
          var instance = new mineos.mc(args.server_name, base_dir);

          async.series([
            async.apply(instance.verify, '!exists'),
            function(cb) {
              var whitelisted_creators = [username]; //by default, accept create attempt by current user
              if ( (user_config || {}).creators ) {  //if creators key:value pair exists, use it
                whitelisted_creators = user_config['creators'].split(',');
                whitelisted_creators = whitelisted_creators.filter(function(e){return e}); //remove non-truthy entries like ''
                whitelisted_creators = whitelisted_creators.map(function(e) {return e.trim()}); //remove trailing and tailing whitespace

                logging.info('Explicitly authorized server creators are:', whitelisted_creators);
              }
              cb(!(whitelisted_creators.indexOf(username) >= 0))
            },
            async.apply(instance.create, OWNER_CREDS),
            async.apply(instance.overlay_sp, args.properties),
          ], function(err, results) {
            if (!err)
              logging.info('[{0}] Server created in filesystem.'.format(args.server_name));
            else {
              logging.info('[{0}] Failed to create server in filesystem as user {1}.'.format(args.server_name, username));
              logging.error(err);
            }
          })
          break;
        case 'create_unconventional_server':
          var instance = new mineos.mc(args.server_name, base_dir);

          async.series([
            async.apply(instance.verify, '!exists'),
            async.apply(instance.create_unconventional_server, OWNER_CREDS),
          ], function(err, results) {
            if (!err)
              logging.info('[{0}] Server (unconventional) created in filesystem.'.format(args.server_name));
            else
              logging.error(err);
          })
          break;
        case 'download':
          for (var idx in self.profiles) {
            if (self.profiles[idx].id == args.profile.id) {
              var SOURCES = require('./profiles.js')['profile_manifests'];
              var profile_dir = path.join(base_dir, 'profiles', args.profile.id);
              var dest_filepath = path.join(profile_dir, args.profile.filename);

              async.series([
                async.apply(fs.ensureDir, profile_dir),
                function(cb) {
                  var progress = require('request-progress');
                  var request = require('request');
                  progress(request({url: args.profile.url, headers: {'User-Agent': 'MineOS-node'}}), { throttle: 250, delay: 100 })
                    .on('error', function(err) {
                      logging.error(err);
                    })
                    .on('progress', function(state) {
                      args.profile.progress = state;
                      self.front_end.emit('file_progress', args.profile);
                    })
                    .on('complete', function(response) {
                      if (response.statusCode == 200) {
                        logging.info('[WEBUI] Successfully downloaded {0} to {1}'.format(args.profile.url, dest_filepath));
                      } else {
                        logging.error('[WEBUI] Server was unable to download file:', args.profile.url);
                        logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                      }
                      cb(response.statusCode != 200);
                    })
                    .pipe(fs.createWriteStream(dest_filepath))
                },
                function(cb) {
                  switch(path.extname(args.profile.filename).toLowerCase()) {
                    case '.jar':
                      cb();
                      break;
                    case '.zip':
                      var unzip = require('unzip');
                      fs.createReadStream(dest_filepath)
                        .pipe(unzip.Extract({ path: profile_dir })
                                .on('close', function() { cb() })
                                .on('error', function() {
                                  //Unzip error occurred, falling back to adm-zip
                                  var admzip = require('adm-zip');
                                  var zip = new admzip(dest_filepath);
                                  zip.extractAllTo(profile_dir, true); //true => overwrite
                                  cb();
                                })
                             );
                      break;
                    default:
                      cb();
                      break;
                  }
                },
                function(cb) {
                  // wide-area net try/catch. addressing issue of multiple simultaneous downloads.
                  // current theory: if multiple downloads occuring, and one finishes, forcing a
                  // redownload of profiles, SOURCES might be empty/lacking the unfinished dl.
                  // opting for full try/catch around postdownload to gracefully handle profile errors
                  try {
                    if ('postdownload' in SOURCES[args.profile['group']])
                      SOURCES[args.profile['group']].postdownload(profile_dir, dest_filepath, cb);
                    else
                      cb();
                  } catch (e) {
                    logging.error('simultaneous download race condition means postdownload hook may not have executed. redownload the profile to ensure proper operation.');
                    cb();
                  }
                }
              ], function(err, output) {
                self.send_profile_list();
              })
              break;
            }
          }
          break;
        case 'build_jar':
          var which = require('which');
          var child_process = require('child_process');

          try {
            var profile_path = path.join(base_dir, mineos.DIRS['profiles']);
            var working_dir = path.join(profile_path, '{0}_{1}'.format(args.builder.group, args.version));
            var bt_path = path.join(profile_path, args.builder.id, args.builder.filename);
            var dest_path = path.join(working_dir, args.builder.filename);
            var params = { cwd: working_dir };
          } catch (e) {
            logging.error('[WEBUI] Could not build jar; insufficient/incorrect arguments provided:', args);
            logging.error(e);
            return;
          }

          async.series([
            async.apply(fs.mkdir, working_dir),
            async.apply(fs.copy, bt_path, dest_path),
            function(cb) {
              var binary = which.sync('java');
              var proc = child_process.spawn(binary, ['-Xms512M', '-jar', dest_path, '--rev', args.version], params);

              proc.stdout.on('data', function (data) {
                self.front_end.emit('build_jar_output', data.toString());
                //logging.log('stdout: ' + data);
              });

              logging.info('[WEBUI] BuildTools starting with arguments:', args)

              proc.stderr.on('data', function (data) {
                self.front_end.emit('build_jar_output', data.toString());
                logging.error('stderr: ' + data);
              });

              proc.on('close', function (code) {
                cb(code);
              });
            }
          ], function(err, results) {
            logging.info('[WEBUI] BuildTools jar compilation finished {0} in {1}'.format( (err ? 'unsuccessfully' : 'successfully'), working_dir));
            logging.info('[WEBUI] Buildtools used: {0}'.format(dest_path));

            var retval = {
              'command': 'BuildTools jar compilation',
              'success': true,
              'help_text': ''
            }

            if (err) {
              retval['success'] = false;
              retval['help_text'] = "Error {0} ({1}): {2}".format(err.errno, err.code, err.path);
            }

            self.front_end.emit('host_notice', retval);
            self.send_spigot_list();
          })
          break;
        case 'delete_build':
          if (args.type == 'spigot')
            var spigot_path = path.join(base_dir, mineos.DIRS['profiles'], 'spigot_' + args.version);
          else {
            logging.error('[WEBUI] Unknown type of craftbukkit server -- potential modified webui request?');
            return;
          }

          fs.remove(spigot_path, function(err) {
            var retval = {
              'command': 'Delete BuildTools jar',
              'success': true,
              'help_text': ''
            }

            if (err) {
              retval['success'] = false;
              retval['help_text'] = "Error {0}".format(err);
            }

            self.front_end.emit('host_notice', retval);
            self.send_spigot_list();
          })
          break;
        case 'copy_to_server':
          var rsync = require('rsync');

          if (args.type == 'spigot')
            var spigot_path = path.join(base_dir, mineos.DIRS['profiles'], 'spigot_' + args.version) + '/';
          else {
            logging.error('[WEBUI] Unknown type of craftbukkit server -- potential modified webui request?');
            return;
          }
          var dest_path = path.join(base_dir, mineos.DIRS['servers'], args.server_name) + '/';

          var obj = rsync.build({
            source: spigot_path,
            destination: dest_path,
            flags: 'au',
            shell:'ssh'
          });

          obj.set('--include', '*.jar');
          obj.set('--exclude', '*');
          obj.set('--prune-empty-dirs');
          obj.set('--chown', '{0}:{1}'.format(OWNER_CREDS.uid, OWNER_CREDS.gid));

          obj.execute(function(error, code, cmd) {
            var retval = {
              'command': 'BuildTools jar copy',
              'success': true,
              'help_text': ''
            }

            if (error) {
              retval['success'] = false;
              retval['help_text'] = "Error {0} ({1})".format(error, code);
            }

            self.front_end.emit('host_notice', retval);
            for (var s in self.servers)
              self.front_end.emit('track_server', s);
          });

          break;
        case 'refresh_server_list':
          for (var s in self.servers)
            self.front_end.emit('track_server', s);
          break;
        case 'refresh_profile_list':
          self.send_profile_list();
          self.send_spigot_list();
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
            if (!err) {
              logging.info('[{0}] Server created in filesystem.'.format(args.new_server_name));
              setTimeout(function(){ self.front_end.emit('track_server', args.new_server_name) }, 1000);
            } else
              logging.error(err);
          })
          break;
        default:
          logging.warn('Command ignored: no such command {0}'.format(args.command));
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
          if (group_data.users.indexOf(username) >= 0 || group_data.gid == userid.gids(username)[0]) {
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
    socket.emit('commit_msg', self.commit_msg);
    socket.emit('change_locale', (user_config || {})['webui_locale']);
    socket.emit('optional_columns', (user_config || {})['optional_columns']);

    for (var server_name in self.servers)
      socket.emit('track_server', server_name);

    socket.on('command', webui_dispatcher);
    self.send_user_list();
    self.send_profile_list(true);
    self.send_spigot_list();
    self.send_importable_list();
    self.send_locale_list();

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

  return self;
}

function server_container(server_name, user_config, socket_io) {
  // when evoked, creates a permanent 'mc' instance, namespace, and place for file tails.
  var self = this;
  var instance = new mineos.mc(server_name, user_config.base_directory),
      nsp = socket_io.of('/{0}'.format(server_name)),
      tails = {},
      notices = [],
      cron = {},
      intervals = {},
      HEARTBEAT_INTERVAL_MS = 5000,
      COMMIT_INTERVAL_MIN = null;

  logging.info('[{0}] Discovered server'.format(server_name));

  // check that awd and bwd also exist alongside cwd or create and chown
  var missing_dir = false;
  try { fs.accessSync(instance.env.bwd, fs.F_OK) } catch (e) { missing_dir = true }
  try { fs.accessSync(instance.env.awd, fs.F_OK) } catch (e) { missing_dir = true }

  if (missing_dir) {
    async.series([
      async.apply(fs.ensureDir, instance.env.bwd),
      async.apply(fs.ensureDir, instance.env.awd),
      async.apply(instance.sync_chown)
    ]);
  }

  //async.series([ async.apply(instance.sync_chown) ]);
  //uncomment sync_chown to correct perms on server discovery
  //commenting out for high cpu usage on startup

  var files_to_tail = ['logs/latest.log', 'server.log', 'proxy.log.0', 'logs/fml-server-latest.log'];
  if ( (user_config || {}).additional_logfiles ) {  //if additional_logfiles key:value pair exists, use it
    var additional = user_config['additional_logfiles'].split(',');
    additional = additional.filter(function(e){return e}); //remove non-truthy entries like ''
    additional = additional.map(function(e) {return e.trim()}); //remove trailing and tailing whitespace
    additional = additional.map(function(e) {return path.normalize(e).replace(/^(\.\.[\/\\])+/, '')}); //normalize path, remove traversal

    logging.info('Explicitly added files to tail are:', additional);
    files_to_tail = files_to_tail.concat(additional);
  }

  for (var i in files_to_tail)
    make_tail(files_to_tail[i]);

  (function() {
    var fireworm = require('fireworm');

    var skip_dirs = fs.readdirSync(instance.env.cwd).filter(function(p) {
      try {
        return fs.statSync(path.join(instance.env.cwd, p)).isDirectory();
      } catch (e) {
        logging.error(e);
        return false;
      }
    });

    var default_skips = ['world', 'world_the_end', 'world_nether', 'dynmap', 'plugins', 'web', 'region', 'playerdata', 'stats', 'data'];
    for (var i in default_skips)
      if (skip_dirs.indexOf(default_skips[i]) == -1)
        skip_dirs.push(default_skips[i]);

    skip_dirs = skip_dirs.filter(function(e) { return e !== 'logs' }); // remove 'logs' from blacklist!

    logging.info('[{0}] Using skipDirEntryPatterns: {1}'.format(server_name, skip_dirs));

    var fw = fireworm(instance.env.cwd, {skipDirEntryPatterns: skip_dirs});

    for (var i in skip_dirs) {
	fw.ignore(skip_dirs[i]);
    }
    fw.add('**/server.properties');
    fw.add('**/server.config');
    fw.add('**/cron.config');
    fw.add('**/eula.txt');
    fw.add('**/server-icon.png');
    fw.add('**/config.yml');

    var FS_DELAY = 250; 
    function handle_event(fp) {
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
        case 'config.yml':
          setTimeout(broadcast_cy, FS_DELAY);
          break;
      }
    }

    fw.on('add', handle_event);
    fw.on('change', handle_event);
  })();

  intervals['heartbeat'] = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  function heartbeat() {
    clearInterval(intervals['heartbeat']);
    intervals['heartbeat'] = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS * 3);

    async.parallel({
      'up': function(cb) { instance.property('up', function(err, is_up) { cb(null, is_up) }) },
      'memory': function(cb) { instance.property('memory', function(err, mem) { cb(null, err ? {} : mem) }) },
      'ping': function(cb) {
        instance.property('unconventional', function(err, is_unconventional) {
          if (is_unconventional)
            cb(null, {}); //ignore ping--wouldn't respond in any meaningful way
          else
            instance.property('ping', function(err, ping) { cb(null, err ? {} : ping) })
        })
      },
      'query': function(cb) {
        instance.property('server.properties', function(err, dict) {
          if ((dict || {})['enable-query'])
            instance.property('query', cb);
          else
            cb(null, {}); //ignore query--wouldn't respond in any meaningful way
        })
      }
    }, function(err, retval) {
      clearInterval(intervals['heartbeat']);
      intervals['heartbeat'] = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

      nsp.emit('heartbeat', {
        'server_name': server_name,
        'timestamp': Date.now(),
        'payload': retval
      })
    })
  }

  intervals['world_commit'] = setInterval(world_committer, 1 * 60 * 1000);

  function world_committer() {
    async.waterfall([
      async.apply(instance.property, 'commit_interval'),
      function(minutes, cb) {
        if (minutes != COMMIT_INTERVAL_MIN) { //upon change or init
          COMMIT_INTERVAL_MIN = minutes;
          if (minutes > 0) {
            logging.info('[{0}] committing world to disk every {1} minutes.'.format(server_name, minutes));
            intervals['commit'] = setInterval(instance.saveall, minutes * 60 * 1000);
          } else {
            logging.info('[{0}] not committing world to disk automatically (interval set to {1})'.format(server_name, minutes));
            clearInterval(intervals['commit']);
          }
        }
      }
    ])
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
          try {
            cron[cronhash] = new CronJob({
              cronTime: cron_dict[cronhash].source,
              onTick: function() {
                cron_dispatcher(this);
              },
              start: true,
              context: cron_dict[cronhash]
            });
          } catch (e) {
            // catches invalid cron expressions
            logging.warn('[{0}] invalid cron expression:'.format(server_name), cronhash, cron_dict[cronhash]);
            instance.set_cron(cronhash, false, function(){});
          }
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
        var msg = Buffer.from("[MOTD]" + sp_data.motd + "[/MOTD][AD]" + sp_data['server-port'] + "[/AD]");
        var server_ip = sp_data['server-ip'];
        callback(msg, server_ip);
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

    for (var i in intervals)
      clearInterval(intervals[i]);

    nsp.removeAllListeners();
  }

  function emit_eula() {
    var fs = require('fs-extra');
    var eula_path = path.join(instance.env.cwd, 'eula.txt');

    async.waterfall([
      async.apply(instance.property, 'eula'),
      function(accepted, cb) {
        logging.info('[{0}] eula.txt detected: {1} (eula={2})'.format(server_name,
                                                                     (accepted ? 'ACCEPTED' : 'NOT YET ACCEPTED'),
                                                                     accepted));
        nsp.emit('eula', accepted);
        cb();
      },
    ])
  }

  function broadcast_icon() {
    // function to encode file data to base64 encoded string
    //http://www.hacksparrow.com/base64-encoding-decoding-in-node-js.html
    var fs = require('fs');
    var filepath = path.join(instance.env.cwd, 'server-icon.png');
    fs.readFile(filepath, function(err, data) {
      if (!err && data.toString('hex',0,4) == '89504e47') //magic number for png first 4B
        nsp.emit('server-icon.png', Buffer.from(data).toString('base64'));
    });
  }

  function broadcast_cy() {
    // function to broadcast raw config.yml from bungeecord
    var fs = require('fs');
    var filepath = path.join(instance.env.cwd, 'config.yml');
    fs.readFile(filepath, function(err, data) {
      if (!err)
        nsp.emit('config.yml', Buffer.from(data).toString());
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
      if (e.errno != -2) {
        logging.error(e);
        return; //exit execution to perhaps curb a runaway process
      }
      logging.info('[{0}] Watching for file generation: {1}'.format(server_name, rel_filepath));

      var fireworm = require('fireworm');
      var default_skips = ['world', 'world_the_end', 'world_nether', 'dynmap', 'plugins', 'web', 'region', 'playerdata', 'stats', 'data'];
      var fw = fireworm(instance.env.cwd, {skipDirEntryPatterns: default_skips});

      fw.add('**/{0}'.format(rel_filepath));
      fw.on('add', function(fp) {
        if (abs_filepath == fp) {
          fw.clear();
          logging.info('[{0}] {1} created! Watchfile {2} closed'.format(server_name, path.basename(fp), rel_filepath));
          async.nextTick(function() { make_tail(rel_filepath) });
        }
      })
    }
  }

  self.direct_dispatch = function(user, args) {
    var introspect = require('introspect');
    var fn, required_args;
    var arg_array = [];

    async.waterfall([
      async.apply(instance.property, 'owner'),
      function(ownership_data, cb) {
        var auth = require('./auth');
        auth.test_membership(user, ownership_data.groupname, function(is_valid) {
          cb(null, is_valid);
        });
      },
      function(is_valid, cb) {
        cb(!is_valid); //logical NOT'ted:  is_valid ? falsy error, !is_valid ? truthy error
      }
    ], function(err) {
      if (err) {
        logging.error('User "{0}" does not have permissions on [{1}]:'.format(user, args.server_name), args);
      } else {
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
    })
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

    function get_available_tails() {
      for (t in tails)
        get_file_contents(tails[t].filename.replace(instance.env.cwd + '/', ''));
    }

    function get_prop(requested) {
      logging.info('[{0}] {1} requesting property: {2}'.format(server_name, ip_address, requested.property));
      instance.property(requested.property, function(err, retval) {
        logging.info('[{0}] returned to {1}: {2}'.format(server_name, ip_address, retval));
        nsp.emit('server_fin', {'server_name': server_name, 'property': requested.property, 'payload': retval});
      })
    }

    function get_archives() {
      logging.debug('[{0}] {1} requesting server archives'.format(server_name, username));
      instance.list_archives(function(err, results) {
        if (err)
          logging.error('[{0}] Error with get_archives'.format(server_name), err, results)
        nsp.emit('archives', {payload: results});
      })
    }

    function get_increments() {
      logging.debug('[{0}] {1} requesting server increments'.format(server_name, username));
      instance.list_increments(function(err, results) {
        if (err)
          logging.error('[{0}] Error with get_increments'.format(server_name), err, results)
        nsp.emit('increments', {payload: results});
      })
    }

    function get_increment_sizes() {
      logging.debug('[{0}] {1} requesting server increment sizes'.format(server_name, username));
      instance.list_increment_sizes(function(err, results) {
        if (err)
          logging.error('[{0}] Error with get_increment_sizes'.format(server_name), err, results)
        nsp.emit('increment_sizes', {payload: results});
      })
    }

    function get_page_data(page) {
      switch (page) {
        case 'glance':
          logging.debug('[{0}] {1} requesting server at a glance info'.format(server_name, username));

          async.parallel({
            'du_awd': async.apply(instance.property, 'du_awd'),
            'du_bwd': async.apply(instance.property, 'du_bwd'),
            'du_cwd': async.apply(instance.property, 'du_cwd'),
            'owner': async.apply(instance.property, 'owner'),
            'server_files': async.apply(instance.property, 'server_files'),
            'ftb_installer': async.apply(instance.property, 'FTBInstall.sh'),
            'eula': async.apply(instance.property, 'eula'),
            'base_dir': function(cb) {
              cb(null, user_config.base_directory)
            },
            'java_version_in_use': async.apply(instance.property, 'java_version_in_use'),
          }, function(err, results) {
            if (err instanceof Object)
              logging.error('[{0}] Error with get_page_data glance'.format(server_name), err, results);
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
              try {
                cron[cronhash] = new CronJob({
                  cronTime: cron_dict[cronhash].source,
                  onTick: function() {
                    server_dispatcher(this);
                  },
                  start: true,
                  context: cron_dict[cronhash]
                });
              } catch (e) {
                //catches invalid cron pattern, disables cron
                logging.warn('[{0}] {1} invalid cron expression submitted:'.format(server_name, ip_address), cron_dict[cronhash].source);
                instance.set_cron(opts.hash, false, function(){});
              }
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
        socket.on('get_available_tails', get_available_tails);
        socket.on('property', get_prop);
        socket.on('page_data', get_page_data);
        socket.on('archives', get_archives);
        socket.on('increments', get_increments);
        socket.on('increment_sizes', get_increment_sizes);
        socket.on('cron', manage_cron);
        socket.on('server.properties', broadcast_sp);
        socket.on('server.config', broadcast_sc);
        socket.on('cron.config', broadcast_cc);
        socket.on('server-icon.png', broadcast_icon);
        socket.on('config.yml', broadcast_cy);
        socket.on('req_server_activity', broadcast_notices);
      }
    })

  }) //nsp on connect container ends
}

