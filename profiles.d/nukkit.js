// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Nukkit',
  handler: function (profile_dir, callback) {
    var p = [];

    try {
      var item = new profile();

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
    } catch (e) { }

    callback(null, p);
  } //end handler

}