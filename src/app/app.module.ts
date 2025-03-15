import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { LoginComponent } from './login/login.component';
import { HeaderComponent } from './layout/header/header.component';
import { MenuComponent } from './layout/menu/menu.component';
import { AuditCheckFullcartonComponent } from './layout/audit-check-fullcarton/audit-check-fullcarton.component';
import { DataService } from './services/index';


import { HttpClientModule } from '@angular/common/http';

import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { AuditCheckComponent } from './layout/audit-check/audit-check.component';
import { EditBoxComponent } from './layout/edit-box/edit-box.component';
import { AuditCheckPrintOldComponent } from './layout/audit-check-Print-Old/audit-check-Print-Old.component';
import { AuditCheckPrintOldFullComponent } from './layout/audit-check-Print-Old-fullcarton/audit-check-Print-Old-fullcarton.component';
import { NgxBarcode6Module } from 'ngx-barcode6';

import {DataTablesModule} from 'angular-datatables';
import { OutboundScantrackingComponent } from './layout/outbound-scantracking/outbound-scantracking.component';
import { OutboundRoutingComponent } from './layout/outbound-routing/outbound-routing.component';
import { RegisterPackComponent } from './layout/register-pack/register-pack.component';
import { ReportSorterComponent } from './layout/reports/report-sorter/report-sorter.component';
import { MoniterStatusRTSComponent } from './layout/moniter-statusRTS/moniter-statusRTS.component';





@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HeaderComponent,
    MenuComponent,
 
    DashboardComponent,
    AuditCheckComponent,
    EditBoxComponent,
    AuditCheckFullcartonComponent,
    AuditCheckPrintOldComponent,
    AuditCheckPrintOldFullComponent,
    OutboundScantrackingComponent,
    OutboundRoutingComponent,
    RegisterPackComponent,
    ReportSorterComponent,
    MoniterStatusRTSComponent,


  
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgxBarcode6Module,
    DataTablesModule,
 

  ],
  providers: [
    DataService,
    {provide: LocationStrategy, useClass: HashLocationStrategy}
  ],
  bootstrap: [AppComponent]
  
})
export class AppModule { }
