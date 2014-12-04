var mineos = require('./mineos');
var server = require('./server');
var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var BASE_DIR = '/var/games/minecraft';
var response_options = {root: __dirname};

var be = server.backend(BASE_DIR, io);

app.use(express.static(path.join(__dirname, 'html')));
app.get('/', function(req, res){
	  res.sendFile(path.join(__dirname,'/html/login.html'));
	});

process.on('SIGINT', function() {
  console.log("Caught interrupt signal; closing webui....");
  process.exit();
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});