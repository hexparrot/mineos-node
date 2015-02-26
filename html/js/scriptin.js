function webui(port) {
  var self = this;

  self.connect_string = ':{0}/'.format(port);
  self.global = io(self.connect_string);
  self.servers = ko.observableArray([]);
  self.page = ko.observable();

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
      gamelog: ko.observableArray([])
    }

    c.emit('watch', 'logs/latest.log');

    c.on('server.properties', function(data) {
      $('#sp').empty();
      $.each(data, function(k,v) {
        $('#sp').append($('<li>').text('{0}:{1}'.format(k,v)));
      })
    })

    c.on('tail_data', function(data) {
      console.log(data);
      container.gamelog.push(data);
    })

    c.on('result', function(data) {
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

  self.show_page('dashboard');
}

String.prototype.format = String.prototype.f = function() {
  var s = this,
      i = arguments.length;

  while (i--) { s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);}
  return s;
};