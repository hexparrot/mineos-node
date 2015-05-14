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