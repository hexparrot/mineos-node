#!/usr/bin/env node

var mineos = require('./mineos');
var server = require('./server');
var express = require('express');
var async = require('async');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var userid = require('userid');
var whoami = require('whoami');

var BASE_DIR = '/var/games/minecraft';
var response_options = {root: __dirname};

var OWNER_CREDS = {
	uid: userid.uid(whoami) || 1000,
	gid: userid.gid(whoami) || 1000
}

mineos.dependencies(function(err, binaries) {
	if (err) {
		console.log('MineOS is missing dependencies:', err);
		console.log(binaries);
	} else {
		var be = server.backend(BASE_DIR, io, OWNER_CREDS);

		app.get('/', function(req, res){
			res.sendFile('index.html', response_options);
		});

		app.use('/angular', express.static(__dirname + '/node_modules/angular'));
		app.use('/angular-translate', express.static(__dirname + '/node_modules/angular-translate/dist'));
		app.use('/moment', express.static(__dirname + '/node_modules/moment'));
		app.use('/angular-moment', express.static(__dirname + '/node_modules/angular-moment'));
		app.use('/angular-moment-duration-format', express.static(__dirname + '/node_modules/moment-duration-format/lib'));
		app.use('/admin', express.static(__dirname + '/html'));

		process.on('SIGINT', function() {
			console.log("Caught interrupt signal; closing webui....");
			be.shutdown();
			process.exit();
		});

		http.listen(3000, function(){
			console.log('listening on *:3000');
		});
	}
})

