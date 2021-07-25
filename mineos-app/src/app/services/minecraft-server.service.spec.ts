import { of } from 'rxjs';
import { MinecraftServerService } from './minecraft-server.service';
import { SocketioWrapper } from './socketio-wrapper';

describe('MinecraftServerService', () => {
  let mockSocket: jasmine.SpyObj<SocketioWrapper>;

  beforeEach(() => {
    mockSocket = jasmine.createSpyObj<SocketioWrapper>('SocketioWrapper', [
      'fromEvent',
      'emit',
    ]);
    mockSocket.fromEvent.and.returnValue(of());
    mockSocket.emit.and.callFake(() => {});
  });

  it('should be created', () => {
    expect(new MinecraftServerService('Test', mockSocket)).toBeTruthy();
  });
});
