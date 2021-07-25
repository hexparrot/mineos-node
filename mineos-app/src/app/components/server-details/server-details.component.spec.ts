import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MockLocationStrategy } from '@angular/common/testing';
import { LocationStrategy } from '@angular/common';

import { ServerDetailsComponent } from './server-details.component';

describe('ServerDetailsComponent', () => {
  let component: ServerDetailsComponent;
  let fixture: ComponentFixture<ServerDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServerDetailsComponent],
      providers:[{ provide: LocationStrategy, useClass: MockLocationStrategy }],
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        MatIconModule,
        MatSidenavModule,
        MatListModule,
        FormsModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
