function webui() {
  var self = this;

  self.global = io('/');
  self.servers = ko.observableArray([]);

  self.page = ko.observable();
  self.page.extend({ notify: 'always' });

  self.global.on('server_list', function(servers) {
    //self.servers = ko.observableArray([]);
    for (var s in servers)
      self.track_server(servers[s]);
  })

  self.global.on('track_server', function(server_name) {
    self.track_server(server_name);
  })

  self.track_server = function(server_name) {
    var c = io('/' + server_name);

    self.servers.push({
      server_name: server_name,
      channel: c
    })

    c.on('server.properties', function(data) {
      $('#sp').empty();
      $.each(data, function(k,v) {
        $('#sp').append($('<li>').text('{0}:{1}'.format(k,v)));
      })
    })

    c.on('tail_data', function(data) {
      $('#log_latest').append($('<li>').text(data))
    })

    c.on('result', function(data) {
      console.log('RESULT:', data);
    })

    c.on('receipt', function(data) {
      console.log('RECEIPT:', data);
    })

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