import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { HostHeartbeat } from 'src/app/models/host-heartbeat';
import { MineosSocketService } from 'src/app/services/mineos-socket.service';

@Component({
  selector: 'app-uptime-card',
  templateUrl: './uptime-card.component.html',
  styleUrls: ['./uptime-card.component.scss']
})
export class UptimeCardComponent implements OnDestroy {
  sub$:Subscription;
  iconColor:string = '';
  serverUptime$:BehaviorSubject<number> = new BehaviorSubject<number>(0);
  constructor(private mineosSocket: MineosSocketService) {
    this.sub$ = this.mineosSocket.hostHeartbeat().subscribe((data:HostHeartbeat) => {
      this.serverUptime$.next(data.uptime);
    })
   }
   ngOnDestroy(): void {
     this.sub$.unsubscribe();
   }
}
