import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserPreferences } from '../models/user-preferences';
import { UserPreferencesService } from './user-preferences.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService {
  private darkMode$:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  constructor(private userPreferencesService:UserPreferencesService) {}

  initilizeTheme():void{
    let preferences:UserPreferences = this.userPreferencesService.getUserPreferences();
    this.setStyle(preferences.darkMode);
    this.darkMode$.next(preferences.darkMode);
  }

  isDarkMode(): Observable<boolean> {
    return this.darkMode$.asObservable();
  }

  setMode(isDark:boolean): void {
    let preferences:UserPreferences = this.userPreferencesService.getUserPreferences();
    preferences.darkMode = isDark;
    this.userPreferencesService.saveUserPreferences(preferences);
    this.setStyle(isDark);
    this.darkMode$.next(isDark);
  }

  private setStyle(dark:boolean):void{
    if (dark === true) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }
}
