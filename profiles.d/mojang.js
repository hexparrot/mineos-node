var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: "Mojang Official Minecraft Jars",
  request_args: {
    url: 'https://launchermeta.mojang.com/mc/game/version_manifest.json',
    json: true
  },
  handler: function (profile_dir, body, callback) {
    var request = require('request');
    var p = [];

    var q = async.queue(function (obj, cb) {
      async.waterfall([
        async.apply(request, obj.url),
        function (response, body, inner_cb) {
          inner_cb(response.statusCode != 200, body)
        },
        function (body, inner_cb) {
          try {
            var parsed = JSON.parse(body);
          } catch (err) {
            callback(err);
            inner_cb(err);
            return;
          }
          for (var idx in p)
            if (p[idx]['id'] == obj['id'])
              try {
                p[idx]['url'] = parsed['downloads']['server']['url'];
              } catch (e) { }
          inner_cb();
        }
      ])
      cb();
    }, 2);

    q.pause();

    try {  // BEGIN PARSING LOGIC
      for (var index in body.versions) {
        var item = new profile();
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

        switch (ref_obj['type']) {
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
    } catch (e) { }

    q.resume();
    q.drain = function () {
      callback(null, p);
    }
  }, //end handler
  postdownload: function (profile_dir, dest_filepath, callback) {
    callback();
  }
}