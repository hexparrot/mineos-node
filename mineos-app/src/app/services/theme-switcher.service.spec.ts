import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { UserPreferences } from '../models/user-preferences';

import { ThemeSwitcherService } from './theme-switcher.service';
import { UserPreferencesService } from './user-preferences.service';

describe('ThemeSwitcherService', () => {
  let service: ThemeSwitcherService;
  let mockUserPreferencesService: jasmine.SpyObj<UserPreferencesService>;

  beforeEach(() => {
    mockUserPreferencesService = jasmine.createSpyObj<UserPreferencesService>(
      'UserPreferencesService',
      ['getUserPreferences', 'saveUserPreferences']
    );
    mockUserPreferencesService.getUserPreferences.and.returnValue({
      darkMode: true,
    } as UserPreferences);
    mockUserPreferencesService.saveUserPreferences.and.callFake(function (
      data
    ) {});

    spyOn(document.body.classList, 'add').and.callThrough();
    spyOn(document.body.classList, 'remove').and.callThrough();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserPreferencesService,
          useValue: mockUserPreferencesService,
        },
      ],
    });
    service = TestBed.inject(ThemeSwitcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check user preferences for dark mode', fakeAsync(() => {
    service.initilizeTheme();
    let result = false;
    service.isDarkMode().subscribe((data) => {
      result = data;
    });
    tick();
    expect(result).toEqual(true);
    expect(mockUserPreferencesService.getUserPreferences).toHaveBeenCalledTimes(
      1
    );
  }));

  let testCases = [
    {
      oldStyle: 'light-theme',
      newStyle: 'dark-theme',
      dark: true,
    },
    {
      oldStyle: 'dark-theme',
      newStyle: 'light-theme',
      dark: false,
    },
  ];
  testCases.forEach(function (testCase) {
    it(`should change body style from ${testCase.oldStyle} to ${testCase.newStyle}`, () => {
      service.setMode(testCase.dark);
      expect(
        mockUserPreferencesService.saveUserPreferences
      ).toHaveBeenCalledWith({ darkMode: testCase.dark } as UserPreferences);
      expect(document.body.classList.add).toHaveBeenCalledWith(
        testCase.newStyle
      );
      expect(document.body.classList.remove).toHaveBeenCalledWith(
        testCase.oldStyle
      );
    });
  });
});
