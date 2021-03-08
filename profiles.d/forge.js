// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Forge Mod',
  request_args: {
    url: 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions.json',
    json: true
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {
      for (var index in body.promos) {
        var item = new profile();
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

    } catch (e) { }

    callback(null, p);
  } //end handler
}