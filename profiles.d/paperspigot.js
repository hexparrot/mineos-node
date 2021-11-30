var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');
var axios = require('axios');

exports.profile = {
  name: 'Paper',
  request_args: {
    url: 'https://papermc.io/api/v2/projects/paper/',
    json: true
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {
      for (var index in body.versions) {
        var version = body.versions[index];

        p.push(axios({ url: `https://papermc.io/api/v2/projects/paper/versions/${version}/`}).catch((err) => {
          console.log(err);
        }));
        
      }
      Promise.all(p).then(responses => {
        p = [];
        responses.forEach(response => {
          var build = response.data.builds[ response.data.builds.length -1 ];
          const splitPath = response.request.path.split('/');
          var ver =splitPath[splitPath.length - 2];
          var item = new profile();
    
          item['id'] = "Paper-{0}-{1}".format(ver,build);
          item['group'] = 'papermc';
          item['webui_desc'] = 'Latest Paper build for {0}'.format(ver);
          item['weight'] = 0;
          item['filename'] = "paper-{0}-{1}.jar".format(ver,build);
          item['url'] = `${response.request.res.responseUrl}builds/${build}/downloads/paper-${ver}-${build}.jar`;
          item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
          item['version'] = ver;
          item['release_version'] = ver;
          item['type'] = 'release'
    
          p.push(item);
        })
      }).then(() => { callback(null, p)});
      
    } catch (e) { console.log(e) }
  } //end handler
}