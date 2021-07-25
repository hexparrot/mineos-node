import { Component, OnDestroy } from '@angular/core';
import { ChartDataSets, ChartOptions, ChartPoint, ChartType } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { Subscription } from 'rxjs';
import { HostHeartbeat } from 'src/app/models/host-heartbeat';
import { MineosSocketService } from '../../services/mineos-socket.service';

@Component({
  selector: 'app-load-averages',
  templateUrl: './load-averages.component.html',
  styleUrls: ['./load-averages.component.scss'],
})
export class LoadAveragesComponent implements OnDestroy {
  private numberOfSamples: number = 25;
  sub$: Subscription;
  iconColor: string = '';
  lineChartData: ChartDataSets[] = [
    { data: Array(this.numberOfSamples).fill(0), label: 'one' },
    { data: Array(this.numberOfSamples).fill(0), label: 'five' },
    { data: Array(this.numberOfSamples).fill(0), label: 'fifteen' },
  ];
  // now contains 25 empty strings
  lineChartLabels: Label[] = Array(this.numberOfSamples).fill('');

  constructor(private mineosSocket: MineosSocketService) {
    this.sub$ = this.mineosSocket
      .hostHeartbeat()
      .subscribe((heartbeat: HostHeartbeat) => {
        this.lineChartData[0].data = this.addChartValue(
          this.lineChartData[0].data,
          heartbeat.loadavg[0]
        );
        this.lineChartData[1].data = this.addChartValue(
          this.lineChartData[1].data,
          heartbeat.loadavg[1]
        );
        this.lineChartData[2].data = this.addChartValue(
          this.lineChartData[2].data,
          heartbeat.loadavg[2]
        );
      });
  }
  ngOnDestroy(): void {
    this.sub$.unsubscribe();
  }

  private addChartValue(data: any, value: number): number[] {
    let newData = data.slice((this.numberOfSamples - 1) * -1);
    newData.push(value);
    return newData;
  }

  // Define chart options
  lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      yAxes: [
        {
          ticks: {
            suggestedMin: 0,
            suggestedMax: 1,
            stepSize: 0.25,
          },
        },
      ],
    },
  };

  // Define colors of chart segments
  lineChartColors: Color[] = [
    {
      // dark grey
      backgroundColor: 'rgba(77,83,96,0.2)',
      borderColor: 'rgba(77,83,96,1)',
    },
    {
      // red
      backgroundColor: 'rgba(255,0,0,0.3)',
      borderColor: 'red',
    },
  ];

  // Set true to show legends
  lineChartLegend = true;

  // Define type of chart
  lineChartType: ChartType = 'line';

  lineChartPlugins = [];

  ngOnInit(): void {}
}
