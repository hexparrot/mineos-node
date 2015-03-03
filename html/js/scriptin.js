function webui(port) {
  var self = this;

  self.connect_string = ':{0}/'.format(port);
  self.global = io(self.connect_string);
  self.servers = ko.observableArray([]);
  self.page = ko.observable();

  self.current_model = ko.observable({});

  self.global.on('server_list', function(servers) {
    var all = [];
    for (var s in servers)
      all.push(self.track_server(servers[s]));
    self.servers(all);
  })

  self.global.on('track_server', function(server_name) {
    self.servers.push(self.track_server(server_name));
  })

  self.dashboard = {
    'servers-running': ko.pureComputed(function() {
      return vm.servers().filter(function(v) {
        return v.heartbeat.up();
      }).length
    })
  }

  self.track_server = function(server_name) {
    var c = io(self.connect_string + server_name);
    var container = {
      server_name: server_name,
      channel: c,
      sp: ko.observable([]),
      heartbeat: {
        'up': ko.observable(false),
        'players_online': ko.observable("-"),
        'players_max': ko.observable("-"),
        'VmRSS': ko.observable("-"),
        'port': ko.observable("-"),
        'heapsize': ko.observable(0)
      },
      server_status: {
        'increments': ko.observableArray([]),
        'oldest_incr': ko.pureComputed(function() {
          return container.server_status.increments()[container.server_status.increments().length - 1];
        }),
        'newest_incr': ko.pureComputed(function() {
          return container.server_status.increments()[0];
        }),
        'du': ko.observable({})
      },
      gamelog: ko.observableArray([])
    }

    container.channel.emit('property', {property: 'server.properties'});
    c.emit('watch', 'logs/latest.log');

    c.on('new_tail', function(filepath) {
      c.emit('watch', filepath);
    })

    c.on('tail_data', function(data) {
      switch (data.filepath) {
        default:
          container.gamelog.push(data.payload);
          break;
      }
    })

    c.on('server_at_a_glance', function(data) {
      container.server_status.increments(data.increments);
      container.server_status.du(data.du);
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
      container.heartbeat['up'](data.payload.up);
      container.heartbeat['VmRSS']( ('VmRSS' in data.payload.memory ? data.payload.memory.VmRSS : "-") );
      container.heartbeat['players_online']( (data.payload.up ? data.payload.ping.players_online: "-") );

      if (data.payload.up)
        container.heartbeat['players_max'](data.payload.ping.players_max);
      else {
        var attrs = container['sp']();
        if (attrs === undefined || (attrs.length == 0)) {
          /* since sp is requested upon start of tracking, this shouldn't really ever happen.
          this fallback code will remain though in the even that the returned sp
          from the earlier call is not fulfilled by the time the first heartbeat arrives. */
          container.heartbeat['players_max']('--');
          container.channel.emit('property', {property: 'server.properties'});
          console.log('client requesting server.properties for server: ', server_name)
        } else {
          for (var i in attrs)
            if (attrs[i]['key'] == 'max-players') {
              container.heartbeat['players_max'](attrs[i]['value']);
              break;
            }
        }
      }
    })

    c.on('receipt', function(data) {
      console.log('RECEIPT:', data);
    })

    return container;
  }

  self.command = function(vm, eventobj) {
    var cmd = $(eventobj.currentTarget).data('cmd');
    self.current_model().channel.emit('command', {'command': cmd})
  }

  self.show_page = function(vm, event) {
    try {
      self.page($(event.currentTarget).data('page'));
    } catch (e) {
      self.page(vm);
    }

    switch(self.page()) {
      case 'server_status':
        self.current_model().channel.emit('server_at_a_glance');
        break;
      default:
        break;
    }

    $('.container-fluid').hide();
    $('#{0}'.format(self.page())).show();
  }

  self.select_server = function(model) {
    self.current_model(model);

    if (self.page() == 'dashboard')
      self.show_page('server_status');
  }

  self.show_page('dashboard');
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