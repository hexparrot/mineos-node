var app = angular.module("mineos", ['angularMoment', 'pascalprecht.translate']);

app.run(['$rootScope', '$translate', function($rootScope, $translate) {
  $rootScope.change_locale = function (locale) {
    $translate.use(locale);
  }
}]);

app.config(function ($translateProvider) {
  $translateProvider.useStaticFilesLoader({
    prefix: 'locales/locale-',
    suffix: '.json'
  });
  $translateProvider.preferredLanguage('en_US');
});

/* directives */

app.directive('ngEnter', function () {
  //http://eric.sau.pe/angularjs-detect-enter-key-ngenter/
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if(event.which === 13) {
        scope.$apply(function (){
          scope.$eval(attrs.ngEnter);
        });

        event.preventDefault();
      }
    });
  };
});

app.directive('icheck', function($timeout, $parse) {
  //http://stackoverflow.com/q/19346523/1191579
  return {
    link: function($scope, element, $attrs) {
      return $timeout(function() {
        var ngModelGetter, value;
        ngModelGetter = $parse($attrs['ngModel']);
        value = $parse($attrs['ngValue'])($scope);
        return $(element).iCheck({
          checkboxClass: 'icheckbox_minimal',
          radioClass: 'iradio_minimal-grey',
          checkboxClass: 'icheckbox_minimal-grey',
          increaseArea: '20%'
        }).on('ifChanged', function(event) {
          if ($(element).attr('type') === 'checkbox' && $attrs['ngModel']) {
            $scope.$apply(function() {
                return ngModelGetter.assign($scope, event.target.checked);
            });
          }
          if ($(element).attr('type') === 'radio' && $attrs['ngModel']) {
            return $scope.$apply(function() {
                return ngModelGetter.assign($scope, value);
            });
          }
        });
      });
    }
  };
});  

/* filters */

app.filter('bytes_to_mb', function() {
  return function(bytes) {
    if (bytes == 0)
      return '0B';
    else if (bytes < 1024)
      return bytes + 'B';

    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));

    return (bytes / Math.pow(k, i)).toPrecision(3) + sizes[i];
  };
})

app.filter('seconds_to_time', function() {
  return function(seconds) {
    return moment.duration(seconds, "seconds").format();
  }
})

app.filter('time_from_now', function() {
  return function(seconds) {
    return moment(seconds).fromNow();
  }
})

app.filter('profile_filter', function() {
  return function(profiles, criteria) {
    var keep = [];

    if (criteria.value == 'all')
      return profiles;
    else {
      for (var index in profiles)
        if (criteria.value == profiles[index][criteria.field])
          keep.push(profiles[index]);

      return keep;
    }
  }
})

app.filter('profile_downloaded', function() {
  return function(profiles, criteria) {
    var keep = [];

    if (criteria == 'all')
      return profiles;
    else {
      for (var index in profiles)
        if (criteria == 'only_downloaded' && profiles[index].downloaded)
          keep.push(profiles[index]);

      return keep;
    }
  }
})

/* controllers */

app.controller("Webui", ['$scope', 'socket', 'Servers', '$filter', function($scope, socket, Servers, $filter) {
  $scope.page = 'dashboard';
  $scope.servers = Servers;
  $scope.current = null;

  $scope.serverprofiles = {
    group: 'mojang',
    type: 'release',
    downloaded: 'all'
  }

  /* watches */
  $scope.$watch(function(scope) { return scope.page },
    function(new_value, previous_value) {
      socket.emit(new_value, 'page_data', new_value);
    }
  );

  $scope.$watch(function(scope) { return scope.broadcast_to_lan },
    function(new_value, previous_value) {
      $scope.change_sc('minecraft', 'broadcast', new_value);
    }
  )

  /* computed variables */

  $scope.servers_up = function() {
    return $.map(Servers, function(instance, server_name) {
      return instance;
    }).filter(function(instance) {
      return ('heartbeat' in instance ? instance.heartbeat.up : false);
    }).length;
  }

  $scope.players_online = function() {
    var online = 0;
    $.each(Servers, function(server_name, instance) {
      try {
        if (instance.heartbeat.ping.players_online)
          online += (instance.heartbeat.ping.players_online)
      } catch (e) {}
    })
    return online;
  }

  $scope.player_capacity = function() {
    var capacity = 0;
    $.each(Servers, function(server_name, instance) {
      if ('sp' in instance)
        capacity += instance.sp['max-players'];
    })
    return capacity;
  }

  /* socket handlers */

  socket.on('/', 'whoami', function(username) {
    $scope.username = username;
  })

  socket.on('/', 'host_heartbeat', function(data) {
    $scope.host_heartbeat = data;
    $scope.update_loadavg(data.loadavg);
  })

  socket.on('/', 'untrack_server', function(server_name) {
    if (server_name == $scope.current)
      $scope.change_page('dashboard');
  })

  socket.on('/', 'profile_list', function(profile_data) {
    $scope.profiles = profile_data;
  })

  socket.on('/', 'user_list', function(user_data) {
    $scope.users = user_data;
  })

  socket.on('/', 'group_list', function(group_data) {
    $scope.groups = group_data;
  })

  socket.on('/', 'file_download', function(data) {
    $.gritter.add({
      title: "{0} {1}".format(data.command,
                              (data.success ? $filter('translate')('SUCCEEDED') : $filter('translate')('FAILED')) ),
      text: data.help_text
    });
  })

  $scope.loadavg = [];
  $scope.loadavg_options = {
      element: $("#load_averages"),
      fallback_xaxis_max: 1,
      series: { 
        lines: {
          show: true,
          fill: .5
        },
        shadowSize: 0 
      },
      yaxis: { min: 0, max: 1 },
      xaxis: { min: 0, max: 30, show: false },
      grid: { borderWidth: 0 }
    };

  /* other functions */

  $scope.server_command = function(cmd, args) {
    if (args) {
      args.command = cmd;
      socket.emit($scope.current, 'command', args);
    } else
      socket.emit($scope.current, 'command', {command: cmd});
  }

  $scope.host_command = function(cmd, args) {
    if (args) {
      args.command = cmd;
      socket.emit('/', 'command', args);
    } else
      socket.emit('/', 'command', {command: cmd});
  }

  $scope.cron_command = function(cmd, args) {
    args['operation'] = cmd;
    socket.emit($scope.current, 'cron', args);
  }

  $scope.console_input = function() {
    socket.emit($scope.current, 'command', {command: 'stuff', msg: $scope.user_input });
    $scope.user_input = '';
  }

  $scope.change_sc = function(section, property, new_value) {
    socket.emit($scope.current, 'command', { command: 'modify_sc',
                                             section: section, 
                                             property: property,
                                             new_value: new_value });
  }

  $scope.change_sp = function() {
    socket.emit($scope.current, 'command', { command: 'modify_sp', 
                                             property: this.property,
                                             new_value: this.new_value });
  }

  $scope.change_owner = function() {
    socket.emit($scope.current, 'command', { command: 'chown', 
                                             uid: parseInt($scope.servers[$scope.current].page_data.glance.owner.uid),
                                             gid: parseInt($scope.servers[$scope.current].page_data.glance.owner.gid)});
  }

  $scope.create_server = function() {
    var serverform = $scope.serverform;
    var server_name = serverform['server_name'];
    var hyphenated = {};

    delete serverform['server_name'];

    for (var prop in serverform) 
      if (serverform.hasOwnProperty(prop)) 
        hyphenated[prop.split("_").join("-")] = serverform[prop]; //replace _ with -

    socket.emit('/', 'command', {
      'command': 'create',
      'server_name': server_name,
      'properties': hyphenated
    });

    $scope.change_page('dashboard', server_name);
  }

  $scope.modals = {
    open_new_server: function() {
      $('#modal_new_server').modal('show');
    },
    close_new_server_start: function() {
      $('#modal_new_server').modal('hide');
      socket.emit($scope.current, 'command', { 'command': 'start' });
    },
    open_accept_eula: function() {
      $('#modal_eula').modal('show');
    },
    close_accept_eula_start: function() {
      $('#modal_eula').modal('hide');
      socket.emit($scope.current, 'command', { 'command': 'start' });
    },
    close_accept_eula_restart: function() {
      $('#modal_eula').modal('hide');
      socket.emit($scope.current, 'command', { 'command': 'restart' });
    }
  }

  $scope.server_from_archive = function(archive_filename) {
    $scope.archive_filename = archive_filename;
    $('#modal_server_from_archive').modal('show');
  }

  $scope.server_from_archive_create = function(new_server_name) {
    socket.emit($scope.current, 'command', {
      'command': 'server_from_archive',
      'new_server_name': new_server_name,
      'filename': $scope.archive_filename
    });
  }

  $scope.update_loadavg = function(new_datapoint) {
    $scope.loadavg.push(new_datapoint);

    while ($scope.loadavg.length > $scope.loadavg_options.xaxis.max)
      $scope.loadavg.splice(0,1);

    function get_enumerated_values(column) {
      var res = [];
      for (var i = 0; i < $scope.loadavg.length; ++i)
        res.push([i, $scope.loadavg[i][column]])
      return res;
    }

    var dataset = [
      { label: "fifteen", data: get_enumerated_values(2), color: "#0077FF" },
      { label: "five", data: get_enumerated_values(1), color: "#ED7B00" },
      { label: "one", data: get_enumerated_values(0), color: "#E8E800" }
    ];

    $scope.loadavg_options.yaxis.max = Math.max(
      Math.max.apply(Math,dataset[0].data),
      Math.max.apply(Math,dataset[1].data),
      Math.max.apply(Math,dataset[2].data)) || $scope.loadavg_options.fallback_xaxis_max;

    $.plot($scope.loadavg_options.element, dataset, $scope.loadavg_options).draw();
  }

  $scope.refresh_calendar = function() {
    var events = [];
    for (var server_name in Servers) {
      try { //archives
        Servers[server_name].page_data.glance.archives.forEach(function(value, idx) {
          events.push({
            title: '{0} archive'.format(server_name),
            start: value.time,
            allDay : false
          })
        })
      } catch (e) {}

      try { //backups
        Servers[server_name].page_data.glance.increments.forEach(function(value, idx) {
          events.push({
            title: '{0} backup'.format(server_name),
            start: value.time,
            allDay : false
          })
        })
      } catch (e) {}
    }
    $('#calendar').fullCalendar('destroy').fullCalendar({events: events });
  }

  $scope.change_page = function(page, server_name) {
    if (server_name)
      $scope.current = server_name;

    switch(page) {
      case 'calendar':
        $scope.refresh_calendar();
        break;
      default:
        break;
    }

    $scope.page = page;
  }
}]);

app.controller("Toolbar", ['$scope', 'Servers', function($scope, Servers) {
  $scope.servers = Servers;

  $scope.all_notices = function() {
    var all = [];
    for (var server_name in Servers) {
      for (var uuid in Servers[server_name].notices) {
        var new_obj = Servers[server_name].notices[uuid];
        new_obj.server_name = server_name;
        all.push(new_obj);
      }
    }
    return all;
  }
}])

/* factories */

app.factory("Servers", ['socket', '$filter', function(socket, $filter) {
  var self = this;

  var server_model = function(server_name) {
    var me = this;
    me.server_name = server_name;
    me.channel = socket;
    me.page_data = {};
    me.live_logs = {};
    me.notices = {};
    me.latest_notice = {};

    me.channel.on(server_name, 'heartbeat', function(data) {
      me.heartbeat = data.payload;
    })

    me.channel.on(server_name, 'page_data', function(data) {
      me.page_data[data.page] = data.payload;
    })

    me.channel.on(server_name, 'tail_data', function(data) {
      try {
        me.live_logs[data.filepath].push(data.payload);
      } catch (e) {
        me.live_logs[data.filepath] = [data.payload];
      }
    })

    me.channel.on(server_name, 'notices', function(data) {
      data.forEach(function(notice, index) {
        me.notices[notice.uuid] = notice;
      })
    })

    me.channel.on(server_name, 'file head', function(data) {
      me.live_logs[data.filename] = data.payload.split('\n');
    })

    me.channel.on(server_name, 'server_ack', function(data) {
      me.notices[data.uuid] = data;
    })

    me.channel.on(server_name, 'server-icon.png', function(data) {
      me['icon'] = data;
    })

    me.channel.on(server_name, 'server.properties', function(data) {
      me['sp'] = data;
    })

    me.channel.on(server_name, 'server.config', function(data) {
      me['sc'] = data;
      if ((data.minecraft || {}).broadcast)
        $('#broadcast').iCheck('check');
      else
        $('#broadcast').iCheck('uncheck');
    })

    me.channel.on(server_name, 'cron.config', function(data) {
      me['cc'] = data;
    })

    me.channel.on(server_name, 'server_fin', function(data) {
      me.notices[data.uuid] = data;
      me.latest_notice[data.command] = data;
      me.channel.emit(server_name, 'page_data', 'glance');

      var suppress = ('suppress_popup' in data ? data.suppress_popup : false);

      if (data.err == 'eula') 
        $('#modal_eula').modal('show');

      if (!suppress) {
        var help_text = '';
        try {
          help_text = $filter('translate')(data.err);
        } catch (e) {}

        $.gritter.add({
          title: "[{0}] {1} {2}".format(me.server_name, data.command,
                                        (data.success ? $filter('translate')('SUCCEEDED') : $filter('translate')('FAILED')) ),
          text: help_text || ''
        });
      }
    })

    me.channel.on(server_name, 'eula', function(accepted) {
      if (!accepted)
        $('#modal_eula').modal('show');
    })

    me.channel.emit(server_name, 'server.properties');
    me.channel.emit(server_name, 'server.config');
    me.channel.emit(server_name, 'cron.config');
    me.channel.emit(server_name, 'server-icon.png');
    me.channel.emit(server_name, 'page_data', 'glance');
    me.channel.emit(server_name, 'get_file_contents', 'logs/latest.log');
    me.channel.emit(server_name, 'req_server_activity');

    return me;
  }

  socket.on('/', 'track_server', function(server_name) {
    self[server_name] = new server_model(server_name);
  })

  socket.on('/', 'untrack_server', function(server_name) {
    delete self[server_name];
  })

  return self;
}])

app.factory('socket', function ($rootScope) {
  //http://briantford.com/blog/angular-socket-io
  var sockets = {};
  if (window.location.protocol == "https:")
    var connect_string = ':8443/';
  else
    var connect_string = ':8080/';

  return {
    on: function (server_name, eventName, callback) {
      if (!(server_name in sockets)) {
        if (server_name == '/')
          sockets[server_name] = io(connect_string, {secure: true});
        else
          sockets[server_name] = io(connect_string + server_name, {secure: true});
      }

      sockets[server_name].on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(sockets[server_name], args);
        });
      });
    },
    emit: function (server_name, eventName, data, callback) {
      if (!(server_name in sockets)) {
        if (server_name == '/')
          sockets[server_name] = io(connect_string, {secure: true});
        else
          sockets[server_name] = io(connect_string + server_name, {secure: true});
      }

      sockets[server_name].emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(sockets[server_name], args);
          }
        });
      })
    }
  };
})

/* prototypes */

String.prototype.format = String.prototype.f = function() {
  var s = this,
      i = arguments.length;

  while (i--) { s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);}
  return s;
};