const async = require('async');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const profile = require('./template');

exports.profile = {
  name: "Mojang Official Minecraft Jars",
  request_args: {
    url: 'https://piston-meta.mojang.com/mc/game/version_manifest.json',
    json: true
  },
  handler: function (profile_dir, body, callback) {
    const profiles = [];

    try {
      const queue = async.queue(function (task, cb) {
        // Request to metadata json of version
        axios({ url: task.url, responseType: 'json' })
          .then(response => {
            if (response.status !== 200) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = response.data;

            let item = new profile();
            item.id = data.id;
            item.time = data.time;
            item.releaseTime = data.releaseTime;
            item.group = 'mojang';
            item.webui_desc = 'Official Mojang Jar';
            item.weight = 0;
            item.filename = `minecraft_server.${item.id}.jar`;
            item.downloaded = fs.existsSync(path.join(profile_dir, item.id, item.filename));
            item.version = item.id;
            item.release_version = item.id;
            item.type = data.type;

            if (data.downloads.server) {
              item.url = data.downloads.server.url;
              profiles.push(item);
            } else {
              console.warn("No server jar:", data);
            }

            cb();
          })
          .catch((err) => {
            console.log(err);
            callback(err);
          });
      }, 2);

      queue.drain = function () {
        callback(null, profiles);
      };

      for (const version of body.versions) {
        const task = { id: version.id, type: version.type, url: version.url };

        // Only releases or snapshots; other types (e.g. old_alpha, old_beta) have no server jar
        if (task.type === 'release' || task.type === 'snapshot') {
          queue.push(task);
        }
      }
    } catch (e) { console.error(e) }
  }
}