// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Spigot',
  handler: function (profile_dir, callback) {
    var p = [];

    try {
      var item = new profile();

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

    } catch (e) { }

    callback(null, p);
  } //end handler

}