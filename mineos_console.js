#!/usr/bin/env node

var getopt = require('node-getopt');
var async = require('async');
var introspect = require('introspect');
var mineos = require('./mineos');

var opt = getopt.create([
  ['s' , 'server_name=SERVER_NAME'  , 'server name'],
  ['d' , 'base_dir=BASE_DIR'        , 'defaults to /var/games/minecraft'],
  ['D' , 'debug'                    , 'show debug output'],
  ['v' , 'version'                  , 'show version'],
  ['h' , 'help'                     , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

if ('server_name' in opt.options) {
  var base_dir = opt.options.d || '/var/games/minecraft';
  var instance = new mineos.mc(opt.options.server_name, base_dir);

  if (opt.argv[0] in instance) {
    var command = opt.argv.shift();
    var fn = instance[command];
    var arg_array = [];
    var required_args = introspect(fn);

    while (required_args.length) {
      var argument = required_args.shift();

      switch (argument) {
        case 'callback':
          arg_array.push(function(err, payload) {
            if (!err) {
              console.log('[{0}] Successfully executed "{1}"'.format(opt.options.server_name, command));
              if (payload)
                console.log(payload)
              process.exit(0);
            } else {
              console.log('[{0}] Error executing "{1}" because server condition not met: {2}'.format(
                opt.options.server_name, 
                command,
                err));
              process.exit(1);
            }
          })
          break;
        case 'owner':
          try {
            var owner_pair = opt.argv.shift().split(':');
            if (owner_pair.length != 2)
              throw 'err';
            arg_array.push({
              uid: parseInt(owner_pair[0]),
              gid: parseInt(owner_pair[1])
            })
          } catch (e) {
            console.log('Provide owner attribute as uid:gid pair, e.g., 1000:1000');
            process.exit(9);
          } 
          break;
        default:
          arg_array.push(opt.argv.shift())
          break;
      }
    }

    fn.apply(instance, arg_array);
  }
}

String.prototype.format = function() {
  var s = this;
  for(var i = 0, iL = arguments.length; i<iL; i++) {
    s = s.replace(new RegExp('\\{'+i+'\\}', 'gm'), arguments[i]);
  }
  return s;
};
