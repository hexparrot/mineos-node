var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');
var axios = require('axios');

module.exports = function papertemplate (name){
  const lowername = name.toLowerCase();
  const titlename = name.charAt(0).toUpperCase() + lowername.substr(1);

return {
  name: titlename,
  request_args: {
    url: `https://papermc.io/api/v2/projects/${lowername}/`,
    json: true
  },
  handler: function (profile_dir, body, callback) {
    var p = [];

    try {
      for (var index in body.versions) {
        var version = body.versions[index];

        p.push(axios({ url: `https://papermc.io/api/v2/projects/${lowername}/versions/${version}/`}).catch((err) => {
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
    
          item['id'] = `${titlename}-${ver}-${build}`;
          item['group'] = lowername;
          item['webui_desc'] = `Latest ${titlename} build for ${ver}`;
          item['weight'] = 0;
          item['filename'] = `${lowername}-${ver}-${build}.jar`;
          item['url'] = `${response.request.res.responseUrl}builds/${build}/downloads/${lowername}-${ver}-${build}.jar`;
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
}