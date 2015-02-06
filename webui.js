var mineos = require('./mineos');
var server = require('./server');
var path = require('path');
var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var privateKey  = fs.readFileSync('sslcert/mineos.key', 'utf8');
var certificate = fs.readFileSync('sslcert/mineos.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var https = require('https').Server(credentials,app);
var io = require('socket.io')(http);

var BASE_DIR = '/var/games/minecraft';
var response_options = {root: __dirname};

var be = server.backend(BASE_DIR, io);

app.get('/', function(req, res){
    res.sendFile('login.html', { root: __dirname + "/html/" } );
});
app.use(express.static(path.join(__dirname, 'html')));

process.on('SIGINT', function() {
  console.log("Caught interrupt signal; closing webui....");
  process.exit();
});

app.get('/', function(req, res){
	  res.sendFile(path.join(__dirname,'/html/login.html'));
});

https.listen(3000, function(){
  console.log('listening on *:3000');
});
