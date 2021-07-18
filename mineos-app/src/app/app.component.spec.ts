import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { MockLocationStrategy } from '@angular/common/testing';
import { LocationStrategy } from '@angular/common';
import { ThemeSwitcherService } from './services/theme-switcher.service';
import { HeaderComponent } from './components/header/header.component';
import { MockComponent } from 'ng-mocks';

describe('AppComponent', () => {
  let mockThemeSwitcherService: jasmine.SpyObj<ThemeSwitcherService>;
  beforeEach(async () => {
    mockThemeSwitcherService = jasmine.createSpyObj<ThemeSwitcherService>('ThemeSwitcherService',['initilizeTheme']);
    await TestBed.configureTestingModule({
      providers: [
        { provide: ThemeSwitcherService, useValue: mockThemeSwitcherService },
        { provide: LocationStrategy, useClass: MockLocationStrategy },
      ],
      declarations: [AppComponent, MockComponent(HeaderComponent)],
      imports: [RouterTestingModule],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should initialze theme`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(mockThemeSwitcherService.initilizeTheme).toHaveBeenCalledTimes(1);
  });
});
