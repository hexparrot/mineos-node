import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { MinecraftServer } from '../models/minecraft-server';
import { ServerHeartbeat } from '../models/server-heartbeat';
import { SocketioWrapper } from './socketio-wrapper';

// Due to the use of namespaced sockets this service needs to be managed manulally
// @Injectable({
//   providedIn: 'root',
// })
export class MinecraftServerService {
  private listeners: Subscription[] = [];
  private serverInstance: MinecraftServer = new MinecraftServer();
  private server$: BehaviorSubject<MinecraftServer> =
    new BehaviorSubject<MinecraftServer>(this.serverInstance);

  constructor(private serverName: string, private socket: SocketioWrapper) {
    this.serverInstance.server_name = serverName;
    this.setupSever();
  }

  public getServerInfo(): Observable<MinecraftServer> {
    return this.server$.asObservable();
  }

  private setupSever(): void {
    this.listeners.push(this.heartbeat());
    this.listeners.push(this.pageData());
    this.listeners.push(this.tailData());
    this.listeners.push(this.notices());
    this.listeners.push(this.liveLogs());
    this.listeners.push(this.serverAck());
    this.listeners.push(this.icon());
    this.listeners.push(this.serverProperties());
    this.listeners.push(this.serverConfig());
    this.listeners.push(this.configYml());
    this.listeners.push(this.cron());
    this.listeners.push(this.serverFin());
    this.listeners.push(this.eula());
    this.socket.emit('page_data', this.serverName, 'glance');
    this.socket.emit('get_available_tails', this.serverName);
    this.socket.emit('req_server_activity', this.serverName);
    this.socket.emit('config.yml', this.serverName);
    this.socket.emit('cron.config', this.serverName);
    this.socket.emit('server.config', this.serverName);
    this.socket.emit('server.properties', this.serverName);
  }

  // private serverConfig(serverName: string): Observable<any> {
  //   this.socket.
  //   let serverSocket = this.server.get(serverName);
  //   if (serverSocket)
  //     return serverSocket.fromEvent('server.config');
  //   else {
  //     console.error('not joined to server room');
  //     return of({});
  //   }
  // }

  private heartbeat(): Subscription {
    return this.socket
      .fromEvent<ServerHeartbeat>('heartbeat')
      .subscribe((data) => {
        let previous_state: ServerHeartbeat | undefined =
          this.serverInstance.heartbeat;
        this.serverInstance.heartbeat = data;

        if (
          previous_state?.payload.up === true &&
          this.serverInstance.heartbeat?.payload.up == false
        ) {
          this.socket.emit('page_data', this.serverName, 'glance');
          // $.gritter.add({
          //   title: '[{0}] {1}'.format(
          //     this.serverInstance.server_name,
          //     $filter('translate')('DOWN')
          //   ),
          //   text: '',
          // });
        }
      });
  }

  private pageData(): Subscription {
    return this.socket.fromEvent<any>('page_data', this.serverName).subscribe((data) => {
      this.serverInstance.page_data[data.page] = data.payload;
    });
  }

  private tailData(): Subscription {
    return this.socket.fromEvent<any>('tail_data', this.serverName).subscribe((data) => {
      try {
        if (this.serverInstance.auto_rate_interval) {
          this.serverInstance.live_logs[data.filepath].push(data.payload);
          this.serverInstance.auto_rate_counter += 1;
        }
      } catch (e) {
        this.serverInstance.live_logs[data.filepath] = [data.payload];
      }
    });
  }

  private notices(): Subscription {
    return this.socket.fromEvent<any>('notices', this.serverName).subscribe((data) => {
      let server = this.serverInstance;
      data.forEach(function (notice: any, index: number) {
        server.notices[notice.uuid] = notice;
      });
    });
  }

  private liveLogs(): Subscription {
    return this.socket.fromEvent<any>('file head', this.serverName).subscribe((data) => {
      this.serverInstance.live_logs[data.filename] = data.payload.split('\n');
    });
  }
  private serverAck(): Subscription {
    return this.socket.fromEvent<any>('server_ack', this.serverName).subscribe((data) => {
      this.serverInstance.notices[data.uuid] = data;
    });
  }
  private icon(): Subscription {
    return this.socket.fromEvent<any>('server-icon.png', this.serverName).subscribe((data) => {
      this.serverInstance.icon = data;
    });
  }

  private serverProperties(): Subscription {
    return this.socket.fromEvent<any>('server.properties', this.serverName).subscribe((data) => {
      this.serverInstance.serverProperties = data;
    });
  }
  private serverConfig(): Subscription {
    return this.socket.fromEvent<any>('server.config', this.serverName).subscribe((data) => {
      this.serverInstance.serverConfig = data;
    });
  }
  private configYml(): Subscription {
    return this.socket.fromEvent<any>('config.yml', this.serverName).subscribe((data) => {
      this.serverInstance.configYml = data;
    });
  }
  private cron(): Subscription {
    return this.socket.fromEvent<any>('cron.config', this.serverName).subscribe((data) => {
      this.serverInstance.cron = data;
    });
  }

  private serverFin(): Subscription {
    return this.socket.fromEvent<any>('server_fin', this.serverName).subscribe((data) => {
      this.serverInstance.notices[data.uuid] = data;
      this.serverInstance.latest_notice[data.command] = data;
      this.socket.emit('page_data', this.serverName, 'glance');

      var suppress = false;
      if ('suppress_popup' in data || data.success) suppress = true;

      // if (data.err == 'eula') $('#modal_eula').modal('show');

      // if (!suppress) {
      //   var help_text = '';
      //   try {
      //     help_text = $filter('translate')(data.err);
      //   } catch (e) {}

      //   // $.gritter.add({
      //   //   title: '[{0}] {1} {2}'.format(
      //   //     this.serverInstance.server_name,
      //   //     data.command,
      //   //     data.success
      //   //       ? $filter('translate')('SUCCEEDED')
      //   //       : $filter('translate')('FAILED')
      //   //   ),
      //   //   text: help_text || '',
      //   // });
      // }
    });
  }
  private eula(): Subscription {
    return this.socket.fromEvent<any>('eula', this.serverName).subscribe((accepted:boolean) => {
      this.serverInstance.page_data.glance.eula = accepted;
      // if (accepted == false) $('#modal_eula').modal('show');
    });
  }
}
