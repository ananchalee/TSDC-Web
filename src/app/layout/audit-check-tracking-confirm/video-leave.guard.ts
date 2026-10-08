import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { AuditCheckTrackingConfirmComponent } from './audit-check-tracking-confirm.component';

// กดไปเมนูอื่นระหว่างที่วิดีโอยังอัดค้าง — ให้หน้าเช็คถามก่อนว่าจะหยุดบันทึกแล้วออกไหม
// (ออกจากหน้าเฉยๆ ไม่ได้สั่ง agent หยุด วิดีโอจะอัดค้างต่อไปเรื่อยๆ)
@Injectable({ providedIn: 'root' })
export class VideoLeaveGuard implements CanDeactivate<AuditCheckTrackingConfirmComponent> {
  canDeactivate(component: AuditCheckTrackingConfirmComponent): boolean | Promise<boolean> {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
