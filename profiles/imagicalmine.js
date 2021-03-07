
// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Imagicalmine',
  handler: function (profile_dir, callback) {
    var p = [];

    try {
      var item = new profile();

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
    } catch (e) { }

    callback(null, p);
  } //end handler
}