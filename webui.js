#!/usr/bin/env node

var mineos = require('./mineos');
var server = require('./server');
var express = require('express');
var async = require('async');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var userid = require('userid');
var auth = require('./auth');
var httpauth = require('http-auth');

var BASE_DIR = '/var/games/minecraft';
var response_options = {root: __dirname};

var OWNER_CREDS = {
	uid: userid.uid(process.env.USER) || 1000,
	gid: userid.gid(process.env.USER) || 1000
}

mineos.dependencies(function(err, binaries) {
	if (err) {
		console.log('MineOS is missing dependencies:', err);
		console.log(binaries);
	} else {
		var memoized_authenticator = async.memoize(auth.authenticate_shadow);
		var authenticator = httpauth.basic({realm: "MineOS Login"}, memoized_authenticator);

		app.use(httpauth.connect(authenticator));
		app.use('/angular', express.static(__dirname + '/node_modules/angular'));
		app.use('/angular-translate', express.static(__dirname + '/node_modules/angular-translate/dist'));
		app.use('/moment', express.static(__dirname + '/node_modules/moment'));
		app.use('/angular-moment', express.static(__dirname + '/node_modules/angular-moment'));
		app.use('/angular-moment-duration-format', express.static(__dirname + '/node_modules/moment-duration-format/lib'));
		app.use('/admin', express.static(__dirname + '/html'));

		var LISTEN_PORT = 3000;
		http.listen(LISTEN_PORT, function(){
			console.log('listening on *:' + LISTEN_PORT);
			var be = server.backend(BASE_DIR, io, OWNER_CREDS);

			process.on('SIGINT', function() {
				console.log("Caught interrupt signal; closing webui....");
				be.shutdown();
				process.exit();
			});
		});
	}
})

