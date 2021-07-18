import { ServerHeartbeat } from './server-heartbeat';

export class MinecraftServer {
  server_name: string = '';
  page_data: any = {};
  live_logs: any = {};
  notices: any = {};
  latest_notice: any = {};
  heartbeat: ServerHeartbeat | undefined = undefined;
  niceness: number = 0;
  AUTO_RATE_THRESHOLD_PER_SECOND: number = 80;
  AUTO_RATE_SUSTAINED_DURATION: number = 2; //how long (in seconds) must rate be sustained to trigger
  auto_rate_counter: number = 0;
  auto_rate_interval: any | null = null;
  icon:any = {};
  serverProperties:any = {};
  serverConfig:any = {};
  configYml:any = {};
  cron:any = {};

  constructor() {
    this.auto_rate_interval = setInterval(
      this.eventTrigger,
      1000 * this.AUTO_RATE_SUSTAINED_DURATION
    );
  }
  private eventTrigger() {
    if (
      this.auto_rate_counter * this.AUTO_RATE_SUSTAINED_DURATION >
      this.AUTO_RATE_THRESHOLD_PER_SECOND * this.AUTO_RATE_SUSTAINED_DURATION
    )
      this.auto_rate_interval = null;
    else this.auto_rate_counter = 0;
  }
}
