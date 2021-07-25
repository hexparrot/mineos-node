import { TestBed } from '@angular/core/testing';
import { UserPreferences } from '../models/user-preferences';

import { UserPreferencesService } from './user-preferences.service';

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let store: any = {};

  const mockLocalStorage = {
    getItem: (key: string): string => {
      return key in store ? store[key] : null;
    },
    setItem: (key: string, value: string) => {
      store[key] = `${value}`;
    },
  };

  beforeEach(() => {
    store = {};
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserPreferencesService);

    spyOn(localStorage, 'getItem').and.callFake(mockLocalStorage.getItem);
    spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get preferences from localStorage', () => {
    let data: UserPreferences = {
      darkMode: false,
    } as UserPreferences;
    store[service['preferencesKey']] = JSON.stringify(data);
    expect(service.getUserPreferences()).toEqual(data);
    expect(localStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('should get default preferences if localStorage is empty', () => {
    let data: UserPreferences = new UserPreferences();
    expect(service.getUserPreferences()).toEqual(data);
    expect(localStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('should save preferences to localStorage', () => {
    let data: UserPreferences = {
      darkMode: true,
    } as UserPreferences;
    service.saveUserPreferences(data);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      service['preferencesKey'],
      JSON.stringify(data)
    );
  });
});
