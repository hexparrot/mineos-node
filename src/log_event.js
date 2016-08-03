var Tail = require('tail').Tail;

var LogEvent = function(filepath) {
    var self = this;
    var tail = null;
    var events = [];
    var state_events = [];
    var state = null;
    var timeouts = [];

    self.append = function(append_events) {
        events = events.concat(append_events);
    };

    self.watch = function() {
        tail = new Tail(filepath);

        tail.on('line', function(data) {
            state_events.forEach(function (element) {
                if (data.match(element.regex)) {
                    element.callback(element.param);
                }
            });
        });
    };

    self.unwatch = function() {
        tail.unwatch();
        self.clear_state();
    }

    self.clear_state = function() {
        state_events = [];
        state = null;
        clear_timeouts();
    };

    self.set_state = function(new_state) {
        clear_timeouts();
        state = new_state;
        state_events = events.filter(function (element, index, array) {
            return (element.state === state);
        });
        state_events.forEach(function (element) {
            timeouts.push(setTimeout(handle_timeout, element.timeout, element));
        });
    };

    var handle_timeout = function(event) {
        console.log('log event state \'' + event.state + '\' timed out');
        self.clear_state();
        event.callback(event.param);
    };

    var clear_timeouts = function() {
        timeouts.forEach(function (element) {
            clearTimeout(element);
        });
        timeouts = [];
    };
};

exports.LogEvent = LogEvent;
