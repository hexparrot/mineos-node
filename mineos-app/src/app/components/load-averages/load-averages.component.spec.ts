import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { BrowserModule } from '@angular/platform-browser';
import { ChartsModule } from 'ng2-charts';
import { of } from 'rxjs';
import { AppModule } from 'src/app/app.module';
import { HostHeartbeat } from 'src/app/models/host-heartbeat';
import { MineosSocketService } from 'src/app/services/mineos-socket.service';

import { LoadAveragesComponent } from './load-averages.component';

describe('LoadAveragesComponent', () => {
  let component: LoadAveragesComponent;
  let fixture: ComponentFixture<LoadAveragesComponent>;
  let mockMineosSocketService: jasmine.SpyObj<MineosSocketService>;

  beforeEach(async () => {
    mockMineosSocketService = jasmine.createSpyObj<MineosSocketService>(
      'MineosSocketService',
      {
        serverList: of([]),
        hostHeartbeat: of({ loadavg: [0.1, 0.25, 0.12] } as HostHeartbeat),
      }
    );
    await TestBed.configureTestingModule({
      declarations: [LoadAveragesComponent],
      providers: [
        { provide: MineosSocketService, useValue: mockMineosSocketService },
      ],
      imports: [ChartsModule, MatCardModule ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadAveragesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
