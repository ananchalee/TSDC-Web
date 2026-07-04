import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';


import { LoginComponent } from './login/login.component';
import { DashboardComponent} from './layout/dashboard/dashboard.component'
import { AuditCheckComponent } from './layout/audit-check/audit-check.component';
import { AuditCheckTrackingComponent } from './layout/audit-check-tracking/audit-check-tracking.component';
import { AuditCheckFullcartonComponent} from './layout/audit-check-fullcarton/audit-check-fullcarton.component';
import { EditBoxComponent } from './layout/edit-box/edit-box.component';
import { AuditCheckPrintOldComponent } from './layout/audit-check-Print-Old/audit-check-Print-Old.component';
import { AuditCheckPrintOldFullComponent } from './layout/audit-check-Print-Old-fullcarton/audit-check-Print-Old-fullcarton.component';
import { OutboundScantrackingComponent } from './layout/outbound-scantracking/outbound-scantracking.component';
import { RegisterPackComponent } from './layout/register-pack/register-pack.component';
import { ReportSorterComponent } from './layout/reports/report-sorter/report-sorter.component';
import { OutboundRoutingComponent } from './layout/outbound-routing/outbound-routing.component';
import { MoniterStatusRTSComponent } from './layout/moniter-statusRTS/moniter-statusRTS.component';
import { MoniterInterfaceErrorManHComponent} from './layout/moniter-InterfaceErrorManH/moniter-InterfaceErrorManH.component';
import { AWBComponent } from './layout/AWB/AWB.component';
import { MoniterTrackingOrderInternalComponent} from './layout/moniter-TrackingOrderInternal/moniter-TrackingOrderInternal.component';
import { ReportPrintOrderCancelComponent } from './layout/reports/report-print-ordercancel/report-print-ordercancel.component';
import { OutboundSignatureOrderCancelComponent } from './layout/outbound-signature-ordercancel/outbound-signature-ordercancel.component';
import { TsuruhaOrderdetailComponent }from './layout/TSURUHA/tsuruha-orderdetail/tsuruha-orderdetail.component'
import {TsuruhaMapInvoiceComponent} from './layout/TSURUHA/tsuruha-mapping-invoice/tsuruha-mapping-invoice.component';
import {ReportPackingListComponent} from './layout/reports/report-packinglist/report-packinglist.component';
import {ReportPrintWaveOrderComponent} from './layout/reports/report-print-waveorder/report-print-waveorder.component';
import {MonitorWaveOrdeComponent} from './layout/monitor-waveorde/monitor-waveorde.component';

const routes: Routes = [

 
  { path: '', redirectTo: 'login',pathMatch:'full' },
  { path: 'login', component:LoginComponent },
  {
    path: 'dashboard', component: DashboardComponent,
    data: { menubar: 'Dashboard', version: '1.0.0', lastupdate: '2026-01-20' }
  },
  {
    path: 'audit-check', component: AuditCheckComponent,
    data: { menubar: 'Audit Check Online A', version: '2.0.0', lastupdate: '2026-03-29' }
  },
  {
    path: 'audit-check-tracking', component: AuditCheckTrackingComponent,
    data: { menubar: 'Audit Check Online B', version: '2.0.1', lastupdate: '2026-07-04' }
  },
  {
    path: 'audit-check-fullcarton', component: AuditCheckFullcartonComponent,
    data: { menubar: 'Check Fullcarton', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'edit-box', component: EditBoxComponent,
    data: { menubar: 'แก้ไขขนาดกล่อง', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'audit-check-Print-Old', component: AuditCheckPrintOldComponent,
    data: { menubar: 'Audit Check Offline A', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'audit-check-Print-Old-Full', component: AuditCheckPrintOldFullComponent,
    data: { menubar: 'เช็คสินค้ายกลัง', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'Outbound-Sacn-Tracking', component: OutboundScantrackingComponent,
    data: { menubar: 'Tracking Order', version: '2.1.0', lastupdate: '2026-07-04' }
  },
  {
    path: 'register-pack', component: RegisterPackComponent,
    data: { menubar: 'ลงทะเบียนแพคสินค้า', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'report-sorter', component: ReportSorterComponent,
    data: { menubar: 'Report Sorter', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'Outbound-Routing', component: OutboundRoutingComponent,
    data: { menubar: 'Outbound Routing', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'monit-statusRTS', component: MoniterStatusRTSComponent,
    data: { menubar: 'RTS', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'monit-InterfaceError-ManH', component: MoniterInterfaceErrorManHComponent,
    data: { menubar: 'Interface Error', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'AWB', component: AWBComponent,
    data: { menubar: 'AWB', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'monit-Trackorderinternal', component: MoniterTrackingOrderInternalComponent,
    data: { menubar: 'Track Order Internal', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'report-printordercancel', component: ReportPrintOrderCancelComponent,
    data: { menubar: 'Report Print Order Cancel', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'Outbound-SignatureOrderCancel', component: OutboundSignatureOrderCancelComponent,
    data: { menubar: 'Signature Order Cancel', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'tsuruha-orderdetail', component: TsuruhaOrderdetailComponent,
    data: { menubar: 'Report Tsuruha', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'tsuruha-mappinginvoice', component: TsuruhaMapInvoiceComponent,
    data: { menubar: 'Map Invoice', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'report-packinglist', component: ReportPackingListComponent,
    data: { menubar: 'Report Packing List', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  {
    path: 'report-printWaveOrder', component: ReportPrintWaveOrderComponent,
    data: { menubar: 'Report Print Wave Order', version: '1.0.0', lastupdate: '2026-05-30' }
  },
  {
    path: 'monitor-waveorde', component: MonitorWaveOrdeComponent,
    data: { menubar: 'Monitor Wave Order', version: '1.0.0', lastupdate: '2026-01-01' }
  },
  { path: '**', redirectTo: 'login' } ,

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
