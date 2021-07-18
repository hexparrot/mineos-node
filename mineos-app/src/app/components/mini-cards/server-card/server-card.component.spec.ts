import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { getTestScheduler, cold } from 'jasmine-marbles';
import {
  ServerHeartbeat,
  ServerHeartbeatPayload,
  ServerHeartbeatPing,
} from 'src/app/models/server-heartbeat';
import { MineosSocketService } from '../../../services/mineos-socket.service';

import { ServerCardComponent } from './server-card.component';

describe('ServerCardComponent', () => {
  let component: ServerCardComponent;
  let fixture: ComponentFixture<ServerCardComponent>;
  let mockMineosSocketService: jasmine.SpyObj<MineosSocketService>;

  beforeEach(async () => {
    mockMineosSocketService = jasmine.createSpyObj<MineosSocketService>(
      'MineosSocketService',
      {
        serverList: of([
          'TestServer1',
          'TestServer3',
          'TestServer2',
          'TestServer1',
        ]),
        serverHeartbeat: of(),
      }
    );
    mockMineosSocketService.serverHeartbeat.and.callFake((serverName) => {
      let result: Observable<ServerHeartbeat> = of();
      switch (serverName) {
        case 'TestServer1':
          return cold('a-b-c', {
            a: {
              server_name: 'TestServer1',
              timestamp: new Date().getTime(),
              payload: {
                up: true,
                ping: {
                  server_version: '1.17.1',
                  players_online: 3,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
            b: {
              server_name: 'TestServer1',
              timestamp: new Date().getTime(),
              payload: {
                up: true,
                ping: {
                  server_version: '1.17.1',
                  players_online: 3,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
            c: {
              server_name: 'TestServer1',
              timestamp: new Date().getTime(),
              payload: {
                up: true,
                ping: {
                  server_version: '1.17.1',
                  players_online: 3,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
          }) as Observable<ServerHeartbeat>;
        case 'TestServer2':
          return cold('a-b-c', {
            a: {
              server_name: 'TestServer2',
              timestamp: new Date().getTime(),
              payload: {
                up: true,
                ping: {
                  server_version: '1.12',
                  players_online: 8,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
            b: {
              server_name: 'TestServer2',
              timestamp: new Date().getTime(),
              payload: {
                up: false,
                ping: {
                  server_version: '1.12',
                  players_online: 5,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
            c: {
              server_name: 'TestServer2',
              timestamp: new Date().getTime(),
              payload: {
                up: false,
                ping: {
                  server_version: '1.12',
                  players_online: 4,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
          }) as Observable<ServerHeartbeat>;
        case 'TestServer3':
          return cold('a-b-c', {
            a: {
              server_name: 'TestServer3',
              timestamp: new Date().getTime(),
              payload: {
                up: false,
                ping: {
                  server_version: '1.17',
                  players_online: 0,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
            b: {
              server_name: 'TestServer3',
              timestamp: new Date().getTime(),
              payload: {
                up: false,
                ping: {
                  server_version: '1.17',
                  players_online: 1,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
            c: {
              server_name: 'TestServer3',
              timestamp: new Date().getTime(),
              payload: {
                up: true,
                ping: {
                  server_version: '1.17',
                  players_online: 3,
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
          }) as Observable<ServerHeartbeat>;
      }
      return result;
    });
    await TestBed.configureTestingModule({
      declarations: [ ServerCardComponent ],
      providers: [
        { provide: MineosSocketService, useValue: mockMineosSocketService },
      ],
      imports: [MatCardModule, MatIconModule]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServerCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    let actualCount: number = 0;

    component.activeServers$.subscribe((servers) => {
      actualCount = servers;
    });

    expect(component).toBeTruthy();

    getTestScheduler().flush(); // flush the observable
    fixture.detectChanges(); // trigger change detection again

    expect(actualCount).toEqual(2);
  });
});
