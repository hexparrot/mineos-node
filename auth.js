var async = require('async');
var auth = exports;

auth.authenticate_shadow = function(user, plaintext, callback) {
  var passwd = require('etc-passwd');
  var hash = require('sha512crypt-node');

  async.waterfall([
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
  ], function(err, retval) {
    if (retval)
      callback(user);
    else
      callback(false);
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