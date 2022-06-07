async function usedJavaVersion(sc, callback){
  try{
    var child_process = require('child_process');
    var which = require('which');

    var java_binary = which.sync('java');
    var value = (sc.java || {}).java_binary || java_binary;

    var java_version = child_process.spawnSync(`${value}`, ['-version']);

    var stdout = java_version.stdout.toString();
    var stderr = java_version.stderr.toString();

    var toReturn = stdout ? stdout.split('"')[1].split('"')[0] : stderr.split('"')[1].split('"')[0];

    callback(null, toReturn);
  }catch(e){
    callback(null, `Error accessing location '${value}'`);
  }

}

module.exports = {usedJavaVersion};