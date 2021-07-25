import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MineosSocketService } from './mineos-socket.service';
import { SocketioWrapper } from './socketio-wrapper';

describe('MineosSocketService', () => {
  let service: MineosSocketService;
  let mockSocket: jasmine.SpyObj<SocketioWrapper>;

  beforeEach(() => {
    mockSocket = jasmine.createSpyObj<SocketioWrapper>('SocketioWrapper', {
      fromEvent: of(),
    });
    TestBed.configureTestingModule({
      providers: [{ provide: SocketioWrapper, useValue: mockSocket }],
    });
    service = TestBed.inject(MineosSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
