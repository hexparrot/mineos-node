var mineos = require('./mineos');
var server = require('./server');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var userid = require('userid');
var whoami = require('whoami');

var BASE_DIR = '/var/games/minecraft';
var response_options = {root: __dirname};

var OWNER_CREDS = {
  uid: userid.uid(whoami),
  gid: userid.gid(whoami)
}

var be = server.backend(BASE_DIR, io, OWNER_CREDS);

app.get('/', function(req, res){
  res.sendFile('index.html', response_options);
});

process.on('SIGINT', function() {
  console.log("Caught interrupt signal; closing webui....");
  process.exit();
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});