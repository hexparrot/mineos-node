import { TestBed } from '@angular/core/testing';

import { SocketioWrapper } from './socketio-wrapper';

describe('SocketioWrapper', () => {
  let service: SocketioWrapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SocketioWrapper);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
