
class JavaHandler {

    constructor() { }

    getJavaVersion(callback) {
        var spawn = require('child_process').spawn('java', ['-version']);
        spawn.on('error', function (err) {
            return callback(err, null);
        })
        spawn.stderr.on('data', function (data) {
            data = data.toString().split('\n')[0];
            var javaVersion = new RegExp('(java|openjdk) version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;
            if (javaVersion != false) {
                // TODO: We have Java installed
                return callback(null, javaVersion);
            } else {
                // TODO: No Java installed

            }
        });
    }

    installNewJavaVersion(version, callback) {

    }

    getAvailableVersions(callback) {

    }
}



module.exports = new JavaHandler();