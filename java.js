const fs = require('fs');
const {accessSync, promises: {readdir}} = fs;


async function getJavaVersionsAvailable (cb){
  let toReturn = [];
  let vers = [];
  try{
    vers = (await readdir(`${__dirname}/java/`, {withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
  }catch(err){}

  vers.forEach((ver) => {
    let path = `${__dirname}/java/${ver}/bin/java`;
    try{ 
      accessSync(path,fs.constants.F_OK);
        toReturn.push({name: ver, path});
    }
    catch(e){
      console.log(`Java version ${ver} not added\npath: '${path}' doesn't exists or you don't have access`)
    }
  })
  cb(null,toReturn);
};

module.exports = {getJavaVersionsAvailable};