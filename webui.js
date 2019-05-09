#!/usr/bin/env node

var mineos = require('./mineos');
var server = require('./server');
var async = require('async');
var fs = require('fs-extra');

var express = require('express');
var compression = require('compression');
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

var response_options = {root: __dirname};

function read_ini(filepath) {
  var ini = require('ini');
  try {
    var data = fs.readFileSync(filepath);
    return ini.parse(data.toString());
  } catch (e) {
    return null;
  }
}

var mineos_config = read_ini('/etc/mineos.conf') || read_ini('/usr/local/etc/mineos.conf') || {};

// Authorization
var localAuth = function (username, password) {
  var Q = require('q');
  var auth = require('./auth');
  var deferred = Q.defer();

  auth.authenticate_shadow(username, password, function(authed_user) {
    if (authed_user)
        deferred.resolve({ username: authed_user });
    else
        deferred.reject(new Error('incorrect password'));
  })

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
        console.log('Successful login attempt for username:', username);
        var logstring = new Date().toString() + ' - success from: ' + req.connection.remoteAddress + ' user: ' + username + '\n';
        fs.appendFileSync('/var/log/mineos.auth.log', logstring);
        done(null, user);
      }
    })
    .fail(function (err) {
      console.log('Unsuccessful login attempt for username:', username);
      var logstring = new Date().toString() + ' - failure from: ' + req.connection.remoteAddress + ' user: ' + username + '\n';
      fs.appendFileSync('/var/log/mineos.auth.log', logstring);
      done(null);
    });
  }
));


var OPTS = {
  server: {
    url: mineos_config['ldap']['url'],
    bindDN: mineos_config['ldap']['bindDN'],
    bindCredentials: mineos_config['ldap']['bindCredentials'],
    searchBase: mineos_config['ldap']['searchBase'],
    searchFilter: mineos_config['ldap']['searchFilter'],
    groupSearchBase: mineos_config['ldap']['groupSearchBase'],
    groupSearchFilter: mineos_config['ldap']['groupSearchFilter'],
    groupDnProperty: mineos_config['ldap']['groupDnProperty']
  },
  passReqToCallback : true
};
var LdapStrategy = require('passport-ldapauth');
passport.use('ldap', new LdapStrategy(OPTS, function(req, user, done) {
  if (mineos_config['ldap']['groupSearchFilter'] === '' || mineos_config['ldap']['groupSearchBase'] === '' || user['_groups'].length >= 1) {
    try {
      var userid = require('userid');
      userid.uid(user[mineos_config['ldap']['fullName']]);
      console.log('Successful login attempt for username:', user[mineos_config['ldap']['fullName']]);
      var logstring = new Date().toString() + ' - success from: ' + req.connection.remoteAddress + ' user: ' + user[mineos_config['ldap']['fullName']] + '\n';
      fs.appendFileSync('/var/log/mineos.auth.log', logstring);
      done(null, { username: user[mineos_config['ldap']['fullName']] });
    } catch (error) {
      console.log('Ldap: Unix user not found for username:', user[mineos_config['ldap']['fullName']]);
      var logstring = new Date().toString() + ' - failure from: ' + req.connection.remoteAddress + ' user: ' + user[mineos_config['ldap']['fullName']] + ' (unix user not found)\n';
      fs.appendFileSync('/var/log/mineos.auth.log', logstring);
      done(null)
    }

  }
  else{
    console.log('Unsuccessful login attempt for username:', user[mineos_config['ldap']['fullName']]);
    var logstring = new Date().toString() + ' - failure from: ' + req.connection.remoteAddress + ' user: ' + user[mineos_config['ldap']['fullName']] + '\n';
    fs.appendFileSync('/var/log/mineos.auth.log', logstring);
    done(null);
  }

}));

// clean up sessions that go stale over time
function session_cleanup() {
  //http://stackoverflow.com/a/10761522/1191579
  sessionStore.all(function(err, sessions) {
    for (var i = 0; i < sessions.length; i++) {
      sessionStore.get(sessions[i], function() {} );
    }
  });
}

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.error = 'Please sign in!';
  res.redirect('/admin/login.html');
}

var token = require('crypto').randomBytes(48).toString('hex');

app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride());
app.use(compression());
app.use(expressSession({ 
  secret: token,
  key: 'express.sid',
  store: sessionStore,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var io = require('socket.io')(http)
io.use(passportSocketIO.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express
  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       token,    // the session_secret to parse the cookie
  store:        sessionStore        // we NEED to use a sessionstore. no memorystore please
}));

function tally(callback) {
  var os = require('os');
  var urllib = require('urllib');
  var child_process = require('child_process');

  var tally_info = {
    sysname: os.type(), 
    release: os.release(), 
    nodename: os.hostname(),
    version: '',
    machine: process.arch
  }

  child_process.execFile('uname', ['-v'], function(err, output) {
    if (!err)
      tally_info['version'] = output.replace(/\n/,'');
    urllib.request('http://minecraft.codeemo.com/tally/tally-node.py', {data: tally_info}, function(){});
  })
}

mineos.dependencies(function(err, binaries) {
  if (err) {
    console.error('MineOS is missing dependencies:', err);
    console.log(binaries);
    process.exit(1);
  } 

  var base_directory = '/var/games/minecraft';

  if ('base_directory' in mineos_config) {
    try {
      if (mineos_config['base_directory'].length < 2)
        throw new error('Invalid base_directory length.');

      base_directory = mineos_config['base_directory'];
      fs.ensureDirSync(base_directory);

    } catch (e) {
      console.error(e.message, 'Aborting startup.');
      process.exit(2); 
    }

    console.info('base_directory found in mineos.conf, using:', base_directory);
  } else {
    console.error('base_directory not specified--missing mineos.conf?');
    console.error('Aborting startup.');
    process.exit(4); 
  }

  var be = new server.backend(base_directory, io, mineos_config);

  tally();
  setInterval(tally, 7200000); //7200000 == 120min

    app.get('/', function(req, res){
        res.redirect('/admin/index.html');
    });

    app.get('/admin/index.html', ensureAuthenticated, function(req, res){
        res.sendfile('/html/index.html', response_options);
    });

    app.get('/login', function(req, res){
        res.sendfile('/html/login.html');
    });

    app.post('/auth', passport.authenticate(mineos_config['auth_method'], {
        successRedirect: '/admin/index.html',
        failureRedirect: '/admin/login.html'
        })
    );

  app.all('/api/:server_name/:command', ensureAuthenticated, function(req, res) {
    var target_server = req.params.server_name;
    var user = req.user.username;
    var instance = be.servers[target_server];

    var args = req.body;
    args['command'] = req.params.command;

    if (instance)
      instance.direct_dispatch(user, args);
    else
      console.error('Ignoring request by "', user, '"; no server found named [', target_server, ']');

    res.end();
  });

  app.post('/admin/command', ensureAuthenticated, function(req, res) {
    var target_server = req.body.server_name;
    var instance = be.servers[target_server];
    var user = req.user.username;
    
    if (instance)
      instance.direct_dispatch(user, req.body);
    else
      console.error('Ignoring request by "', user, '"; no server found named [', target_server, ']');
    
    res.end();
  });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/admin/login.html');
  });

  app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io'));
  app.use('/angular', express.static(__dirname + '/node_modules/angular'));
  app.use('/angular-translate', express.static(__dirname + '/node_modules/angular-translate/dist'));
  app.use('/moment', express.static(__dirname + '/node_modules/moment'));
  app.use('/angular-moment', express.static(__dirname + '/node_modules/angular-moment'));
  app.use('/angular-moment-duration-format', express.static(__dirname + '/node_modules/moment-duration-format/lib'));
  app.use('/angular-sanitize', express.static(__dirname + '/node_modules/angular-sanitize'));
  app.use('/admin', express.static(__dirname + '/html'));

  process.on('SIGINT', function() {
    console.log("Caught interrupt signal; closing webui....");
    be.shutdown();
    process.exit();
  });

  var SOCKET_PORT = null;
  var SOCKET_HOST = '0.0.0.0';
  var USE_HTTPS = true;

  if ('use_https' in mineos_config)
    USE_HTTPS = mineos_config['use_https'];

  if ('socket_host' in mineos_config)
    SOCKET_HOST = mineos_config['socket_host'];

  if ('socket_port' in mineos_config)
    SOCKET_PORT = mineos_config['socket_port'];
  else
    if (USE_HTTPS)
      SOCKET_PORT = 8443;
    else
      SOCKET_PORT = 8080;

  if (USE_HTTPS)
    async.parallel({
      key: async.apply(fs.readFile, mineos_config['ssl_private_key'] || '/etc/ssl/certs/mineos.key'),
      cert: async.apply(fs.readFile, mineos_config['ssl_certificate'] || '/etc/ssl/certs/mineos.crt')
    }, function(err, ssl) {
      if (err) {
        console.error('Could not locate required SSL files /etc/ssl/certs/mineos.{key,crt}, aborting server start.');
        process.exit(3);
      } else {
        var https = require('https');

        if ('ssl_cert_chain' in mineos_config) {
          try {
            var cert_chain_data = fs.readFileSync(mineos_config['ssl_cert_chain']);
            if (cert_chain_data.length)
              ssl['ca'] = cert_chain_data;
          } catch (e) {}
        }

        var https_server = https.createServer(ssl, app).listen(SOCKET_PORT, SOCKET_HOST, function() {
          io.attach(https_server);
          console.log('MineOS webui listening on HTTPS://' + SOCKET_HOST + ':' + SOCKET_PORT);
        });
      }
    })
  else {
    console.warn('mineos.conf set to host insecurely: starting HTTP server.');
    http.listen(SOCKET_PORT, SOCKET_HOST, function(){
      console.log('MineOS webui listening on HTTP://' + SOCKET_HOST + ':' + SOCKET_PORT);
    });
  }

  setInterval(session_cleanup, 3600000); //check for expired sessions every hour

})
