import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { AuthenticationService } from './authentication.service';
import { User } from '../models/user';
import { LoginRequest } from '../models/login-request';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginComponent } from '../components/login/login.component';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { MockLocationStrategy } from '@angular/common/testing';
import { LocationStrategy } from '@angular/common';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LocationStrategy, useClass: MockLocationStrategy },
      ],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'login', component: LoginComponent },
          { path: 'dashboard', component: DashboardComponent },
        ]),
        HttpClientTestingModule,
      ],
    });
    service = TestBed.inject(AuthenticationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should should cache authentication status', fakeAsync(() => {
    service['loggedIn$'].next(true);
    tick();
    let result: boolean = false;
    service.isAuthenticated().subscribe((data) => {
      result = data;
    });
    const request = httpMock.expectNone(`/api/auth/is-authenticated`);
    tick();
    expect(result).toEqual(true);
  }));

  it('should should check server session for authentication', fakeAsync(() => {
    let result: boolean = false;
    service.isAuthenticated().subscribe((data) => {
      result = data;
    });
    const request = httpMock.expectOne(`/api/auth/is-authenticated`);
    expect(request.request.method).toBe('GET');
    request.flush({ authenticated: true });
    tick();
    expect(result).toEqual(true);
  }));

  it('should return false if session is not authenticated', fakeAsync(() => {
    let result: boolean = true;
    service.isAuthenticated().subscribe((data) => {
      result = data;
    });
    const request = httpMock.expectOne(`/api/auth/is-authenticated`);
    expect(request.request.method).toBe('GET');
    request.flush({ authenticated: false });
    tick();
    expect(result).toEqual(false);
  }));

  it('should set currentUser on login', fakeAsync(() => {
    let login: LoginRequest = {
      username: 'jdoe',
      password: 'minecraft',
    } as LoginRequest;
    let user: User = {
      username: 'jdoe',
    } as User;

    service.loginUser(login).subscribe((response) => {
      expect(response).toEqual(true);
    });
    const request = httpMock.expectOne(`/api/auth`);
    expect(request.request.method).toBe('POST');
    request.flush(user);
    tick();
    expect(service['currentUser']).toEqual(user);
  }));

  it('should clear currentUser on logout', fakeAsync(() => {
    let user: User = {
      username: 'jdoe',
    } as User;

    service.logoutUser().subscribe((response) => {
      expect(response).toEqual(true);
    });
    const request = httpMock.expectOne(`/api/logout`);
    expect(request.request.method).toBe('GET');
    request.flush(user);
    tick();
    expect(service['currentUser']).toEqual(undefined);
  }));
});
