import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { ThemeSwitcherService } from '../../services/theme-switcher.service';
import { AuthenticationService } from '../../services/authentication.service';
import { ThemePalette } from '@angular/material/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  background: ThemePalette = undefined;
  darkMode:Observable<boolean>;
  userLoggedIn:Observable<boolean>;
  constructor(private authService: AuthenticationService, private themeSwitcher:ThemeSwitcherService) {
    this.userLoggedIn = this.authService.isAuthenticated();
    this.darkMode = this.themeSwitcher.isDarkMode();
  }

  logout() {
    this.authService.logoutUser().subscribe();
  }

  public changeMode(isDark:boolean):void{
    this.themeSwitcher.setMode(isDark);
  }
}
