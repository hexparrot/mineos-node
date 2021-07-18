export class ServerHeartbeat {
  server_name: string = '';
  timestamp: number = 0;
  payload: ServerHeartbeatPayload = new ServerHeartbeatPayload();
}
export class ServerHeartbeatPayload {
  up: boolean = false;
  memory: ServerMemory = new ServerMemory();
  query: any | null = null;
  ping: ServerHeartbeatPing = new ServerHeartbeatPing();
}

export class ServerHeartbeatPing {
  protocol: string = '';
  server_version: string = '';
  motd: string = '';
  players_online: number = 0;
  players_max: number = 0;
}

export class ServerMemory {
  VmPeak: number | undefined = undefined;
  VmSize: number | undefined = undefined;
  VmRSS: number | undefined = undefined;
  VmSwap: number | undefined = undefined;
}
