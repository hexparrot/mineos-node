var logging = require('winston');

var profile_manifests = {};

var normalizedPath = require("path").join(__dirname, "profiles.d");

logging.info(normalizedPath);
require("fs").readdirSync(normalizedPath).filter(fn => fn.endsWith('.js')).forEach(function(file) {
  if (!file.match('template.js')) {
    var loadedProfile = require('./profiles.d/' + file);
    if(loadedProfile.profile !== undefined){
      var name = file.split('.')[0];
      profile_manifests[name] = loadedProfile.profile;
    }
  }
});

module.exports = { "profile_manifests" : profile_manifests };
