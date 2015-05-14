#!/usr/bin/env node

var mineos = require('./mineos');
var server = require('./server');
var async = require('async');

var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var passportSocketIO = require("passport.socketio");
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');

var sessionStore = new expressSession.MemoryStore();
var app = express();
var http = require('http').Server(app);

var BASE_DIR = '/var/games/minecraft';
var response_options = {root: __dirname};

// Authorization

var localAuth = function (username, password) {
  var Q = require('q');
  var deferred = Q.defer();

  if (username == 'will' && password == 'pass')
    deferred.resolve({
      username: username
    })
  else
    deferred.reject(new Error('incorrect password'))
  return deferred.promise;
}

// Passport init

passport.serializeUser(function(user, done) {
  //console.log("serializing " + user.username);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  //console.log("deserializing " + obj);
  done(null, obj);
});

// Use the LocalStrategy within Passport to login users.
passport.use('local-signin', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    localAuth(username, password)
    .then(function (user) {
      if (user) {
        console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT LOG IN");
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.error = 'Please sign in!';
  res.redirect('/admin/login.html');
}

app.use(bodyParser());
app.use(methodOverride());
app.use(expressSession({ 
  secret: 'session_secret', 
  key:'express.sid', 
  store: sessionStore 
}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io'));

var io = require('socket.io')(http)
io.use(passportSocketIO.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express
  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       'session_secret',    // the session_secret to parse the cookie
  store:        sessionStore        // we NEED to use a sessionstore. no memorystore please
}));

mineos.dependencies(function(err, binaries) {
	if (err) {
		console.log('MineOS is missing dependencies:', err);
		console.log(binaries);
	} else {
		var be = new server.backend(BASE_DIR, io);

		app.get('/', ensureAuthenticated, function(req, res){
			res.redirect('/admin/index.html');
		});

		app.get('/admin/index.html', ensureAuthenticated, function(req, res){
			res.sendfile('/html/index.html', response_options);
		});

		app.get('/login', function(req, res){
			res.sendfile('/html/login.html');
		});

		app.post('/auth', passport.authenticate('local-signin', {
			successRedirect: '/admin/index.html',
			failureRedirect: '/admin/login.html'
			})
		);

		app.get('/logout', function(req, res){
			var name = req.user.username;
			console.log("LOGGING OUT " + req.user.username)
			req.logout();
			res.redirect('/admin/login.html');
			req.session.notice = "You have successfully been logged out!";
		});

		app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io'));
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

