var request = require('request');
var url = require('url');
var yggdrasil = exports;

yggdrasil.SERVER_HOST = 'https://authserver.mojang.com';

yggdrasil.authenticate = function(username, password, callback) {
  var auth = {
    "agent": {
      "name": "Minecraft",
      "version": 1
    },
    "username": username,
    "password": password
  }

  request.post(
    url.resolve(yggdrasil.SERVER_HOST, 'authenticate'), { json: auth }, function (error, response, body) {
      if (!error && response.statusCode == 200) 
        callback(body);
    }
  );
}