var mineos = require('./mineos');
var async = require('async');
var chokidar = require('chokidar');
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
  self.profiles = {};
  self.watches = {};
  self.front_end = socket_emitter;

  fs.ensureDirSync(base_dir);
  fs.ensureDirSync(path.join(base_dir, mineos.DIRS['import']));

  (function() {
    //thanks to https://github.com/flareofghast/node-advertiser/blob/master/advert.js
    var dgram = require('dgram');
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
            self.servers[s].broadcast_to_lan(function(msg) {
              if (msg)
                udp_broadcaster.send(msg, 0, msg.length, udp_port, udp_dest);
            })
          }
          setTimeout(next, broadcast_delay_ms);
        }
      )
    });
  })();

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers']);
    self.watches['server_added'] = chokidar.watch(server_path, { persistent: true, depth: 2 });
    
    self.watches['server_added']
      .on('add', function(dirpath) {
        if (/\/server\.properties$/.test(dirpath)) {
          // event to trigger when new server detected, e.g., /var/games/minecraft/servers/asdf/server.properties
          // ignores all events if string does not include 'server.properties'
          var server_name = path.basename(path.dirname(dirpath));
          async.nextTick(function() {
            self.servers[server_name] = new server_container(server_name, base_dir, self.front_end);
            self.front_end.emit('track_server', server_name);
          });
        }
      })
      .on('ready', function() {
        setTimeout(self.start_servers, 2000);
      })
  })();

  (function() {
    var server_path = path.join(base_dir, mineos.DIRS['servers']);
    self.watches['server_removed'] = chokidar.watch(server_path, { persistent: true, depth: 1 });
    // ignores event updates from servers that have more path beyond the /servers/<dirhere>/<filehere>

    self.watches['server_removed']
      .on('unlinkDir', function(dirpath) {
        // event to trigger when server directory deleted
        var server_name = path.basename(dirpath);
        self.servers[server_name].cleanup();
        delete self.servers[server_name];
        self.front_end.emit('untrack_server', server_name);
      })
  })();

  (function() {
    var importable_archives = path.join(base_dir, mineos.DIRS['import']);
    self.watches['importables'] = chokidar.watch(importable_archives, { 
      persistent: true, 
      depth: 1, 
      ignoreInitial: true });
    
    self.watches['importables']
      .on('ready', function() {
        self.send_importable_list();
      })
  })();

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

  function host_heartbeat() {
    self.front_end.emit('host_heartbeat', {
      'uptime': os.uptime(),
      'freemem': os.freemem(),
      'loadavg': os.loadavg()
    })
  }

  setInterval(host_heartbeat, 1000);

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
          var request = require('request');
          var fs = require('fs-extra');

          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(args.profile.id);
          var filename = 'minecraft_server.{0}.jar'.format(args.profile.id);
          var dest_filepath = path.join(dest_dir, filename);

          var url = 'https://s3.amazonaws.com/Minecraft.Download/versions/{0}/{1}'.format(args.profile.id, filename);

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              request(url)
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
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              request(url)
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
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              request(url)
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
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        case 'pocketmine_download':
          var request = require('request');
          var fs = require('fs-extra');

          var dir_concat = args.profile.id;
          var dest_dir = '/var/games/minecraft/profiles/{0}'.format(dir_concat);
          var filename = args.profile.name;
          var dest_filepath = path.join(dest_dir, filename);

          var url = 'https://github.com/PocketMine/PocketMine-MP/releases/download/{0}/{1}'.format(args.profile.version, args.profile.name);;

          fs.ensureDir(dest_dir, function(err) {
            if (err) {
              logging.error('[WEBUI] Error attempting download:', err);
            } else {
              request(url)
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
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        case 'php_download':
          var request = require('request');
          var fs = require('fs-extra');
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
              request(url)
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
                .pipe(fs.createWriteStream(dest_filepath))
            }
          });
          break;
        default:
          logging.warning('Command ignored: no such command {0}'.format(args.command));
          break;
      }
    }

    self.send_profile_list = function() {
      async.auto({
        'mojang': async.retry(2, self.check_profiles.mojang),
        'ftb': async.retry(2, self.check_profiles.ftb),
        'ftb_3rd': async.retry(2, self.check_profiles.ftb_third_party),
        'pocketmine': async.retry(2, self.check_profiles.pocketmine),
        'php': async.retry(2, self.check_profiles.php)
      }, function(err, results) {
        var merged = [];
        for (var source in results)
          merged = merged.concat.apply(merged, results[source]);

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
              item['weight'] = 0;

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
        var request = require('request');
        var xml_parser = require('xml2js');
        var fs = require('fs');

        var FTB_VERSIONS_URL = 'http://ftb.cursecdn.com/FTB2/static/thirdparty.xml';
        var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

        function handle_reply(err, response, body) {
          var p = [];

          if (!err && response.statusCode === 200)
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
        var request = require('request');
        var options = {
          url: 'https://api.github.com/repos/PocketMine/PocketMine-MP/releases',
          headers: {
            'User-Agent': 'MineOS Release Browser'
          }
        };

        var p = [];

        function handle_reply(err, response, body) {
          if (!err && response.statusCode == 200) {
            var releases = JSON.parse(body);

            for (var index in releases) {
              for (var asset in releases[index].assets) {
                if (releases[index].assets[asset].name.slice(-5).toLowerCase() == '.phar') {
                  var item = releases[index].assets[asset];
                  var version = releases[index].tag_name;
                  var dir_concat = 'Pocketmine-{0}'.format(version);
                  item['group'] = 'pocketmine';
                  item['type'] = (releases[index].prerelease ? 'snapshot' : 'release');
                  item['id'] = dir_concat;
                  item['version'] = releases[index].tag_name;
                  item['webui_desc'] = 'Pocketmine phar download';
                  item['weight'] = 10;
                  item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], dir_concat, item.name));
                  p.push(item);
                }
              }
            }
          }
          callback(err, p);
        }
        request(options, handle_reply);
      },
      php: function(callback) {
        var request = require('request');
        BUILD_REGEX = /^[\w]+BUILD="([^"]+)"/
        var p = [];

        function handle_reply(err, response, body) {
          if (!err && response.statusCode == 200) {
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
          self.front_end.emit('user_list', users);
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
          self.front_end.emit('group_list', groups);
        })
    }

    logging.info('[WEBUI] {0} connected from {1}'.format(username, ip_address));
    socket.emit('whoami', username);

    for (var server_name in self.servers)
      socket.emit('track_server', server_name);

    socket.on('command', webui_dispatcher);
    self.send_profile_list();
    self.send_user_list();
    self.send_importable_list();
  })

  return self;
}

function server_container(server_name, base_dir, socket_io) {
  // when evoked, creates a permanent 'mc' instance, namespace, and place for file tails/watches. 
  var self = this;
  var instance = new mineos.mc(server_name, base_dir),
      nsp = socket_io.of('/{0}'.format(server_name)),
      tails = {},
      watches = {},
      notices = [],
      cron = {},
      heartbeat_interval = null,
      HEARTBEAT_INTERVAL_MS = 5000;

  logging.info('[{0}] Discovered server'.format(server_name));
  make_tail('logs/latest.log');
  make_tail('server.log');

  make_watch('server.properties', broadcast_sp);
  make_watch('server.config', broadcast_sc);
  make_watch('cron.config', broadcast_cc);
  make_watch('eula.txt', emit_eula);
  make_watch('server-icon.png', broadcast_icon);

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

    for (var w in watches)
      watches[w].close();

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

      var tail_lookout = chokidar.watch(instance.env.cwd, {persistent: true, ignoreInitial: true});
      tail_lookout
        .on('add', function(fp) {
          var file = path.basename(fp);
          if (path.basename(rel_filepath) == file) {
            tail_lookout.close();
            logging.debug('[{0}] {1} created! Watchfile {2} closed'.format(server_name, file, rel_filepath));
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

    if (rel_filepath in watches) {
      logging.warn('[{0}] Watch already exists for {1}'.format(server_name, rel_filepath));
      return;
    }

    try {
      var watcher = chokidar.watch(abs_filepath, {persistent: true});
      watcher.on('change', function(fp) {
        callback();
      })
      logging.debug('[{0}] Started watch on {1}'.format(server_name, rel_filepath));
      watches[rel_filepath] = watcher;
    } catch (e) {
      logging.log(e) //handle error or ignore
    }
  }

  nsp.on('connection', function(socket) {
    var ip_address = socket.request.connection.remoteAddress;
    var username = socket.request.user.username;

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
      nsp.emit('server_ack', args)
      server_dispatcher(args);
    }

    function get_file_contents(rel_filepath) {
      if (rel_filepath in tails) { //this is the protection from malicious client
        // a tail would only exist for a file the server itself has opened
        var fs = require('fs');
        var abs_filepath = path.join(instance.env['cwd'], rel_filepath);

        fs.readFile(abs_filepath, function (err, data) {
          if (!err) {
            logging.info('[{0}] transmittting existing file contents: {1} ({2} bytes)'.format(server_name, rel_filepath, data.length));
            nsp.emit('file head', {filename: rel_filepath, payload: data.toString()});
          }
        });
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
            if (err)
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
          for (var c in cron_dict) {
            var cloned = JSON.parse(JSON.stringify(cron_dict[c])); //clones!
            var enabled = cloned['enabled'];
            delete cloned['enabled'];
            var cronjob = new CronJob(cloned.source, function (){
              server_dispatcher(cloned);
            }, null, false);

            if (enabled)
              cronjob.start();

            cron[hash(cloned)] = cronjob;
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
          ], function(err) {
            if (!err) {
              cron[opts.hash].start();
              broadcast_cc();
            }
          })
          break;
        case 'suspend':
          logging.log('[{0}] {1} suspending cron: {2}'.format(server_name, ip_address, opts.hash));

          async.series([
            async.apply(instance.set_cron, opts.hash, false),
            async.apply(reload_cron)
          ], function(err) {
            if (!err) {
              cron[opts.hash].stop();
              broadcast_cc();
            }
          })
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

  })
}