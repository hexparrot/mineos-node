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

      item['id'] = 'mineos-bedrock-wrapper';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'mineosbedrockwrapper';
      item['webui_desc'] = 'MineOS Bedrock Wrapper';
      item['weight'] = 0;
      item['filename'] = 'mineos-bedrock-wrapper-1.0-SNAPSHOT.jar';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://github.com/tucks/mineos-bedrock-wrapper/blob/master/download/latest/mineos-bedrock-wrapper-1.0-SNAPSHOT.jar';

      p.push(item);	
    } catch (e) { }

    callback(null, p);
  } //end handler

}
