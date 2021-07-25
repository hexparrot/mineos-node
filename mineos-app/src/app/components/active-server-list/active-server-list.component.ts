import { ServerHeartbeat } from 'src/app/models/server-heartbeat';
import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { MineosSocketService } from 'src/app/services/mineos-socket.service';

@Component({
  selector: 'app-active-server-list',
  templateUrl: './active-server-list.component.html',
  styleUrls: ['./active-server-list.component.scss'],
})
export class ActiveServerListComponent implements OnDestroy {
  columnsToDisplay = ['Server', 'Profile', 'Port', 'Status', 'Memory'];
  iconColor: string = '';
  activeServers$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  heartbeats: Map<string, Subscription> = new Map<string, Subscription>();
  serverDataMap: Map<string, any> = new Map<string, any>();

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
          this.updateServerList(serverName, data);
        })
    );
  }

  private updateServerList(serverName: string, data: ServerHeartbeat) {
    this.serverDataMap.set(serverName, {
      server_name: data.server_name,
      server_version: data.payload.ping.server_version,
      port: '',
      status: data.payload.up,
      memory: data.payload.memory,
    });
    let list: any[] = [];
    this.serverDataMap.forEach((mapValue) => {
      if (mapValue) {
        list.push(mapValue);
      }
    });
    let newList = list.sort((a, b) => (a.server_name > b.server_name ? 1 : -1));
    this.activeServers$.next(newList);
  }

  ngOnDestroy(): void {
    this.heartbeats.forEach((sub) => {
      sub.unsubscribe();
    });
  }
}
