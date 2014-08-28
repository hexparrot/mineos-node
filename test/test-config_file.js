var path = require('path');
var fs = require('fs-extra');
var ini = require('ini');
var cf = require('../config_file');
var test = exports;

test.load_absent_file = function(test) {
  var file_path = 'make.believe';
  var config = new cf.config_file(file_path);

  test.equal(Object.keys(config.props).length, 0);
  test.equal(config.file_path, 'make.believe');

  config.load(function(err) {
    test.ok(err);
    test.done();
  })
  
}

test.make_new_file = function(test) {
  var file_path = 'new.file';
  var config = new cf.config_file(file_path);
  var new_dict = {'level-name':'world'};

  test.expect(2);

  config.write(new_dict, function(err) {
    if (!err) {
      var written_data = ini.parse(fs.readFileSync(file_path, 'utf8'));
      test.equal(written_data['level-name'], 'world');
      test.equal(config.props, new_dict);
      fs.removeSync(file_path);
      test.done();
    }
  })
}

test.change_property = function(test) {
  var file_path = 'new.file';
  var config = new cf.config_file(file_path);

  test.expect(2);

  config.write({'level-name':'world'}, function(err) {
    if (!err) {
      var written_data = ini.parse(fs.readFileSync(file_path, 'utf8'));
      test.equal(written_data['level-name'], 'world');

      config.modify('level-name', 'wasteland', function(err) {
        if (!err) {
          written_data = ini.parse(fs.readFileSync(file_path, 'utf8'));
          test.equal(written_data['level-name'], 'wasteland');
          fs.removeSync(file_path);
          test.done();
        }
      })
    }
  })
}

test.load_existing = function(test) {
  var file_path = 'new.file';
  var config = new cf.config_file(file_path);

  fs.writeFile(file_path, ini.stringify({'level-name':'world'}), 'utf8', function(err) {
    if (!err) {
      test.equal(Object.keys(config.props).length, 0);
      config.load(function(err) {
        if (!err) {
          test.equal(Object.keys(config.props).length, 1);
          fs.removeSync(file_path);
          test.done();
        }
      })
    }
  })
}