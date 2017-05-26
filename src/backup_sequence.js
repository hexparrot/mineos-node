var LogEvent = require('./log_event').LogEvent;

var BackupSequence = function(server, log_path, do_backup, sequence_complete_cb) {
  var self = this;
  var save_off_regex = /INFO]: Turned off world auto-saving/
  var save_already_off_regex = /INFO]: Saving is already turned off/;
  var save_all_regex = /INFO]: Saved the world/;
  var save_on_regex = /INFO]: ((Turned on world auto-saving)|(Saving is already turned on))/;
  var restore_autosave = true;
  var result_code = null;

  var logevent = new LogEvent(log_path);

  self.start = function() {
    logevent.watch();
    send_save_off_cmd();
  };

  var send_save_off_cmd = function() {
    logevent.set_state('save_off');
    server.stuff('save-off', null);
  };

  var send_save_all_cmd = function() {
    logevent.set_state('save_all');
    server.stuff('save-all', null);
  };

  var send_save_on_cmd = function() {
    if (restore_autosave) {
      logevent.set_state('save_on');
      server.stuff('save-on', null);
    }
    else {
      save_on_complete();
    }
  };

  var save_off_complete = function(autosave) {
    restore_autosave = autosave;
    send_save_all_cmd();
  };

  var backup_complete = function(backup_result_code) {
    result_code = backup_result_code;
    send_save_on_cmd();
  };

  var save_on_complete = function() {
    logevent.unwatch();
    sequence_complete_cb(result_code);
  };

  logevent.append([
    { state: 'save_off',
      regex: save_off_regex,
      timeout: 1000,
      callback: save_off_complete,
      param: true },
    { state: 'save_off',
      regex: save_already_off_regex,
      timeout: 1000,
      callback: save_off_complete,
      param: false },
    { state: 'save_all',
      regex: save_all_regex,
      timeout: 20000, // give minecraft some time to save
      callback: do_backup,
      param: backup_complete }, // send_save_on_cmd },
    { state: 'save_on',
      regex: save_on_regex,
      timeout: 1000,
      callback: save_on_complete,
      param: null }
  ]);
};

exports.BackupSequence = BackupSequence;
