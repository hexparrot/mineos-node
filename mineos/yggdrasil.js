var path = require('path');
var request = require('request');
var async = require('async');
var yggdrasil = exports;

yggdrasil.authenticate = function(username, password, callback) {
  var endpoint = 'authenticate';
  var auth = {
    "agent": {
      "name": "Minecraft",
      "version": 1
    },
    "username": username,
    "password": password
  }

  request.post(
    'https://authserver.mojang.com/authenticate', { json: auth }, function (error, response, body) {
      if (!error && response.statusCode == 200) 
        callback(body);
    }
  );
}