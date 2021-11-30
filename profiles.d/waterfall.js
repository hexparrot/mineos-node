// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Waterfall',
  request_args: {
    url: 'https://papermc.io/api/v2/projects/waterfall/',
    json: true
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {
      for (var index in body.versions) {
        var version = body.versions[index];
        var item = new profile();

        item['id'] = 'waterfall-{0}-latest'.format(version);
        item['group'] = 'waterfall';
        item['webui_desc'] = 'Latest Waterfall build for {0}'.format(version);
        item['weight'] = 0;
        item['filename'] = 'waterfall.jar'.format(version);
        item['url'] = 'https://papermc.io/api/v1/waterfall/{0}/latest/download'.format(version);
        item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
        item['version'] = version;
        item['release_version'] = version;
        item['type'] = 'release'

        p.push(item);
      }
    } catch (e) { console.log(e) }
    callback(null, p);
  } //end handler
}

