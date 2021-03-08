
// var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: "Cuberite C++ Server",
  request_args: {
    url: 'http://builds.cuberite.org/rssLatest',
    json: false
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {  // BEGIN PARSING LOGIC
      var item = new profile();

      item['id'] = 'cuberite-x64-latest';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'cuberite';
      item['webui_desc'] = 'Latest Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'Cuberite.tar.gz';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://builds.cuberite.org/job/Cuberite%20Linux%20x64%20Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'cuberite-x86-latest';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'cuberite';
      item['webui_desc'] = 'Latest Linux x86 release';
      item['weight'] = 0;
      item['filename'] = 'Cuberite.tar.gz';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://builds.cuberite.org/job/Cuberite%20Linux%20x86%20Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'cuberite-rpi-latest';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'cuberite';
      item['webui_desc'] = 'Latest RPI release';
      item['weight'] = 0;
      item['filename'] = 'Cuberite.tar.gz';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://builds.cuberite.org/job/Cuberite%20Linux%20raspi-armhf%20Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'cuberite-bsd-latest';
      item['time'] = new Date().getTime();
      item['releaseTime'] = new Date().getTime();
      item['type'] = 'release';
      item['group'] = 'cuberite';
      item['webui_desc'] = 'Latest FreeBSD x64 release';
      item['weight'] = 0;
      item['filename'] = 'Cuberite.tar.gz';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '';
      item['url'] = 'https://builds.cuberite.org/job/Cuberite-FreeBSD-x64-Master/lastSuccessfulBuild/artifact/Cuberite.tar.gz';
      p.push(JSON.parse(JSON.stringify(item)));

    } catch (e) { }

    callback(null, p);
  }, //end handler
  postdownload: function (profile_dir, dest_filepath, callback) {
    var child = require('child_process');
    var which = require('which');
    var binary = which.sync('tar');
    var args = ['--force-local',
      '-xf', dest_filepath];
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