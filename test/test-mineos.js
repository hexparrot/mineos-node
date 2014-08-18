var fs = require('fs');
var path = require('path');
var touch = require("touch");
var mineos = require('../mineos/mineos');

exports['server_list'] = function (test) {
    test.ok(mineos.server_list('/var/games/minecraft') instanceof Array, "server returns an array");
    test.done();
};

exports['is_server'] = function(test) {
	var server_name = 'testing';
	var base_dir = '/var/games/minecraft';
	var server_path = path.join(base_dir, server_name);
	var sp_path = path.join(server_path, 'server.properties');

	test.ok(!mineos.is_server(server_path), 'non-existent path should fail');
	fs.mkdirSync(server_path);
	touch.sync(sp_path);
	test.ok(mineos.is_server(server_path), 'newly created path + sp should succeed');

	fs.unlink(sp_path);
	fs.rmdirSync(server_path);
	test.done();
}