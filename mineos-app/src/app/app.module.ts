import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MomentModule } from 'ngx-moment';
import { ChartsModule } from 'ng2-charts';

// Material UI
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { ReactiveFormsModule } from '@angular/forms';

// App Components
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AppRoutingModule } from './app-routing.module';
import { HeaderComponent } from './components/header/header.component';
import { ServerDetailsComponent } from './components/server-details/server-details.component';
import { StatusComponent } from './components/status/status.component';
import { EnvironmentComponent } from './components/environment/environment.component';
import { RestorePointComponent } from './components/restore-point/restore-point.component';
import { ArchiveComponent } from './components/archive/archive.component';
import { SchedulingComponent } from './components/scheduling/scheduling.component';
import { LoggingComponent } from './components/logging/logging.component';
import { ProfilesComponent } from './components/profiles/profiles.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { ActiveServerListComponent } from './components/active-server-list/active-server-list.component';
import { ServerCardComponent } from './components/mini-cards/server-card/server-card.component';
import { PlayerCardComponent } from './components/mini-cards/player-card/player-card.component';
import { UptimeCardComponent } from './components/mini-cards/uptime-card/uptime-card.component';
import { MemoryCardComponent } from './components/mini-cards/memory-card/memory-card.component';
import { BytesToMegabytesPipe } from './pipes/bytes-to-megabytes.pipe';
import { LoadAveragesComponent } from './components/load-averages/load-averages.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    HeaderComponent,
    ServerDetailsComponent,
    StatusComponent,
    EnvironmentComponent,
    RestorePointComponent,
    ArchiveComponent,
    SchedulingComponent,
    LoggingComponent,
    ProfilesComponent,
    CalendarComponent,
    ActiveServerListComponent,
    ServerCardComponent,
    PlayerCardComponent,
    UptimeCardComponent,
    MemoryCardComponent,
    BytesToMegabytesPipe,
    LoadAveragesComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MomentModule,
    ChartsModule,
    MatGridListModule,
    MatCardModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    LayoutModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatRadioModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
