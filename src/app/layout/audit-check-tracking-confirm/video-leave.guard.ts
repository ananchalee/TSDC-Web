import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

// หน้าเช็คที่อัดวิดีโอ (Audit Check Online A / B / C) ต้องมี canDeactivate() ของตัวเอง
export interface VideoLeaveAware {
  canDeactivate?: () => boolean | Promise<boolean>;
}

// กดไปเมนูอื่นระหว่างที่วิดีโอยังอัดค้าง — ให้หน้าเช็คถามก่อนว่าจะหยุดบันทึกแล้วออกไหม
// (ออกจากหน้าเฉยๆ ไม่ได้สั่ง agent หยุด วิดีโอจะอัดค้างต่อไปเรื่อยๆ)
@Injectable({ providedIn: 'root' })
export class VideoLeaveGuard implements CanDeactivate<VideoLeaveAware> {
  canDeactivate(component: VideoLeaveAware): boolean | Promise<boolean> {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
