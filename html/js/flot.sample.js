/*----------------------------------------------------*/
/*  Flot Chart Sample Data
/* 	http://www.flotcharts.org/
/*	@color : application.js
/*----------------------------------------------------*/
// Bar Chart
$(function () {
	if(jQuery().plot) {
		var data = [{
			label : 'Population',
			color : $color['blue'],
			shadowSize : 1,
			data : [["Jan", 450],["Feb", 550],["Mar", 320],["Apr", 700],["May", 200],["Jun", 330],["Jul", 900],["Aug", 140],["Sep", 300],["Nov", 500],["Dec", 300]]
		}]

		if($("#chart1").length !== 0) {
			$.plot($("#chart1"), data, {
				series: {
					bars: {
					show: true,
					barWidth: 0.5,
					align: "center" ,
					fill: .9
				}
				},
					grid: {
					borderWidth: 0, 
					hoverable: true 
				},
					tooltip: true,
					tooltipOpts: {
					content: "%x : %y"
				},
				xaxis: {
					mode: "categories",
					tickLength: 0
				}
			});
		}
	}
});

// Line Chart
$(function () {
	if(jQuery().plot) {
		var sin = [], cos = [];
		for (var i = 0; i < 14; i += 0.5) {
			sin.push([i, Math.sin(i)]);
			cos.push([i, Math.cos(i)]);
		}

		if($("#chart2").length !== 0) {
			var plot = $.plot($("#chart2"), [{ 
				data: sin, 
				color : $color['pink'],
				label: "sin(x)"
			}, 
			{ 
				data: cos,
				color : $color['magenta'],
				label: "cos(x)" 
			}], 
			{
				series: {
				lines: { show: true },
				points: { show: true }
			},
			grid: { hoverable: true, clickable: true, borderWidth: 0, },
			yaxis: { min: -1.2, max: 1.2 },
			tooltip: true,
			tooltipOpts: {
				content: "%x : %y"
			}
			});
		}
	}
});

// Line Chart - Filled
$(function () {
	if(jQuery().plot) {
		var data = [{
			label : 'Visits',
			color : $color['yellow'],
			data: [['Jan', Math.floor((Math.random()*50)+1)], ['Feb', Math.floor((Math.random()*50)+1)],['Mac', Math.floor((Math.random()*50)+1)], ['Apr', Math.floor((Math.random()*50)+1)], ['Mei', Math.floor((Math.random()*50)+1)]]
		},
		{
			label : 'Hit',
			color : $color['green'],
			data: [['Jan', Math.floor((Math.random()*50)+1)], ['Feb', Math.floor((Math.random()*50)+1)],['Mac', Math.floor((Math.random()*50)+1)], ['Apr', Math.floor((Math.random()*50)+1)], ['Mei', Math.floor((Math.random()*50)+1)]]
		}]

		if($("#chart3").length !== 0) {
			$.plot($("#chart3"), data, {
				series: {
					lines: {
					show: true,
					fill: .7
					},
					points: { show: true }
				},
				grid: {
					borderWidth: 0, 
					hoverable: true 
				},
				tooltip: true,
				tooltipOpts: {
					content: "%x : %y"
				},
				xaxis: {
					mode: "categories",
					tickLength: 0
				}
			});
		}
	}
});

// Pie Chart
$(function () {
	if(jQuery().plot) {
		var data = [
			{ label: "Series 1", data: Math.floor(Math.random()*100)+1, color: $color['red'] },
			{ label: "Series 2", data: Math.floor(Math.random()*100)+1, color: $color['blue'] },
			{ label: "Series 3", data: Math.floor(Math.random()*100)+1, color: $color['lime'] },
			{ label: "Series 4", data: Math.floor(Math.random()*100)+1, color: $color['magenta'] },
			{ label: "Series 5", data: Math.floor(Math.random()*100)+1, color: $color['green'] }
		];

		if($("#chart5").length !== 0) {
			$.plot($("#chart5"), data, {
				series: {
					pie: { show: true }
				}
			});
		}
	}
});

// Donut Chart
$(function () {
	if(jQuery().plot) {
		var data = [
			{ label: "Series 1", data: Math.floor(Math.random()*100)+1, color: $color['teal'] },
			{ label: "Series 2", data: Math.floor(Math.random()*100)+1, color: $color['red'] },
			{ label: "Series 3", data: Math.floor(Math.random()*100)+1, color: $color['pink'] },
			{ label: "Series 4", data: Math.floor(Math.random()*100)+1, color: $color['yellow'] },
			{ label: "Series 5", data: Math.floor(Math.random()*100)+1, color: $color['brown'] }
		];

		if($("#chart6").length !== 0) {
			$.plot($("#chart6"), data, {
				series: {
					pie: { 
						innerRadius: 0.5,
						show: true
					}
				},
				grid: {
					hoverable: true,
					clickable: true
				}
			});
		}
	}
});

// Auto Update Chart
$(function () {
	if(jQuery().plot) {
		var data = [], totalPoints = 100;
		function getRandomData() {
			if (data.length > 0)
				data = data.slice(1);

			// do a random walk
			while (data.length < totalPoints) {
				var prev = data.length > 0 ? data[data.length - 1] : 50;
				var y = prev + Math.random() * 10 - 5;
				if (y < 0)
					y = 0;
				if (y > 100)
					y = 100;
				data.push(y);
			}
			var res = [];
			for (var i = 0; i < data.length; ++i)
				res.push([i, data[i]])
				return res;
		}

		var updateInterval = 600;
		var options = {
			series: { 
				lines: {
					show: true,
					fill: .5
				},
				shadowSize: 0 
			},
			yaxis: { min: 0, max: 100 },
			xaxis: { show: false },
			grid: {
				borderWidth: 0, 
				hoverable: true 
			}
		};
		if($("#chart4").length !== 0) {
			var plot = $.plot($("#chart4"), [ getRandomData() ], options);
		
			function update() {
				plot.setData([getRandomData()]);
				plot.draw();
				setTimeout(update, updateInterval);
			}	
			update();
		}
	}
});