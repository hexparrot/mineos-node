var fs = require('fs-extra');
var path = require('path');
var cf = require('../mineos/config_file');
var test = exports;

test.load_absent_file = function(test) {
  var instance = new cf.config_file('make.believe');

  test.equal(Object.keys(instance.props).length, 0);
  instance.read();
  test.equal(Object.keys(instance.props).length, 0);
  test.done();
}

/*test.commit = function(test) {
  var instance = new cf.config_file('test.config');

  instance.props['newprop'] = true;
  instance.commit();
}*/