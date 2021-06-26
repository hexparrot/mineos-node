import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthGuard } from './auth.guard';
import { AuthenticationService } from './services/authentication.service';
import { Router } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { of, Observable } from 'rxjs';
import { MockLocationStrategy } from '@angular/common/testing';
import { LocationStrategy } from '@angular/common';


describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockAuthenticationService: jasmine.SpyObj<AuthenticationService>;
  let routerMock: jasmine.SpyObj<Router>;
  let routeMock: any = { snapshot: {} };
  let routeStateMock: any = { snapshot: {}, url: 'login' };

  beforeEach(() => {
    mockAuthenticationService = jasmine.createSpyObj<AuthenticationService>(
      'AuthenticationService',
      {
        isAuthenticated: of(true),
      }
    );
    routerMock = jasmine.createSpyObj<Router>('Router', {
      navigate: Promise.resolve(true),
    });
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'login', component: LoginComponent },
        ]),
      ],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthenticationService, useValue: mockAuthenticationService },
        { provide: LocationStrategy, useClass: MockLocationStrategy }
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should redirect an unauthenticated user to the login route', fakeAsync(() => {
    mockAuthenticationService.isAuthenticated.and.returnValue(of(false));
    let resut = true;
    (
      guard.canActivate(routeMock, routeStateMock) as Observable<boolean>
    ).subscribe((data) => {
      resut = data;
    });
    tick();
    expect(resut).toEqual(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['login']);
  }));

  it('should allow the authenticated user to access app', fakeAsync(() => {
    let resut = false;
    (
      guard.canActivate(routeMock, routeStateMock) as Observable<boolean>
    ).subscribe((data) => {
      resut = data;
    });
    tick();
    expect(resut).toEqual(true);
  }));

  it('should allow the authenticated user to access child routes', fakeAsync(() => {
    let resut = false;
    (
      guard.canActivateChild(routeMock, routeStateMock) as Observable<boolean>
    ).subscribe((data) => {
      resut = data;
    });
    tick();
    expect(resut).toEqual(true);
  }));
});
