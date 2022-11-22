
var path = require('path');
var fs = require('fs-extra');
var profile = require('./template');

exports.profile = {
  name: 'Minecraft Bedrock',
  handler: function (profile_dir, callback) {
    var p = [];

    try {  // BEGIN PARSING LOGIC
      var item = new profile();

      item['id'] = 'bedrock-server-1.18.33.02';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.33.02 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.33.02.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.33.02';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.33.02.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.18.32.02';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.32.02 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.32.02.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.32.02';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.32.02.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.18.31.04';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.31.04 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.31.04.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.31.04';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.31.04.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.18.30.04';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.30.04 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.30.04.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.30.04';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.30.04.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.18.12.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.12.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.12.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.12.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.12.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.18.11.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.11.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.11.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.11.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.11.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.18.2.03';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.2.03 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.2.03.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.2.03';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.2.03.zip';
      p.push(JSON.parse(JSON.stringify(item))); 
      
      item['id'] = 'bedrock-server-1.18.1.02';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.1.02 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.1.02.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.1.02';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.1.02.zip';
      p.push(JSON.parse(JSON.stringify(item)));     

      item['id'] = 'bedrock-server-1.18.0.02';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.18.0.02 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.18.0.02.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.18.0.02';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.18.0.02.zip';
      p.push(JSON.parse(JSON.stringify(item))); 

      item['id'] = 'bedrock-server-1.17.41.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.41.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.41.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.41.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.41.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));       

      item['id'] = 'bedrock-server-1.17.40.06';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.40.06 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.40.06.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.40.06';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.40.06.zip';
      p.push(JSON.parse(JSON.stringify(item)));           

      item['id'] = 'bedrock-server-1.17.34.02';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.34.02 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.34.02.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.34.02';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.34.02.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.17.33.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.33.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.33.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.33.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.33.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));      

      item['id'] = 'bedrock-server-1.17.32.02';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.32.02 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.32.02.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.32.02';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.32.02.zip';
      p.push(JSON.parse(JSON.stringify(item)));  
      
      item['id'] = 'bedrock-server-1.17.31.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.31.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.31.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.31.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.31.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));
      
      item['id'] = 'bedrock-server-1.17.30.04';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.30.04 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.30.04.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.30.04';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.30.04.zip';
      p.push(JSON.parse(JSON.stringify(item)));      

      item['id'] = 'bedrock-server-1.17.11.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.11.01 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.11.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.11.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.11.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));         

      item['id'] = 'bedrock-server-1.17.10.04';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.17.10.04 Linux x64 release';
      item['weight'] = 0;
      item['filename'] = 'bedrock-server-1.17.10.04.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.17.10.04';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.17.10.04.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.16.221.01';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.16.221.01 Linux x64 release';
      item['weight'] = 1;
      item['filename'] = 'bedrock-server-1.16.221.01.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.16.221.01';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.16.221.01.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.14.60.5';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.14.60.5 Linux x64 release';
      item['weight'] = 2;
      item['filename'] = 'bedrock-server-1.14.60.5.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.14.60.5';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.14.60.5.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.13.3.0';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.13.3.0 Linux x64 release';
      item['weight'] = 3;
      item['filename'] = 'bedrock-server-1.13.3.0.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.13.3.0';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.13.3.0.zip';
      p.push(JSON.parse(JSON.stringify(item)));	    

      item['id'] = 'bedrock-server-1.12.1.1';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.12.1.1 Linux x64 release';
      item['weight'] = 4;
      item['filename'] = 'bedrock-server-1.12.1.1.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.12.1.1';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.12.1.1.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.11.4.2';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.11.4.2 Linux x64 release';
      item['weight'] = 5;
      item['filename'] = 'bedrock-server-1.11.4.2.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.11.4.2';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.11.4.2.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.10.0.7';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.10.0.7 Linux x64 release';
      item['weight'] = 6;
      item['filename'] = 'bedrock-server-1.10.0.7.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.10.0.7';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.10.0.7.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.9.0.15';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.9.0.15 Linux x64 release';
      item['weight'] = 7;
      item['filename'] = 'bedrock-server-1.9.0.15.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.9.0.15';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.9.0.15.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.8.1.2';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.8.1.2 Linux x64 release';
      item['weight'] = 8;
      item['filename'] = 'bedrock-server-1.8.1.2.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.8.1.2';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.8.1.2.zip';
      p.push(JSON.parse(JSON.stringify(item)));

      item['id'] = 'bedrock-server-1.7.0.13';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.7.0.13 Linux x64 release';
      item['weight'] = 9;
      item['filename'] = 'bedrock-server-1.7.0.13.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.7.0.13';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.7.0.13.zip';
      p.push(JSON.parse(JSON.stringify(item)));
	    
      item['id'] = 'bedrock-server-1.6.1.0';
      item['type'] = 'release';
      item['group'] = 'bedrock-server';
      item['webui_desc'] = '1.6.1.0 Linux x64 release';
      item['weight'] = 10;
      item['filename'] = 'bedrock-server-1.6.1.0.zip';
      item['downloaded'] = fs.existsSync(path.join(profile_dir, item.id, item.filename));
      item['version'] = 0;
      item['release_version'] = '1.6.1.0';
      item['url'] = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.6.1.0.zip';
      p.push(JSON.parse(JSON.stringify(item)));      

    } catch (e) { console.error(e); }

    callback(null, p);
  }, //end handler
  postdownload: function (profile_dir, dest_filepath, callback) {

    // perform an async chmod of the unipper extracted bedrock_server binary
    fs.chmod((profile_dir + '/bedrock_server'), 0755);
    callback();
  }
}
