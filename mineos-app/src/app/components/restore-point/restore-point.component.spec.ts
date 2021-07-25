import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestorePointComponent } from './restore-point.component';

describe('RestorePointComponent', () => {
  let component: RestorePointComponent;
  let fixture: ComponentFixture<RestorePointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RestorePointComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RestorePointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
