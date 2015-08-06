#!/usr/bin/env node

var getopt = require('node-getopt');
var async = require('async');
var introspect = require('introspect');
var child_process = require('child_process');
var mineos = require('./mineos');

var opt = getopt.create([
  ['s' , 'server_name=SERVER_NAME'  , 'server name'],
  ['d' , 'base_dir=BASE_DIR'        , 'defaults to /var/games/minecraft'],
  ['D' , 'debug'                    , 'show debug output'],
  ['V' , 'version'                  , 'show version'],
  ['h' , 'help'                     , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

function return_git_commit_hash(callback) {
  var gitproc = child_process.spawn('git', 'log -n 1 --pretty=format:"%H"'.split(' '));
  var commit_value = '';

  gitproc.stdout.on('data', function(data) {
    var buffer = new Buffer(data, 'ascii');
    commit_value = buffer.toString('ascii');
  });

  gitproc.on('error', function(code) {
    // branch if path does not exist
    if (code != 0)
      callback(true, undefined);
  });

  gitproc.on('exit', function(code) {
    if (code == 0) // branch if all is well
      callback(code, commit_value);
    else 
      callback(true, undefined);
  });
}

if ('version' in opt.options) {
  return_git_commit_hash(function(code, hash) {
    if (!code)
      console.log(hash);
    process.exit(code);
  })
} else if ('server_name' in opt.options) {
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
  } else {
    var property = opt.argv.shift();
    var fn = instance.property;
    var arg_array = [property];

    arg_array.push(function(err, payload) {
      if (!err && payload !== undefined) {
        console.log('[{0}] Queried property: "{1}"'.format(opt.options.server_name, property));
        console.log(payload);
        process.exit(0);
      } else {
        console.log('[{0}] Error querying property "{1}"'.format(
          opt.options.server_name, 
          property,
          err));
        process.exit(1);
      }
    })

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
