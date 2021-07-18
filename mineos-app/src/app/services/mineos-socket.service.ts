import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { ServerHeartbeat } from '../models/server-heartbeat';
import { HostHeartbeat } from '../models/host-heartbeat';
import { SocketioWrapper } from './socketio-wrapper';

@Injectable({
  providedIn: 'root',
})
export class MineosSocketService implements OnDestroy {
  serverNames$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  sub$: Subscription;

  constructor(private socket: SocketioWrapper) {
    this.sub$ = this.trackServer().subscribe((serverName) => {
      this.socket.addNamespace(serverName);
      let serverNameList = this.serverNames$.value;
      serverNameList.push(serverName);
      this.serverNames$.next(serverNameList);
    });
  }
  serverList(): Observable<string[]> {
    return this.serverNames$.asObservable();
  }

  ngOnDestroy(): void {
    this.sub$.unsubscribe();
    this.socket.disconnect();
  }

  /* socket handlers */

  // whoami() {
  //   return this.socket.fromEvent('whoami');
  // }

  // commitMsg() {
  //   return this.socket.fromEvent<string>('commit_msg');
  // }

  hostHeartbeat(): Observable<HostHeartbeat> {
    return this.socket.fromEvent<HostHeartbeat>('host_heartbeat');
  }

  serverHeartbeat(serverName: string): Observable<ServerHeartbeat> {
    return this.socket.fromEvent<ServerHeartbeat>('heartbeat', serverName);
  }

  trackServer(): Observable<string> {
    return this.socket.fromEvent<string>('track_server');
  }

  // untrackServer() {
  //   return this.socket.fromEvent('untrack_server');
  // }

  // profileList() {
  //   return this.socket.fromEvent('profile_list');
  // }

  // userList() {
  //   return this.socket.fromEvent('user_list');
  // }

  // groupList() {
  //   return this.socket.fromEvent('group_list');
  // }

  // archiveList() {
  //   return this.socket.fromEvent('archive_list');
  // }

  // spigotList() {
  //   return this.socket.fromEvent('spigot_list');
  // }

  // localeList() {
  //   return this.socket.fromEvent('locale_list');
  // }

  // buildJarOutput() {
  //   return this.socket.fromEvent('build_jar_output');
  // }

  // hostNotice() {
  //   return this.socket.fromEvent('host_notice');
  // }

  // changeLocale() {
  //   return this.socket.fromEvent('change_locale');
  // }

  // optionalColumns() {
  //   return this.socket.fromEvent('optional_columns');
  // }

  // fileProgress() {
  //   return this.socket.fromEvent('file_progress');
  // }
}
