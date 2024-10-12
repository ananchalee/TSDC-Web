import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


import { LoginComponent } from './login/login.component';
import { DashboardComponent} from './layout/dashboard/dashboard.component'
import { AuditCheckComponent } from './layout/audit-check/audit-check.component';
import { AuditCheckFullcartonComponent} from './layout/audit-check-fullcarton/audit-check-fullcarton.component';
import { EditBoxComponent } from './layout/edit-box/edit-box.component';
import { AuditCheckPrintOldComponent } from './layout/audit-check-Print-Old/audit-check-Print-Old.component';
import { AuditCheckPrintOldFullComponent } from './layout/audit-check-Print-Old-fullcarton/audit-check-Print-Old-fullcarton.component';
import { OutboundScantrackingComponent } from './layout/outbound-scantracking/outbound-scantracking.component';
import { RegisterPackComponent } from './layout/register-pack/register-pack.component';
import { ReportSorterComponent } from './layout/reports/report-sorter/report-sorter.component';

const routes: Routes = [

 
  { path: '', redirectTo: 'login',pathMatch:'full' },
  { path: 'login', component:LoginComponent },
  { path: 'dashboard', component:DashboardComponent },
  { path:'audit-check',component:AuditCheckComponent},
  { path:'audit-check-fullcarton',component:AuditCheckFullcartonComponent},
  { path:'edit-box', component:EditBoxComponent },
  { path:'audit-check-Print-Old',component:AuditCheckPrintOldComponent},
  { path:'audit-check-Print-Old-Full',component:AuditCheckPrintOldFullComponent},
  { path:'Outbound-Sacn-Tracking',component:OutboundScantrackingComponent},
  { path:'register-pack',component:RegisterPackComponent},
  { path:'report-sorter',component:ReportSorterComponent},

  { path: '**', redirectTo: 'login' } ,

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
