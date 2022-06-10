const fs = require('fs');
const {accessSync, promises: {readdir}} = fs;
const child_process = require('child_process');

async function getJavaVersionsAvailable (cb, sc){
  let toReturn = [];
  let vers = [];
  
  try{
    vers = (await readdir(`${__dirname}/java/`, {withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
  }catch(err){}

  vers.forEach((ver) => {
    let path = `${__dirname}/java/${ver}/bin/java`;
    try{ 
      accessSync(path,fs.constants.F_OK);
        toReturn.push({name: getJavaVersion(path), path});
    }
    catch(e){
      console.log(`Java version ${ver} not added\npath: '${path}' doesn't exists or you don't have access`)
    }
  })

  let currentJavaBin = getCurrentJavaBinaryLocation(sc);
  let current = {name: getJavaVersion(currentJavaBin), path: currentJavaBin};
  if (!toReturn.includes({current})){
    toReturn.push(current);
  }
  
  cb(null,toReturn);
};


async function usedJavaVersion(sc, callback){
  try{
    var value = getCurrentJavaBinaryLocation(sc);
    var toReturn = getJavaVersion(value);

    callback(null, toReturn);
  }catch(e){
    callback(null, `Error accessing location '${value}'`);
  }

}

function getCurrentJavaBinaryLocation(sc){

  var which = require('which');

  var java_binary = which.sync('java');
  return (sc.java || {}).java_binary || java_binary;
}

function getJavaVersion(path){
  var java_version = child_process.spawnSync(`${path}`, ['-version']);

  var stdout = java_version.stdout.toString();
  var stderr = java_version.stderr.toString();

  return stdout ? stdout.split('"')[1].split('"')[0] : stderr.split('"')[1].split('"')[0];
}

module.exports = {usedJavaVersion,getJavaVersionsAvailable};
