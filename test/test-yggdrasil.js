var auth = require('../yggdrasil');

var test = exports;

var path = require('path');
var fs = require('fs');
var user = fs.readFileSync(path.join(process.cwd(), 'mojang_user'), 'utf8').trim();
var pass = fs.readFileSync(path.join(process.cwd(), 'mojang_pass'), 'utf8').trim();

test.authenticate = function(test) {
  auth.authenticate(user, pass, function(payload) {
    test.ok('accessToken' in payload);
    test.ok('clientToken' in payload);
    test.ok('selectedProfile' in payload);
    test.ok('availableProfiles' in payload);
    test.equal(Object.keys(payload).length, 4);
    test.done()
  })
}