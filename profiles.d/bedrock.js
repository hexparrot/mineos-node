
// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: "Minecraft Bedrock",
  request_args: {
    url: '',
    json: false
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {  // BEGIN PARSING LOGIC
      var item = new profile();

      item['id'] = 'bedrock-server-1.17.10.04';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = 'Latest Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.10.04.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.10.04';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.10.04.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.16.221.01';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.16.221.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.16.221.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.16.221.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.16.221.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.14.60.5';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.14.60.5 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.14.60.5.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.14.60.5';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.14.60.5.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.13.3.0';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.13.3.0 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.13.3.0.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.13.3.0';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.13.3.0.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.12.1.1';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.12.1.1 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.12.1.1.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.12.1.1';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.12.1.1.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.11.4.2';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.11.4.2 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.11.4.2.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.11.4.2';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.11.4.2.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.10.0.7';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.10.0.7 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.10.0.7.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.10.0.7';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.10.0.7.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.9.0.15';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.9.0.15 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.9.0.15.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.9.0.15';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.9.0.15.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.8.1.2';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.8.1.2 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.8.1.2.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.8.1.2';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.8.1.2.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.7.0.13';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.7.0.13 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.7.0.13.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.7.0.13';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.7.0.13.zip';
      p.push(JSON.parse(JSON.stringify(item)));
	    
      item['id'] = 'bedrock-server-1.6.1.0';
      item['type'] = 'release';
      item['group'] = 'minecraft-bedrock';
      item['webui_desc'] = '1.6.1.0 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.6.1.0.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.6.1.0';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.6.1.0.zip';
      p.push(JSON.parse(JSON.stringify(item)));
	    
    } catch (e) { }

    callback(null, p);
  }, //end handler
  postdownload: function (profile_dir, dest_filepath, callback) {
    var child = require('child_process');
    var which = require('which');
    var binary = which.sync('unzip');
    var args = ['-qq', dest_filepath];
    var params = { cwd: profile_dir }

    async.series([
      function (cb) {
        var proc = child.spawn(binary, args, params);
        proc.once('exit', function (code) {
          cb(code);
        })
      },
      function (cb) {
        var inside_dir = path.join(profile_dir, 'Server');
        fs.readdir(inside_dir, function (err, files) {
          if (!err)
            async.each(files, function (file, inner_cb) {
              var old_filepath = path.join(inside_dir, file);
              var new_filepath = path.join(profile_dir, file);

              fs.move(old_filepath, new_filepath, inner_cb);
            }, cb);
          else
            cb(err);
        })
      }
    ], callback)
  }
}
