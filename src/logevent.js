var Tail = require('tail').Tail;

var LogEvent = function(filepath) {
    var self = this;
    self.filepath = filepath;
    self.tail = null;
    self.events = [];
    self.state_events = [];
    self.state = null;
    self.timeouts = [];

    self.append = function(append_events) {
        self.events = self.events.concat(append_events);
    };

    self.watch = function() {
        self.tail = new Tail(self.filepath);

        self.tail.on('line', function(data) {
            self.state_events.forEach(function (element) {
                if (data.match(element.regex)) {
                    element.callback(element.param);
                }
            });
        });
    };

    self.unwatch = function() {
        self.tail.unwatch();
        self.clear_state();
    }

    self.clear_state = function() {
        self.state_events = [];
        self.state = null;
        clear_timeouts();
    };

    self.set_state = function(state) {
        clear_timeouts();
        self.state = state;
        self.state_events = self.events.filter(function (element, index, array) {
            return (element.state === self.state);
        });
        self.state_events.forEach(function (element) {
            self.timeouts.push(setTimeout(handle_timeout, element.timeout, element));
        });
    };

    var handle_timeout = function(event) {
        console.log('log event state \'' + event.state + '\' timed out');
        self.clear_state();
        event.callback(event.param);
    };

    var clear_timeouts = function() {
        self.timeouts.forEach(function (element) {
            clearTimeout(element);
        });
        self.timeouts = [];
    };
};

exports.LogEvent = LogEvent;
