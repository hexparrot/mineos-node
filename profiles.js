var mineos = require('./mineos');
var async = require('async');
var path = require('path');
var logging = require('winston');
var fs = require('fs-extra');

exports.check_profiles = function check_profiles(base_dir, callback) {
  /**
   * Returns list of all available profiles and denotes which are present on the system
   * @param {String} base_dir, likely /var/games/minecraft
   * @return {Array} all profile definitions
   */
  var self = this;
  var request = require('request');

  function profile_template() {
    return  {
      id: null,
      time: null,
      releaseTime: null,
      type: null, // release, snapshot, old_version
      group: null, //mojang, ftb, ftb_third_party, pocketmine, etc.
      webui_desc: null,
      weight: 0,
      downloaded: false,
      filename: null, // minecraft_server.1.8.8.jar
      version: null // 1.8.8,
    }
  }

  var SOURCES = {
    mojang: function(callback) {
      var MOJANG_VERSIONS_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode === 200)
          for (var index in body.versions) {
            var item = new profile_template();
            var ref_obj = body.versions[index];

            item['id'] = ref_obj['id'];
            item['time'] = ref_obj['time'];
            item['releaseTime'] = ref_obj['releaseTime'];
            item['group'] = 'mojang';
            item['webui_desc'] = 'Official Mojang Jar';
            item['weight'] = 0;
            item['filename'] = 'minecraft_server.{0}.jar'.format(ref_obj['id']);
            item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
            item['version'] = ref_obj['id'];
            item['release_version'] = ref_obj['id'];
            item['url'] = 'https://s3.amazonaws.com/Minecraft.Download/versions/{0}/minecraft_server.{0}.jar'.format(item.version);

            switch(ref_obj['type']) {
              case 'release':
              case 'snapshot':
                item['type'] = ref_obj['type'];
                break;
              default:
                item['type'] = 'old_version'; //old_alpha, old_beta
                break;
            }

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
            try {
              var packs = result['modpacks']['modpack'];

              for (var index in packs) {
                var item = new profile_template();
                var ref_obj = packs[index]['$'];

                item['id'] = '{0}-{1}'.format(ref_obj['dir'], ref_obj['version']);
                //item['time'] = ref_obj['time'];
                //item['releaseTime'] = ref_obj['releaseTime'];
                item['type'] = 'release';
                item['group'] = 'ftb';
                item['webui_desc'] = '{0} (mc: {1})'.format(ref_obj['name'], ref_obj['mcVersion']);
                item['weight'] = 3;
                item['filename'] = ref_obj['serverPack'];
                item['url'] = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, ref_obj.version.replace(/\./g, '_'), ref_obj.serverPack);
                item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
                item['version'] = ref_obj['mcVersion'];
                item['release_version'] = ref_obj['version'];
                p.push(item);

                var old_versions = ref_obj['oldVersions'].split(';');
                for (var idx in old_versions) {
                  var new_item = new profile_template();

                  new_item['id'] = '{0}-{1}'.format(ref_obj['dir'], old_versions[idx]);
                  //new_item['time'] = ref_obj['time'];
                  //new_item['releaseTime'] = ref_obj['releaseTime'];
                  new_item['type'] = 'old_version';
                  new_item['group'] = 'ftb';
                  new_item['webui_desc'] = ref_obj['name'];
                  new_item['weight'] = 3;
                  new_item['filename'] = ref_obj['serverPack'];
                  new_item['url'] = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, old_versions[idx].replace(/\./g, '_'), ref_obj.serverPack);
                  new_item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], new_item.id, new_item.filename));
                  new_item['version'] = ref_obj['mcVersion'];
                  new_item['release_version'] = old_versions[idx];

                  if (old_versions[idx].length > 0 && old_versions[idx] != ref_obj['version'])
                    p.push(new_item);
                }
              }
              callback(err || inner_err, p);
            } catch (e) {
              callback(e, p)
            }
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

        if (!err && (response || {}).statusCode === 200)
          xml_parser.parseString(body, function(inner_err, result) {
            try {
              var packs = result['modpacks']['modpack'];

              for (var index in packs) {
                var item = new profile_template();
                var ref_obj = packs[index]['$'];

                item['id'] = '{0}-{1}'.format(ref_obj['dir'], ref_obj['version']);
                //item['time'] = ref_obj['time'];
                //item['releaseTime'] = ref_obj['releaseTime'];
                item['type'] = 'release';
                item['group'] = 'ftb_third_party';
                item['webui_desc'] = '{0} (mc: {1})'.format(ref_obj['name'], ref_obj['mcVersion']);
                item['weight'] = 3;
                item['filename'] = ref_obj['serverPack'];
                item['url'] = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, ref_obj.version.replace(/\./g, '_'), ref_obj.serverPack);
                item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
                item['version'] = ref_obj['mcVersion'];
                item['release_version'] = ref_obj['version'];
                p.push(item);

                var old_versions = ref_obj['oldVersions'].split(';');
                for (var idx in old_versions) {
                  var new_item = new profile_template();

                  new_item['id'] = '{0}-{1}'.format(ref_obj['dir'], old_versions[idx]);
                  //new_item['time'] = ref_obj['time'];
                  //new_item['releaseTime'] = ref_obj['releaseTime'];
                  new_item['type'] = 'old_version';
                  new_item['group'] = 'ftb';
                  new_item['webui_desc'] = ref_obj['name'];
                  new_item['weight'] = 3;
                  new_item['filename'] = ref_obj['serverPack'];
                  new_item['url'] = 'http://ftb.cursecdn.com/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, ref_obj.version.replace(/\./g, '_'), ref_obj.serverPack);
                  new_item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], new_item.id, new_item.filename));
                  new_item['version'] = ref_obj['mcVersion'];
                  new_item['release_version'] = old_versions[idx];

                  if (old_versions[idx].length > 0 && old_versions[idx] != ref_obj['version'])
                    p.push(new_item);
                }
              }
              callback(err || inner_err, p);
            } catch (e) {
              callback(e, p)
            }
          })
        else
          callback(null, p);
      }
      request({ url: FTB_VERSIONS_URL, json: false }, handle_reply);
    },
    forge: function(callback) {
      var FORGE_VERSIONS_URL = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions.json';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode === 200)
          for (var index in body.promos) {
            var item = new profile_template();
            var ref_obj = body.promos[index];

            item['id'] = index;
            item['time'] = ref_obj['modified'];
            item['releaseTime'] = ref_obj['modified'];
            item['type'] = 'release';
            item['group'] = 'forge';
            item['webui_desc'] = 'Forge Jar (build {0})'.format(ref_obj['build']);
            item['weight'] = 0;
            if (ref_obj['branch'])
              item['filename'] = 'forge-{0}-{1}-{2}-installer.jar'.format(ref_obj['mcversion'], ref_obj['version'], ref_obj['branch']);
            else
              item['filename'] = 'forge-{0}-{1}-installer.jar'.format(ref_obj['mcversion'], ref_obj['version']);
            item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
            item['version'] = ref_obj['mcversion'];
            item['release_version'] = ref_obj['version'];
            if (ref_obj['branch'])
              item['url'] = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/{0}-{1}-{2}/{3}'.format(ref_obj['mcversion'], ref_obj['version'], ref_obj['branch'], item['filename']);
            else
              item['url'] = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/{0}-{1}/{2}'.format(ref_obj['mcversion'], ref_obj['version'], item['filename']);

            var ver = ref_obj['mcversion'].match(/(\d+)\.(\d+)\.?(\d+)?/);

            if (parseInt(ver[1]) >= 1 && parseInt(ver[2]) >= 6)
              p.push(item); // 1.x major, .6 minor, chosen because 1.6.1 changed the installation process so drastically
          }

        callback(err, p);
      }
      request({ url: FORGE_VERSIONS_URL, json: true }, handle_reply);
    },
    paperspigot: function(callback) {
      var p = [];

      var item = {};

      item['id'] = 'paperspigot-latest';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'paperspigot';
      item['webui_desc'] = 'Latest paperclip release';
      item['weight'] = 0;
      item['filename'] = 'paperclip.jar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://ci.destroystokyo.com/job/PaperSpigot/lastSuccessfulBuild/artifact/paperclip.jar';
      p.push(JSON.parse(JSON.stringify(item)));

      item['version'] = '1072';
      item['id'] = 'paperspigot-{0}'.format(item.version);
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'paperspigot';
      item['release_version'] = '1.11.2';
      item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
      item['weight'] = 0;
      item['filename'] = 'paperclip.jar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['url'] = 'https://ci.destroystokyo.com/job/PaperSpigot/{0}/artifact/paperclip.jar'.format(item.version);
      p.push(JSON.parse(JSON.stringify(item)));

      item['version'] = '916';
      item['id'] = 'paperspigot-{0}'.format(item.version);
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'paperspigot';
      item['release_version'] = '1.10.2';
      item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
      item['weight'] = 0;
      item['filename'] = 'paperclip.jar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['url'] = 'https://ci.destroystokyo.com/job/PaperSpigot/{0}/artifact/paperclip.jar'.format(item.version);
      p.push(JSON.parse(JSON.stringify(item)));

      item['version'] = '773';
      item['id'] = 'paperspigot-{0}'.format(item.version);
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'paperspigot';
      item['release_version'] = '1.9.4';
      item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
      item['weight'] = 0;
      item['filename'] = 'paperclip.jar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['url'] = 'https://ci.destroystokyo.com/job/PaperSpigot/{0}/artifact/paperclip.jar'.format(item.version);
      p.push(JSON.parse(JSON.stringify(item)));

      item['version'] = '443';
      item['id'] = 'paperspigot-{0}'.format(item.version);
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'paperspigot';
      item['release_version'] = '1.8.8';
      item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
      item['weight'] = 0;
      item['filename'] = 'paperclip.jar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['url'] = 'https://ci.destroystokyo.com/job/PaperSpigot/{0}/artifact/Paperclip.jar'.format(item.version);
      //uppercase Paperclip.jar for some reason (old convention, perhaps)
      p.push(JSON.parse(JSON.stringify(item)));

      callback(null, p);
    },
    spigot: function(callback) {
      var p = [];

      var item = {};

      item['id'] = 'BuildTools-latest';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'spigot';
      item['webui_desc'] = 'Latest BuildTools.jar for building Spigot/Craftbukkit';
      item['weight'] = 0;
      item['filename'] = 'BuildTools.jar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar';

      p.push(item);

      callback(null, p);
    },
    imagicalmine: function(callback) {
      var p = [];

      var item = {};

      item['id'] = 'imagicalmine';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'imagicalmine';
      item['webui_desc'] = 'Third-party Pocketmine build';
      item['weight'] = 0;
      item['filename'] = 'ImagicalMine.phar';
      item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'http://jenkins.imagicalmine.net:8080/job/ImagicalMine/lastStableBuild/artifact/releases/ImagicalMine.phar';

      p.push(item);

      callback(null, p);
    },
    mianite: function(callback) {
      var MIANITE_VERSIONS_URL = "http://mianite.us/repo?api=true";

      var p = [];

      function handle_reply(err, retval) {
        if ((retval || {}).statusCode == 200) {
          var objects = JSON.parse(retval.body)
          for (var r in objects) {
            var item = new profile_template();
            var ref_obj = objects[r];
            try {
              var version = ref_obj.version.match(/[\d+]\.[\d+]\.[\d+]/)[0];
            } catch (e) {
              continue;
            }


            item['id'] = ref_obj['version'];
            item['group'] = 'mianite';
            item['webui_desc'] = 'Realm of Mianite {0}'.format(version);
            item['weight'] = 10;
            item['filename'] = path.basename(ref_obj['download']);
            item['url'] = ref_obj['download'];
            item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
            item['version'] = version;
            item['release_version'] = version;

            switch (ref_obj['version_tag']) {
              case 'Recommended':
                item['type'] = 'release';
                break;
              default:
                if (ref_obj.version.match(/RC|A/))
                  item['type'] = 'snapshot';
                else
                  item['type'] = 'release';
                break;
            }

            p.push(item);
          }
        }
        callback(null, p)
      }

      request(MIANITE_VERSIONS_URL, handle_reply);
    },
    bungeecord: function(callback) {
      var xml_parser = require('xml2js');

      var BUNGEE_VERSIONS_URL = 'http://ci.md-5.net/job/BungeeCord/rssAll';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode === 200)
          xml_parser.parseString(body, function(inner_err, result) {
            try {
              var packs = result['feed']['entry'];

              for (var index in packs) {
                var item = new profile_template();
                var ref_obj = packs[index];

                item['version'] = packs[index]['id'][0].split(':').slice(-1)[0];
                item['group'] = 'bungeecord';
                item['type'] = 'release';
                item['id'] = 'BungeeCord-{0}'.format(item.version);
                item['webui_desc'] = packs[index]['title'][0];
                item['weight'] = 5;
                item['filename'] = 'BungeeCord-{0}.jar'.format(item.version);
                item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
                item['url'] = 'http://ci.md-5.net/job/BungeeCord/{0}/artifact/bootstrap/target/BungeeCord.jar'.format(item.version);
                p.push(item);
              }
              callback(err || inner_err, p);
            } catch (e) {
              callback(e, p)
            }
          })
        else
          callback(null, p);
      }
      request({ url: BUNGEE_VERSIONS_URL, json: false }, handle_reply);
    },
    spongevanilla: function(callback) {
      var xml_parser = require('xml2js');

      var SPONGEVANILLA_VERSIONS_URL = 'https://repo.spongepowered.org/maven/org/spongepowered/spongevanilla/maven-metadata.xml';
      var path_prefix = path.join(base_dir, mineos.DIRS['profiles']);

      function handle_reply(err, response, body) {
        var p = [];

        if (!err && (response || {}).statusCode === 200)
          xml_parser.parseString(body, function(inner_err, result) {
            try {
              var packs = result['metadata']['versioning'][0]['versions'][0]['version'];

              for (var index in packs) {
                var item = new profile_template();
                var matches = packs[index].match(/([\d\.]+)-([\d\.]+)?-?(\D+)-(\d+)/);

                item['version'] = packs[index];
                item['group'] = 'spongevanilla';

                switch (matches[3]) {
                  case 'DEV':
                    item['type'] = 'snapshot';
                    break;
                  case 'BETA':
                    item['type'] = 'release';
                    break;
                  default:
                    item['type'] = 'old_versions';
                    break;
                }

                item['id'] = 'SpongeVanilla-{0}{1}{2}'.format(matches[1], matches[3][0].toLowerCase(), matches[4]);
                item['webui_desc'] = 'Version {0}, build {1} (mc: {2})'.format(matches[2], matches[4], matches[1]);
                item['weight'] = 5;
                item['filename'] = 'spongevanilla-{0}.jar'.format(item.version);
                item['downloaded'] = fs.existsSync(path.join(base_dir, mineos.DIRS['profiles'], item.id, item.filename));
                item['url'] = 'https://repo.spongepowered.org/maven/org/spongepowered/spongevanilla/{0}/spongevanilla-{0}.jar'.format(item.version);
                p.push(item);
              }
              callback(err || inner_err, p);
            } catch (e) {
              callback(e, p)
            }
          })
        else
          callback(null, p);
      }
      request({ url: SPONGEVANILLA_VERSIONS_URL, json: false, gzip: true }, handle_reply);
    }
  } //end sources

  logging.info('[WEBUI] Downloading official profiles.');

  var LIMIT_SIMULTANEOUS_DOWNLOADS = 3;
  var results = {};

  async.forEachOfLimit(
    SOURCES,
    LIMIT_SIMULTANEOUS_DOWNLOADS,
    function(dl_func, key, inner_callback) {
      dl_func(function(err, profs) {
        for (var source in profs)
          results[key] = profs;

        inner_callback();
      })
    },
    function(err) {
      var merged = [];
      for (var source in results)
        merged = merged.concat.apply(merged, results[source]);

      callback(err, merged);
    }
  )

} // end check_profiles

exports.download_profiles = function download_profiles(base_dir, args, progress_update_fn, callback) {
  var request = require('request');
  var progress = require('request-progress');

  args['command'] = 'Download';

  var DOWNLOADS = {
    mojang: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    ftb: function(inner_callback) {
      var unzip = require('unzip');

      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);

                fs.createReadStream(dest_filepath)
                  .pipe(unzip.Extract({ path: dest_dir })
                          .on('close', function() { inner_callback(args); })
                          .on('error', function() {
                            logging.error('Unzip error occurred, falling back to adm-zip');
                            var admzip = require('adm-zip');
                            var zip = new admzip(dest_filepath);
                            zip.extractAllTo(dest_dir, true); //true => overwrite
                            inner_callback(args);
                          })
                       );
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    ftb_third_party: function(inner_callback) {
      var unzip = require('unzip');

      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);

                fs.createReadStream(dest_filepath)
                  .pipe(unzip.Extract({ path: dest_dir })
                          .on('close', function() { inner_callback(args); })
                          .on('error', function() {
                            logging.error('Unzip error occurred, falling back to adm-zip');
                            var admzip = require('adm-zip');
                            var zip = new admzip(dest_filepath);
                            zip.extractAllTo(dest_dir, true); //true => overwrite
                            inner_callback(args);
                          })
                       );
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    mianite: function(inner_callback) {
      var unzip = require('unzip');

      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);

                fs.createReadStream(dest_filepath)
                  .pipe(unzip.Extract({ path: dest_dir })
                          .on('close', function() { inner_callback(args); })
                          .on('error', function() {
                            logging.error('Unzip error occurred, falling back to adm-zip');
                            var admzip = require('adm-zip');
                            var zip = new admzip(dest_filepath);
                            zip.extractAllTo(dest_dir, true); //true => overwrite
                            inner_callback(args);
                          })
                       );
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    forge: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    paperspigot: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    spigot: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    imagicalmine: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    bungeecord: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
    spongevanilla: function(inner_callback) {
      var dest_dir = path.join(base_dir, 'profiles', args.id);
      var dest_filepath = path.join(dest_dir, args.filename);

      var url = args.url;

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
                args['success'] = true;
                args['progress']['percent'] = 100;
                args['help_text'] = 'Successfully downloaded {0} to {1}'.format(url, dest_filepath);
                args['suppress_popup'] = false;
                inner_callback(args);
              } else {
                logging.error('[WEBUI] Server was unable to download file:', url);
                logging.error('[WEBUI] Remote server returned status {0} with headers:'.format(response.statusCode), response.headers);
                args['success'] = false;
                args['help_text'] = 'Remote server did not return {0} (status {1})'.format(args.filename, response.statusCode);
                args['suppress_popup'] = false;
                inner_callback(args);
              }
            })
            .on('progress', function(state) {
              args['progress'] = state;
              progress_update_fn(args);
            })
            .pipe(fs.createWriteStream(dest_filepath))
        }
      });
    },
  } // end downloads {}

  DOWNLOADS[args.group](callback);

} //end function
