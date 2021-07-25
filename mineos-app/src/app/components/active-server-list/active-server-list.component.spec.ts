import {
  ComponentFixture,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { getTestScheduler, cold } from 'jasmine-marbles';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Observable, of } from 'rxjs';
import { MineosSocketService } from 'src/app/services/mineos-socket.service';

import { ActiveServerListComponent } from './active-server-list.component';
import {
  ServerHeartbeat,
  ServerHeartbeatPayload,
  ServerHeartbeatPing,
} from 'src/app/models/server-heartbeat';
import { BytesToMegabytesPipe } from 'src/app/pipes/bytes-to-megabytes.pipe';

describe('ActiveServerListComponent', () => {
  let component: ActiveServerListComponent;
  let fixture: ComponentFixture<ActiveServerListComponent>;
  let mockMineosSocketService: jasmine.SpyObj<MineosSocketService>;
  let mockBytesToMegabytesPipe: jasmine.SpyObj<BytesToMegabytesPipe>;

  beforeEach(async () => {
    mockBytesToMegabytesPipe = jasmine.createSpyObj<BytesToMegabytesPipe>(
      'BytesToMegabytesPipe',
      ['transform']
    );
    mockMineosSocketService = jasmine.createSpyObj<MineosSocketService>(
      'MineosSocketService',
      {
        serverList: of(['TestServer1', 'TestServer3', 'TestServer2','TestServer1']),
        serverHeartbeat:of()
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
                } as ServerHeartbeatPing,
              } as ServerHeartbeatPayload,
            } as ServerHeartbeat,
          }) as Observable<ServerHeartbeat>;
      }
      return result;
    });
    await TestBed.configureTestingModule({
      declarations: [ActiveServerListComponent, BytesToMegabytesPipe],
      providers: [
        { provide: MineosSocketService, useValue: mockMineosSocketService },
        { provide: BytesToMegabytesPipe, useValue: mockBytesToMegabytesPipe },
      ],
      imports: [MatTableModule, MatCardModule, MatIconModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActiveServerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    mockMineosSocketService.serverList.and.returnValue(of([]));
    expect(component).toBeTruthy();
  });
  it(
    'should sort the list of activeServers',
    waitForAsync(() => {
      let expectedList: any[] = [
        {
          server_name: 'TestServer1',
          server_version: '1.17.1',
          port: '',
          status: true,
          memory: undefined,
        },
        {
          server_name: 'TestServer2',
          server_version: '1.12',
          port: '',
          status: false,
          memory: undefined,
        },
        {
          server_name: 'TestServer3',
          server_version: '1.17',
          port: '',
          status: true,
          memory: undefined,
        },
      ];
      let actualList: any[] = [];
      component.activeServers$.subscribe((servers) => {
        actualList = servers;
      });

      getTestScheduler().flush(); // flush the observable
      fixture.detectChanges(); // trigger change detection again

      expect(actualList).toEqual(expectedList);
    })
  );
});
