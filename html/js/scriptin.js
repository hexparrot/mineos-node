function webui(port) {
  var self = this;

  self.connect_string = ':{0}/'.format(port);
  self.global = io(self.connect_string);
  self.servers = ko.observableArray([]);
  self.page = ko.observable();

  self.current_model = ko.observable({});

  self.current_tail = ko.pureComputed(function() {
    try {
      return this.current_model().gamelog();
    } catch (e) {
      return [];
    }
  }, this);

  self.current_sp = ko.pureComputed(function() {
    try {
      var sp = this.current_model().sp();
      var sp_array = [];
      for (var k in sp)
        sp_array.push({key: k, value: sp[k]})
      return sp_array;
    } catch (e) {
      return [];
    }
  }, this);

  self.global.on('server_list', function(servers) {
    var all = [];
    for (var s in servers)
      all.push(self.track_server(servers[s]));
    self.servers(all);
  })

  self.global.on('track_server', function(server_name) {
    self.servers.push(self.track_server(server_name));
  })

  self.track_server = function(server_name) {
    var c = io(self.connect_string + server_name);
    var container = {
      server_name: server_name,
      channel: c,
      sp: ko.observable({}),
      gamelog: ko.observableArray([])
    }

    c.emit('watch', 'logs/latest.log');

    c.on('tail_data', function(data) {
      container.gamelog.push(data.payload);
    })

    c.on('result', function(data) {
      console.log(data)
      if ('property' in data) {
        switch (data.property) {
          case 'server.properties':
            container.sp(data.payload);
            break;
          default:
            break;
        }
      }
      console.log('RESULT:', data);
    })

    c.on('receipt', function(data) {
      console.log('RECEIPT:', data);
    })

    return container;
  }

  self.show_page = function(vm, event) {
    try {
      self.page($(event.currentTarget).data('page'));
    } catch (e) {
      self.page(vm);
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