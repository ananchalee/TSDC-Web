// confirm-qty-groupsku.component.ts
//
// ยืนยันจำนวนชิ้นตอนเบิกของ — ใส่ PIN → สแกน Group Pick → สแกน barcode สินค้า 1 ครั้ง → กดยืนยัน
// เขียน USER_CONFIRM (pincode) + CONFIRM_DATE ลงทุกแถวของ GROUP_PICK นั้น
// อ่านข้อมูลจากตาราง TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU ตัวเดียวกับหน้า Print Tracking Group SKU
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { DataService } from '../../services/index';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

//// เอาเฉพาะคอลัมน์ที่หน้านี้ใช้ — ตัวเต็มอยู่ใน report-print-tracking-groupsku.component.ts
interface GroupSkuRow {
  GROUP_PICK:      string;
  SHIPMENT_ID:     string;
  ITEM_ID:         string;
  ITEM_ID_BARCODE: string;
  QTY:             number;
  USER_CONFIRM:    string;
  CONFIRM_DATE:    string;
}

@Component({
  selector:    'app-confirm-qty-groupsku',
  templateUrl: './confirm-qty-groupsku.component.html',
  styleUrls:   ['./confirm-qty-groupsku.component.scss']
})
export class ConfirmQtyGroupSkuComponent implements OnInit {

  pageactive: any;

  @ViewChild('inputPin')       inputPin!:       ElementRef<HTMLInputElement>;
  @ViewChild('inputGroupPick') inputGroupPick!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScanItem')  inputScanItem!:  ElementRef<HTMLInputElement>;
  @ViewChild('btnConfirm')     btnConfirm!:     ElementRef<HTMLButtonElement>;

  input = { PIN_CODE: '', GROUP_PICK: '', ITEM_BARCODE: '' };

  //// รายชื่อ pincode ทั้งหมด โหลดครั้งเดียวตอนเข้าหน้า แล้วเทียบในเครื่อง
  //// (ทำแบบเดียวกับ register-pack / AWB — ไม่มี API ตรวจ pin ทีละครั้ง)
  //// ใช้เฉพาะกรณีต้องกรอก PIN เอง (หา pin เดิมของ login นี้ไม่เจอ)
  userpin: any[] = [];

  //// ข้อมูลคนที่ยืนยัน — มาจาก pin เดิมที่ login นี้เคยเช็คอินไว้ (LOAD_USERTABLECHECK)
  //// โครงเดียวกับ audit-check-tracking: โชว์ USER_NAME + ชื่อ + นามสกุล
  userNameCode  = '';   //// USER_NAME (รหัสผู้ใช้) ตัวที่โชว์บนจอ ไม่ใช่ PIN
  workerName    = '';
  workerSurname = '';

  //// หา pin เดิมของ login นี้ไม่เจอ = ให้กรอก PIN เองแทน (เครื่องใหม่ / ยังไม่เคยเช็คอิน)
  pinLoadFailed = false;

  //// PIN ผ่านการตรวจแล้วหรือยัง — ต้องเป็นธงแยก ห้ามดูจาก input.PIN_CODE ว่ามีค่าไหม
  //// เพราะ [(ngModel)] เขียนค่าลงตัวแปรทุกครั้งที่พิมพ์ทีละตัว แค่กดตัวแรกก็จะผ่านทันที
  pinConfirmed = false;

  isLoading   = false;
  isConfirming = false;   //// กันกดปุ่มยืนยันซ้ำระหว่างรอ API

  rows: GroupSkuRow[] = [];
  loadedGroupPick = '';   //// group ของข้อมูลที่โหลดมาจริง ห้ามใช้ค่าในช่องสแกน

  itemScanned    = false;
  scannedBarcode = '';

  //// ข้อมูลการยืนยันของกลุ่มนี้ — มีค่า = ยืนยันไปแล้ว ปิดช่องสแกนสินค้าและปุ่มยืนยัน
  confirmed: { USER_CONFIRM: string, CONFIRM_DATE: string } | null = null;

  constructor(
    private dataService: DataService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data;
    const page: any[] = [];
    page.push({
      pagename:   'Confirm Qty Group SKU',
      active:     'Audit&Check',
      menubar:    d['menubar'],
      version:    d['version'],
      lastupdate: d['lastupdate']
    });
    this.pageactive = page;

    this.get_userpincode();
    this.LOAD_USERTABLECHECK();
  }

  // ── PIN ──────────────────────────────────────────────────────

  //// ดึง PIN เดิมที่ login คนนี้เคยใช้เช็คอินไว้ — เส้นเดียวกับที่ audit-check-tracking ใช้
  //// คีย์คือ TABLE_CHECK = WORKER_ID ของ user ที่ login อยู่ API คืนแถวล่าสุดของโต๊ะนั้น
  ////
  //// ทำแบบนี้เพื่อให้คนเบิกไม่ต้องพิมพ์ PIN ซ้ำทุกครั้งที่เข้าหน้านี้ — เครื่องหนึ่งเครื่อง
  //// ผูกกับคนคนเดียวอยู่แล้ว หา pin เดิมไม่เจอค่อยให้กรอกเอง
  LOAD_USERTABLECHECK(): void {
    let workerId = '';
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      workerId = (user.WORKER_ID || '').toString().trim();
    } catch (err) {
      console.log('currentUser parse', err);
    }

    if (!workerId) {
      this.pinLoadFailed = true;
      this.focusEl('inputPin');
      return;
    }

    this.dataService.LOAD_USERTABLECHECK({ TABLE_CHECK: workerId }).subscribe((res: any) => {
      if (res.status === 'success' && res.data && res.data.length > 0) {
        const u = res.data[0];
        this.input.PIN_CODE = (u.PIN_CODE || '').toString().trim();
        this.userNameCode   = (u.USER_NAME || '').toString().trim();
        this.workerName     = (u.WORKER_NAME || '').toString().trim();
        this.workerSurname  = (u.WORKER_SURNAME || '').toString().trim();

        if (this.input.PIN_CODE) {
          //// ได้ pin แล้ว ข้ามขั้นใส่ PIN ไปสแกน Group Pick ได้เลย
          this.pinConfirmed = true;
          this.focusEl('inputGroupPick');
          return;
        }
      }

      //// ยังไม่เคยเช็คอินด้วยเครื่อง/ผู้ใช้นี้ — ถอยไปให้กรอก PIN เอง
      this.pinLoadFailed = true;
      this.focusEl('inputPin');

    }, (err: any) => {
      console.log('LOAD_USERTABLECHECK error', err);
      this.pinLoadFailed = true;
      this.focusEl('inputPin');
    });
  }

  get_userpincode(): void {
    this.dataService.get_userpincode().subscribe((res: any) => {
      if (res.status === 'success') {
        this.userpin = res.data || [];
      } else {
        console.log('get_userpincode', res);
        Swal.fire({ icon: 'error', title: 'โหลดรายชื่อ PIN ไม่สำเร็จ',
                    text: 'กรุณาติดต่อ ADMIN', showConfirmButton: false, timer: 2500 });
      }
    }, (err: any) => {
      console.log('get_userpincode error', err);
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อ Server ไม่ได้',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  //// กรอก PIN เอง — ใช้เฉพาะตอนหา pin เดิมของ login นี้ไม่เจอ
  checkPin(): void {
    const pin = (this.input.PIN_CODE || '').toString().trim();
    if (!pin) { return; }

    const found = this.userpin.find(u => String(u.PIN_CODE).trim() === pin);
    if (!found) {
      this.input.PIN_CODE = '';
      this.userNameCode   = '';
      this.workerName     = '';
      this.workerSurname  = '';
      this.pinConfirmed   = false;
      this.playAudio('error.mp3');
      Swal.fire({ icon: 'warning', title: 'PIN CODE ไม่ถูกต้อง',
                  showConfirmButton: false, timer: 2000 })
          .then(() => this.focusEl('inputPin'));
      return;
    }

    this.input.PIN_CODE = pin;
    this.userNameCode   = (found.USER_NAME || '').toString().trim();
    this.workerName     = (found.WORKER_NAME || '').toString().trim();
    this.workerSurname  = (found.WORKER_SURNAME || '').toString().trim();
    this.pinConfirmed   = true;
    this.playAudio('ok.mp3');
    this.focusEl('inputGroupPick');
  }

  //// เปลี่ยนคน — ล้างทุกอย่างแล้วต้องกรอก PIN ใหม่เองให้ผ่านก่อนเสมอ
  //// ไม่ดึง pin เดิมกลับมาทับ ไม่งั้นกดเปลี่ยนคนแล้วได้คนเดิมกลับมา
  changeUser(): void {
    this.input = { PIN_CODE: '', GROUP_PICK: '', ITEM_BARCODE: '' };
    this.userNameCode  = '';
    this.workerName    = '';
    this.workerSurname = '';
    this.pinConfirmed  = false;
    this.pinLoadFailed = true;
    this.clearGroup();
    this.focusEl('inputPin');
  }

  //// ผ่านขั้นแรกแล้วหรือยัง — ไม่ว่าจะมาจาก pin เดิมที่ดึงมาให้ หรือกรอกเองแล้วตรวจผ่าน
  get isPinOk(): boolean {
    return this.pinConfirmed;
  }

  //// ชื่อ-นามสกุลคนเบิก สำหรับโชว์บนหน้าจอ
  get workerFullName(): string {
    const name = (this.workerName + ' ' + this.workerSurname).trim();
    return name || '-';
  }

  //// รูปแบบที่โชว์ทั้งหน้า: "USER_NAME : ชื่อ นามสกุล"
  get userLabel(): string {
    return this.formatUser(this.userNameCode, this.workerName, this.workerSurname);
  }

  //// แปลง PIN_CODE ที่เก็บใน DB กลับเป็นชื่อคน สำหรับกล่อง "ยืนยันแล้ว"
  //// DB เก็บแค่ pincode (ตามที่ตกลงไว้) จึงต้องหาจากรายชื่อ get_userpincode ตอนแสดงผล
  //// หาไม่เจอ (คนลาออก / pin ถูกลบ) คืน pin ดิบไว้ ดีกว่าโชว์ '-' แล้วไม่รู้ว่าใครยืนยัน
  userLabelOfPin(pin: string): string {
    const code = (pin || '').toString().trim();
    if (!code) { return '-'; }

    const u = this.userpin.find(x => String(x.PIN_CODE).trim() === code);
    if (!u) { return code; }

    return this.formatUser(u.USER_NAME, u.WORKER_NAME, u.WORKER_SURNAME) || code;
  }

  formatUser(userName: any, name: any, surname: any): string {
    const code = (userName || '').toString().trim();
    const full = ((name || '') + ' ' + (surname || '')).toString().trim();

    if (code && full) { return code + ' : ' + full; }
    return code || full || '';
  }

  // ── Group Pick ───────────────────────────────────────────────

  //// สแกน Group Pick — โหลดรายการของกลุ่มนั้นมาสรุปจำนวน
  loadGroup(): void {
    const group = (this.input.GROUP_PICK || '').trim();
    if (!group) { return; }

    if (!this.isPinOk) {
      Swal.fire({ icon: 'warning', title: 'ใส่ PIN CODE ก่อน',
                  showConfirmButton: false, timer: 2000 })
          .then(() => this.focusEl('inputPin'));
      return;
    }

    this.clearGroup();
    this.isLoading = true;

    this.dataService.Get_TrackingGroupSku({ GROUP_PICK: group }).subscribe((res: any) => {
      this.isLoading = false;

      if (res.status === 'null' || !res.data || res.data.length === 0) {
        this.input.GROUP_PICK = '';
        this.playAudio('error.mp3');
        Swal.fire({ icon: 'warning', title: 'ไม่พบข้อมูล',
                    text: 'Group Pick : ' + group, showConfirmButton: false, timer: 2500 })
            .then(() => this.focusEl('inputGroupPick'));
        return;
      }

      if (res.status !== 'success') {
        console.log('Get_TrackingGroupSku', res);
        this.input.GROUP_PICK = '';
        this.playAudio('error.mp3');
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                    showConfirmButton: false, timer: 2500 });
        return;
      }

      this.rows = res.data as GroupSkuRow[];
      this.loadedGroupPick = (this.rows[0].GROUP_PICK || '').trim() || group;

      //// ยืนยันไปแล้ว = โชว์รายละเอียดคนยืนยัน แล้วปิดช่องสแกนสินค้าทิ้ง ไม่ต้องทำอะไรต่อ
      const done = this.rows.find(r => !!r.CONFIRM_DATE);
      if (done) {
        this.confirmed = { USER_CONFIRM: done.USER_CONFIRM, CONFIRM_DATE: done.CONFIRM_DATE };
        this.playAudio('error.mp3');
        this.focusEl('inputGroupPick');
        return;
      }

      this.playAudio('ok.mp3');
      this.focusEl('inputScanItem');

    }, (err: any) => {
      console.log('Get_TrackingGroupSku error', err);
      this.isLoading = false;
      this.input.GROUP_PICK = '';
      this.playAudio('error.mp3');
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อ Server ไม่ได้',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  //// ล้างเฉพาะส่วนของกลุ่ม — PIN กับชื่อคนยังอยู่ จะได้ยิงกลุ่มถัดไปต่อได้เลย
  clearGroup(): void {
    this.rows            = [];
    this.loadedGroupPick = '';
    this.itemScanned     = false;
    this.scannedBarcode  = '';
    this.confirmed       = null;
    this.input.ITEM_BARCODE = '';
  }

  //// เริ่มกลุ่มถัดไป — คนเดิมเบิกต่อได้ทันที ไม่ต้องใส่ PIN ใหม่
  nextGroup(): void {
    this.input.GROUP_PICK = '';
    this.clearGroup();
    this.focusEl('inputGroupPick');
  }

  // ── สรุปจำนวน ────────────────────────────────────────────────

  get hasGroup(): boolean {
    return this.rows.length > 0;
  }

  qtyOf(row: GroupSkuRow): number {
    const n = Number(row.QTY);
    return isNaN(n) ? 0 : n;
  }

  //// จำนวนชิ้นรวมทั้งกลุ่ม — นับทุกแถว ไม่สนว่าพิมพ์ tracking ไปแล้วหรือยัง
  //// เพราะเป็นการนับของตอนเบิก คนละเรื่องกับการพิมพ์
  get totalQty(): number {
    return this.rows.reduce((sum, r) => sum + this.qtyOf(r), 0);
  }

  //// จำนวน order ในกลุ่ม (SHIPMENT_ID ไม่ซ้ำ)
  get orderCount(): number {
    const seen = new Set<string>();
    this.rows.forEach(r => {
      const id = (r.SHIPMENT_ID || '').trim();
      if (id) { seen.add(id); }
    });
    return seen.size;
  }

  //// ไม่มีตัวเลข "ต่อ 1 order" ในหน้านี้ — ฝั่งเบิกของนับ QTY กับ order ตาม GROUP_PICK
  //// ทั้งก้อน ไม่สน SUB_GROUP_PICK ซึ่งเป็นตัวแยกของที่จำนวนต่อ order ไม่เท่ากัน
  //// เลขต่อ order จึงไม่มีความหมายตรงนี้ (ตัวเลขนั้นอยู่ในหน้า Print Tracking Group SKU
  //// ที่แยกการ์ดตาม sub group แล้ว)

  //// รหัสสินค้าในกลุ่ม — ปกติมีตัวเดียว แต่รองรับหลายตัวไว้
  get itemIds(): string[] {
    const seen = new Set<string>();
    this.rows.forEach(r => {
      const id = (r.ITEM_ID || '').toString().trim();
      if (id) { seen.add(id); }
    });
    return Array.from(seen);
  }

  get itemText(): string {
    return this.itemIds.length ? this.itemIds.join(', ') : '—';
  }

  // ── สแกนสินค้า ───────────────────────────────────────────────

  normalizeBarcode(value: any): string {
    return (value === null || value === undefined ? '' : String(value)).trim().toUpperCase();
  }

  get barcodes(): string[] {
    const seen = new Set<string>();
    this.rows.forEach(r => {
      const code = this.normalizeBarcode(r.ITEM_ID_BARCODE);
      if (code) { seen.add(code); }
    });
    return Array.from(seen);
  }

  //// กลุ่มนี้มี barcode ให้เทียบไหม — ไม่มี = ข้อมูลต้นทางไม่ครบ ต้องไปแก้ที่ข้อมูล
  get hasBarcodeData(): boolean {
    return this.barcodes.length > 0;
  }

  //// ต้องสแกนผ่านเสมอ ไม่มีทางลัด — ยืนยันจำนวนโดยไม่ได้ตรวจของ คือความเสี่ยงที่ของจะตกหล่น
  //// ข้อมูลไม่มี barcode คือกรณีที่ต้องตรวจเข้มที่สุด ไม่ใช่กรณีที่ควรได้ข้ามด่าน
  get isItemScanOk(): boolean {
    return this.itemScanned;
  }

  //// สแกน barcode สินค้า 1 ครั้ง — ถูกแล้วไปโฟกัสปุ่มยืนยันเลย
  scanItem(): void {
    if (this.itemScanned || this.confirmed) { return; }

    const code = this.normalizeBarcode(this.input.ITEM_BARCODE);
    if (!code) { return; }

    //// ข้อมูลกลุ่มนี้ไม่มี barcode เลย — บอกตรงๆ ว่าต้องไปแก้ที่ข้อมูล
    //// ไม่ใช้ข้อความ "Item ไม่ถูกต้อง" เพราะของที่พนักงานถืออยู่อาจถูกแล้ว ปัญหาอยู่ที่ข้อมูล
    if (!this.hasBarcodeData) {
      this.input.ITEM_BARCODE = '';
      this.playAudio('error.mp3');
      Swal.fire({
        icon: 'warning',
        title: 'กลุ่มนี้ไม่มีข้อมูล barcode สินค้า',
        html: 'Group Pick : <b>' + this.loadedGroupPick + '</b>'
      }).then(() => this.focusEl('inputScanItem'));
      return;
    }

    if (this.barcodes.indexOf(code) === -1) {
      this.input.ITEM_BARCODE = '';
      this.playAudio('error.mp3');
      Swal.fire({
        icon: 'error',
        title: 'Item ไม่ถูกต้อง',
        html: 'barcode ที่สแกน : <b style="color:#dc3545">' + code + '</b><br>'
            + '<small>กลุ่มนี้ต้องเป็นสินค้า <b>' + this.itemText + '</b></small>'
      }).then(() => this.focusEl('inputScanItem'));
      return;
    }

    this.itemScanned    = true;
    this.scannedBarcode = code;
    this.playAudio('ok.mp3');
    this.focusEl('btnConfirm');
  }

  // ── ยืนยัน ───────────────────────────────────────────────────

  get canConfirm(): boolean {
    return this.hasGroup && !this.confirmed && this.isItemScanOk && !this.isConfirming;
  }

  confirmQty(): void {
    if (!this.canConfirm) { return; }

    this.isConfirming = true;

    const payload = {
      GROUP_PICK:   this.loadedGroupPick,
      USER_CONFIRM: this.input.PIN_CODE
    };

    this.dataService.Confirm_QtyGroupSku(payload).subscribe((res: any) => {
      this.isConfirming = false;

      if (res.status === 'success') {
        const d = (res.data && res.data[0]) || {};
        this.confirmed = { USER_CONFIRM: d.USER_CONFIRM, CONFIRM_DATE: d.CONFIRM_DATE };
        this.playAudio('nice.mp3');
        Swal.fire({ icon: 'success', title: 'ยืนยันเรียบร้อย',
                    html: 'Group Pick : <b>' + this.loadedGroupPick + '</b><br>'
                        + 'จำนวน <b>' + this.totalQty + '</b> ชิ้น',
                    showConfirmButton: false, timer: 2000 })
            .then(() => this.focusEl('inputGroupPick'));
        return;
      }

      if (res.status === 'confirmed') {
        //// มีคนยืนยันไปก่อนแล้วระหว่างที่เปิดหน้าค้างไว้ — โชว์รายละเอียดแทน ไม่นับเป็น error
        const d = (res.data && res.data[0]) || {};
        this.confirmed = { USER_CONFIRM: d.USER_CONFIRM, CONFIRM_DATE: d.CONFIRM_DATE };
        this.playAudio('error.mp3');
        Swal.fire({ icon: 'warning', title: 'ยืนยันไปแล้ว',
                    html: 'Group Pick นี้ถูกยืนยันโดย<br><b>' + this.userLabelOfPin(d.USER_CONFIRM) + '</b><br>'
                        + '<small>' + (d.CONFIRM_DATE || '-') + '</small>' });
        return;
      }

      console.log('Confirm_QtyGroupSku', res);
      this.playAudio('error.mp3');
      Swal.fire({ icon: 'error', title: 'ยืนยันไม่สำเร็จ',
                  text: res.message || 'กรุณาติดต่อ ADMIN',
                  showConfirmButton: false, timer: 2500 });

    }, (err: any) => {
      console.log('Confirm_QtyGroupSku error', err);
      this.isConfirming = false;
      this.playAudio('error.mp3');
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อ Server ไม่ได้',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  // ── helper ───────────────────────────────────────────────────

  //// setTimeout เพราะช่องที่จะโฟกัสมักเพิ่งถูก *ngIf แสดงในรอบ change detection เดียวกัน
  focusEl(name: 'inputPin' | 'inputGroupPick' | 'inputScanItem' | 'btnConfirm'): void {
    setTimeout(() => {
      const ref: any = (this as any)[name];
      if (ref && ref.nativeElement) {
        ref.nativeElement.focus();
        if (ref.nativeElement.select) { ref.nativeElement.select(); }
      }
    }, 150);
  }

  //// เสียงตอบรับ — ไฟล์ชุดเดียวกับหน้า audit-check
  //// อิง document.baseURI เพื่อให้ path ถูกทั้งตอน dev และทุก base-href ตอน deploy
  playAudio(file: string): void {
    try {
      const audio = new Audio(new URL('assets/audio/' + file, document.baseURI).href);
      audio.load();
      //// เบราว์เซอร์บล็อกเสียงได้ถ้ายังไม่เคยคลิกในหน้านั้น — เงียบไปเฉยๆ ห้ามขวางการสแกน
      const played: any = audio.play();
      if (played && played.catch) { played.catch(() => { /* เล่นไม่ได้ก็ข้าม */ }); }
    } catch (err) {
      console.log('playAudio', err);
    }
  }
}
