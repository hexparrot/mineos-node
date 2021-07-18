import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthenticationService } from '../../services/authentication.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { LoginComponent } from './login.component';
import { LoginRequest } from 'src/app/models/login-request';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthenticationService: jasmine.SpyObj<AuthenticationService>;

  beforeEach(async () => {
    mockAuthenticationService = jasmine.createSpyObj<AuthenticationService>(
      'AuthenticationService',
      {
        isAuthenticated: of(false),
        loginUser: of(true),
        logoutUser: of(true),
      }
    );
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [
        FormBuilder,
        { provide: AuthenticationService, useValue: mockAuthenticationService },
      ],
      imports: [
        NoopAnimationsModule,
        MatIconModule,
        MatCardModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    component.loginForm = new FormGroup({
      username: new FormControl('jdoe', Validators.required),
      password: new FormControl('minecraft', Validators.required),
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthenticationService login', () => {
    component.login();
    expect(mockAuthenticationService.loginUser).toHaveBeenCalledWith({
      username: 'jdoe',
      password: 'minecraft',
    } as LoginRequest);
  });
});
