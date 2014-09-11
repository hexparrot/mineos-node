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

/*----------------------------------------------------*/
/*  Tags It
/*  http://aehlke.github.io/tag-it/
/*----------------------------------------------------*/
$(function () {
    if(jQuery().tagit) {
        $('#ignore_files').tagit();
    }
});

/*----------------------------------------------------*/
/*  Input Mask
/*  http://digitalbush.com/projects/masked-input-plugin/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Form Wizard
/*  http://thecodemine.org/
/*----------------------------------------------------*/
$(function(){
    if(jQuery().formwizard) {
        $(".form-horizontal").formwizard({ 
            disableUIStyles: true,
            focusFirstInput : true,
            validationEnabled: true
        });
    }
});

/*----------------------------------------------------*/
/*  Select2 - Advanced Select
/*  http://ivaynberg.github.io/select2/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Minicolor - Color Picker
/*  http://www.abeautifulsite.net/blog/2011/02/jquery-minicolors-a-color-selector-for-input-controls
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Timepicker - Bootstrap Timepicker
/*  http://jdewit.github.io/bootstrap-timepicker/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  WYSIWYG Editor - CLEditor
/*  http://premiumsoftware.net/cleditor/
/*----------------------------------------------------*/

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

/*----------------------------------------------------*/
/*  Jquery UI - Tabs
/*  http://jqueryui.com/tabs/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Jquery UI - Accordion
/*  http://jqueryui.com/accordion/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Jquery UI - Datepicker
/*  http://jqueryui.com/datepicker/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Jquery UI - Timepicker
/*  http://trentrichardson.com/examples/timepicker/
/*----------------------------------------------------*/

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

/*----------------------------------------------------*/
/*  Jquery UI - Dialog
/*  http://jqueryui.com/dialog/
/*----------------------------------------------------*/

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

/*----------------------------------------------------*/
/*  Gallery Shuffle
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Prettyphoto
/*  http://www.no-margin-for-errors.com/projects/prettyphoto-jquery-lightbox-clone/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Datatables & Table
/*  http://www.datatables.net/
/*----------------------------------------------------*/

/*----------------------------------------------------*/
/*  Gritter - Growl notification
/*  http://boedesign.com/blog/2009/07/11/growl-for-jquery-gritter/
/*----------------------------------------------------*/

$.extend($.gritter.options, {
            position: 'bottom-right', // possibilities: bottom-left, bottom-right, top-left, top-right
            fade_in_speed: 100, // how fast notifications fade in (string or int)
            fade_out_speed: 100, // how fast the notices fade out
            time: 3000 // hang on the screen for...
        });