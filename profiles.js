var glob = require('glob');

var profile_manifests = {};

glob.sync( './profiles/*.js').forEach( function(file){
  if(!file.match('template.js')){
  
  var loadedProfile = require(file);

  var name = file.split('/')[2].split('.')[0];
  profile_manifests[name] = loadedProfile.profile;
}
});

exports = profile_manifests;
