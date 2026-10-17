import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataService } from '../../services/index';
import { UpdateNoticeService, UpdateNotice } from '../../services/update-notice.service';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  @Input() Pageactive: any; /// รับค่าเมนูจากค่าต่างๆ
  @Input() RepageTime: any; /// รับค่าหน้ารีเฟรชจาก Dashboard

  page: any = {};
  Repage: any = {};
  input: any = {};

  // ประกาศอัปเดตเมนู (ดู update-notice.service.ts)
  routeKey = '';
  notices: UpdateNotice[] = [];
  noticeNew = false;
  noticeOpen = false;
  selNotice: UpdateNotice | null = null;
  selFile = '';
  selFileUrl: SafeResourceUrl | null = null;

  pushRightClass: string = 'push-right';
  today = new Date();

  private destroy$ = new Subject<void>();
  private offset = 0; // ส่วนต่างระหว่าง server กับ client (ms)

  constructor(
    private dataService: DataService,
    public router: Router,
    public updateNotice: UpdateNoticeService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.Pageactive && this.Pageactive[0]) {
      this.page = this.Pageactive[0].pagename;
      this.input.menubar = this.Pageactive[0].menubar;
      this.input.version = this.Pageactive[0].version;
      this.input.lastupdate = this.Pageactive[0].lastupdate;
      this.input.PageDashboard = this.page === 'Dashboard';
    } else {
      this.input.PageDashboard = false;
    }

    this.loadNotices();

    // รีเฟรช RepageTime ทุกวินาที
    this.TimeRepage();
    setInterval(() => this.TimeRepage(), 1000);

    // ดึงเวลา server และนับต่อด้วย offset
    this.startTime();
  }

  loadNotices() {
    this.routeKey = (this.router.url || '').split(/[?#;]/)[0].replace(/^\/+/, '').split('/')[0];
    if (!this.routeKey) { return; }
    this.updateNotice.getForRoute(this.routeKey, this.input.version)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.notices = list;
        this.noticeNew = list.length > 0 && !this.updateNotice.isSeen(this.routeKey, list[0].version);
      });
  }

  openNotices() {
    if (!this.notices.length) { return; }
    this.noticeOpen = true;
    this.selectNotice(this.notices[0]);
    this.updateNotice.markSeen(this.routeKey, this.notices[0].version);
    this.noticeNew = false;
  }

  closeNotices() {
    this.noticeOpen = false;
    this.selFileUrl = null;
  }

  selectNotice(n: UpdateNotice) {
    this.selNotice = n;
    const files = this.updateNotice.fileList(n);
    this.selectFile(files.length ? files[0] : '');
  }

  selectFile(path: string) {
    this.selFile = path;
    // PDF ต้องผ่าน iframe จึงต้อง bypass; url มาจาก docsUrl ของเราเท่านั้น
    this.selFileUrl = path ? this.sanitizer.bypassSecurityTrustResourceUrl(this.updateNotice.fileUrl(path)) : null;
  }

  // คำนวณเวลาคงเหลือ (RepageTime)
  TimeRepage() {
    this.RepageTime = this.checkTime(this.RepageTime);
    this.Repage = this.RepageTime;
  }

  checkTimeRe(i: any) {
    if (i > 0) { i = i - 1; }
    return i;
  }

  // --- ฟังก์ชันหลักสำหรับเวลา server ---
  startTime() {
    this.dataService.getServerDate().subscribe(resp => {
      const serverDate = resp?.date ? new Date(resp.date) : new Date();
      const clientDate = new Date();

      // คำนวณ offset = server - client
      this.offset = serverDate.getTime() - clientDate.getTime();

      // แสดงครั้งแรก
      this.updateDateTimeDisplay(new Date(Date.now() + this.offset));

  
      interval(1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          const serverSyncedNow = new Date(Date.now() + this.offset);
          this.updateDateTimeDisplay(serverSyncedNow);
        });
    });
  }

  checkTime(i: any) {
    return i < 10 ? '0' + i : i;
  }

  updateDateTimeDisplay(current: Date) {
    const Datenow = current.toISOString().slice(0, 10);
    let h = current.getHours();
    let m = current.getMinutes();
    let s = current.getSeconds();

    m = this.checkTime(m);
    s = this.checkTime(s);

    this.input.time = `${h}:${m}:${s}`;
    this.input.datetimetoday = `${Datenow} ${h}:${m}:${s}`;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
