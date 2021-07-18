import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ServerHeartbeat } from 'src/app/models/server-heartbeat';
import { MineosSocketService } from 'src/app/services/mineos-socket.service';

@Component({
  selector: 'app-server-card',
  templateUrl: './server-card.component.html',
  styleUrls: ['./server-card.component.scss'],
})
export class ServerCardComponent implements OnDestroy {
  iconColor: string = '';
  activeServers$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  heartbeats: Map<string, Subscription> = new Map<string, Subscription>();
  serverCountMap: Map<string, boolean> = new Map<string, boolean>();
  constructor(private mineosSocket: MineosSocketService) {
    this.mineosSocket.serverList().subscribe((serverList) => {
      serverList.forEach((serverName) => {
        if (!this.heartbeats.has(serverName)) {
          this.subscribeToHeartbeat(serverName);
        }
      });
    });
  }

  private subscribeToHeartbeat(serverName: string) {
    this.heartbeats.set(
      serverName,
      this.mineosSocket
        .serverHeartbeat(serverName)
        .subscribe((data: ServerHeartbeat) => {
          this.updateServerCount(serverName, data);
        })
    );
  }

  private updateServerCount(serverName: string, data: ServerHeartbeat) {
    this.serverCountMap.set(serverName, data.payload.up);
    let total = 0;
    this.serverCountMap.forEach((mapValue) => {
      if (mapValue) {
        total = total + 1;
      }
    });
    this.activeServers$.next(total);
  }

  ngOnDestroy(): void {
    this.heartbeats.forEach((sub) => {
      sub.unsubscribe();
    });
  }
}
