import { Injectable } from '@angular/core';
import { UserPreferences } from '../models/user-preferences';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  private preferencesKey: string = 'MineOS-Preferences';
  constructor() {}
  getUserPreferences(): UserPreferences {
    let data = localStorage.getItem(this.preferencesKey);
    let result: UserPreferences = new UserPreferences();
    if (data) {
      result = JSON.parse(data);
    }
    return result;
  }
  saveUserPreferences(data: UserPreferences): void {
    return localStorage.setItem(this.preferencesKey, JSON.stringify(data));
  }
}
