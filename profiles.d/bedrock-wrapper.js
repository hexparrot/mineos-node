// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'MineOS Bedrock Wrapper',
  handler: function(profile_dir, callback) {
    var p = [];

    try {
      var item = {};

      item['id'] = 'bedrock-server-wrapper';
      item['type'] = 'snapshot';
      item['group'] = 'bedrock-wrapper';
      item['webui_desc'] = 'Bedrock Server Wrapper';
      item['weight'] = 0;
      item['filename'] = 'mineos-bedrock-wrapper-1.0-SNAPSHOT.jar';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.0';
      item['url'] = 'https://github.com/tucks/mineos-bedrock-wrapper/raw/master/download/latest/mineos-bedrock-wrapper-1.0-SNAPSHOT.jar';

      p.push(item);	
    } catch (e) { }

    callback(null, p);
  } //end handler

}
