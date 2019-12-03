var async = require('async');
var auth = require('../auth');
var test = exports;

test.authenticate_shadow = function(test) {
  // this test assumes:
  // user "weak" with password "password"
  // user "madeup" with group membership: users (no existence of 'madeup' group)
  async.series([
    function(callback) {
      auth.authenticate_shadow('madeup', 'password', function(authed_user) {
        test.equal(authed_user, 'madeup');
        callback(!authed_user);
      })
    },
    function(callback) {
      auth.authenticate_shadow('weak', 'password', function(authed_user) {
        test.equal(authed_user, 'weak');
        callback(!authed_user);
      })
    },
    function(callback) {
      auth.authenticate_shadow('weak', 'notthepassword', function(authed_user) {
        test.equal(authed_user, false);
        callback(authed_user);
      })
    },
    function(callback) {
      auth.authenticate_shadow('fake', 'notthepassword', function(authed_user) {
        test.equal(authed_user, false);
        callback(authed_user);
      })
    },
    function(callback) {
      auth.authenticate_shadow('root', 'notthepassword', function(authed_user) {
        test.equal(authed_user, false);
        callback(authed_user);
      })
    },
    function(callback) {
      auth.authenticate_shadow('root', '', function(authed_user) {
        test.equal(authed_user, false);
        callback(authed_user);
      })
    },
    function(callback) {
      auth.authenticate_shadow('root', '!', function(authed_user) {
        test.equal(authed_user, false);
        callback(authed_user);
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.test_membership = function(test) {
  // this test assumes:
  // user 'root' is part of group 'root'
  // user 'will' is part of group 'sudo'

  async.series([
    function(callback) {
      auth.test_membership('root', 'root', function(is_member) {
        test.equal(is_member, true);
        callback();
      })
    },
    function(callback) {
      auth.test_membership('will', 'root', function(is_member) {
        test.equal(is_member, false);
        callback();
      })
    },
    function(callback) {
      auth.test_membership('will', 'sudo', function(is_member) {
        test.equal(is_member, true);
        callback();
      })
    },
    function(callback) {
      auth.test_membership('will', 'will', function(is_member) {
        test.equal(is_member, true);
        callback();
      })
    },
    function(callback) {
      auth.test_membership('jill', 'will', function(is_member) {
        test.equal(is_member, false);
        callback();
      })
    },
    function(callback) {
      auth.test_membership('jill', 'jill', function(is_member) {
        test.equal(is_member, false);
        callback();
      })
    }
  ], function(err, results) {
    test.done();
  })
}

test.verify_ids = function(test) {
  // this test assumes:
  // UID and GID 1000 exist

  async.series([
    async.apply(auth.verify_ids, 1000, 1000),
    function(callback) {
      auth.verify_ids(9876, 1000, function(err) {
        test.equal(err, 'UID 9876 does not exist on this system');
        callback();
      })
    },
    function(callback) {
      auth.verify_ids(1000, 9876, function(err) {
        test.equal(err, 'GID 9876 does not exist on this system');
        callback();
      })
    },
    function(callback) {
      auth.verify_ids(9876, 9876, function(err) {
        test.equal(err, 'UID 9876 does not exist on this system');
        callback();
      })
    }
  ], function(err, results) {
    test.ifError(err);
    test.done();
  })
}

