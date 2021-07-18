import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MomentModule } from 'ngx-moment';
import { of } from 'rxjs';
import { HostHeartbeat } from '../../../models/host-heartbeat';
import { MineosSocketService } from '../../../services/mineos-socket.service';

import { UptimeCardComponent } from './uptime-card.component';

describe('UptimeCardComponent', () => {
  let component: UptimeCardComponent;
  let fixture: ComponentFixture<UptimeCardComponent>;
  let mockMineosSocketService: jasmine.SpyObj<MineosSocketService>;

  beforeEach(async () => {
    mockMineosSocketService = jasmine.createSpyObj<MineosSocketService>(
      'MineosSocketService',
      {
        serverList: of([]),
        hostHeartbeat: of({} as HostHeartbeat),
      }
    );
    await TestBed.configureTestingModule({
      declarations: [UptimeCardComponent],
      providers: [
        { provide: MineosSocketService, useValue: mockMineosSocketService }
      ],
      imports: [MatCardModule, MatIconModule, MomentModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UptimeCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
