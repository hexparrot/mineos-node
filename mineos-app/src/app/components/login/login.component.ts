import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthenticationService } from '../../services/authentication.service';
import { LoginRequest } from '../../models/login-request';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public hidePassword: boolean = false;
  public loginForm: FormGroup;

  constructor(
    private authService: AuthenticationService,
    private formBuilder: FormBuilder
  ) {
    this.loginForm = this.formBuilder.group({
      username: '',
      password: '',
    });
  }

  ngOnInit(): void {}

  login(): void {
    const loginRequest: LoginRequest = {
      username: this.loginForm.controls.username.value,
      password: this.loginForm.controls.password.value,
    };

    this.authService.loginUser(loginRequest).subscribe();
  }
}
