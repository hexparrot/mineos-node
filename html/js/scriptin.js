function webui(port) {
  var self = this;

  self.connect_string = ':{0}/'.format(port);
  self.global = io(self.connect_string);
  self.servers = ko.observableArray([]);
  self.page = ko.observable('dashboard');

  self.global.on('server_list', function(servers) {
    self.servers($.map(servers, function(server_name, idx) {
      return self.track_server(server_name);
    }));
  })

  self.global.on('track_server', function(server_name) {
    self.servers.push(self.track_server(server_name));
  })

  self.current = ko.observable();

  /*

  self.dashboard = {
    'servers-running': ko.pureComputed(function() {
      return vm.servers().filter(function(v) {
        return v.heartbeat.up();
      }).length
    })
  }*/

  self.track_server = function(server_name) {
    var c = io(self.connect_string + server_name);
    var container = {
      server_name: server_name,
      channel: c,
      sp: ko.observable([]),
      heartbeat: {
        'up': ko.observable(false),
        'players_online': ko.observable(0),
        'players_max': ko.observable(0),
        'VmRSS': ko.observable(0),
        'port': ko.observable(0),
        'heapsize': ko.observable(0)
      },
      tails: {
        'console': ko.observableArray([])
      },
      server_status: {},
      console_input: ko.observable()
    }

    c.emit('property', {property: 'server.properties'});
    c.emit('watch', 'logs/latest.log');

    c.on('new_tail', function(filepath) {
      c.emit('watch', filepath);
    })

    c.on('tail_data', function(data) {
      switch (data.filepath) {
        default:
          container.tails.console.push(data.payload);
          break;
      }
    })

    c.on('page_data', function(data) {
      switch(data.page) {
        case 'server_status':
          var ss = container.server_status;
          ko.mapping.fromJS(data.payload, {}, ss);
          ss['oldest_incr'] = ko.pureComputed(function() {
            if (ss.increments().length)
              return ss.increments()[ss.increments().length - 1];
            else
              return {time: '', size: '', cum: ''};
          });
          ss['newest_incr'] = ko.pureComputed(function() {
            if (ss.increments().length)
              return ss.increments()[0];
            else
              return {time: '', size: '', cum: ''};
            
          });
          break;
        default:
          break;
      }
    })

    c.on('result', function(data) {
      console.log(data)
      if ('property' in data) {
        switch (data.property) {
          case 'server.properties':
            container.sp($.map(data.payload, function(v,k) {
              return {key: k, value: v}
            }))
            container.heartbeat.port(data.payload['server-port']);
            container.heartbeat.players_max(data.payload['max-players']); 
            break;
          default:
            break;
        }
      } else {
        switch (data.command) {
          case 'delete':
            if (data.success) {
              self.show_page('dashboard');
              self.current_model(null);
            }
            break;
          default:
            break;
        }
      }
      console.log('RESULT:', data);
    })

    c.on('heartbeat', function(data) {
      var ch = container.heartbeat;
      var hb = data.payload;

      ch['up'](hb.up);
      ch['VmRSS'](('VmRSS' in hb.memory ? hb.memory.VmRSS : 0));

      if (hb.up) {
        try {
          ch['players_online'](hb.ping.players_online);
        } catch (e) {
          ch['players_online'](0);
        }
      }
    })

    c.on('receipt', function(data) {
      console.log('RECEIPT:', data);
    })

    return container;
  }

  self.update_prop = function(obj, event) {
    if (event.which == 13)
      self.current().channel.emit('command', {'command': 'modify_sp', 'property': obj.key, 'new_value': obj.value})
    return true;
  }

  self.stuff = function() {
    var input = self.current().console_input();

    self.current().tails.console.push(input);
    self.current().console_input('');
    self.current().channel.emit('command', {'command': 'stuff', 'msg': input})
  }

  self.command = function(vm, eventobj) {
    var REQUIRED_ARGS = {
      'restore': ['step']
    }

    var cmd = $(eventobj.currentTarget).data('cmd');
    var command_obj = {'command': cmd}
    
    if (cmd in REQUIRED_ARGS) {
      var reqs = REQUIRED_ARGS[cmd];

      for (var i=0; i<reqs.length; i++) {
        var key = reqs[i];
        command_obj[key] = vm[key]();
      }
    }
  
    
    self.current().channel.emit('command', command_obj)
  }

  self.show_page = function(vm, event) {
    var new_page = null;
    try {
      new_page = $(event.currentTarget).data('page');
    } catch (e) {
      new_page = vm;
    }

    if (['dashboard', 'profiles', 'create_server', 'importable'].indexOf(new_page) >= 0) {
      self.page(new_page)
    } else {
      self.current().channel.emit('page_data', new_page);
      self.current().channel.once('page_data', function(data) {
        self.page(new_page);
      })
    }
  }

  self.select_server = function(model) {
    self.current(model);

    if (self.page() == 'dashboard')
      self.show_page('server_status');
  }
}

String.prototype.format = String.prototype.f = function() {
  var s = this,
      i = arguments.length;

  while (i--) { s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);}
  return s;
};

function bytes_to_mb(bytes){
  //http://stackoverflow.com/a/18650828
  if (bytes == 0)
    return '0B';
  else if (bytes < 1024)
    return bytes + 'B';

  var k = 1024;
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toPrecision(3) + sizes[i];
}