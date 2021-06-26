import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MockPipe } from 'ng-mocks';
import { of } from 'rxjs';
import { HostHeartbeat } from 'src/app/models/host-heartbeat';
import { BytesToMegabytesPipe } from 'src/app/pipes/bytes-to-megabytes.pipe';
import { MineosSocketService } from '../../../services/mineos-socket.service';

import { MemoryCardComponent } from './memory-card.component';

describe('MemoryCardComponent', () => {
  let component: MemoryCardComponent;
  let fixture: ComponentFixture<MemoryCardComponent>;
  let mockMineosSocketService: jasmine.SpyObj<MineosSocketService>;
  let mockBytesToMegabytesPipe: jasmine.SpyObj<BytesToMegabytesPipe>;

  beforeEach(async () => {
    mockMineosSocketService = jasmine.createSpyObj<MineosSocketService>(
      'MineosSocketService',
      {
        serverList: of([]),
        hostHeartbeat: of({} as HostHeartbeat),
      }
    );
    mockBytesToMegabytesPipe = jasmine.createSpyObj<BytesToMegabytesPipe>(
      'BytesToMegabytesPipe',
      ['transform']
    );
    await TestBed.configureTestingModule({
      declarations: [MemoryCardComponent, BytesToMegabytesPipe],
      providers: [
        { provide: MineosSocketService, useValue: mockMineosSocketService },
        { provide: BytesToMegabytesPipe, useValue: mockBytesToMegabytesPipe },
      ],
      imports: [MatCardModule, MatIconModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MemoryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
