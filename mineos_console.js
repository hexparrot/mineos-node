#!/usr/bin/env node

var getopt = require('node-getopt');
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
  var child_process = require('child_process');

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

function handle_server(args, callback) {
  var introspect = require('introspect');

  var base_dir = (args.options || {}).d || '/var/games/minecraft';
  var command = args.argv.shift();
  var fn = instance[command];
  var arg_array = [];
  var required_args = introspect(fn);

  while (required_args.length) {
    var ra = required_args.shift();

    switch (ra) {
      case 'callback':
        arg_array.push(function(err, payload) {
          var retval = [];

          if (!err) {
            retval.push('[{0}] Successfully executed "{1}"'.format(args.options.server_name, command));
            if (payload)
              retval.push(payload)
          } else {
            retval.push('[{0}] Error executing "{1}" because server condition not met: {2}'.format(
              args.options.server_name, 
              command,
              err)
            );
          }

          callback( (err ? 1 : 0), retval );
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
    } //end switch
  } //end while

  fn.apply(instance, arg_array); //actually run the function with the args
}

function retrieve_property(args, callback) {
  var property = args.argv.shift();
  var fn = instance.property;
  var arg_array = [property];
  var retval = [];

  arg_array.push(function(err, payload) {
    if (!err && payload !== undefined) {
      retval.push('[{0}] Queried property: "{1}"'.format(args.options.server_name, property));
      retval.push(payload);
    } else {
      retval.push('[{0}] Error querying property "{1}"'.format(
        args.options.server_name, 
        property,
        err));
    }
    callback( (err ? 1 : 0), retval);
  })

  fn.apply(instance, arg_array);
}

var base_dir = (opt.options || {}).d || '/var/games/minecraft';
var instance = new mineos.mc(opt.options.server_name, base_dir);

if ('version' in opt.options) {
  return_git_commit_hash(function(code, hash) {
    if (!code)
      console.log(hash);
    process.exit(code);
  })
} else if (opt.argv[0] in instance) { //first provided param matches a function name) {
  handle_server(opt, function(code, retval) {
    for (var idx in retval)
      console.log(retval[idx])
    process.exit(code);
  })
} else {
  retrieve_property(opt, function(code, retval) {
    for (var idx in retval)
      console.log(retval[idx])
    process.exit(code);
  })
}

String.prototype.format = function() {
  var s = this;
  for(var i = 0, iL = arguments.length; i<iL; i++) {
    s = s.replace(new RegExp('\\{'+i+'\\}', 'gm'), arguments[i]);
  }
  return s;
};
