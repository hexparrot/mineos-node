/*----------------------------------------------------*/
/*  Template Version
/*----------------------------------------------------*/
$(function () {
	var $version = '1.2.2';
	$('.version').text($version);
});

/*----------------------------------------------------*/
/*  Sidebar Scrollable
/*----------------------------------------------------*/
$(function () {
    if(jQuery().perfectScrollbar) {
    	$('#sidebar').perfectScrollbar();
    }
});

/*----------------------------------------------------*/
/*  Sidebar toggler
/*----------------------------------------------------*/
$(function () {
	$('[data-toggle="sidebar"]').click(function (e) {

		$(this).toggleClass('active');
		$('html').toggleClass('nav-open');

		e.preventDefault();
	});
});

/*----------------------------------------------------*/
/*  Sidebar Height - ie8 Fix
/*----------------------------------------------------*/
$(function () {
	if($('html').hasClass('lt-ie9')) {
		$('#sidebar').css('min-height', $('#main').height());
	}
	$('#sidebar').resize(function(){
		var $this = $(this);
		$('#main').css('min-height', $this.height());
	});
	$('#sidebar').resize();
});

/*----------------------------------------------------*/
/*  Widget Collapse
/*----------------------------------------------------*/
$(function () {
	$('.toolbar [data-toggle="collapse"]').on('click', function (e) {
		$icon = $(this).children('.icon');

		if($(this).hasClass('collapsed')) {
			$icon.removeClass('icone-chevron-down').addClass('icone-chevron-up');
		}else{
			$icon.removeClass('icone-chevron-up').addClass('icone-chevron-down');
		}
		e.preventDefault();
	});
});

/*----------------------------------------------------*/
/*  Widget Refresh Modal
/*----------------------------------------------------*/
$(function () {
	$('[data-widget="refresh"]').on('click', function (e) {
		var $modal = $('<div class="widget-modal"><span class="spinner spinner1"></span></div>');
		var $target = $(this).parents('.widget');

		// append to widget
		$target.append($modal);

		// remove after 3 second
		setTimeout(function () {
	        $modal.remove();
	    }, 2000);

		e.preventDefault();
	});
});

/*----------------------------------------------------*/
/*  Application Color
/*----------------------------------------------------*/
var $color = [];

// Application color as in version 1.0.0
$color['red'] = '#dc143c';
$color['teal'] = '#00A0B1';
$color['blue'] = '#2E8DEF';
$color['purple'] = '#A700AE';
$color['magenta'] = '#FF0097';
$color['lime'] = '#8CBF26';
$color['brown'] = '#A05000';
$color['pink'] = '#E671B8';
$color['orange'] = '#F09609';
$color['green'] = '#3A9548';
$color['yellow'] = '#E1B700';

/*----------------------------------------------------*/
/*  To Top Scroller
/*----------------------------------------------------*/
$(function () {
	$('.totop').click(function (e){
		$("html, body").animate({ scrollTop: 0 }, 600);
		
		e.preventDefault();
	});
});