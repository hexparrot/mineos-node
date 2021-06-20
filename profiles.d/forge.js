// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Forge Mod',
  request_args: {
    url: 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json',
    json: true
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {
      for (var index in body.promos) {
        var item = new profile();
        var mcver = index.split('-')[0];
        var forgever = body.promos[index];

        item['id'] = index;
        item['type'] = 'release';
        item['group'] = 'forge';
        item['webui_desc'] = 'Forge Jar (build {0})'.format(forgever);
        item['weight'] = 0;
        item['version'] = index;
        item['release_version'] = forgever;

        var ver = mcver.match(/(\d+)\.(\d+)\.?(\d+)?/);

        if (parseInt(ver[1]) <= 1 && parseInt(ver[2]) <= 5) {
          // skip version 1.5.2 and earlier--non installer.jar model not supported workflow
        } else if (mcver == '1.10') {
          // 1.x major, .10 minor but not .10.2, chosen because url construction
          item['filename'] = 'forge-{0}-{1}-{0}-installer.jar'.format(mcver, forgever);
          item['url'] = 'http://maven.minecraftforge.net/net/minecraftforge/forge/1.10-{0}-1.10.0/forge-1.10-{0}-1.10.0-installer.jar'.format(forgever);
          item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
          p.push(item);
        } else if (parseInt(ver[1]) == 1 && parseInt(ver[2]) >= 7 && parseInt(ver[2]) <= 9) {
          // 1.x major, .7-.9 minor, chosen because url construction
          item['filename'] = 'forge-{0}-{1}-{0}-installer.jar'.format(mcver, forgever);
          item['url'] = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/{0}-{1}-{0}/{2}'.format(mcver, forgever, item['filename']);
          item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
          p.push(item);
        } else {
          item['filename'] = 'forge-{0}-{1}-installer.jar'.format(mcver, forgever);
          item['url'] = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/{0}-{1}/{2}'.format(mcver, forgever, item['filename']);
          item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
          p.push(item);
        }
      }
    } catch (e) { }

    callback(null, p);
  } //end handler
}