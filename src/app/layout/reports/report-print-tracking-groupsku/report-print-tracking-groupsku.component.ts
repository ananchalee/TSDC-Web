// report-print-tracking-groupsku.component.ts
import { Component, OnInit } from '@angular/core';
import { DataService, TimeService } from '../../../services/index';
import { ActivatedRoute } from '@angular/router';
import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2';
declare var $: any;

interface TrackingRow {
  COMPANY:        string;
  GROUP_PICK:     string;
  SHIPMENT_ID:    string;
  CONTAINER_ID:   string;
  SELLER_NO:      string;
  TRANSPORT_CODE: string;
  TRACKING:       string;
  FILE_PACKING:   string;
  STATUS_PRINT:   string;
  TRACKING_DOC_P: string;
  PALLET_NO:      string;
  PRINT_STATUS:   string;
  PRINT_DATE:     string;
  TABLE_CHECK:    string;
}

//// STATUS_PRINT เป็นตัวแยกว่าแถวนี้พิมพ์แบบไหน (คุมโดยระบบ ไม่ใช่ free text อย่าง TRANSPORT_CODE)
////   1 = ขนส่งปกติ (Lex/Flash/...) มี TRACKING + FILE_PACKING → พิมพ์ PDF
////   2 = DocP  ไม่มี TRACKING/FILE_PACKING → พิมพ์ใบ track เอกสาร
////   3 = Cancel ไม่มี TRACKING/FILE_PACKING → พิมพ์ใบ Cancel
type PrintKind = 1 | 2 | 3;

interface TransportSummary {
  code:     string;     //// TRANSPORT_CODE
  kind:     PrintKind;  //// แบบการพิมพ์ของการ์ดนี้
  total:    number;     //// จำนวนทั้งหมดใน group pick นี้
  pending:  number;     //// ที่ยังไม่พิมพ์ (PRINT_STATUS = 'N')
  noFile:   number;     //// ที่ไม่มี FILE_PACKING
  isCancel: boolean;    //// kind 3 — พิมพ์ใบ Cancel ไม่ใช่ PDF
  isDocP:   boolean;    //// kind 2 — พิมพ์ใบ track เอกสาร
}

//// ใบปะหน้าพาเลท 1 ใบ ต่อ 1 การพิมพ์ของ transport นั้น
interface PalletSheet {
  PALLET_NO:      string;
  GROUP_PICK:     string;
  TRANSPORT_CODE: string;
  QTY_SHIPMENT:   number;   //// จำนวน shipment ที่พิมพ์สำเร็จรอบนี้
  QTY_BOX:        number;   //// ยอดสะสมทั้งพาเลท — 1 shipment = 1 กล่อง
  PRINT_DATE:     string;
  REMOTE_ERROR:   string;   //// ว่าง = sync ไปเครื่อง conveyor สำเร็จ
}

//// ใบ track (running) 1 ใบ ต่อ 1 REF_INDEX — โครงเดียวกับ dataprint ใน audit-check-tracking
interface TrackSheet {
  REF_INDEX:     string;
  QTY:           number;
  PO_NO:         string;
  SELLER_NO:     string;
  BOX_NO_ORDER:  string;
  SHIPPING_NAME: string;
  SHIPMENT_ID:   string;
  TABLE_CHECK:   string;
  BOX_SIZE:      string;
  TCHANNEL:      string;
  COMPANY:       string;
  ORDER_DATE:    string;
}

//// 1 ใบ Cancel ต่อ 1 SHIPMENT_ID — พก TABLE_CHECK / CONTAINER_ID ของแถวนั้นไปด้วย
interface CancelTarget {
  SHIPMENT_ID:  string;
  TABLE_CHECK:  string;
  CONTAINER_ID: string;
}

//// 1 ใบ Cancel ต่อ 1 SHIPMENT_ID — โครงเดียวกับ dataprintcancel ใน audit-check-tracking
interface CancelSheet {
  SHIPMENT_ID:   string;
  SHIPPING_NAME: string;
  TCHANNEL:      string;
  SELLER_NO:     string;
  COMPANY:       string;
  ORDER_DATE:    string;
  Zone:          string;
  Table:         string;
  PRINT_DATE:    string;
}

@Component({
  selector:    'app-report-print-tracking-groupsku',
  templateUrl: './report-print-tracking-groupsku.component.html',
  styleUrls:   ['./report-print-tracking-groupsku.component.scss']
})
export class ReportPrintTrackingGroupSkuComponent implements OnInit {

  pageactive: any;

  isLoading    = false;
  isSearched   = false;
  isPrinting   = false;    //// กันกดปุ่มพิมพ์ซ้ำ (double click)
  printProgress = { done: 0, total: 0 };

  input = { GROUP_PICK: '', TRANSPORT_CODE: '' };

  //// GROUP_PICK ของ "ข้อมูลที่โหลดมาจริง" — ทุก payload ต้องใช้ตัวนี้ ห้ามใช้ input.GROUP_PICK
  //// เพราะช่องค้นหาผูก ngModel ถ้าพิมพ์ทับแล้วไม่กดค้นหา จะส่งเลขที่ไม่ตรงกับข้อมูลบนจอ
  loadedGroupPick = '';

  data_list:    TrackingRow[]      = [];
  transportList: TransportSummary[] = [];

  activeCode = '';   //// transport ที่เลือกอยู่ในหน้ายืนยัน

  //// ── ใบ Cancel ─────────────────────────────────────────────
  readonly CANCEL_CODE = 'cancel';
  readonly DOCP_CODE   = 'docp';
  //// แถวที่ไม่มี TABLE_CHECK ให้ตกมาที่โต๊ะกลางนี้ จะได้ไม่ต้องข้ามใบนั้นทิ้ง
  readonly DEFAULT_TABLE_CHECK = 'P999';
  zones = ['Zone F1A', 'Zone F1B', 'Zone 2 CoolRoom', 'Zone 3A', 'Zone 3B', 'Zone 3C'];
  selectedZone = '';
  dataprintcancel: CancelSheet[] = [];
  pagePrintCancel = true;   //// true = ซ่อนส่วนพิมพ์ใบ Cancel

  //// ── ใบ track (running) ────────────────────────────────────
  dataprint: TrackSheet[] = [];
  pagePrintTrack = true;    //// true = ซ่อนส่วนพิมพ์ใบ track
  printTimeShow  = '';


  //// ขนาดกล่อง — ถามครั้งเดียวต่อการ์ด ใช้กับทุก shipment ใน batch นั้น
  boxInput = { BOX_SIZE: '', CARTON_BOX_W: 0, CARTON_BOX_H: 0, CARTON_BOX_L: 0, CARTON_BOX_WEIGHT: 0 };
  box: any = { Errorhide: true, Suchide: true, des: '' };

  constructor(
    private dataService: DataService,
    private timeService: TimeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data;
    const page: any[] = [];
    page.push({
      pagename:   'Print Tracking Group SKU',
      active:     'Reports',
      menubar:    d['menubar'],
      version:    d['version'],
      lastupdate: d['lastupdate']
    });
    this.pageactive = page;
  }

  // ── ค้นหาด้วย Group Pick ─────────────────────────────────────
  //// groupOverride ใช้ตอน refresh หลังพิมพ์ — ยึด group ของข้อมูลที่โหลดอยู่
  //// ไม่ใช่ค่าล่าสุดในช่องค้นหาที่ผู้ใช้อาจพิมพ์ทับไว้
  getdata(groupOverride?: string): void {
    const group = ((groupOverride !== undefined ? groupOverride : this.input.GROUP_PICK) || '').trim();
    if (!group) { return; }

    this.input.GROUP_PICK = group;
    this.isLoading  = true;
    this.activeCode = '';

    this.dataService.Get_TrackingGroupSku({ GROUP_PICK: group }).subscribe((res: any) => {
      this.isLoading  = false;
      this.isSearched = true;

      if (res.status === 'error') {
        this.clearResult();
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                    showConfirmButton: false, timer: 2500 });
        return;
      }

      if (res.status === 'null' || !res.data || res.data.length === 0) {
        this.clearResult();
        Swal.fire({ icon: 'warning', title: 'ไม่พบข้อมูล',
                    text: 'Group Pick : ' + group,
                    showConfirmButton: false, timer: 2500 });
        return;
      }

      this.data_list     = this.sortRows(res.data as TrackingRow[]);
      this.transportList = this.buildTransportSummary(this.data_list);

      //// ยึด GROUP_PICK จากตัวข้อมูลเอง ไม่ใช่จากช่องค้นหา
      this.loadedGroupPick = (this.data_list[0].GROUP_PICK || '').trim() || group;

    }, err => {
      console.log(err);
      this.isLoading  = false;
      this.isSearched = true;
      this.clearResult();
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อ Server ไม่ได้',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  clearResult(): void {
    this.data_list       = [];
    this.transportList   = [];
    this.activeCode      = '';
    this.loadedGroupPick = '';
  }

  isCancelCode(code: string): boolean {
    return (code || '').trim().toLowerCase() === this.CANCEL_CODE;
  }

  isDocPCode(code: string): boolean {
    return (code || '').trim().toLowerCase() === this.DOCP_CODE;
  }

  //// แยกด้วย STATUS_PRINT เป็นหลัก — เป็นเลขที่ระบบคุมเอง ขนส่งเจ้าใหม่เข้ามาก็ได้ 1 อัตโนมัติ
  //// ถ้า STATUS_PRINT ว่าง/เพี้ยน ค่อย fallback ไปดู TRANSPORT_CODE กันข้อมูลไม่ครบ
  printKindOf(row: TrackingRow): PrintKind {
    const status = Number((row.STATUS_PRINT || '').toString().trim());
    if (status === 1 || status === 2 || status === 3) { return status as PrintKind; }
    if (this.isCancelCode(row.TRANSPORT_CODE)) { return 3; }
    if (this.isDocPCode(row.TRANSPORT_CODE))   { return 2; }
    return 1;
  }

  //// สีเดียวกับการ์ด transport ด้านบน — badge-danger/warning/info = #dc3545/#ffc107/#17a2b8
  transportBadgeClass(row: TrackingRow): string {
    const kind = this.printKindOf(row);
    return kind === 3 ? 'badge-danger'
         : kind === 2 ? 'badge-warning'
                      : 'badge-info';
  }

  get activeKind(): PrintKind {
    const t = this.transportList.find(x => x.code === this.activeCode);
    return t ? t.kind : 1;
  }

  get isActiveCancel(): boolean {
    return this.activeKind === 3;
  }

  get isActiveDocP(): boolean {
    return this.activeKind === 2;
  }

  // ── สรุปจำนวนต่อ TRANSPORT_CODE ─────────────────────────────
  buildTransportSummary(rows: TrackingRow[]): TransportSummary[] {
    const map = new Map<string, TransportSummary>();

    rows.forEach(r => {
      const code = (r.TRANSPORT_CODE || '').trim() || '(ไม่ระบุ)';
      const kind = this.printKindOf(r);

      let s = map.get(code);
      if (!s) {
        s = { code: code, kind: kind, total: 0, pending: 0, noFile: 0,
              isCancel: kind === 3, isDocP: kind === 2 };
        map.set(code, s);
      }
      s.total++;
      if (this.isPending(r)) { s.pending++; }
      //// Cancel/DocP พิมพ์จากข้อมูลใน DB ไม่ได้ใช้ FILE_PACKING จึงไม่นับว่า "ไม่มีไฟล์"
      if (!r.FILE_PACKING && s.kind === 1) { s.noFile++; }
    });

    //// เรียงตาม STATUS_PRINT ก่อน แล้วค่อย TRANSPORT_CODE — ให้ตรงกับลำดับในตาราง
    return Array.from(map.values()).sort(
      (a, b) => (a.kind - b.kind) || a.code.localeCompare(b.code)
    );
  }

  //// order by STATUS_PRINT, TRANSPORT_CODE, TRACKING
  sortRows(rows: TrackingRow[]): TrackingRow[] {
    return rows.slice().sort((a, b) =>
         (this.printKindOf(a) - this.printKindOf(b))
      || (a.TRANSPORT_CODE || '').trim().localeCompare((b.TRANSPORT_CODE || '').trim())
      || (a.TRACKING || '').trim().localeCompare((b.TRACKING || '').trim())
    );
  }

  rowsOf(code: string): TrackingRow[] {
    return this.data_list.filter(
      r => ((r.TRANSPORT_CODE || '').trim() || '(ไม่ระบุ)') === code
    );
  }

  get activeRows(): TrackingRow[] {
    return this.activeCode ? this.rowsOf(this.activeCode) : [];
  }

  //// พิมพ์สำเร็จแล้ว (PRINT_STATUS != 'N') จะไม่เอาเข้ารอบพิมพ์อีก กันพิมพ์ซ้ำ
  isPending(row: TrackingRow): boolean {
    return (row.PRINT_STATUS || '').trim().toUpperCase() === 'N';
  }

  //// เฉพาะแถวที่ยังไม่ได้พิมพ์ — ทุก flow ใช้ชุดนี้เป็นตัวตั้ง
  get activePendingRows(): TrackingRow[] {
    return this.activeRows.filter(r => this.isPending(r));
  }

  //// เฉพาะรายการที่ยังไม่พิมพ์ และมีไฟล์จริง ถึงจะพิมพ์ได้
  get printableRows(): TrackingRow[] {
    return this.activePendingRows.filter(r => !!r.FILE_PACKING);
  }

  get totalRows(): number {
    return this.data_list.length;
  }

  //// จำนวนใบที่จะพิมพ์ของกลุ่มที่เลือก — DocP นับเป็น 1 ใบต่อ 1 shipment
  get printCount(): number {
    return this.isActiveDocP ? this.activeShipmentIds.length : this.printableRows.length;
  }

  //// SHIPMENT_ID ไม่ซ้ำที่ยังไม่ได้พิมพ์ — ใบ Cancel/DocP พิมพ์ 1 ใบต่อ 1 shipment
  get activeShipmentIds(): string[] {
    const seen = new Set<string>();
    this.activePendingRows.forEach(r => {
      const id = (r.SHIPMENT_ID || '').trim();
      if (id) { seen.add(id); }
    });
    return Array.from(seen);
  }

  // ── กดการ์ด transport → เปิด modal ยืนยัน ────────────────────
  openPrintModal(code: string): void {
    if (this.isPrinting) { return; }

    this.activeCode = code;

    //// พิมพ์ครบแล้วไม่ให้กดซ้ำ — การ์ดก็ disabled อยู่แล้ว ตรงนี้กันอีกชั้น
    if (this.activePendingRows.length === 0) {
      Swal.fire({ icon: 'info', title: 'พิมพ์ไปแล้วทั้งหมด',
                  text: 'รายการของ ' + code + ' ถูกพิมพ์ครบแล้ว',
                  showConfirmButton: false, timer: 2500 });
      return;
    }

    //// กลุ่ม Cancel ไปอีกทางหนึ่ง: เลือก Zone ก่อน แล้วพิมพ์ใบ Cancel
    if (this.isActiveCancel) {
      if (this.activeShipmentIds.length === 0) {
        Swal.fire({ icon: 'warning', title: 'ไม่มี SHIPMENT_ID ให้พิมพ์',
                    showConfirmButton: false, timer: 2500 });
        return;
      }
      this.selectedZone = '';
      $('#zonePrintModal').modal('show');
      return;
    }

    //// DocP: ไม่ใช้ FILE_PACKING แต่ยังต้องระบุขนาดกล่องเหมือนขนส่งปกติ
    if (this.isActiveDocP) {
      if (this.activeShipmentIds.length === 0) {
        Swal.fire({ icon: 'warning', title: 'ไม่มี SHIPMENT_ID ให้พิมพ์',
                    showConfirmButton: false, timer: 2500 });
        return;
      }
    } else if (this.printableRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'ไม่มีไฟล์ให้พิมพ์',
                  text: 'รายการของ ' + code + ' ไม่มี FILE_PACKING',
                  showConfirmButton: false, timer: 2500 });
      return;
    }

    //// ทั้ง 2 กลุ่มระบุขนาดกล่องก่อน แล้วค่อย running — ต่างกันแค่พิมพ์อะไรต่อ
    this.resetBox();
    $('#boxPrintModal').modal('show');
  }

  closeZoneModal(): void {
    $('#zonePrintModal').modal('hide');
  }

  closeBoxModal(): void {
    $('#boxPrintModal').modal('hide');
  }

  resetBox(): void {
    this.boxInput = { BOX_SIZE: '', CARTON_BOX_W: 0, CARTON_BOX_H: 0, CARTON_BOX_L: 0, CARTON_BOX_WEIGHT: 0 };
    this.box = { Errorhide: true, Suchide: true, des: '' };
  }

  //// box.Suchide === false = ขนาดกล่องผ่านการตรวจแล้ว (ปุ่มบันทึกถึงจะโผล่)
  get isBoxValid(): boolean {
    return this.box.Suchide === false;
  }

  //// ตรวจขนาดกล่องกับ master — โครงเดียวกับ check_size() ใน audit-check-tracking
  check_size(): void {
    const size = (this.boxInput.BOX_SIZE || '').trim();
    if (!size) {
      this.box = { Errorhide: false, Suchide: true, des: 'ระบุขนาดกล่อง' };
      return;
    }

    this.dataService.check_master_box({ BOX_SIZE: size }).subscribe((res: any) => {
      if (res.status === 'success' && res.data && res.data.length > 0) {
        const b = res.data[0];
        this.boxInput.CARTON_BOX_W      = b.CARTON_BOX_W      || 0;
        this.boxInput.CARTON_BOX_L      = b.CARTON_BOX_L      || 0;
        this.boxInput.CARTON_BOX_H      = b.CARTON_BOX_H      || 0;
        this.boxInput.CARTON_BOX_WEIGHT = b.CARTON_BOX_WEIGHT || 0;

        if (b.ACTIVE === 'Y') {
          this.box = b;
          this.box.Errorhide = true;
          this.box.Suchide   = false;
        } else {
          this.box = { Errorhide: false, Suchide: true, des: 'งดใช้ขนาดกล่องนี้' };
        }
      } else if (res.status === 'null') {
        this.box = { Errorhide: false, Suchide: true, des: 'ไม่พบขนาดกล่องนี้' };
      } else {
        console.log('check_master_box', res);
        this.box = { Errorhide: false, Suchide: true, des: 'Error ติดต่อ ADMIN' };
      }
    }, (err: any) => {
      console.log('check_master_box error', err);
      this.box = { Errorhide: false, Suchide: true, des: 'Error ติดต่อ ADMIN' };
    });
  }

  // ── path บน network → networkKey (ตามกติกาเดิมของ printLabel) ─
  networkKeyOf(rawPath: string): string {
    return rawPath.startsWith('TSDC_PACKING') ? '26' : '23';
  }

  // ── ระบุขนาดกล่อง → running → พิมพ์ ──────────────────────────
  //// STATUS_PRINT = 1 พิมพ์ PDF, = 2 พิมพ์ใบ tracking running (html)
  confirmPrint(): void {
    if (this.isPrinting) { return; }

    //// DocP ไม่มี FILE_PACKING จึงใช้ทุกแถวที่ยังไม่พิมพ์ ไม่ใช่เฉพาะแถวที่มีไฟล์
    const rows = this.isActiveDocP ? this.activePendingRows : this.printableRows;
    if (rows.length === 0) { return; }

    if (!this.isBoxValid) {
      Swal.fire({ icon: 'warning', title: 'ระบุขนาดกล่องให้ถูกต้องก่อน',
                  showConfirmButton: false, timer: 2500 });
      return;
    }

    const printDocP = this.isActiveDocP;

    this.closeBoxModal();
    this.isPrinting = true;

    //// running ให้ครบก่อน แล้วค่อยพิมพ์ — TRACKING_DOC_P ต้องถูกเก็บก่อนกระดาษออก
    this.runTracking(rows, this.boxInput.BOX_SIZE).then(run => {
      if (run.okRows.length === 0) {
        this.endPrint();
        Swal.fire({ icon: 'error', title: 'สร้างเลข running ไม่สำเร็จ',
                    html: 'ไม่พบรายการไอเทมของ shipment ที่เลือก<br>'
                        + '<small>' + run.failed.join(', ') + '</small>' });
        return;
      }

      if (printDocP) {
        this.doPrintTrack(run.sheets, run.okRows, run.failed);
      } else {
        this.printPdfBatch(run.okRows, run.failed);
      }

    }).catch(err => {
      console.log(err);
      this.endPrint();
      Swal.fire({ icon: 'error', title: 'สร้างเลข running ไม่สำเร็จ',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  //// โหลด PDF ทุกไฟล์ → รวมเป็นเล่มเดียว → สั่งพิมพ์
  printPdfBatch(rows: TrackingRow[], runFailed: string[]): void {
    this.printProgress = { done: 0, total: rows.length };

    const jobs = rows.map(r => this.fetchPdfBytes(r));

    Promise.all(jobs).then(results => {
      const okBytes = results
        .filter(x => x.bytes !== null)
        .map(x => x.bytes as Uint8Array);
      const failed = results.filter(x => x.bytes === null);

      if (okBytes.length === 0) {
        this.endPrint();
        Swal.fire({ icon: 'error', title: 'โหลดไฟล์ไม่สำเร็จ',
                    text: 'ไม่สามารถโหลด PDF ได้เลยสักไฟล์' });
        return;
      }

      //// เฉพาะรายการที่โหลดไฟล์ได้จริง ถึงจะนับว่าพิมพ์สำเร็จ / เข้าพาเลท
      const okTracking = new Set(results.filter(x => x.bytes !== null).map(x => (x.tracking || '').trim()));
      const printedRows = rows.filter(r => okTracking.has((r.TRACKING || '').trim()));

      //// จับไว้ก่อน — markPrinted() เรียก getdata() ซึ่งจะล้าง activeCode ทิ้ง
      const transport = this.activeCode;

      //// confirm outbound ก่อน จะได้เลขพาเลทมาทำเป็นหน้าแรกของเล่ม
      //// print dialog จึงเด้งครั้งเดียว ไม่ต้องแยกพิมพ์ใบปะหน้าด้วย window.print()
      return this.confirmOutbound(printedRows, transport).then(pallet => {
        return this.mergePdf(okBytes, pallet).then(merged => {
          this.sendToPrinter(merged);
          this.markPrinted(printedRows);

          const allFailed = failed.map(f => f.tracking).concat(runFailed);
          const remoteError = pallet ? pallet.REMOTE_ERROR : '';

          if (allFailed.length > 0 || remoteError) {
            Swal.fire({
              icon: 'warning',
              title: allFailed.length > 0 ? 'พิมพ์บางส่วน' : 'พิมพ์สำเร็จ แต่ sync ไม่ผ่าน',
              html: 'สำเร็จ <b>' + okBytes.length + '</b> รายการ<br>'
                  + (allFailed.length > 0
                      ? 'ไม่สำเร็จ <b>' + allFailed.length + '</b> รายการ<br>'
                        + '<small>' + allFailed.join(', ') + '</small><br>'
                      : '')
                  + (remoteError
                      ? '<hr>ส่งข้อมูลไปเครื่อง Conveyor ไม่สำเร็จ<br>'
                        + '<small>' + remoteError + '</small>'
                      : '')
            });
          }
        });
      });

    }).catch(err => {
      console.log(err);
      this.endPrint();
      Swal.fire({ icon: 'error', title: 'รวมไฟล์ PDF ไม่สำเร็จ',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  //// โหลด 1 ไฟล์ — ไม่ throw ออกไป เพื่อให้ไฟล์เสีย 1 ใบไม่ล้มทั้งงาน
  fetchPdfBytes(row: TrackingRow): Promise<{ tracking: string, bytes: Uint8Array | null }> {
    const normalizedPath = row.FILE_PACKING.replace(/\\/g, '/');
    const payload = {
      networkKey: this.networkKeyOf(row.FILE_PACKING),
      path: normalizedPath
    };

    return new Promise(resolve => {
      this.dataService.DownloadFileFromNetwork(payload).subscribe((blob: Blob) => {
        this.blobToBytes(blob).then(bytes => {
          this.printProgress.done++;
          resolve({ tracking: row.TRACKING, bytes: bytes });
        }).catch(() => {
          this.printProgress.done++;
          resolve({ tracking: row.TRACKING, bytes: null });
        });
      }, (err: any) => {
        console.log('download failed', row.TRACKING, err);
        this.printProgress.done++;
        resolve({ tracking: row.TRACKING, bytes: null });
      });
    });
  }

  //// Blob -> Uint8Array (fallback FileReader เผื่อ WebView เก่าที่ไม่มี blob.arrayBuffer)
  blobToBytes(blob: Blob): Promise<Uint8Array> {
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer().then(buf => new Uint8Array(buf));
    }
    return new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  //// รวมหลาย PDF เป็นเล่มเดียว + แทรกใบปะหน้าพาเลทเป็นหน้าแรก (ถ้ามี)
  async mergePdf(files: Uint8Array[], pallet: PalletSheet | null): Promise<Uint8Array> {
    const out = await PDFDocument.create();

    for (const bytes of files) {
      try {
        const src   = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(p => out.addPage(p));
      } catch (e) {
        console.log('merge skip broken pdf', e);   //// ข้ามไฟล์ที่อ่านไม่ออก
      }
    }

    if (out.getPageCount() === 0) {
      throw new Error('no readable pdf');
    }

    if (pallet) {
      try {
        await this.addPalletCover(out, pallet);
      } catch (e) {
        console.log('pallet cover failed', e);   //// ใบปะหน้าพังก็ยังพิมพ์ PDF ต่อได้
      }
    }

    return out.save();
  }

  //// CODE128 → PNG data url (วาดผ่าน canvas ชั่วคราว ไม่ต้องแตะ DOM ของหน้า)
  barcodePng(value: string): string {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format:       'CODE128',
      width:        3,
      height:       90,
      fontSize:     22,
      displayValue: true,
      margin:       10
    });
    return canvas.toDataURL('image/png');
  }

  //// pdf-lib ใช้ฟอนต์มาตรฐาน (WinAnsi) ที่เขียนไทยไม่ได้ — ตัดอักขระนอกช่วงทิ้งกัน throw
  asciiOnly(value: any): string {
    return (value === null || value === undefined ? '' : value)
      .toString()
      .replace(/[^\x20-\x7E]/g, '');
  }

  //// ใบปะหน้าพาเลทเป็นหน้าแรกของเล่ม — ป้ายเป็นอังกฤษเพราะฟอนต์มาตรฐานไม่รองรับไทย
  async addPalletCover(doc: PDFDocument, sheet: PalletSheet): Promise<void> {
    const font     = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const png      = await doc.embedPng(this.barcodePng(sheet.PALLET_NO));

    const page = doc.insertPage(0, [595.28, 841.89]);   //// A4 แนวตั้ง
    const W    = page.getWidth();
    let   y    = page.getHeight() - 90;

    const drawCenter = (text: string, size: number, f: PDFFont) => {
      const t = this.asciiOnly(text);
      page.drawText(t, { x: (W - f.widthOfTextAtSize(t, size)) / 2, y: y, size: size, font: f });
    };

    const drawRow = (label: string, value: string, size: number) => {
      page.drawText(this.asciiOnly(label), { x: 70,  y: y, size: 14,   font: font });
      page.drawText(this.asciiOnly(value), { x: 260, y: y, size: size, font: fontBold });
    };

    drawCenter('PALLET COVER SHEET', 24, fontBold);
    y -= 40;

    //// บาร์โค้ดกว้างไม่เกิน 400pt กันล้นขอบเมื่อเลขยาว
    const scaled = png.scaleToFit(400, 130);
    y -= scaled.height;
    page.drawImage(png, { x: (W - scaled.width) / 2, y: y, width: scaled.width, height: scaled.height });

    y -= 60;
    drawRow('GROUP PICK', sheet.GROUP_PICK, 16);
    y -= 32;
    drawRow('TRANSPORT', sheet.TRANSPORT_CODE, 16);
    y -= 40;
    drawRow('SHIPMENTS (this print)', String(sheet.QTY_SHIPMENT), 30);
    y -= 40;
    //// 1 shipment = 1 กล่อง ยอดนี้จึงเป็นทั้งจำนวน shipment และจำนวนกล่องบนพาเลท
    drawRow('TOTAL ON PALLET', String(sheet.QTY_BOX) + ' box', 30);
    y -= 50;

    page.drawText(this.asciiOnly('Printed: ' + sheet.PRINT_DATE), { x: 70, y: y, size: 10, font: font });
  }

  //// ส่งเข้า iframe แล้วเรียก print (แนวเดียวกับ printLabel เดิม)
  sendToPrinter(bytes: Uint8Array): void {
    //// copy ลง ArrayBuffer ตรง ๆ — Uint8Array ของ TS 5.7+ เป็น generic (ArrayBufferLike)
    //// ซึ่งไม่ตรงกับ BlobPart ที่ต้องการ ArrayBuffer ล้วน
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);

    const blob    = new Blob([buffer], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = fileURL;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      this.endPrint();

      //// เคลียร์ทิ้งหลังพิมพ์ ป้องกัน memory ค้าง
      setTimeout(() => {
        URL.revokeObjectURL(fileURL);
        iframe.remove();
      }, 60000);
    };
  }

  //// อัปเดต PRINT_STATUS / PRINT_DATE ใน TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU แล้ว refresh
  //// ใช้ร่วมกันทั้งพิมพ์ PDF และพิมพ์ใบ Cancel
  markPrinted(rows: TrackingRow[]): void {
    //// จับไว้ก่อน — refresh ต้องยิงด้วย group ของข้อมูลชุดนี้ ไม่ใช่ค่าในช่องค้นหา
    const group = this.loadedGroupPick;

    if (rows.length === 0) { this.getdata(group); return; }

    const payload = {
      GROUP_PICK:     this.loadedGroupPick,
      TRANSPORT_CODE: this.activeCode,
      //// where = GROUP_PICK + SHIPMENT_ID + TRACKING ราย record
      //// ใบ Cancel ไม่มี TRACKING ส่งเป็นค่าว่าง แล้วใช้ SHIPMENT_ID ตัวเดียว (1 ต่อ 1 อยู่แล้ว)
      //// PRINT_STATUS / PRINT_DATE ฝั่ง API เซ็ตเอง ('Y' + GETDATE()) ไม่ต้องส่งไป
      ROWS:           this.buildPrintKeys(rows)
    };

    this.dataService.Update_PrintStatus_TrackingGroupSku(payload).subscribe(() => {
      this.getdata(group);
    }, (err: any) => {
      console.log('update print status failed', err);
    });
  }

  //// คู่ SHIPMENT_ID + TRACKING สำหรับ where ของ backend (ตัดคู่ซ้ำ/คู่ว่างออก)
  buildPrintKeys(rows: TrackingRow[]): { SHIPMENT_ID: string, TRACKING: string }[] {
    const map = new Map<string, { SHIPMENT_ID: string, TRACKING: string }>();

    rows.forEach(r => {
      const shipment = (r.SHIPMENT_ID || '').trim();
      const tracking = (r.TRACKING    || '').trim();
      if (!shipment && !tracking) { return; }
      map.set(shipment + '|' + tracking, { SHIPMENT_ID: shipment, TRACKING: tracking });
    });

    return Array.from(map.values());
  }

  //// ปลดล็อกปุ่ม — หน่วงกันนิ้วเด้ง/กดซ้ำบนมือถือ
  endPrint(): void {
    this.printProgress = { done: 0, total: 0 };
    setTimeout(() => { this.isPrinting = false; }, 800);
  }

  // ══════════════════════════════════════════════════════════════
  //  STATUS_PRINT 1/2 → running REF_INDEX เก็บลง TRACKING_DOC_P
  // ══════════════════════════════════════════════════════════════

  //// 1 running ต่อ 1 คู่ SHIPMENT_ID+TRACKING
  //// DocP ไม่มี TRACKING คู่จึงยุบเหลือ 1 ต่อ 1 shipment เอง
  uniqueRunRows(rows: TrackingRow[]): TrackingRow[] {
    const map = new Map<string, TrackingRow>();
    rows.forEach(r => {
      const key = (r.SHIPMENT_ID || '').trim() + '|' + (r.TRACKING || '').trim();
      if (!map.has(key)) { map.set(key, r); }
    });
    return Array.from(map.values());
  }

  //// ยิง running ทุกแถว — แถวที่ล้มถูกคัดออกไป ไม่ล้มทั้ง batch
  //// ต้องยิง "ทีละใบตามลำดับ" ห้ามขนาน เพราะทุก request อ่าน MAX(TABLE_RUNNING)
  //// ก่อนที่ใบก่อนหน้าจะ insert เสร็จ จะได้เลขซ้ำแล้วชน PK
  runTracking(rows: TrackingRow[], boxSize: string):
      Promise<{ okRows: TrackingRow[], sheets: TrackSheet[], failed: string[] }> {

    const targets = this.uniqueRunRows(rows);
    this.printProgress = { done: 0, total: targets.length };

    const okRows: TrackingRow[] = [];
    const sheets: TrackSheet[]  = [];
    const failed: string[]      = [];

    const chain = targets.reduce(
      (prev, r) => prev.then(() => this.fetchTrackSheet(r, boxSize).then(sheet => {
        if (sheet) {
          okRows.push(r);
          sheets.push(sheet);
        } else {
          failed.push((r.TRACKING || '').trim() || (r.SHIPMENT_ID || '').trim());
        }
      })),
      Promise.resolve()
    );

    return chain.then(() => ({ okRows: okRows, sheets: sheets, failed: failed }));
  }

  //// running 1 แถว — คืน null ถ้าล้ม เพื่อให้แถวอื่นไปต่อได้
  fetchTrackSheet(row: TrackingRow, boxSize: string): Promise<TrackSheet | null> {
    const shipment = (row.SHIPMENT_ID || '').trim();
    const table    = (row.TABLE_CHECK || '').trim() || this.DEFAULT_TABLE_CHECK;
    const tracking = (row.TRACKING || '').trim();

    return new Promise(resolve => {
      const payload = {
        GROUP_PICK:        this.loadedGroupPick,
        shipment_id:       shipment,
        SHIPMENT_ID:       shipment,
        SELLER_NO:         (row.SELLER_NO || '').trim(),
        CONTAINER_ID:      (row.CONTAINER_ID || '').trim(),
        TABLE_CHECK:       table,
        PIN_CODE:          table,
        TRACKING:          tracking,
        SHIPPING_NAME:     (row.COMPANY || '').trim(),
        BOX_SIZE:          boxSize,
        CARTON_BOX_W:      this.boxInput.CARTON_BOX_W,
        CARTON_BOX_H:      this.boxInput.CARTON_BOX_H,
        CARTON_BOX_L:      this.boxInput.CARTON_BOX_L,
        CARTON_BOX_WEIGHT: this.boxInput.CARTON_BOX_WEIGHT
      };

      this.dataService.tracking_running_groupsku(payload).subscribe((res: any) => {
        this.printProgress.done++;

        if (res.status !== 'success' || !res.data || res.data.length === 0) {
          console.log('tracking_running_groupsku failed', shipment, res.status, res.message);
          resolve(null);
          return;
        }

        const d = res.data[0];
        resolve({
          REF_INDEX:     d.REF_INDEX,
          QTY:           d.QTY,
          PO_NO:         d.PO_NO,
          SELLER_NO:     d.SELLER_NO,
          BOX_NO_ORDER:  d.BOX_NO_ORDER,
          SHIPPING_NAME: (row.COMPANY || '').trim(),
          SHIPMENT_ID:   shipment,
          TABLE_CHECK:   table,
          BOX_SIZE:      boxSize,
          TCHANNEL:      '',
          COMPANY:       (row.COMPANY || '').trim(),
          ORDER_DATE:    ''
        });

      }, (err: any) => {
        console.log('tracking_running_groupsku error', shipment, err);
        this.printProgress.done++;
        resolve(null);
      });
    });
  }

  // ── confirm outbound + ใบปะหน้าพาเลท (เฉพาะ STATUS_PRINT = 1) ──

  //// ยิง confirm outbound ยกชุด แล้วคืนข้อมูลใบปะหน้า (null = ล้ม → ข้ามใบปะหน้าไป)
  confirmOutbound(rows: TrackingRow[], transport: string): Promise<PalletSheet | null> {
    const trackings = new Set<string>();
    const shipments = new Set<string>();

    rows.forEach(r => {
      const t = (r.TRACKING || '').trim();
      const s = (r.SHIPMENT_ID || '').trim();
      if (t) { trackings.add(t); }
      if (s) { shipments.add(s); }
    });

    if (trackings.size === 0) { return Promise.resolve(null); }

    const table = (rows[0].TABLE_CHECK || '').trim() || this.DEFAULT_TABLE_CHECK;

    const payload = {
      GROUP_PICK:        this.loadedGroupPick,
      TRANSPORT_CODE:    transport,
      PIN_ID:            table,
      INTERNAL_ID:       '',
      SHIP_PROVIDER_OOD: transport,
      ROWS:              Array.from(trackings).map(t => ({ TRACKING: t }))
    };

    return new Promise(resolve => {
      this.dataService.insertTracking_confirmOutbound_groupsku(payload).subscribe((res: any) => {
        if (res.status !== 'success' || !res.data || res.data.length === 0) {
          console.log('confirmOutbound failed', res.status, res.message);
          resolve(null);
          return;
        }

        const d = res.data[0];

        //// ปลายทาง conveyor sync ไม่ผ่าน — ข้อมูล local ลงแล้ว แค่ต้องตามไป sync ทีหลัง
        const remoteError = (d.REMOTE_ERROR || '').toString().trim();
        if (remoteError) {
          console.log('confirmOutbound remote sync failed', remoteError);
        }

        resolve({
          PALLET_NO:      d.PALLET_NO,
          GROUP_PICK:     d.GROUP_PICK,
          TRANSPORT_CODE: d.TRANSPORT_CODE,
          QTY_SHIPMENT:   shipments.size,
          QTY_BOX:        Number(d.QTY_BOX) || 0,
          PRINT_DATE:     this.timeService.getNow(),
          REMOTE_ERROR:   remoteError
        });

      }, (err: any) => {
        console.log('confirmOutbound error', err);
        resolve(null);
      });
    });
  }

  //// แสดงส่วนใบ track แล้วสั่งพิมพ์ (window.print ของหน้านี้)
  doPrintTrack(sheets: TrackSheet[], okRows: TrackingRow[], failed: string[]): void {
    this.dataprint      = sheets;
    this.printTimeShow  = this.timeService.getNow();
    this.pagePrintTrack = false;

    //// รอ barcode render ให้เสร็จก่อน ไม่งั้นได้กระดาษว่าง
    setTimeout(() => {
      window.print();

      setTimeout(() => {
        this.pagePrintTrack = true;
        this.dataprint      = [];
        this.endPrint();

        this.markPrinted(okRows);

        if (failed.length > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'พิมพ์บางส่วน',
            html: 'สำเร็จ <b>' + sheets.length + '</b> ใบ<br>'
                + 'ไม่สำเร็จ <b>' + failed.length + '</b> ใบ<br>'
                + '<small>' + failed.join(', ') + '</small>'
          });
        }
      }, 1000);
    }, 800);
  }

  // ══════════════════════════════════════════════════════════════
  //  TRANSPORT_CODE = Cancel → พิมพ์ใบ Cancel 1 ใบต่อ 1 SHIPMENT_ID
  // ══════════════════════════════════════════════════════════════

  //// กด OK ใน modal เลือก Zone
  confirmPrintCancel(): void {
    if (this.isPrinting) { return; }
    if (!this.selectedZone) { return; }

    //// โต๊ะเช็คมาจาก TABLE_CHECK ของข้อมูลที่ค้นได้ ไม่ใช่ user ที่ login อยู่
    //// เพราะหน้านี้เป็นการพิมพ์ซ้ำใบเดิม ต้องคงโต๊ะที่เช็คจริงไว้
    //// แถวที่ไม่มีค่า buildCancelTargets เติม DEFAULT_TABLE_CHECK ให้แล้ว
    const targets = this.buildCancelTargets();
    if (targets.length === 0) { return; }

    this.closeZoneModal();
    this.isPrinting    = true;
    this.printProgress = { done: 0, total: targets.length };

    //// CheckOrder_Cancel รับทีละ container/shipment จึงต้องยิงทีละใบ
    //// เบราว์เซอร์จำกัด concurrent เองอยู่แล้ว ไม่ต้องคุมเพิ่ม
    const jobs = targets.map(t => this.fetchCancelSheet(t));

    Promise.all(jobs).then(results => {
      const sheets = results.filter(x => x !== null) as CancelSheet[];
      const failed = targets.filter((t, i) => results[i] === null)
                            .map(t => t.SHIPMENT_ID);

      if (sheets.length === 0) {
        this.endPrint();
        Swal.fire({ icon: 'error', title: 'พิมพ์ใบ Cancel ไม่สำเร็จ',
                    html: 'ไม่พบข้อมูล order cancel ของ shipment ที่เลือก' });
        return;
      }

      this.dataprintcancel = sheets;
      this.doPrintCancel(sheets, failed);

    }).catch(err => {
      console.log(err);
      this.endPrint();
      Swal.fire({ icon: 'error', title: 'พิมพ์ใบ Cancel ไม่สำเร็จ',
                  showConfirmButton: false, timer: 2500 });
    });
  }

  //// 1 shipment: ดึงข้อมูล order cancel → บันทึก log → คืนข้อมูลสำหรับพิมพ์
  //// คืน null ถ้าขั้นตอนใดล้ม เพื่อให้ใบอื่นพิมพ์ต่อได้
  fetchCancelSheet(target: CancelTarget): Promise<CancelSheet | null> {
    const shipmentId  = target.SHIPMENT_ID;
    const tableCheck  = target.TABLE_CHECK;
    const containerId = target.CONTAINER_ID;

    return new Promise(resolve => {
      //// API ค้นด้วย CONTAINER_ID จึงต้องส่งไปด้วยทุกครั้ง (ตามที่ audit-check-tracking ส่งทั้ง input)
      const req = {
        shipment_id:  shipmentId,
        SHIPMENT_ID:  shipmentId,
        CONTAINER_ID: containerId,
        GROUP_PICK:   this.loadedGroupPick
      };

      this.dataService.CheckOrder_Cancel(req).subscribe((res: any) => {
        if (res.status !== 'success' || !res.data || res.data.length === 0) {
          console.log('CheckOrder_Cancel no data', shipmentId, containerId, res.status);
          this.printProgress.done++;
          resolve(null);
          return;
        }

        const d = res.data[0];
        const sheet: CancelSheet = {
          SHIPMENT_ID:   shipmentId,
          SHIPPING_NAME: d.SHIPPING_NAME,
          TCHANNEL:      d.TCHANNEL,
          SELLER_NO:     d.SELLER_NO,
          COMPANY:       d.COMPANY,
          ORDER_DATE:    d.ORDER_DATE,
          Zone:          this.selectedZone,
          Table:         tableCheck,
          PRINT_DATE:    this.timeService.getNow()
        };

        //// บันทึก log การพิมพ์ก่อน แล้วค่อยพิมพ์ (ลำดับเดียวกับ printcancel เดิม)
        this.dataService.pickcheck_print_ordercancel({
          shipment_id:   shipmentId,
          SHIPMENT_ID:   shipmentId,
          CONTAINER_ID:  containerId,
          SHIPPING_NAME: sheet.SHIPPING_NAME,
          TCHANNEL:      sheet.TCHANNEL,
          SELLER_NO:     sheet.SELLER_NO,
          COMPANY:       sheet.COMPANY,
          ORDER_DATE:    sheet.ORDER_DATE,
          Zone:          sheet.Zone,
          TABLE_CHECK:   tableCheck,
          USER_NAME:     '',            //// พิมพ์ซ้ำจากรายงาน ไม่ผูกกับ user ที่กด
          GROUP_PICK:    this.loadedGroupPick
        }).subscribe((logRes: any) => {
          this.printProgress.done++;
          if (logRes.status === 'success') {
            resolve(sheet);
          } else {
            console.log('pickcheck_print_ordercancel failed', shipmentId, logRes);
            resolve(null);
          }
        }, (err: any) => {
          console.log('pickcheck_print_ordercancel error', shipmentId, err);
          this.printProgress.done++;
          resolve(null);
        });

      }, (err: any) => {
        console.log('CheckOrder_Cancel error', shipmentId, err);
        this.printProgress.done++;
        resolve(null);
      });
    });
  }

  //// แสดงส่วนใบ Cancel แล้วสั่งพิมพ์ (window.print ของหน้านี้ ไม่ใช่ PDF)
  doPrintCancel(sheets: CancelSheet[], failed: string[]): void {
    this.pagePrintCancel = false;

    //// รอ barcode/qrcode render ให้เสร็จก่อน ไม่งั้นได้กระดาษว่าง
    setTimeout(() => {
      window.print();

      setTimeout(() => {
        this.pagePrintCancel = true;
        this.dataprintcancel = [];
        this.endPrint();

        this.markPrinted(this.activeRows.filter(
          r => sheets.some(s => s.SHIPMENT_ID === (r.SHIPMENT_ID || '').trim())
        ));

        if (failed.length > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'พิมพ์บางส่วน',
            html: 'สำเร็จ <b>' + sheets.length + '</b> ใบ<br>'
                + 'ไม่สำเร็จ <b>' + failed.length + '</b> ใบ<br>'
                + '<small>' + failed.join(', ') + '</small>'
          });
        }
      }, 1000);
    }, 800);
  }

  //// รวมแถวในกลุ่มเป็น 1 target ต่อ 1 SHIPMENT_ID
  //// 1 shipment มีได้หลายแถวตาม tracking — เก็บค่าแรกที่ไม่ว่างของแต่ละฟิลด์
  buildCancelTargets(): CancelTarget[] {
    const map = new Map<string, CancelTarget>();

    this.activePendingRows.forEach(r => {
      const id = (r.SHIPMENT_ID || '').trim();
      if (!id) { return; }

      let t = map.get(id);
      if (!t) {
        t = { SHIPMENT_ID: id, TABLE_CHECK: '', CONTAINER_ID: '' };
        map.set(id, t);
      }
      if (!t.TABLE_CHECK)  { t.TABLE_CHECK  = (r.TABLE_CHECK  || '').trim(); }
      if (!t.CONTAINER_ID) { t.CONTAINER_ID = (r.CONTAINER_ID || '').trim(); }
    });

    //// ไม่มีโต๊ะเช็คในข้อมูล ก็ใช้โต๊ะกลางแทน ไม่ต้องข้ามใบนั้น
    map.forEach(t => {
      if (!t.TABLE_CHECK) { t.TABLE_CHECK = this.DEFAULT_TABLE_CHECK; }
    });

    return Array.from(map.values());
  }
}
