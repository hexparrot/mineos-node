var async = require('async');
var auth = require('../auth');
var test = exports;

test.authenticate_shadow = function(test) {
  //this test depends on the existence of system user "weak" with password "password"
  async.series([
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
    }
  ], function(err, results) {
    test.expect(3);
    test.done();
  })
}

test.test_membership = function(test) {
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