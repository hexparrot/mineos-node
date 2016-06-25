var async = require('async');
var auth = exports;

auth.authenticate_shadow = function(user, plaintext, callback) {
  var hash = require('sha512crypt-node');
  var fs = require('fs-extra');

  function etc_shadow(inner_callback) {
    // return true if error, false if auth failed, string for user if successful
    var passwd = require('etc-passwd');

    fs.stat('/etc/shadow', function(err, stat_info) {
      if (err)
        inner_callback(true);
      else {
        passwd.getShadow({username: user}, function(err, shadow_info) {
          if (shadow_info && shadow_info.password == '!')
            inner_callback(false);
          else if (shadow_info) {
            var password_parts = shadow_info['password'].split(/\$/);
            var salt = password_parts[2];
            var new_hash = hash.sha512crypt(plaintext, salt);

            var passed = (new_hash == shadow_info['password'] ? user : false);
            inner_callback(passed);
          } else {
            inner_callback(true);
          }
        })
      }
    })
  }

  function posix(inner_callback) {
    // return true if error, false if auth failed, string for user if successful
    try {
      var crypt = require('apache-crypt');
      var posix = require('posix');
    } catch (e) {
      inner_callback(true);
      return;
    }

    try {
      var user_data = posix.getpwnam(user);
      if (crypt(plaintext, user_data.passwd) == user_data.passwd)
        inner_callback(user);
      // this hash method fails on FreeNAS we need to try the sha512 hash
      else if (user_data) {
            var password_parts = user_data.passwd.split(/\$/);
            var salt = password_parts[2];
            var new_hash = hash.sha512crypt(plaintext, salt);

            var passed = (new_hash == user_data.passwd ? user : false);
            inner_callback(passed);
	  } else 
        inner_callback(false);
    } catch (e) {
      inner_callback(true);
    }
  }

  function pam(inner_callback) {
    // return true if error, false if auth failed, string for user if successful
    try {
      var pam = require('authenticate-pam');
    } catch (e) {
      inner_callback(true);
      return;
    }

    pam.authenticate(user, plaintext, function(err) {
      if (err)
        inner_callback(false);
      else
        inner_callback(user);
    })
  }

  pam(function(pam_passed) {
    if (typeof pam_passed == 'string')
      callback(pam_passed);
    else
      etc_shadow(function(etc_passed) {
        if (typeof etc_passed == 'string')
          callback(etc_passed)
        else
          posix(function(posix_passed) {
            if (typeof posix_passed == 'string')
              callback(posix_passed)
            else
              callback(false);
          })
      })
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
