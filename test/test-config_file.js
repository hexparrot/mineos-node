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

test.commit = function(test) {
  var instance = new cf.config_file('test.config');

  instance.ev.once('commit', function() {
    instance.ev.once('read', function() {
      test.equal(Object.keys(instance.props).length, 1);
      test.equal(instance.props['newprop'], 'true');
      fs.removeSync(instance.file_path);
      test.done();
    })
    instance.read();
  })
  
  instance.props['newprop'] = true;
  instance.commit();
}

test.load_populated_file = function(test) {
  var file_path = 'server.properties';
  fs.writeFileSync(file_path, 'server-ip=0.0.0.0');
  test.ok(fs.existsSync(file_path));

  var instance = new cf.config_file(file_path);

  instance.ev.on('read', function() {
    test.equal(instance.props['server-ip'], '0.0.0.0');
    fs.removeSync(file_path);
    test.done();
  })
}