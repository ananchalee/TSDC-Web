import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/*
  ประกาศอัปเดตเมนู
  อ่านจาก <docsUrl>/updates.json (วางเองบน server ไม่ต้อง build เว็บใหม่) รูปแบบ:
  [
    {
      "route": "audit-check",            // path ของเมนูใน app-routing
      "version": "2.0.1",                // ตรงกับ version ใน app-routing
      "date": "2026-10-17",
      "title": "สแกนกล่องแล้วไปหน้า print ทันที",
      "detail": "ข้อความสั้นๆ (ไม่ใส่ก็ได้)",
      "files": ["audit-check/2026-10-17-audit-A-v2.0.1.pdf"]   // PDF หรือรูป, path เทียบกับ docsUrl
    }
  ]
*/
export interface UpdateNotice {
  route: string;
  version: string;
  date: string;
  title: string;
  detail?: string;
  file?: string;
  files?: string[];
}

@Injectable({ providedIn: 'root' })
export class UpdateNoticeService {

  readonly docsUrl: string = environment.docsUrl;
  private all$?: Observable<UpdateNotice[]>;

  constructor(private http: HttpClient) { }

  /** ประกาศของเมนูนี้ เฉพาะเวอร์ชันที่ไม่ใหม่กว่าตัวที่ deploy อยู่ เรียงใหม่สุดก่อน */
  getForRoute(route: string, currentVersion?: string): Observable<UpdateNotice[]> {
    const key = (route || '').toLowerCase();
    return this.loadAll().pipe(
      map(list => list
        .filter(n => (n.route || '').toLowerCase() === key)
        .filter(n => !currentVersion || this.compareVersion(n.version, currentVersion) <= 0)
        .sort((a, b) => this.compareVersion(b.version, a.version) || (b.date || '').localeCompare(a.date || '')))
    );
  }

  fileList(n: UpdateNotice): string[] {
    return (n.files && n.files.length) ? n.files : (n.file ? [n.file] : []);
  }

  fileUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) { return path; }
    return this.docsUrl + path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  }

  isImage(path: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(path);
  }

  // จำต่อเครื่องว่าเห็นประกาศเวอร์ชันไหนแล้ว (ไม่มี localStorage ก็แค่ขึ้น NEW ต่อไป)
  isSeen(route: string, version: string): boolean {
    try { return localStorage.getItem(this.seenKey(route)) === version; } catch (e) { return false; }
  }

  markSeen(route: string, version: string): void {
    try { localStorage.setItem(this.seenKey(route), version); } catch (e) { }
  }

  private seenKey(route: string): string {
    return 'tsdc-update-seen:' + (route || '').toLowerCase();
  }

  private loadAll(): Observable<UpdateNotice[]> {
    if (!this.all$) {
      // อ่านเป็น text เอง เพราะ Notepad ชอบเซฟ UTF-8 มี BOM ซึ่ง JSON.parse ไม่รับ
      this.all$ = this.http.get(this.docsUrl + 'updates.json?t=' + Date.now(), { responseType: 'text' }).pipe(
        map(text => {
          const list = JSON.parse(text.replace(/^﻿/, ''));
          return Array.isArray(list) ? list as UpdateNotice[] : [];
        }),
        catchError(err => {
          console.warn('[update-notice] อ่าน updates.json ไม่ได้', err);
          return of([] as UpdateNotice[]);
        }),
        shareReplay(1)
      );
    }
    return this.all$;
  }

  private compareVersion(a: string, b: string): number {
    const pa = String(a || '').split('.').map(x => parseInt(x, 10) || 0);
    const pb = String(b || '').split('.').map(x => parseInt(x, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) { return d; }
    }
    return 0;
  }
}
