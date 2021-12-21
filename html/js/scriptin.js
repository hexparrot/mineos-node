var app = angular.module("mineos", ['angularMoment', 'pascalprecht.translate', 'ngSanitize']);

app.config(function ($translateProvider) {
  $translateProvider.useSanitizeValueStrategy('escape');
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

app.directive('stickyConsole', function () {
  return function (scope, element, attrs) {

    var elem = angular.element(element)[0];
    var follow = true;

    // Setup binds to element
    element.bind('scroll', function () {
      // Start following if scroll bar is within 2px of
      // the bottom
      if(elem.scrollHeight - elem.scrollTop > elem.offsetHeight) {
        follow = false;
      } else {
        follow = true;
      }
    });

    // This event gets fired off constantly to check for updates.  I am
    // using it to keep tabs on when the console should scroll down.
    scope.$watch(function(){
      if(follow) {
        elem.scrollTop = elem.scrollHeight;
      }
    });
  };
});

/* filters */

app.filter('membership', function() {
  return function(servers) {
    var keep = {};

    for (var s in servers)
      if (servers[s].sp)
        keep[s] = servers[s];

    return keep;
  }
})

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

app.filter('kb_string_to_mb', function() {
  return function(kbyte_str) {
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var kbytes = parseInt(kbyte_str) * k;

    if (kbytes) {
      var i = Math.floor(Math.log(kbytes) / Math.log(k));
      return (kbytes / Math.pow(k, i)).toPrecision(3) + sizes[i];
    } else {
      return '';
    }
  };
})

app.filter('seconds_to_time', function() {
  return function(seconds) {
    return moment.duration(seconds, "seconds").format('DD [days] HH [hours] mm [minutes]');
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

app.filter('remove_old_versions', function() {
  return function(profiles, remove_older_than) {
    var keep = [];
    var min_ver = remove_older_than.match(/(\d+)\.(\d+)\.(\d+)/);
    var major = parseInt(min_ver[1]);
    var minor = parseInt(min_ver[2]);
    var patch = parseInt(min_ver[3]);

    for (var index in profiles) {
      var ver = profiles[index].version.match(/(\d+)\.(\d+)\.?(\d+)?/);

      if (parseInt(ver[1]) > major)
        keep.push(profiles[index]);
      else if (parseInt(ver[1]) == major)
        if (parseInt(ver[2]) > minor)
          keep.push(profiles[index]);
        else if (parseInt(ver[2]) == minor)
          if (parseInt(ver[3]) || 0 >= patch)
            keep.push(profiles[index]);
    }

    return keep;
  }
})

app.filter('colorize', [ '$sce', function($sce){

  const ANSI_MIN_COLOR    = 30,
        ANSI_MAX_COLOR    = 37,
        ANSI_COLOR_OFFSET = 30,
        ANSI_INTENSE_CODE = 1,
        ANSI_NORMAL_CODE  = 22;

  var Colors = [ 
    'black',        // 30
    'dark_red',     // 31
    'dark_green',   // 32
    'gold',         // 33
    'dark_blue',    // 34
    'dark_purple',  // 35
    'dark_aqua',    // 36
    'gray'          // 37
  ];

  var IntenseColors = [
    'dark_gray',    // 30 with 1
    'red',          // 31 with 1
    'green',        // 32 with 1
    'yellow',       // 33 with 1
    'blue',         // 34 with 1
    'light_purple', // 35 with 1
    'aqua',         // 36 with 1
    'white',        // 37 with 1
  ];


  function escapeChars(str){
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  return function(str) {
    /* Regex Explanation from regex101.com
      + /\[0;((?:\d+;?)+)m|\[m/g
        + 1st Alternative: \[0;((?:\d+;?)+)m
          + \[ matches the character [ literally
          + 0; matches the characters 0; literally
          + 1st Capturing group ((?:\d+;?)+)
            + (?:\d+;?)+ Non-capturing group
                + Quantifier: + Between one and unlimited times, as many times as possible, giving back as needed [greedy]
              + \d+ match a digit [0-9]
                + Quantifier: + Between one and unlimited times, as many times as possible, giving back as needed [greedy]
              + ;? matches the character ; literally
                + Quantifier: ? Between zero and one time, as many times as possible, giving back as needed [greedy]
            + m matches the character m literally (case sensitive)
        + 2nd Alternative: \[m
          + \[ matches the character [ literally
          + m matches the character m literally (case sensitive)
      + g modifier: global. All matches (don't return on first match)

        Note: "(" and ")" are needed for split otherwise matched content is ignored.
    */
    str = str.split('\033').join('');
    var splitString = str.split(/\[0;((?:\d+;?)+)m|\[m/g);

    var spanOpen = false;
    for ( i in splitString ) {

      // Every over cell should be format codes
      if ( i % 2 == 1 ) {

        // Check for closing span at end of array (there WILL be an undefined element)
        if (splitString[i] == undefined)
          splitString[i] = spanOpen ? '</span>' : '';
        else {
          // Setup new formatting span.  formatCodes
          // are split first so we can reuse the array cell
          // as a work area.
          var formatCodes = splitString[i].split(';');
          splitString[i] = spanOpen ? '</span>' : '';
          splitString[i] += '<span class="';

          // Parse the ANSI format codes and extract useable
          // information into variables.
          var intense;
          var colorCode;
          for (j in formatCodes) {
            formatCode = parseInt(formatCodes[j]);

            if (formatCode == ANSI_INTENSE_CODE)
              intense = true;
            else if (formatCode == ANSI_NORMAL_CODE) 
              intense = false;
            else if (formatCode >= ANSI_MIN_COLOR && formatCode <= ANSI_MAX_COLOR)
              colorCode = formatCode;
            else 
              console.log('Unsupported format code: ' + formatCode);
          }

          // Add color class to span
          if (intense)
            splitString[i] += IntenseColors[colorCode - ANSI_COLOR_OFFSET];
          else
            splitString[i] += Colors[colorCode - ANSI_COLOR_OFFSET];

          // Close span off
          splitString[i] += '">';
          spanOpen = true;
        }
      } else 
        splitString[i] = escapeChars(splitString[i]);
    }

    // needed so the color spans will be used as HTML and not as text
    return $sce.trustAsHtml(splitString.join(''));
  }
}]);

/* controllers */

app.controller("Webui", ['$scope', 'socket', 'Servers', '$filter', '$translate', function($scope, socket, Servers, $filter, $translate) {
  $scope.page = 'dashboard';
  $scope.servers = Servers;
  $scope.current = null;
  $scope.build_jar_log = [];
  $scope.user_input = { input: { text: '' } }; //convoluted structure required; see http://jsfiddle.net/sirhc/z9cGm/#run

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

  $scope.$watch(function(scope) { return scope.preferred_locale },
    function(new_value, previous_value) {
      $scope.change_locale(new_value);
    }
  );

  $scope.$watch(function(scope) { return scope.current },
    function() {
      $scope.refresh_checkboxes();

      if (!($scope.current in Servers))
        $scope.change_page('dashboard');
    }
  );

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
    //variable for populating players online circular gauge
    var capacity = 0;
    $.each(Servers, function(server_name, instance) {
      if ('sp' in instance)
        try {
          capacity += parseInt(instance.sp['max-players']);
        } catch (e) {}
    })
    return capacity;
  }

  $scope.unique_profile_groups = function() {
    var groups = [];
    if($scope.profiles)
      $.each($scope.profiles, function(idx, data) {
        if (groups.indexOf(data.group) < 0)
          groups.push(data.group)
      })
    return groups;
  }

  $scope.extra_action = function(action) {
    var profile = 'default';

    try {
      profile = $scope.servers[$scope.current]['sc']['minecraft']['profile'].toLowerCase();
    } catch (e) {
      return false; //catches missing 'profile' val in sc or no current server selected
    }

    var EXTRA_ACTIONS = {
      'bungeecord': ['end'],
      'nukkit': ['stop', 'stop_and_backup', 'restart', 'save-all', 'save-on', 'save-off', 'reload'],
      'paperspigot': ['stop', 'stop_and_backup', 'restart', 'save-all', 'save-on', 'save-off'],
      'cuberite': ['stop', 'stop_and_backup', 'restart', 'save-all', 'reload'],
      'default': ['stop', 'stop_and_backup', 'restart', 'save-all', 'save-on', 'save-off']
    }

    var show = false;
    if (profile.startsWith('bungee'))
      show = EXTRA_ACTIONS['bungeecord'].indexOf(action) >= 0;
    else if (profile.startsWith('cuberite'))
      show = EXTRA_ACTIONS['cuberite'].indexOf(action) >= 0;
    else if (profile.startsWith('nukkit'))
      show = EXTRA_ACTIONS['nukkit'].indexOf(action) >= 0;
    else if (profile.startsWith('paperspigot'))
      show = EXTRA_ACTIONS['paperspigot'].indexOf(action) >= 0;
    else
      show = EXTRA_ACTIONS['default'].indexOf(action) >= 0;

    return !show;
  }

  /* socket handlers */

  socket.on('/', 'whoami', function(username) {
    $scope.username = username;
  })

  socket.on('/', 'commit_msg', function(commit_msg) {
    console.log(commit_msg)
    $scope.commit_msg = commit_msg;
    $scope.git_commit = commit_msg.split(' ')[0];
  })

  socket.on('/', 'host_heartbeat', function(data) {
    $scope.host_heartbeat = data;
    $scope.update_loadavg(data.loadavg);
  })

  socket.on('/', 'profile_list', function(profile_data) {
    $scope.profiles = profile_data;

    for (var p in profile_data)
      if (profile_data[p].id == 'BuildTools-latest')
        $scope.buildtools_jar = profile_data[p];
      else if (profile_data[p].id == 'PaperTools-latest')
        $scope.papertools_jar = profile_data[p];
  })

  socket.on('/', 'user_list', function(user_data) {
    $scope.users = user_data;
  })

  socket.on('/', 'group_list', function(group_data) {
    $scope.groups = group_data;
  })

  socket.on('/', 'archive_list', function(archive_data) {
    $scope.archive_list = archive_data;
  })

  socket.on('/', 'spigot_list', function(spigot_list) {
    $scope.spigot_list = spigot_list;
  })

  socket.on('/', 'locale_list', function(locale_list) {
    $scope.locale_list = locale_list;
  })

  socket.on('/', 'build_jar_output', function(data) {
    //removed to allow access to all produced log entries
    //while ($scope.build_jar_log.length > 40)
    //  $scope.build_jar_log.splice(0,1);
    $scope.build_jar_log.push(data);
  })

  socket.on('/', 'host_notice', function(data) {
    var suppress = false;
    if ('suppress_popup' in data || data.success)
      suppress = true;

    $.gritter.add({
      title: "{0} {1}".format(data.command,
                              (data.success ? $filter('translate')('SUCCEEDED') : $filter('translate')('FAILED')) ),
      text: data.help_text
    });
  })

  socket.on('/', 'change_locale', function(locale) {
    $translate.use(locale);
  })

  socket.on('/', 'optional_columns', function(user_data) {
    var columns = [];
    if (user_data.length > 0)
      columns = user_data.split(',');
    $scope.columns = columns;
  })

  socket.on('/', 'file_progress', function(data) {
    for (var p in $scope.profiles)
      if (data.group == $scope.profiles[p].group &&
          data.id == $scope.profiles[p].id &&
          data.type == $scope.profiles[p].type)
        $scope.profiles[p].progress = data.progress;
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

  $scope.valid_server_name = function(server_name) {
    return /^(?!\.)[a-zA-Z0-9_\.]+$/.test(server_name);
  }
  
  $scope.change_locale = function(locale) {
    $translate.use(locale);
  }

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
    if (args['command'] != 'stuff')
      args['msg'] = '';
    socket.emit($scope.current, 'cron', args);
  }

  $scope.player_command = function(cmd, player, args) {
    var full_cmd = '{0} {1} {2}'.format(cmd, player, args || '');
    socket.emit($scope.current, 'command', {command: 'stuff', msg: full_cmd });
  }

  $scope.console_input = function() {
    socket.emit($scope.current, 'command', {command: 'stuff', msg: $scope.user_input['input'].text });
    $scope.user_input['input'].text = '';
  }

  $scope.change_sc = function(section, property, new_value) {
    if (!new_value)
      new_value = '';
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
    var regex_valid_server_name = /^(?!\.)[a-zA-Z0-9_\.]+$/;

    var serverform = $scope.serverform;
    var server_name = serverform['server_name'];
    var hyphenated = {};

    if (!regex_valid_server_name.test(server_name)) {
      $.gritter.add({
        title: "Invalid server name",
        text: "Alphanumerics and underscores only (no spaces)."
      })
    } else {
      // if server name is valid, continue here
      if ($scope.unconventional) {
        socket.emit('/', 'command', {
          'command': 'create_unconventional_server',
          'server_name': server_name,
          'properties': hyphenated
        });
      } else {
        delete serverform['server_name'];

        for (var prop in serverform) 
          if (serverform.hasOwnProperty(prop)) 
            hyphenated[prop.split("_").join("-")] = serverform[prop]; //replace _ with -

        socket.emit('/', 'command', {
          'command': 'create',
          'server_name': server_name,
          'properties': hyphenated
        });
      }
      $scope.change_page('dashboard', server_name);
    }
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
    },
    open_add_sp: function() {
      $('#modal_sp').modal('show');
    },
    close_add_sp: function() {
      $('#modal_sp').modal('hide');
      socket.emit($scope.current, 'command', {
        'command': 'modify_sp',
        'property': $scope.sp.new_attribute,
        'new_value': $scope.sp.new_value
      });
    },
    open_locales: function() {
      $('#modal_locales').modal('show');
    },
    open_copy_to_server: function(jarversion, type) {
      $('#modal_spigotjar').modal('show');
      $scope.jarcopy_version = jarversion;
      $scope.jarcopy_type = type;
    },
    close_copy_to_server: function(jarversion) {
      $('#modal_spigotjar').modal('hide');
      socket.emit('/', 'command', {
        'command': 'copy_to_server',
        'server_name': $scope.server_target,
        'version': $scope.jarcopy_version,
        'type': $scope.jarcopy_type
      });
    },
    open_modal_niceness: function() {
      $('#modal_niceness').modal('show');
    },
    close_modal_niceness: function() {
      $('#modal_niceness').modal('hide');
    }
  }

  $scope.server_from_archive = function(archive_filename, awd_dir) {
    $scope.archive_filename = archive_filename;
    $scope.awd_dir = awd_dir;
    $('#modal_server_from_archive').modal('show');
  }

  $scope.server_from_archive_create = function() {
    var regex_valid_server_name = /^(?!\.)[a-zA-Z0-9_\.]+$/;
    var obj = {
      'command': 'create_from_archive',
      'new_server_name': $scope.new_server_name,
      'filename': $scope.archive_filename
    }

    if ($scope.awd_dir && $scope.current)
      obj['awd_dir'] = $scope.current;
    else
      obj['awd_dir'] = null;

    if (!regex_valid_server_name.test($scope.new_server_name)) {
      $.gritter.add({
        title: "Invalid server name",
        text: "Alphanumerics and underscores only (no spaces)."
      })
    } else {
      socket.emit('/', 'command', obj);
      $('#modal_server_from_archive').modal('hide');
      $scope.change_page('dashboard', $scope.new_server_name);
    }
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

    function get_max_y(arr) {
      var max_y = 1;
      for (var i=0; i<arr.length; i++)
        if (arr[i][1] > max_y)
          max_y = arr[i][1];
      return max_y;
    }

    var dataset = [
      { label: "fifteen", data: get_enumerated_values(2), color: "#0077FF" },
      { label: "five", data: get_enumerated_values(1), color: "#ED7B00" },
      { label: "one", data: get_enumerated_values(0), color: "#E8E800" }
    ];

    $scope.loadavg_options.yaxis.max = Math.max.apply(Math, [
      get_max_y(dataset[0].data),
      get_max_y(dataset[1].data),
      get_max_y(dataset[2].data)
    ]);

    $.plot($scope.loadavg_options.element, dataset, $scope.loadavg_options).draw();
  }

  $scope.refresh_calendar = function() {
    var events = [];
    for (var server_name in Servers) {
      try { //archives
        Servers[server_name].page_data.archives.forEach(function(value, idx) {
          events.push({
            title: '{0} archive'.format(server_name),
            start: value.time,
            allDay : false
          })
        })
      } catch (e) {}

      try { //backups
        Servers[server_name].page_data.increments.forEach(function(value, idx) {
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

  $scope.refresh_checkboxes = function() {
    try {
      var sc = $scope.servers[$scope.current].sc;
      $scope.broadcast_to_lan = (sc.minecraft || {}).broadcast;
      $scope.onrebootstart = (sc.onreboot || {}).start;
      $scope.unconventional_server = (sc.minecraft || {}).unconventional;
    } catch (e) {
      $scope.broadcast_to_lan = false;
      $scope.onrebootstart = false;
      $scope.unconventional_server = false;
    }
      
    $('#broadcast').prop('checked', $scope.broadcast_to_lan );
    $('#onrebootstart').prop('checked', $scope.onrebootstart );
    $('#unconventional').prop('checked', $scope.unconventional_server );

    $scope.delete_archive = false;
    $scope.delete_backup = false;
    $scope.delete_servers = false;
  }

  $scope.change_page = function(page, server_name) {
    if (server_name) {
      $scope.current = server_name;
      $scope.servers[$scope.current].refresh_all_data();
    }

    switch(page) {
      case 'calendar':
        $scope.refresh_calendar();
        break;
      // case 'restore_points':
      //   $scope.servers[$scope.current].refresh_increments();
      //   break;
      // case 'archives':
      //   $scope.servers[$scope.current].refresh_archives();
      //   break;
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
    me.niceness = 0;
    me.AUTO_RATE_THRESHOLD_PER_SECOND = 80;
    me.AUTO_RATE_SUSTAINED_DURATION = 2; //how long (in seconds) must rate be sustained to trigger
    me.auto_rate_counter = 0;
    me.auto_rate_interval = setInterval(function() {
      if (me.auto_rate_counter * me.AUTO_RATE_SUSTAINED_DURATION > me.AUTO_RATE_THRESHOLD_PER_SECOND * me.AUTO_RATE_SUSTAINED_DURATION)
        me.auto_rate_interval = null;
      else
        me.auto_rate_counter = 0;
    }, 1000 * me.AUTO_RATE_SUSTAINED_DURATION);

    me.channel.on(server_name, 'heartbeat', function(data) {
      var previous_state = me.heartbeat;
      me.heartbeat = data.payload;

      if ((previous_state || {}).up == true && me.heartbeat.up == false) {
        me.channel.emit(server_name, 'page_data', 'glance');
        $.gritter.add({
          title: "[{0}] {1}".format(me.server_name, $filter('translate')('DOWN') ),
          text: ''
        });
      }
    })

    me.channel.on(server_name, 'page_data', function(data) {
      me.page_data[data.page] = data.payload;
    })

    me.channel.on(server_name, 'tail_data', function(data) {
      try {
        if (me.auto_rate_interval) {
          me.live_logs[data.filepath].push(data.payload);
          me.auto_rate_counter += 1;
        }
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
    })

    me.channel.on(server_name, 'config.yml', function(data) {
      me['cy'] = data;
    })

    me.channel.on(server_name, 'cron.config', function(data) {
      me['cc'] = data;
    })

    me.channel.on(server_name, 'server_fin', function(data) {
      me.notices[data.uuid] = data;
      me.latest_notice[data.command] = data;
      me.channel.emit(server_name, 'page_data', 'glance');

      if(data.command == 'archive')
        me.refresh_archives();

      if(data.command == 'backup')
        me.refresh_increments();

      var suppress = false;
      if ('suppress_popup' in data || data.success)
        suppress = true;

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
      me.page_data.glance.eula = accepted;
      if (accepted == false)
        $('#modal_eula').modal('show');
    })

    //request all data for this server
    me.refresh_all_data = function() {
      me.refresh_glance();
      me.refresh_increments();
      me.refresh_archives();
      me.get_dashboard_data();
      me.refresh_cron_data();
      me.channel.emit(me.server_name, 'get_available_tails');
      me.channel.emit(me.server_name, 'req_server_activity');
      me.channel.emit(me.server_name, 'config.yml');
    }
    
    //request new server at a glance info
    me.refresh_glance = function() {
      me.channel.emit(me.server_name, 'page_data', 'glance');
    }

    //request new incrments data for this server
    me.refresh_increments = function() {
      me.channel.emit(me.server_name, 'page_data', 'increments');
    }

    //request new archives data for this server
    me.refresh_archives = function() {
      me.channel.emit(me.server_name, 'page_data', 'archives');
    }

    // request new cron data for this server
    me.refresh_cron_data = function() {
      me.channel.emit(me.server_name, 'cron.config');
    }
    
    //request all data necessary to populate the dashboard
    me.get_dashboard_data = function() {
      me.channel.emit(me.server_name, 'server-icon.png');
      me.channel.emit(me.server_name, 'server.config');
      me.channel.emit(me.server_name, 'server.properties');
    }

    //request minimum data for use by dashboard before returning constructed server
    me.get_dashboard_data()
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

  var port = window.location.port || null;
  if (port === null) {
    //this path should pretty much never occur
    //but permits users to not have to use default port assignment
    //i.e., any user-specified port will be honored.
    if (window.location.protocol == "https:")
      var port = '443';
    else
      var port = '80';
  }

  var connect_string = ':{0}/'.format(port);

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
