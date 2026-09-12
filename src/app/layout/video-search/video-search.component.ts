// video-search.component.ts
//
// ค้นหาวิดีโอการแพ็คที่อัดไว้ แล้วเปิดดู / ดาวน์โหลด
// อ่านจากตาราง TSDC_VIDEO_HD ผ่าน /search_video_hd  ตัวไฟล์มาจาก /video_hd_file/:id
//
// ไฟล์จริงอยู่บน share \\10.26.1.26\Dev\Video\ปี\เดือน\วัน\ เบราว์เซอร์เปิด UNC เองไม่ได้
// API จึงเป็นคนอ่านไฟล์แล้วส่งเป็น HTTP ให้ (รองรับ Range จึงลากแถบเวลาได้)
//
// ⚠️ ไม่ใช่ทุกแถวจะมีไฟล์ให้ดู — นับของจริงเมื่อ 12 ก.ย. 2026 ได้ 402 แถวที่อ้างว่ามีไฟล์
//    บน server แต่เปิดได้จริง 15 ที่เหลือถูกลบไปแล้ว หน้านี้จึงต้องแสดงแถวที่ไฟล์หายด้วย
//    พร้อมบอกเหตุผล ไม่ใช่ซ่อนทิ้ง ไม่งั้นคนค้นจะนึกว่าไม่เคยมีการอัด
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DataService } from '../../services/index';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

//// หนึ่งแถว = หนึ่งไฟล์วิดีโอ (ออเดอร์เดียวมีได้หลายไฟล์ เพราะอัดยาวเกินจะถูกตัดเป็น segment
//// และออเดอร์เดิมที่เอามาเช็คใหม่ก็ได้ไฟล์ชุดใหม่)
interface VideoRow {
  FNVideo_id:     number;
  FTVideo_name:   string;
  FTOrder_number: string;
  FTContainer_id: string;
  FTTracking_id:  string;
  FTTable_id:     string;
  FTZone:         string;
  FTPin_code:     string;
  FCFile_size:    number;   //// หน่วย MB (ของเดิมในตารางเก็บเป็น MB ไม่ใช่ไบต์)
  FNStaUpload:    number;
  FTStaDesc:      string;
  FDStartdate:    string;
  FDEnddate:      string;
  FDCreatedate:   string;
  FTPath:         string;
  FTPath_server:  string;
  FTUser_create:  string;
  FTCustomer_id:  string;
  FTShop_id:      string;   //// = SELLER_NO รหัสร้านที่ไลน์แพ็คใช้ (คอลัมน์เดียวกัน)
  FTShop_name_th: string;
  FTChannel_id:   string;
  FILE_STATUS:    'ready' | 'missing' | 'not_ready' | 'recording' | 'no_access';
  CAN_PLAY:       boolean;
}

//// ผลการค้นหาถูกจับกลุ่มตามเลขออเดอร์ เพราะคนค้นคิดเป็น "ออเดอร์" ไม่ใช่ "ไฟล์"
interface OrderGroup {
  orderNumber:  string;
  clips:        VideoRow[];
  customerId:   string;
  sellerNo:     string;
  shopName:     string;
  channelId:    string;
  /* ค่าที่ "ต่างกันได้ในออเดอร์เดียว" ต้องเก็บเป็น list ไม่ใช่ค่าเดียว
     ถ้าหยิบตัวแรกมาแสดงเป็นของทั้งออเดอร์จะกลายเป็นข้อมูลผิด
     ออเดอร์เดิมถูกเอามาเช็คใหม่คนละวัน คนละโต๊ะ คนละคน คนละพัสดุได้ทั้งหมด

     ยาว 1 = ทั้งออเดอร์ตรงกัน โชว์บนหัวการ์ดได้
     ยาว >1 = ต้องไปดูรายคลิป หัวการ์ดบอกแค่ว่ามีหลายค่า */
  trackingList:  string[];
  tableList:     string[];
  pinList:       string[];
  containerList: string[];
  firstStart:   string;
  lastEnd:      string;
  totalSizeMb:  number;
  playableCount: number;
}

@Component({
  selector:    'app-video-search',
  templateUrl: './video-search.component.html',
  styleUrls:   ['./video-search.component.scss']
})
export class VideoSearchComponent implements OnInit {

  pageactive: any;

  @ViewChild('inputOrder')  inputOrder!:  ElementRef<HTMLInputElement>;
  @ViewChild('sidePlayer')  sidePlayer!:  ElementRef<HTMLVideoElement>;
  @ViewChild('fullPlayer')  fullPlayer!:  ElementRef<HTMLVideoElement>;

  //// ตั้งใจไม่มีตัวกรอง "ช่วงวันที่" — ค้นด้วยวันอย่างเดียวจะลากทั้งวันมาแล้วต้องไปเช็ค
  //// ไฟล์บน share ทุกแถว ยิ่งวิดีโอเยอะยิ่งหนัก และไม่ตรงกับคำถามที่คนใช้งานจริงถาม
  //// (ถามว่า "ออเดอร์นี้อัดไว้ไหม" ไม่ได้ถามว่า "วันนี้อัดอะไรไปบ้าง")
  filter = {
    ORDER_NUMBER: '',
    SELLER_NO:    '',
    TRACKING_ID:  ''
  };

  isLoading  = false;
  hasSearched = false;
  truncated  = false;
  groups: OrderGroup[] = [];
  totalClips = 0;

  /* ---------------------------------------------------------------------
     การดูวิดีโอมี 2 ระดับ แยก state กันคนละตัว
       selected  = คลิปที่เลือกอยู่ เล่นในกรอบเล็กด้านขวา (อยู่ค้างระหว่างไล่ดูรายการ)
       expanded  = เปิดกรอบใหญ่เต็มจอทับหน้า ใช้ตอนอยากดูละเอียด

     ห้ามให้ทั้งสองกรอบเล่นพร้อมกัน ไม่งั้นจะได้ยินเสียงซ้อนกันสองชั้น
     และเปลือง bandwidth เป็นสองเท่าเพราะสตรีมไฟล์เดียวกันสองรอบ
     --------------------------------------------------------------------- */
  selected: VideoRow | null = null;
  selectedGroup: OrderGroup | null = null;
  selectedUrl = '';
  expanded = false;

  constructor(
    private dataService: DataService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const d = this.route.snapshot.data;
    // active = ชื่อหมวดเมนูใหญ่ใน menu.component.ts ใช้ตัดสินว่าจะไฮไลต์เมนูไหน
    // ไม่ใส่ = เมนูไม่ไฮไลต์เลย (ของเดิมขาดตัวนี้ไป)
    this.pageactive = [{
      active:   'VideoPackings',
      pagename: 'Video Search',
      menubar:  d.menubar,
      version:  d.version,
      lastupdate: d.lastupdate
    }];

    setTimeout(() => this.inputOrder?.nativeElement?.focus(), 200);
  }

  /* =====================================================================
     เวลา
     ---------------------------------------------------------------------
     คอลัมน์เป็น datetime ของ SQL ซึ่งเก็บ "เวลาหน้าปัด" ไม่มี timezone
     แต่ driver คืนมาเป็น ISO ที่ลงท้ายด้วย Z เช่น 2026-08-15T15:54:52.000Z
     ค่าจริงคือ 15:54:52 ตามเวลาไทย (ยืนยันได้จากชื่อไฟล์ที่ลงท้าย Time(15-54-52))

     ถ้าอ่านด้วย getHours() เบราว์เซอร์จะบวก +7 ให้กลายเป็น 22:54 ทันที
     จึงต้องอ่านด้วย getUTC* เท่านั้น
     ===================================================================== */
  private parts(iso: string): { y: number, mo: number, d: number, h: number, mi: number, s: number } | null {
    if (!iso) { return null; }
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) { return null; }
    return {
      y:  dt.getUTCFullYear(),
      mo: dt.getUTCMonth() + 1,
      d:  dt.getUTCDate(),
      h:  dt.getUTCHours(),
      mi: dt.getUTCMinutes(),
      s:  dt.getUTCSeconds()
    };
  }

  private pad(n: number): string { return n < 10 ? '0' + n : String(n); }

  //// 15/08/2026 15:54:52 — ปี ค.ศ. ตามที่ระบบอื่นในเว็บนี้ใช้
  fmtDateTime(iso: string): string {
    const p = this.parts(iso);
    if (!p) { return '-'; }
    return `${this.pad(p.d)}/${this.pad(p.mo)}/${p.y} ${this.pad(p.h)}:${this.pad(p.mi)}:${this.pad(p.s)}`;
  }

  fmtTime(iso: string): string {
    const p = this.parts(iso);
    if (!p) { return '-'; }
    return `${this.pad(p.h)}:${this.pad(p.mi)}:${this.pad(p.s)}`;
  }

  fmtDate(iso: string): string {
    const p = this.parts(iso);
    if (!p) { return '-'; }
    return `${this.pad(p.d)}/${this.pad(p.mo)}/${p.y}`;
  }

  /* ---------------------------------------------------------------------
     ช่วงเวลาของคลิป "15:52:30 – 15:53:12"
     วันที่อยู่บนหัวการ์ดของออเดอร์แล้ว ไม่ต้องซ้ำทุกแถว
     ยกเว้นคลิปที่ข้ามไปวันอื่น (อัดคร่อมเที่ยงคืน หรือออเดอร์เดิมเอามาเช็คใหม่คนละวัน)
     --------------------------------------------------------------------- */
  timeRange(row: VideoRow): string {
    const s = this.fmtTime(row.FDStartdate);
    if (!row.FDEnddate) { return s + ' – …'; }   // ยังอัดไม่จบ ไม่มีเวลาปิด
    return s + ' – ' + this.fmtTime(row.FDEnddate);
  }

  //// คืนวันที่ของคลิปเฉพาะตอนที่ไม่ตรงกับวันของการ์ด ไม่งั้นคืนค่าว่าง
  clipDateIfDifferent(row: VideoRow, g: OrderGroup): string {
    const a = this.fmtDate(row.FDStartdate);
    const b = this.fmtDate(g.firstStart);
    return a === b ? '' : a;
  }

  //// ช่วงวันของทั้งออเดอร์ — ถ้าอัดวันเดียวโชว์วันเดียว ถ้าคร่อมวันโชว์ทั้งช่วง
  groupDateLabel(g: OrderGroup): string {
    const a = this.fmtDate(g.firstStart);
    const b = this.fmtDate(g.lastEnd);
    return a === b ? a : a + ' – ' + b;
  }

  //// ความยาวคลิป — ไฟล์ที่ยังอัดไม่จบจะไม่มี FDEnddate
  duration(row: VideoRow): string {
    if (!row.FDStartdate || !row.FDEnddate) { return '-'; }
    const a = new Date(row.FDStartdate).getTime();
    const b = new Date(row.FDEnddate).getTime();
    if (isNaN(a) || isNaN(b) || b < a) { return '-'; }
    const sec = Math.round((b - a) / 1000);
    const m = Math.floor(sec / 60);
    return m > 0 ? `${m} นาที ${this.pad(sec % 60)} วิ` : `${sec} วิ`;
  }

  fmtSize(mb: number): string {
    const n = Number(mb);
    if (!n) { return '-'; }
    return n >= 1024 ? (n / 1024).toFixed(2) + ' GB' : n.toFixed(2) + ' MB';
  }

  /* ---------------------------------------------------------------------
     ป้ายสถานะไฟล์ — บอกให้ชัดว่าทำไมกดดูไม่ได้ แยกกันคนละสาเหตุ
     --------------------------------------------------------------------- */
  statusText(s: string): string {
    switch (s) {
      case 'ready':     return 'เปิดดูได้';
      case 'missing':   return 'ไม่พบไฟล์บน server';
      case 'not_ready': return 'ยังไม่ได้อัปโหลดขึ้น server';
      case 'recording': return 'กำลังอัดอยู่';
      case 'no_access': return 'API เข้าถึง share ไม่ได้';
      default:          return s || '-';
    }
  }

  statusClass(s: string): string {
    switch (s) {
      case 'ready':     return 'badge-success';
      case 'missing':   return 'badge-danger';
      case 'not_ready': return 'badge-secondary';
      case 'recording': return 'badge-warning';
      case 'no_access': return 'badge-dark';
      default:          return 'badge-light';
    }
  }

  hasFilter(): boolean {
    return !!(this.filter.ORDER_NUMBER.trim() || this.filter.SELLER_NO.trim()
           || this.filter.TRACKING_ID.trim());
  }

  search(): void {
    if (!this.hasFilter()) {
      Swal.fire({ icon: 'info', title: 'กรุณาระบุเลขออเดอร์ รหัสร้าน หรือเลขพัสดุ อย่างน้อย 1 อย่าง' });
      return;
    }
    if (this.isLoading) { return; }

    this.isLoading = true;
    this.hasSearched = true;
    // คลิปที่เลือกไว้เป็นของผลชุดเก่า ถ้าไม่ล้างจะค้างอยู่ในกรอบขวาทั้งที่ไม่มีในรายการแล้ว
    this.clearSelection();

    this.dataService.search_video_hd({
      ORDER_NUMBER: this.filter.ORDER_NUMBER.trim(),
      SELLER_NO:    this.filter.SELLER_NO.trim(),
      TRACKING_ID:  this.filter.TRACKING_ID.trim(),
      LIMIT:        200
    }).subscribe((res: any) => {
      this.isLoading = false;

      if (!res || res.status !== 'success') {
        this.groups = [];
        this.totalClips = 0;
        Swal.fire({ icon: 'error', title: 'ค้นหาไม่สำเร็จ', text: (res && res.message) || 'ไม่ทราบสาเหตุ' });
        return;
      }

      const rows: VideoRow[] = res.data || [];
      this.totalClips = rows.length;
      this.truncated  = !!res.truncated;
      this.groups     = this.groupByOrder(rows);

    }, (err: any) => {
      this.isLoading = false;
      this.groups = [];
      this.totalClips = 0;
      console.error('search_video_hd error:', err);
      Swal.fire({ icon: 'error', title: 'ติดต่อ API ไม่ได้', text: (err && err.message) || '' });
    });
  }

  clear(): void {
    this.filter = { ORDER_NUMBER: '', SELLER_NO: '', TRACKING_ID: '' };
    this.clearSelection();
    this.groups = [];
    this.totalClips = 0;
    this.truncated = false;
    this.hasSearched = false;
    setTimeout(() => this.inputOrder?.nativeElement?.focus(), 100);
  }

  /* ---------------------------------------------------------------------
     จัดกลุ่มตามเลขออเดอร์
     API ส่งมาเรียงตามเวลาใหม่ก่อน กลุ่มจึงเรียงตามออเดอร์ที่อัดล่าสุดโดยอัตโนมัติ
     แต่ "ในกลุ่ม" ต้องเรียงเก่าไปใหม่ เพราะ segment 001 → 002 คือลำดับการเล่น
     --------------------------------------------------------------------- */
  private groupByOrder(rows: VideoRow[]): OrderGroup[] {
    const map = new Map<string, VideoRow[]>();

    rows.forEach(r => {
      const key = r.FTOrder_number || '(ไม่มีเลขออเดอร์)';
      if (!map.has(key)) { map.set(key, []); }
      map.get(key)!.push(r);
    });

    const out: OrderGroup[] = [];

    map.forEach((clips, orderNumber) => {
      clips.sort((a, b) => {
        const ta = new Date(a.FDStartdate).getTime() || 0;
        const tb = new Date(b.FDStartdate).getTime() || 0;
        return ta - tb || a.FNVideo_id - b.FNVideo_id;
      });

      // ข้อมูลระดับออเดอร์อาจว่างในบางแถว (เช่น tracking ที่เพิ่งเลือกหลังเริ่มอัด)
      // จึงหยิบค่าแรกที่ไม่ว่างจากทั้งกลุ่ม ไม่ใช่จากแถวแรกอย่างเดียว
      const pick = (f: keyof VideoRow): string => {
        const hit = clips.find(c => c[f] !== null && c[f] !== undefined && String(c[f]).trim() !== '');
        return hit ? String(hit[f]) : '';
      };

      /* ค่าที่ไม่ซ้ำทั้งหมดของฟิลด์หนึ่งในกลุ่ม เรียงตามลำดับที่เจอ (= เรียงตามเวลาอัด)
         ---------------------------------------------------------------------
         ⚠️ ห้ามใช้ pick() กับฟิลด์ที่ต่างกันได้ในออเดอร์เดียว — จะได้ค่าเดียว
         มาแสดงเป็นของทั้งออเดอร์ ซึ่งเป็นข้อมูลผิด

         วัดจากของจริง 12 ก.ย. 2026 (355 ออเดอร์ · 69 ออเดอร์ที่มีหลายคลิป):
             โต๊ะไม่ตรงกัน       8 ออเดอร์
             PIN ไม่ตรงกัน       2 ออเดอร์
             container ไม่ตรงกัน 1 ออเดอร์
             tracking ไม่ตรงกัน  4 ออเดอร์
         เช่น 10120766-2113030 อัดที่ P31 คน 100476 วันที่ 22/05
         แล้วกลับมาอัดที่ P99 คน 140879 วันที่ 23/05 */
      const uniq = (f: keyof VideoRow): string[] =>
        clips.map(c => String(c[f] == null ? '' : c[f]).trim())
             .filter((v, i, arr) => v !== '' && arr.indexOf(v) === i);

      out.push({
        orderNumber,
        clips,
        customerId:  pick('FTCustomer_id'),
        sellerNo:    pick('FTShop_id'),
        shopName:    pick('FTShop_name_th'),
        channelId:   pick('FTChannel_id'),
        containerList: uniq('FTContainer_id'),
        trackingList:  uniq('FTTracking_id'),
        tableList:     uniq('FTTable_id'),
        pinList:       uniq('FTPin_code'),
        firstStart:  clips[0].FDStartdate,
        lastEnd:     clips[clips.length - 1].FDEnddate || clips[clips.length - 1].FDStartdate,
        totalSizeMb: clips.reduce((s, c) => s + (Number(c.FCFile_size) || 0), 0),
        playableCount: clips.filter(c => c.CAN_PLAY).length
      });
    });

    // เรียงกลุ่มด้วยเวลาอัดล่าสุดของกลุ่ม ใหม่สุดอยู่บน
    out.sort((a, b) => {
      const ta = new Date(a.clips[a.clips.length - 1].FDStartdate).getTime() || 0;
      const tb = new Date(b.clips[b.clips.length - 1].FDStartdate).getTime() || 0;
      return tb - ta;
    });

    return out;
  }

  /* ---------------------------------------------------------------------
     เปิดดู / ดาวน์โหลด
     --------------------------------------------------------------------- */

  //// เลือกคลิปมาเล่นในกรอบเล็กด้านขวา
  play(row: VideoRow, g: OrderGroup): void {
    if (!row.CAN_PLAY) {
      Swal.fire({ icon: 'warning', title: 'เปิดดูไม่ได้', text: this.statusText(row.FILE_STATUS) });
      return;
    }
    this.selected = row;
    this.selectedGroup = g;
    this.selectedUrl = this.dataService.video_hd_file_url(row.FNVideo_id);
    this.expanded = false;

    /* เลื่อนให้เห็นกรอบขวาครบทั้งกล่อง
       กล่องนี้ sticky แต่ตอนหน้ายังอยู่บนสุด มันอยู่ที่ตำแหน่งปกติซึ่งค่อนลงมา
       ปุ่ม "ดูเต็มจอ" กับ "ดาวน์โหลด" จึงตกขอบจอทันทีที่กดเลือกคลิป
       (วัดจริงบนจอสูง 855px: ปุ่มอยู่ที่ 886)

       ใช้ block:'nearest' เพื่อเลื่อนเท่าที่จำเป็น ถ้าเห็นครบอยู่แล้วจะไม่ขยับเลย
       ไม่ไปกวนจังหวะของคนที่กำลังไล่ดูรายการอยู่
       setTimeout เพื่อรอ Angular วาดกล่องก่อน ไม่งั้นวัดตำแหน่งตอนยังไม่มี DOM */
    setTimeout(() => {
      const el = this.sidePlayer?.nativeElement?.closest('.preview-box');
      if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }, 60);
  }

  isSelected(row: VideoRow): boolean {
    return !!this.selected && this.selected.FNVideo_id === row.FNVideo_id;
  }

  //// ขยายคลิปที่เลือกอยู่ขึ้นกรอบใหญ่ — หยุดกรอบเล็กก่อนเสมอ กันเสียงซ้อน
  expand(): void {
    if (!this.selected) { return; }
    this.stopEl(this.sidePlayer, false);
    this.expanded = true;
  }

  //// ปิดกรอบใหญ่ กลับไปเหลือแต่กรอบเล็ก (ไม่เล่นต่อเอง ให้ผู้ใช้กดเอง)
  closeExpanded(): void {
    this.stopEl(this.fullPlayer, true);
    this.expanded = false;
  }

  //// ปิดกรอบเล็กทิ้งไปเลย
  clearSelection(): void {
    this.stopEl(this.sidePlayer, true);
    this.stopEl(this.fullPlayer, true);
    this.selected = null;
    this.selectedGroup = null;
    this.selectedUrl = '';
    this.expanded = false;
  }

  /* หยุดวิดีโอให้สนิท
     pause() อย่างเดียวไม่พอ — Chrome ยังคาการดาวน์โหลดสตรีมไว้เบื้องหลัง
     ต้องถอด src แล้ว load() ใหม่ถึงจะตัดการเชื่อมต่อจริง
     clearSrc = false ใช้ตอนแค่พักไว้ชั่วคราว (สลับไปกรอบใหญ่) จะได้ไม่ต้องโหลดใหม่ตอนกลับมา */
  private stopEl(ref: ElementRef<HTMLVideoElement> | undefined, clearSrc: boolean): void {
    const el = ref?.nativeElement;
    if (!el) { return; }
    el.pause();
    if (clearSrc) {
      el.removeAttribute('src');
      el.load();
    }
  }

  download(row: VideoRow): void {
    if (!row.CAN_PLAY) {
      Swal.fire({ icon: 'warning', title: 'ดาวน์โหลดไม่ได้', text: this.statusText(row.FILE_STATUS) });
      return;
    }
    // ให้เบราว์เซอร์โหลดตรงจาก API — ไม่ผ่าน blob เพราะคลิปหลักร้อย MB จะกินแรมทั้งก้อน
    // และ Content-Disposition จากฝั่ง API เป็นตัวบังคับให้เซฟแทนที่จะเปิดในแท็บ
    window.location.href = this.dataService.video_hd_file_url(row.FNVideo_id, true);
  }

  //// ใช้กับ *ngFor ของรายการคลิป ให้ Angular reuse DOM เดิมแทนที่จะสร้างใหม่ทุกรอบ
  trackByVideoId(_i: number, row: VideoRow) { return row.FNVideo_id; }
  trackByOrder(_i: number, g: OrderGroup)   { return g.orderNumber; }
}
