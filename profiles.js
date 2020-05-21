var async = require('async');
var path = require('path');
var fs = require('fs-extra');

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

exports.profile_manifests = {
  mojang: {
    name: "Mojang Official Minecraft Jars",
    request_args: {
      url: 'https://launchermeta.mojang.com/mc/game/version_manifest.json',
      json: true
    },
    handler: function(profile_dir, body, callback) {
      var request = require('request');
      var p = [];

      var q = async.queue(function(obj, cb) {
        async.waterfall([
          async.apply(request, obj.url),
          function(response, body, inner_cb) {
            inner_cb(response.statusCode != 200, body)
          },
          function(body, inner_cb) {
            var parsed = JSON.parse(body);
            for (var idx in p)
              if (p[idx]['id'] == obj['id'])
                try {
                  p[idx]['url'] = parsed['downloads']['server']['url'];
                } catch (e) {}
            inner_cb();
          }
        ])
        cb();
      }, 2);

      q.pause();

      try {  // BEGIN PARSING LOGIC
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
	  item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
	  item['version'] = ref_obj['id'];
	  item['release_version'] = ref_obj['id'];
	  item['url'] = 'https://s3.amazonaws.com/Minecraft.Download/versions/{0}/minecraft_server.{0}.jar'.format(item.version);

	  switch(ref_obj['type']) {
	    case 'release':
	      item['type'] = ref_obj['type'];
              q.push({ id: item['id'], url: ref_obj.url });
              p.push(item);
	      break;
	    case 'snapshot':
	      item['type'] = ref_obj['type'];
              q.push({ id: item['id'], url: ref_obj.url });
              p.push(item);
	      break;
	    default:
	      item['type'] = 'old_version'; //old_alpha, old_beta
              //q.push({ id: item['id'], url: ref_obj.url });
	      break;
	  }
          //p.push(item);
	}
      } catch (e) {}

      q.resume();
      q.drain = function() {
        callback(null, p);
      }
    }, //end handler
    postdownload: function(profile_dir, dest_filepath, callback) {
      callback();
    }
  },
  ftb: {
    name: 'Feed the Beast Server Packs',
    request_args: {
      url: 'http://dist.creeper.host/FTB2/static/modpacks.xml',
      json: false
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {  // BEGIN PARSING LOGIC
        var xml_parser = require('xml2js');

        xml_parser.parseString(body, function(inner_err, result) {
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
            item['url'] = 'http://dist.creeper.host/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, ref_obj.version.replace(/\./g, '_'), ref_obj.serverPack);
            item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
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
              new_item['url'] = 'http://dist.creeper.host/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, old_versions[idx].replace(/\./g, '_'), ref_obj.serverPack);
              new_item['downloaded'] = fs.existsSync(path.join(profile_dir, new_item.id, new_item.filename));
              new_item['version'] = ref_obj['mcVersion'];
              new_item['release_version'] = old_versions[idx];

              if (old_versions[idx].length > 0 && old_versions[idx] != ref_obj['version'])
                p.push(new_item);
            }
          }
        }) // end parseString
      } catch (e) {}

      callback(null, p);
    }, //end handler
    postdownload: function(profile_dir, dest_filepath, callback) {
      callback();
    }
  },
  ftb_third_party: {
    name: 'Feed the Beast Third-Party Server Packs',
    request_args: {
      url: 'http://dist.creeper.host/FTB2/static/thirdparty.xml',
      json: false
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {
        var xml_parser = require('xml2js');

        xml_parser.parseString(body, function(inner_err, result) {
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
            item['url'] = 'http://dist.creeper.host/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, ref_obj.version.replace(/\./g, '_'), ref_obj.serverPack);
            item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
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
              new_item['url'] = 'http://dist.creeper.host/FTB2/modpacks/{0}/{1}/{2}'.format(ref_obj.dir, ref_obj.version.replace(/\./g, '_'), ref_obj.serverPack);
              new_item['downloaded'] = fs.existsSync(path.join(profile_dir, new_item.id, new_item.filename));
              new_item['version'] = ref_obj['mcVersion'];
              new_item['release_version'] = old_versions[idx];

              if (old_versions[idx].length > 0 && old_versions[idx] != ref_obj['version'])
                p.push(new_item);
            }
          }
        })
      } catch (e) {}

      callback(null, p);
    }, //end handler
    postdownload: function(profile_dir, dest_filepath, callback) {
      callback();
    }
  },
  forge: {
    name: 'Forge Mod',
    request_args: {
      url: 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions.json',
      json: true
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {
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
          item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
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

      } catch (e) {}

      callback(null, p);
    } //end handler
  },
  paperspigot: {
    name: 'PaperSpigot',
    handler: function(profile_dir, callback) {
      var p = [];

      try {
        var item = {};

        item['id'] = 'paperspigot-latest';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'paperspigot';
        item['webui_desc'] = 'Latest paperclip release';
        item['weight'] = 0;
        item['filename'] = 'paperclip.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'https://papermc.io/ci/job/Paper-1.15/lastSuccessfulBuild/artifact/paperclip.jar';
        p.push(JSON.parse(JSON.stringify(item)));

        item['version'] = '77';
        item['id'] = 'paperspigot-{0}'.format(item.version);
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'paperspigot';
        item['release_version'] = '1.15.2';
        item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
        item['weight'] = 0;
        item['filename'] = 'paperclip.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['url'] = 'https://ci.destroystokyo.com/job/Paper-1.15/{0}/artifact/paperclip.jar'.format(item.version);
        p.push(JSON.parse(JSON.stringify(item)));
		
        item['version'] = '1618';
        item['id'] = 'paperspigot-{0}'.format(item.version);
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'paperspigot';
        item['release_version'] = '1.12.2';
        item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
        item['weight'] = 0;
        item['filename'] = 'paperclip.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['url'] = 'https://ci.destroystokyo.com/job/Paper/{0}/artifact/paperclip.jar'.format(item.version);
        p.push(JSON.parse(JSON.stringify(item)));

	    item['version'] = '655';
        item['id'] = 'paperspigot-{0}'.format(item.version);
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'paperspigot';
        item['release_version'] = '1.13.2';
        item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
        item['weight'] = 0;
        item['filename'] = 'paperclip.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['url'] = 'https://ci.destroystokyo.com/job/Paper-1.13/{0}/artifact/paperclip.jar'.format(item.version);
        p.push(JSON.parse(JSON.stringify(item)));
		
        item['version'] = '243';
        item['id'] = 'paperspigot-{0}'.format(item.version);
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'paperspigot';
        item['release_version'] = '1.14.4';
        item['webui_desc'] = 'Paperclip build {0} (mc version: {1})'.format(item.version, item['release_version']);
        item['weight'] = 0;
        item['filename'] = 'paperclip.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['url'] = 'https://ci.destroystokyo.com/job/Paper-1.14/{0}/artifact/paperclip.jar'.format(item.version);
        p.push(JSON.parse(JSON.stringify(item)));

      } catch (e) {}

      callback(null, p);
    } //end handler
  },
  spigot: {
    name: 'Spigot',
    handler: function(profile_dir, callback) {
      var p = [];

      try {
        var item = {};

        item['id'] = 'BuildTools-latest';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'spigot';
        item['webui_desc'] = 'Latest BuildTools.jar for building Spigot/Craftbukkit';
        item['weight'] = 0;
        item['filename'] = 'BuildTools.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar';

        p.push(item);

      } catch (e) {}

      callback(null, p);
    } //end handler
  },
  imagicalmine: {
    name: 'Imagicalmine',
    handler: function(profile_dir, callback) {
      var p = [];

      try {
        var item = {};

        item['id'] = 'imagicalmine';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'imagicalmine';
        item['webui_desc'] = 'Third-party Pocketmine build';
        item['weight'] = 0;
        item['filename'] = 'ImagicalMine.phar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'http://jenkins.imagicalmine.net:8080/job/ImagicalMine/lastStableBuild/artifact/releases/ImagicalMine.phar';

        p.push(item);
      } catch (e) {}

      callback(null, p);
    } //end handler
  },
  mianite: {
    name: 'Mianite',
    request_args: {
      url: 'http://mianite.us/repo?api=true',
      json: true
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {
        for (var r in body) {
          var item = new profile_template();
          var ref_obj = body[r];
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
          item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
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

      } catch (e) {console.log(e)}

      callback(null, p);
    } //end handler
  },
  bungeecord: {
    name: 'BungeeCord',
    request_args: {
      url: 'http://ci.md-5.net/job/BungeeCord/rssAll',
      json: false
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {
        var xml_parser = require('xml2js');

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
              item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
              item['url'] = 'http://ci.md-5.net/job/BungeeCord/{0}/artifact/bootstrap/target/BungeeCord.jar'.format(item.version);
              p.push(item);
            }
            callback(err || inner_err, p);
          } catch (e) {}
        })

      } catch (e) {console.log(e)}

      callback(null, p);
    } //end handler
  },
  spongevanilla: {
    name: 'SpongeVanilla',
    request_args: {
      url: 'https://repo.spongepowered.org/maven/org/spongepowered/spongevanilla/maven-metadata.xml',
      json: false,
      gzip: true
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {
        var xml_parser = require('xml2js');

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
              item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
              item['url'] = 'https://repo.spongepowered.org/maven/org/spongepowered/spongevanilla/{0}/spongevanilla-{0}.jar'.format(item.version);
              p.push(item);
            }
            callback(inner_err, p);
          } catch (e) {}
        })

      } catch (e) {}

      callback(null, p);
    } //end handler
  },
  cuberite: {
    name: "Cuberite C++ Server",
    request_args: {
      url: 'http://builds.cuberite.org/rssLatest',
      json: false
    },
    handler: function(profile_dir, body, callback) {
      var p = [];

      try {  // BEGIN PARSING LOGIC
        var item = {};

        item['id'] = 'cuberite-x64-latest';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'cuberite';
        item['webui_desc'] = 'Latest Linux x64 release';
        item['weight'] = 0;
        item['filename'] = 'Cuberite.tar.gz';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'https://builds.cuberite.org/job/Cuberite%20Linux%20x64%20Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
        p.push(JSON.parse(JSON.stringify(item)));

        item['id'] = 'cuberite-x86-latest';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'cuberite';
        item['webui_desc'] = 'Latest Linux x86 release';
        item['weight'] = 0;
        item['filename'] = 'Cuberite.tar.gz';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'https://builds.cuberite.org/job/Cuberite%20Linux%20x86%20Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
        p.push(JSON.parse(JSON.stringify(item)));

        item['id'] = 'cuberite-rpi-latest';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'cuberite';
        item['webui_desc'] = 'Latest RPI release';
        item['weight'] = 0;
        item['filename'] = 'Cuberite.tar.gz';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'https://builds.cuberite.org/job/Cuberite%20Linux%20raspi-armhf%20Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
        p.push(JSON.parse(JSON.stringify(item)));

        item['id'] = 'cuberite-bsd-latest';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'cuberite';
        item['webui_desc'] = 'Latest FreeBSD x64 release';
        item['weight'] = 0;
        item['filename'] = 'Cuberite.tar.gz';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'https://builds.cuberite.org/job/Cuberite-FreeBSD-x64-Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
        p.push(JSON.parse(JSON.stringify(item)));

      } catch (e) {}

      callback(null, p);
    }, //end handler
    postdownload: function(profile_dir, dest_filepath, callback) {
      var child = require('child_process');
      var which = require('which');
      var binary = which.sync('tar');
      var args = ['--force-local',
                  '-xf', dest_filepath];
      var params = { cwd: profile_dir }

      async.series([
        function(cb) {
          var proc = child.spawn(binary, args, params);
          proc.once('exit', function(code) {
            cb(code);
          })
        },
        function(cb) {
          var inside_dir = path.join(profile_dir, 'Server');
          fs.readdir(inside_dir, function(err, files) {
            if (!err)
              async.each(files, function(file, inner_cb) {
                var old_filepath = path.join(inside_dir, file);
                var new_filepath = path.join(profile_dir, file);

                fs.move(old_filepath, new_filepath, inner_cb);
              }, cb);
            else
              cb(err);
          })
        }
      ], callback)
    }
  },
  nukkit: {
    name: 'Nukkit',
    handler: function(profile_dir, callback) {
      var p = [];

      try {
        var item = {};

        item['id'] = 'nukkit-stable';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'release';
        item['group'] = 'nukkit';
        item['webui_desc'] = 'Minecraft: PE server for Java (stable)';
        item['weight'] = 0;
        item['filename'] = 'nukkit-1.0-SNAPSHOT.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'http://ci.mengcraft.com:8081/job/nukkit/lastStableBuild/artifact/target/nukkit-1.0-SNAPSHOT.jar';

        p.push(item);

        var item = {};

        item['id'] = 'nukkit-snapshot';
        item['time'] = new Date().getTime();
        item['releaseTime'] = new Date().getTime();
        item['type'] = 'snapshot';
        item['group'] = 'nukkit';
        item['webui_desc'] = 'Minecraft: PE server for Java (last successful)';
        item['weight'] = 0;
        item['filename'] = 'nukkit-1.0-SNAPSHOT.jar';
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = 0;
        item['release_version'] = '';
        item['url'] = 'http://ci.mengcraft.com:8081/job/nukkit/lastSuccessfulBuild/artifact/target/nukkit-1.0-SNAPSHOT.jar';

        p.push(item);
      } catch (e) {}

      callback(null, p);
    } //end handler
  },
};
