/*----------------------------------------------------*/
/*  Avoid `console` errors
/*----------------------------------------------------*/
(function () {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

/*----------------------------------------------------*/
/*  Internet Explorer Placeholder
/*----------------------------------------------------*/
$(function () {
    if(jQuery().placeholder) {
        $('input, textarea').placeholder();
    }
});

/*----------------------------------------------------*/
/*  Bootstrap Tooltip
/*----------------------------------------------------*/
$(function () {
    if(jQuery().tooltip) {
        $('[rel="tooltip"]').tooltip();
    }
});

/*----------------------------------------------------*/
/*  Widget Scrollable Content
/*----------------------------------------------------*/
$(function () {
    if(jQuery().perfectScrollbar) {
        $('#demo1').perfectScrollbar();
        $('#demo2').perfectScrollbar();
        $('#demo3').perfectScrollbar();
        $('#demo4').perfectScrollbar();
        $('#demo5').perfectScrollbar();
    }
});

/*----------------------------------------------------*/
/*  Bootstrap Popover
/*----------------------------------------------------*/
$(function () {
    if(jQuery().popover) {
        $('[rel="popover"]').popover({
            trigger : 'hover'
        });
    }
});

/*----------------------------------------------------*/
/*  Snippet - Syntax Highlighter
/*  http://www.steamdev.com/snippet/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().snippet) {
        $("pre.php").snippet("php",{style:"bright"});
    }
});

/*----------------------------------------------------*/
/*  iCheck - Checkbox & Radio styling
/*  http://damirfoy.com/iCheck/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().iCheck) {
        $('input[type="checkbox"], input[type="radio"]').not('.nostyle').iCheck({
            checkboxClass: 'icheckbox_minimal-grey',
            radioClass: 'iradio_minimal-grey',
            increaseArea: '20%' // optional
        });
    }
});

/*----------------------------------------------------*/
/*  Filestyle - Custom File Input
/*  http://markusslima.github.io/bootstrap-filestyle
/*----------------------------------------------------*/
$(function () {
    if(jQuery().filestyle) {
        $(":file").filestyle({ 
            icon: true 
        });
    }
});

/*----------------------------------------------------*/
/*  Tags It
/*  http://aehlke.github.io/tag-it/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().tagit) {
        $('#tags').tagit();
    }
});

/*----------------------------------------------------*/
/*  Input Mask
/*  http://digitalbush.com/projects/masked-input-plugin/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().mask) {
        $('[input-mask="date"]').mask("99/99/9999");
        $('[input-mask="phone"]').mask("(999) 999-9999");
        $('[input-mask="tin"]').mask("99-9999999");
        $('[input-mask="ssn"]').mask("999-99-9999");
    }
});

/*----------------------------------------------------*/
/*  Form Wizard
/*  http://thecodemine.org/
/*----------------------------------------------------*/
$(function(){
    if(jQuery().formwizard) {
        $("#formwizard1").formwizard({ 
            disableUIStyles: true,
            focusFirstInput : true
        });
        $("#formwizard2").formwizard({ 
            disableUIStyles: true,
            validationEnabled: true
        });
    }
});

/*----------------------------------------------------*/
/*  Select2 - Advanced Select
/*  http://ivaynberg.github.io/select2/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().select2) {
        $("#select2_1").select2({
            placeholder: "Select a State"
        });
        $("#select2_2").select2({
            placeholder: "Select a State",
            allowClear: true
        });
        $("#select2_3").select2({
            minimumInputLength: 2
        });
        $("#select2_4").select2({
            tags: ["red", "green", "blue", "yellow", "purple", "brown"]
        });
    }
});

/*----------------------------------------------------*/
/*  Minicolor - Color Picker
/*  http://www.abeautifulsite.net/blog/2011/02/jquery-minicolors-a-color-selector-for-input-controls
/*----------------------------------------------------*/
$(function () {
    if(jQuery().minicolors) {
        $('#minicolor_1').minicolors({
            theme: 'default'
        });
        $('#minicolor_2').minicolors({
            theme: 'bootstrap'
        });
        $('#minicolor_3').minicolors({
            textfield: false
        });
        $('#minicolor_4').minicolors({
            control: 'wheel'
        });
    }
});

/*----------------------------------------------------*/
/*  Timepicker - Bootstrap Timepicker
/*  http://jdewit.github.io/bootstrap-timepicker/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().timepicker) {
        $('#timepicker_1').timepicker();
        $('#timepicker_2').timepicker({
            minuteStep: 1,
            template: 'modal',
            showSeconds: true,
            showMeridian: false
        });
    }
});

/*----------------------------------------------------*/
/*  WYSIWYG Editor - CLEditor
/*  http://premiumsoftware.net/cleditor/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().cleditor) {
        $(".cleditor").cleditor({width:"100%", height:"100%"});
    }
});

/*----------------------------------------------------*/
/*  Autosize Textarea
/*  http://www.jacklmoore.com/autosize/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().autosize) {
        $('textarea.autosize').autosize();
    }
});

/*----------------------------------------------------*/
/*  Form Validation - bassistance
/*  http://bassistance.de/jquery-plugins/jquery-plugin-validation/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().validate) {
        // Set Defaults
        jQuery.validator.setDefaults({
            errorElement: 'span',
            errorClass: 'help-block',
            highlight:function(element, errorClass, validClass) {
                $(element).parents('.control-group').addClass('error');
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).parents('.control-group').removeClass('error');
            }
        });
        $("#form_validate_inline").validate();
    }
});

/*----------------------------------------------------*/
/*  Form Validation - Validation Engine
/*  http://posabsolute.github.io/jQuery-Validation-Engine
/*----------------------------------------------------*/
$(function () {
    if(jQuery().validationEngine) {
        $("#form_validate_tooltip").validationEngine();
    }
});

/*----------------------------------------------------*/
/*  Bootstrap Daterange Picker
/*  https://github.com/dangrossman/bootstrap-daterangepicker
/*----------------------------------------------------*/
$(function(){
    if(jQuery().daterangepicker) {
        // Open Left
        $('.daterange.right').daterangepicker({
            opens: 'left'
        });

        // Open Right - default
        $('.daterange').daterangepicker();

        // Report range
        $('#reportrange').daterangepicker({
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
                'Last 7 Days': [moment(), moment().add({ days: -6 })],
                'Last 30 Days': [moment().add({ days: -29 }), moment()],
            }
        },
        function(start, end) {
            $('#reportrange #rangedate').html(start.format('MMMM d, YYYY') + ' - ' + end.format('MMMM d, YYYY'));
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Tabs
/*  http://jqueryui.com/tabs/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().tabs) {
        $("#tabs1").tabs();
        $("#tabs2").tabs();
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Accordion
/*  http://jqueryui.com/accordion/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().accordion) {
        $("#accordion_1, #accordion_2").accordion({
            heightStyle: "content"
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Datepicker
/*  http://jqueryui.com/datepicker/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().datepicker) {
        $("#datepicker1").datepicker();
        $("#datepicker2").datepicker({
            showButtonPanel: true
        });
        $("#datepicker3").datepicker({
            numberOfMonths: 3,
            showButtonPanel: true
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Timepicker
/*  http://trentrichardson.com/examples/timepicker/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().timepicker) {
        $("#timepicker1").timepicker();
        $("#timepicker2").timepicker({
            showSecond: true
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Slider
/*  http://jqueryui.com/slider/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().slider) {
        $("#slider1").slider({
            range: "min",
            value: 37,
            min: 1,
            max: 700,
            start: function( event, ui ) {
                $(this).find('.ui-slider-handle.ui-state-hover')
                .append('<span class="ui-slider-tooltip">'+ui.value+'</span>');
            },
            slide: function( event, ui ) {
                $(this).find('.ui-slider-tooltip').text(ui.value);
            },
            stop: function( event, ui ) {
                $(this).find('.ui-slider-tooltip').remove();
            }
        });
        $("#slider2").slider({
            range: true,
            min: 0,
            max: 500,
            values: [ 75, 300 ],
            start: function( event, ui ) {
                $(this).find('.ui-slider-handle.ui-state-hover')
                .append('<span class="ui-slider-tooltip">'+ui.value+'</span>');
            },
            slide: function( event, ui ) {
                $(this).find('.ui-slider-tooltip').text(ui.value);
            },
            stop: function( event, ui ) {
                $(this).find('.ui-slider-tooltip').remove();
            }
        });
        $("#slider3").slider({
            range: "max",
            min: 1,
            max: 10,
            value: 2,
            start: function( event, ui ) {
                $(this).find('.ui-slider-handle.ui-state-hover')
                .append('<span class="ui-slider-tooltip">'+ui.value+'</span>');
            },
            slide: function( event, ui ) {
                $(this).find('.ui-slider-tooltip').text(ui.value);
            },
            stop: function( event, ui ) {
                $(this).find('.ui-slider-tooltip').remove();
            }
        });
        $("#eq > span").each(function() {
            // read initial values from markup and remove that
            var value = parseInt( $(this).text(), 10);
            $( this ).empty().slider({
                value: value,
                range: "min",
                animate: true,
                orientation: "vertical"
            });
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Autocomplete
/*  http://jqueryui.com/autocomplete/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().autocomplete) {
        var availableTags = [
            "ActionScript",
            "AppleScript",
            "Asp",
            "BASIC",
            "C",
            "C++",
            "Clojure",
            "COBOL",
            "ColdFusion",
            "Erlang",
            "Fortran",
            "Groovy",
            "Haskell",
            "Java",
            "JavaScript",
            "Lisp",
            "Perl",
            "PHP",
            "Python",
            "Ruby",
            "Scala",
            "Scheme"
        ];
        $("#autocomplete").autocomplete({
            source: availableTags
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Dialog
/*  http://jqueryui.com/dialog/
/*----------------------------------------------------*/
$(function() {
    if(jQuery().dialog) {
        $("#dialog1").dialog({
            autoOpen: false
        });
        $("#dialog2").dialog({
            autoOpen: false,
            modal: true
        });
        $("#dialog3").dialog({
            autoOpen: false,
            show: "blind",
            hide: "explode"
        });
        $('#btn-dialog').click(function() {
            $("#dialog1").dialog('open');
        });
        $('#btn-dialogmodal').click(function() {
            $("#dialog2").dialog('open');;
        });
        $('#btn-dialoganim').click(function() {
            $("#dialog3").dialog('open');
        });
    }
});

/*----------------------------------------------------*/
/*  Jquery UI - Sortable
/*  http://jqueryui.com/sortable/#portlets
/*----------------------------------------------------*/
$(function() {
    $( ".column" ).sortable({
        connectWith: ".column",
        placeholder: "widget-placeholder",
        handle: ".handle"
    });
});

/*----------------------------------------------------*/
/*  Jquery Full Calendar
/*  http://arshaw.com/fullcalendar
/*----------------------------------------------------*/
$(function() {
    if(jQuery().fullCalendar) {
        /* Default Calendar
        -----------------------------------------------------------------*/
        var date = new Date();
        var d = date.getDate();
        var m = date.getMonth();
        var y = date.getFullYear();

        $('#calendar').fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay'
            },
            buttonText: {
                prev: '&laquo;',
                next: '&raquo;',
                prevYear: '&nbsp;&lt;&lt;&nbsp;',
                nextYear: '&nbsp;&gt;&gt;&nbsp;',
                today: 'today',
                month: 'month',
                week: 'week',
                day: 'day'
            },
            editable: true,
            events: [
                {
                    title: 'All Day Event',
                    start: new Date(y, m, 1)
                },
                {
                    title: 'Long Event',
                    start: new Date(y, m, d-5),
                    end: new Date(y, m, d-2)
                },
                {
                    id: 999,
                    title: 'Repeating Event',
                    start: new Date(y, m, d-3, 16, 0),
                    allDay: false
                },
                {
                    id: 999,
                    title: 'Repeating Event',
                    start: new Date(y, m, d+4, 16, 0),
                    allDay: false
                },
                {
                    title: 'Meeting',
                    start: new Date(y, m, d, 10, 30),
                    allDay: false
                },
                {
                    title: 'Lunch',
                    start: new Date(y, m, d, 12, 0),
                    end: new Date(y, m, d, 14, 0),
                    allDay: false
                },
                {
                    title: 'Birthday Party',
                    start: new Date(y, m, d+1, 19, 0),
                    end: new Date(y, m, d+1, 22, 30),
                    allDay: false
                },
                {
                    title: 'Click for Google',
                    start: new Date(y, m, 28),
                    end: new Date(y, m, 29),
                    url: 'http://google.com/'
                }
            ]
        });

        /* Calendar With External Dragging
        -----------------------------------------------------------------*/
        $('#external-events div.external-event').each(function() {
            var eventObject = {
                title: $.trim($(this).text())
            };
            $(this).data('eventObject', eventObject);
            $(this).draggable({
                zIndex: 999,
                revert: true,
                revertDuration: 0
            });
        });
        $('#calendar_events').fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay'
            },
            buttonText: {
                prev: '&laquo;',
                next: '&raquo;',
                prevYear: '&nbsp;&lt;&lt;&nbsp;',
                nextYear: '&nbsp;&gt;&gt;&nbsp;',
                today: 'today',
                month: 'month',
                week: 'week',
                day: 'day'
            },
            editable: true,
            droppable: true,
            drop: function(date, allDay) {
                var originalEventObject = $(this).data('eventObject');
                var copiedEventObject = $.extend({}, originalEventObject);
                copiedEventObject.start = date;
                copiedEventObject.allDay = allDay;
                
                $('#calendar_events').fullCalendar('renderEvent', copiedEventObject, true);
            
                if ($('#drop-remove').is(':checked')) {
                    $(this).remove();
                }
                
            }
        });
    }
});

/*----------------------------------------------------*/
/*  Gallery Shuffle
/*----------------------------------------------------*/
$(function(){
    if(jQuery().shuffle) {
        $('.portfolio-filter li').on('click', function(e) {
            var $this = $(this),
                $grid = $('.gallery');

            $grid.shuffle($this.data('group'));

            e.preventDefault();
        });
        $(window).load(function() {
            $('.gallery').shuffle();
        });
    }
});

/*----------------------------------------------------*/
/*  Prettyphoto
/*  http://www.no-margin-for-errors.com/projects/prettyphoto-jquery-lightbox-clone/
/*----------------------------------------------------*/
$(function(){
    if(jQuery().prettyPhoto) {
        $("a[rel^='prettyPhoto']").prettyPhoto({
            allow_resize: true,
            social_tools: false
        });
    }
});

/*----------------------------------------------------*/
/*  Datatables & Table
/*  http://www.datatables.net/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().dataTable) {
        $('#datatable1').dataTable({
            "bProcessing": true,
            "sAjaxSource": 'table-dynamic.txt',
            "aoColumns": [
                null,
                null,
                null,
                null,
                null
            ],
            "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                $('td:eq(1)', nRow).addClass('hidden-phone');
                $('td:eq(3)', nRow).addClass('hidden-phone');
                $('td:eq(4)', nRow).addClass('hidden-phone');
            }
        });

        var $table = $('#datatable2').dataTable({
            "bProcessing": true,
            "sAjaxSource": 'table-dynamic-rich.txt',
            "aoColumns": [
                { "bSortable": false },
                null,
                null,
                null,
                null,
                { "bSortable": false }
            ],
            "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                $('td:eq(2)', nRow).addClass('hidden-phone');
                $('td:eq(3)', nRow).addClass('hidden-phone');
                $('td:eq(4)', nRow).addClass('hidden-phone');

                // Apply iCheck to checkbox
                $('td input[type="checkbox"]', nRow).iCheck({
                    checkboxClass: 'icheckbox_minimal-grey',
                    radioClass: 'iradio_minimal-grey',
                    increaseArea: '20%' // optional
                });
            }
        });

        // Datatable Checkbox check all
        $('thead input[type="checkbox"]').on('ifChecked', function (e){
            $('tbody input[type="checkbox"]').each( function (e) {
                $(this).iCheck('check');
            });
        });
        // Datatable Checkbox uncheck all
        $('thead input[type="checkbox"]').on('ifUnchecked', function (e){
            $('tbody input[type="checkbox"]').each( function (e) {
                $(this).iCheck('uncheck');
            });
        });
    }
});

/*----------------------------------------------------*/
/*  Gritter - Growl notification
/*  http://boedesign.com/blog/2009/07/11/growl-for-jquery-gritter/
/*----------------------------------------------------*/
$(function () {
    if($('.gritter-data').length > 0) {
        $('.gritter-data').each(function () {
            var $title = $(this).children('.title').text();
            var $text = $(this).children('.text').text();
            var $image = $(this).children('.image').text();
            var $color = 'gritter-'+$(this).data('color');
            var $time = $(this).data('time');

            $.gritter.add({
                title: $title,
                text: $text,
                image: $image,
                time: $time,
                class_name: $color
            });
        });
    }
});