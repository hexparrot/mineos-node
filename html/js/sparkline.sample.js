/*----------------------------------------------------*/
/*  Jquery Sparkline
/*	@color : application.js
/* 	http://omnipotent.net/jquery.sparkline/
/*----------------------------------------------------*/
$(function () {
	if(jQuery().sparkline) {
		// Sparkline 1
		$(".sparkline-line").sparkline('html', {
			disableHiddenCheck: true,
			enableTagOptions: true,
		    type: 'line',
		    width: '60',
		    height: '35',
		    lineColor: $color['red'],
		    fillColor: $color['pink'],
		    lineWidth: 1.5,
		    spotColor: '#972525',
		    minSpotColor: '#972525',
		    maxSpotColor: '#972525',
		    spotRadius: 2
		});

		// Sparkline 2
		$(".sparkline-bar").sparkline('html', {
			disableHiddenCheck: true,
			enableTagOptions: true,
		    type: 'bar',
		    height: '35',
		    barWidth: 6,
		    barColor: $color['teal']
		});

		// Sparkline 3
		$(".sparkline-tristate").sparkline('html', {
			disableHiddenCheck: true,
			enableTagOptions: true,
		    type: 'tristate',
		    height: '35',
		    posBarColor: $color['green'],
		    negBarColor: $color['red'],
		    barWidth: 6,
		    zeroAxis: true
		});
		$('.sparkline-2line').sparkline('html', {
			disableHiddenCheck: true,
			enableTagOptions: true,
			fillColor: false, 
			changeRangeMin: 0, 
			chartRangeMax: 10,
			lineColor: $color['yellow'],
			width: '60',
		    height: '35',
		    lineWidth: 1.5,
		    spotRadius: 2
		});
	    $('.sparkline-2line').sparkline([4,1,5,7,9,9,8,7,6,6,4,7], {
	    	disableHiddenCheck: true,
	    	enableTagOptions: true,
	    	composite: true, 
	    	fillColor: false, 
	    	lineColor: $color['red'], 
	    	changeRangeMin: 0, 
	    	chartRangeMax: 10,
	    	lineColor: $color['green'],
	    	width: '60',
		    height: '35',
		    lineWidth: 1.5,
		    spotRadius: 2
	    });
	}
});