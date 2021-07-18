import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoginRequest } from '../models/login-request';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private currentUser: User | undefined = undefined;
  private loggedIn$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );

  constructor(private http: HttpClient, private router: Router) {}

  isAuthenticated(): Observable<boolean> {
    let loggedIn: boolean = this.loggedIn$.getValue();
    if (loggedIn) {
      return this.loggedIn$.asObservable();
    } else {
      // Check server to see if they have an active session.
      return this.http
        .get<{ authenticated: false }>('/api/auth/is-authenticated')
        .pipe(
          map((result: { authenticated: boolean }) => {
            this.loggedIn$.next(result.authenticated);
            return result.authenticated;
          })
        );
    }
  }

  loginUser(loginRequest: LoginRequest): Observable<boolean> {
    // using FormData does not work due to backend expecting x-www-form-urlencoded not multipart/form-data
    const formData = new HttpParams()
      .set('username', loginRequest.username)
      .set('password', loginRequest.password);
    return this.http.post<User>(`/api/auth`, formData).pipe(
      map((user) => {
        this.currentUser = user;
        this.loggedIn$.next(true);
        this.router.navigate(['dashboard']);
        return true;
      })
    );
  }

  logoutUser(): Observable<boolean> {
    return this.http.get<User>(`/api/logout`).pipe(
      map((user) => {
        this.currentUser = undefined;
        this.loggedIn$.next(false);
        this.router.navigate(['login']);
        return true;
      })
    );
  }
}
