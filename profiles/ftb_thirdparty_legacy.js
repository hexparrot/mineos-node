var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
    name: 'Feed the Beast Third-Party Server Packs - old',
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
            var item = new profile();
            var ref_obj = packs[index]['$'];

            item['id'] = '{0}-{1}'.format(ref_obj['dir'], ref_obj['version']);
            //item['time'] = ref_obj['time'];
            //item['releaseTime'] = ref_obj['releaseTime'];
            item['type'] = 'release';
            item['group'] = 'ftb_third_party_old';
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
              new_item['group'] = 'ftb_third_party_old';
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
  
}