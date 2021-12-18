#!/usr/bin/env node

var user = 'mc';
var password = 'password';

var async = require('async');
var hash = require('sha512crypt-node');
var fs = require('fs');

function etc_shadow(user, plaintext, inner_callback) {
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

function posix(user, plaintext,inner_callback) {
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
    else if (user_data) {
      // the crypt hash method fails on FreeNAS so try the sha512
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

function pam(user, plaintext, inner_callback) {
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

async.series([
  function(cb) {
    etc_shadow(user, password, function(retval) {
      console.log('testing etc_shadow');
      console.log('expected value: ' + user);
      console.log('returned value: ' + retval);
      console.log();
      cb();
    })
  },
  function(cb) {
    posix(user, password, function(retval) {
      console.log('testing posix');
      console.log('expected value: ' + user);
      console.log('returned value: ' + retval);
      console.log();
      cb();
    })
  },
  function(cb) {
    pam(user, password, function(retval) {
      console.log('testing pam');
      console.log('expected value: ' + user);
      console.log('returned value: ' + retval);
      console.log();
      cb();
    })
  }
],
function(err) {})
