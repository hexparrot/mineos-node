var async = require('async');
var auth = exports;

auth.authenticate_shadow = function(user, plaintext, callback) {
  var hash = require('sha512crypt-node');
  var fs = require('fs-extra');

  function etc_shadow(inner_callback) {
    var passwd = require('etc-passwd');
    async.waterfall([
      async.apply(fs.stat, '/etc/shadow'),
      async.apply(passwd.getShadow, {username: user}),
      function(shadow_info, cb) {
        try {
          var password_parts = shadow_info['password'].split(/\$/);
          var salt = password_parts[2];
          var new_hash = hash.sha512crypt(plaintext, salt);

          cb(null, new_hash == shadow_info['password']);
        } catch (e) {
          cb(true, null);
        }
      }
    ], inner_callback)
  }

  function posix(inner_callback) {
    var crypt = require('crypt3');
    var posix = require('posix');

    try {
      var user_data = posix.getpwnam(user);
      if (crypt(plaintext, user_data.passwd) == user_data.passwd)
        inner_callback(user);
      else
        inner_callback(false);
    } catch (e) {
      inner_callback(false);
    }
  }

  etc_shadow(function(err, result_one) {
    if (err.errno == -2) { //if /etc/shadow ENOENT
      posix(function(result_two) {
        callback(result_two)
      })
    } else { //if /etc/shadow was found
      callback(result_one);
    }
  })
}

auth.test_membership = function(username, group, callback) {
  var passwd = require('etc-passwd');
  var userid = require('userid');

  var membership_valid = false;
  var gg = passwd.getGroups()
    .on('group', function(group_data) {
      if (group == group_data.groupname)
        try {
          if (group_data.users.indexOf(username) >= 0 || group_data.gid == userid.gid(username)) 
            membership_valid = true;
        } catch (e) {}
    })
    .on('end', function() {
      callback(membership_valid);
    })
}

auth.verify_ids = function(uid, gid, callback) {
  var passwd = require('etc-passwd');

  var uid_present = false;
  var gid_present = false;

  async.series([
    function(cb) {
      var gg = passwd.getUsers()
        .on('user', function(user_data) {
          if (user_data.uid == uid)
            uid_present = true;
        })
        .on('end', function() {
          if (!uid_present)
            cb('UID ' + uid + ' does not exist on this system');
          else
            cb();
        })
    },
    function(cb) {
      var gg = passwd.getGroups()
        .on('group', function(group_data) {
          if (group_data.gid == gid)
            gid_present = true;
        })
        .on('end', function() {
          if (!gid_present)
            cb('GID ' + gid + ' does not exist on this system');
          else
            cb();
        })
    }
  ], callback)
}