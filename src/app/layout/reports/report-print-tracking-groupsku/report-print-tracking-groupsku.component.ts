// report-print-tracking-groupsku.component.ts
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
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
  ITEM_ID:         string;
  ITEM_ID_BARCODE: string;
  QTY:             number;
  //// หน่วยนับของแถวนั้น (ชิ้น / แพ็ก) — ว่างได้ ถ้า job ต้นทางยังไม่เติมมา
  UOM:             string;
  //// กลุ่มย่อยใน GROUP_PICK เดียวกัน แยกของที่ QTY ต่อ order ไม่เท่ากัน
  //// ว่างได้ = กลุ่มนั้นไม่ได้แบ่ง sub (ของเท่ากันหมด)
  SUB_GROUP_PICK:  string;
}

//// STATUS_PRINT เป็นตัวแยกว่าแถวนี้พิมพ์แบบไหน (คุมโดยระบบ ไม่ใช่ free text อย่าง TRANSPORT_CODE)
////   1 = ขนส่งปกติ (Lex/Flash/...) มี TRACKING + FILE_PACKING → พิมพ์ PDF
////   2 = DocP  ไม่มี TRACKING/FILE_PACKING → พิมพ์ใบ track เอกสาร
////   3 = Cancel ไม่มี TRACKING/FILE_PACKING → พิมพ์ใบ Cancel
type PrintKind = 1 | 2 | 3;

//// 1 การ์ด = 1 คู่ TRANSPORT_CODE + SUB_GROUP_PICK
//// SUB_GROUP_PICK แยกของที่ QTY ไม่เท่ากันออกจากกันภายใน group ใหญ่เดียวกัน
//// จึงต้องพิมพ์แยกใบกัน ไม่งั้นขนาดกล่องกับจำนวนของแต่ละ sub จะปนกัน
interface TransportSummary {
  code:     string;     //// TRANSPORT_CODE
  subGroup: string;     //// SUB_GROUP_PICK ('' = ไม่ได้แบ่ง sub)
  kind:     PrintKind;  //// แบบการพิมพ์ของการ์ดนี้
  total:    number;     //// จำนวนทั้งหมดในคู่นี้
  pending:  number;     //// ที่ยังไม่พิมพ์ (PRINT_STATUS = 'N')
  noFile:   number;     //// ที่ไม่มี FILE_PACKING
  isCancel: boolean;    //// kind 3 — พิมพ์ใบ Cancel ไม่ใช่ PDF
  isDocP:   boolean;    //// kind 2 — พิมพ์ใบ track เอกสาร
  //// จำนวนชิ้นต่อ 1 order ของการ์ดนี้ — คิดตอนโหลดครั้งเดียว ไม่ผูกเป็น getter ใน template
  //// เพราะการ์ดถูก render ทุกรอบ change detection
  qtyText:     string;    //// ข้อความบนการ์ด ('2', '2 - 5' หรือ '—' เมื่อยังไม่มีข้อมูล)
  uom:         string;    //// หน่วยนับของการ์ดนี้ (ชิ้น / แพ็ก) ว่างได้ถ้าข้อมูลยังไม่มา
  qtyMixed:    boolean;   //// true = แต่ละ order มีของไม่เท่ากัน (ข้อมูลผิดปกติ)
}

//// ใบปะหน้าพาเลท 1 ใบ ต่อ 1 การพิมพ์ของ transport นั้น
interface PalletSheet {
  PALLET_NO:      string;
  GROUP_PICK:     string;
  TRANSPORT_CODE: string;
  QTY_SHIPMENT:   number;   //// จำนวน shipment ที่พิมพ์สำเร็จรอบนี้
  QTY_BOX:        number;   //// ยอดสะสมทั้งพาเลทที่ API คืนมา (ใบปะหน้าไม่ได้ใช้ ใช้ยอดทั้ง group แทน)
  PRINT_DATE:     string;
  REMOTE_ERROR:   string;   //// ว่าง = sync ไปเครื่อง conveyor สำเร็จ

  //// ── ตัวเลขสำหรับบล็อกรายละเอียดใต้บาร์โค้ด ──
  //// ยอดของทั้ง GROUP_PICK (ทุก transport ทุก sub) — ไว้เทียบว่าพาเลทนี้เป็นส่วนไหนของงาน
  GROUP_ORDERS:   number;
  GROUP_QTY:      number;
  GROUP_UOM:      string;   //// หน่วยนับของทั้ง group — ถ้าปนหลายหน่วยจะได้ทุกตัวคั่นด้วย /
  //// ยอดของการ์ดที่พิมพ์รอบนี้ = transport + sub group คู่นี้เท่านั้น
  //// (sub เดียวกันอยู่ได้หลาย transport แต่คนละพาเลท เลขจึงต้องนับแยกตาม transport
  //// ไม่งั้นจำนวน order บนใบจะไม่ตรงกับจำนวนกล่องบนพาเลทจริง)
  SUB_GROUP_PICK: string;
  SUB_ORDERS:     number;
  SUB_QTY:        number;
  QTY_PER_BOX:    string;   //// จำนวนต่อกล่อง — 1 order = 1 กล่อง จึงเท่ากับจำนวนต่อ order
  UOM:            string;   //// หน่วยนับ (ชิ้น / แพ็ก) ว่างได้ถ้าข้อมูลยังไม่มา
}

//// 1 บรรทัดของบล็อกรายละเอียดใต้บาร์โค้ดในใบปะหน้า ('divider' = เส้นกั้น)
type CoverLine = 'divider' | { label: string, value: string, big?: boolean };

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

  //// การ์ดที่เลือกอยู่ — ต้องใช้ทั้งคู่ ไม่ใช่ transport อย่างเดียว
  //// เพราะ transport เดียวกันมีได้หลาย SUB_GROUP_PICK และต้องพิมพ์แยกใบกัน
  activeCode     = '';   //// TRANSPORT_CODE ที่เลือก
  activeSubGroup = '';   //// SUB_GROUP_PICK ที่เลือก ('' = การ์ดที่ไม่มี sub)

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

  //// ── สแกนไอเทมก่อนระบุขนาดกล่อง ────────────────────────────
  @ViewChild('inputScanItem') inputScanItem!: ElementRef<HTMLInputElement>;
  @ViewChild('inputBoxSize')  inputBoxSize!:  ElementRef<HTMLInputElement>;

  scanInput      = { ITEM_BARCODE: '' };
  itemScanned    = false;   //// สแกนผ่านแล้ว — ช่องขนาดกล่องถึงจะกรอกได้
  scannedBarcode = '';      //// barcode ที่สแกนผ่าน โชว์ยืนยันให้เห็นบนหน้าจอ

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
    this.isLoading      = true;
    this.activeCode     = '';
    this.activeSubGroup = '';

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
    this.activeSubGroup  = '';
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
    const t = this.transportList.find(
      x => x.code === this.activeCode && x.subGroup === this.activeSubGroup
    );
    return t ? t.kind : 1;
  }

  get isActiveCancel(): boolean {
    return this.activeKind === 3;
  }

  get isActiveDocP(): boolean {
    return this.activeKind === 2;
  }

  //// TRANSPORT_CODE ของแถว — ค่าว่างถูกจัดเป็นกลุ่ม (ไม่ระบุ) เหมือนเดิม
  codeOf(row: TrackingRow): string {
    return (row.TRANSPORT_CODE || '').trim() || '(ไม่ระบุ)';
  }

  //// SUB_GROUP_PICK ของแถว — ว่างได้ (กลุ่มที่ไม่ได้แบ่ง sub) ไม่ต้องแทนด้วย (ไม่ระบุ)
  //// เพราะ '' เป็นค่าที่ถูกต้องตามธุรกิจ ไม่ใช่ข้อมูลขาด
  subGroupOf(row: TrackingRow): string {
    return (row.SUB_GROUP_PICK || '').toString().trim();
  }

  // ── สรุปจำนวนต่อ TRANSPORT_CODE + SUB_GROUP_PICK ────────────
  buildTransportSummary(rows: TrackingRow[]): TransportSummary[] {
    const map = new Map<string, TransportSummary>();
    //// QTY รวมของแต่ละ SHIPMENT_ID แยกตามการ์ด — ต้องรวมก่อนแล้วค่อยหาค่าที่ไม่ซ้ำ
    //// เพราะ 1 order มีได้หลาย SKU (หลายแถว) จะอ่าน QTY ของแถวเดียวมาตอบตรงๆ ไม่ได้
    const qtyByCard = new Map<string, Map<string, number>>();
    //// หน่วยนับที่เจอในแต่ละการ์ด — ห้าม hardcode ว่า "ชิ้น" เพราะมีทั้งชิ้นและแพ็ก
    const uomByCard = new Map<string, Set<string>>();

    rows.forEach(r => {
      const code = this.codeOf(r);
      const sub  = this.subGroupOf(r);
      const kind = this.printKindOf(r);

      //// คีย์ของการ์ด = TRANSPORT_CODE + SUB_GROUP_PICK
      //// ใช้ JSON.stringify แทนการต่อสตริงด้วยตัวคั่น จะได้ไม่ต้องเดาว่าตัวคั่นตัวไหนปลอดภัย
      //// (ถ้าใช้ '|' แล้วชื่อ transport หรือ sub มี '|' อยู่ คีย์ของคนละการ์ดจะชนกันได้)
      const key = JSON.stringify([code, sub]);

      let s = map.get(key);
      if (!s) {
        s = { code: code, subGroup: sub, kind: kind, total: 0, pending: 0, noFile: 0,
              isCancel: kind === 3, isDocP: kind === 2,
              qtyText: '—', qtyMixed: false, uom: '' };
        map.set(key, s);
      }
      s.total++;
      if (this.isPending(r)) { s.pending++; }
      //// Cancel/DocP พิมพ์จากข้อมูลใน DB ไม่ได้ใช้ FILE_PACKING จึงไม่นับว่า "ไม่มีไฟล์"
      if (!r.FILE_PACKING && s.kind === 1) { s.noFile++; }

      const shipment = (r.SHIPMENT_ID || '').trim();
      if (shipment) {
        let byOrder = qtyByCard.get(key);
        if (!byOrder) { byOrder = new Map<string, number>(); qtyByCard.set(key, byOrder); }
        byOrder.set(shipment, (byOrder.get(shipment) || 0) + this.qtyOf(r));
      }

      const unit = (r.UOM === null || r.UOM === undefined ? '' : String(r.UOM)).trim();
      if (unit) {
        let units = uomByCard.get(key);
        if (!units) { units = new Set<string>(); uomByCard.set(key, units); }
        units.add(unit);
      }
    });

    //// จำนวนชิ้นต่อ order ของแต่ละการ์ด — ปกติ sub group เดียวกันต้องได้เลขเดียว
    //// (การแบ่ง sub ก็เพื่อแยกของที่ต่อ order ไม่เท่ากันออกจากกัน) ถ้าได้หลายเลข
    //// แปลว่าข้อมูลผิดปกติ ต้องโชว์เป็นช่วงพร้อมเตือน ไม่ใช่หยิบเลขเดียวมาโชว์
    map.forEach((s, key) => {
      const byOrder = qtyByCard.get(key);
      const values  = byOrder ? Array.from(new Set(byOrder.values())).sort((a, b) => a - b) : [];
      s.qtyMixed = values.length > 1;
      s.qtyText  = this.qtyRangeText(values);
      const units = uomByCard.get(key);
      s.uom      = units ? Array.from(units).join(' / ') : '';
    });

    //// เรียงตาม STATUS_PRINT → TRANSPORT_CODE → SUB_GROUP_PICK ให้ตรงกับลำดับในตาราง
    return Array.from(map.values()).sort(
      (a, b) => (a.kind - b.kind)
             || a.code.localeCompare(b.code)
             || a.subGroup.localeCompare(b.subGroup)
    );
  }

  //// order by STATUS_PRINT, TRANSPORT_CODE, SUB_GROUP_PICK, TRACKING
  sortRows(rows: TrackingRow[]): TrackingRow[] {
    return rows.slice().sort((a, b) =>
         (this.printKindOf(a) - this.printKindOf(b))
      || (a.TRANSPORT_CODE || '').trim().localeCompare((b.TRANSPORT_CODE || '').trim())
      || this.subGroupOf(a).localeCompare(this.subGroupOf(b))
      || (a.TRACKING || '').trim().localeCompare((b.TRACKING || '').trim())
    );
  }

  //// แถวของการ์ดหนึ่งใบ — ต้องตรงทั้ง transport และ sub group
  rowsOf(code: string, subGroup: string): TrackingRow[] {
    return this.data_list.filter(
      r => this.codeOf(r) === code && this.subGroupOf(r) === subGroup
    );
  }

  get activeRows(): TrackingRow[] {
    return this.activeCode ? this.rowsOf(this.activeCode, this.activeSubGroup) : [];
  }

  //// หน่วยนับของการ์ดที่เลือกอยู่ — ใช้บน modal แทนการ fix ว่า "ชิ้น"
  get activeUom(): string {
    return this.uomOf(this.activeRows);
  }

  //// ชื่อการ์ดที่เลือกอยู่ สำหรับข้อความบนจอ เช่น "Lex / SUB-01"
  get activeCardLabel(): string {
    return this.activeSubGroup ? this.activeCode + ' / ' + this.activeSubGroup : this.activeCode;
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

  //// แถวที่จะถูกพิมพ์จริงในรอบนี้ — DocP ไม่มี FILE_PACKING จึงใช้ทุกแถวที่ยังไม่พิมพ์
  //// ใช้ร่วมกันระหว่างการสรุปจำนวนใน modal กับ confirmPrint() จะได้ไม่มีทางนับคนละชุดกัน
  get printRows(): TrackingRow[] {
    return this.isActiveDocP ? this.activePendingRows : this.printableRows;
  }

  // ── สแกนไอเทม + สรุปจำนวนชิ้น ───────────────────────────────

  //// barcode ไอเทมไม่ซ้ำของรอบที่จะพิมพ์ — ปกติมีตัวเดียว (Group SKU) แต่รองรับหลายตัวไว้
  get activeBarcodes(): string[] {
    const seen = new Set<string>();
    this.printRows.forEach(r => {
      const code = this.normalizeBarcode(r.ITEM_ID_BARCODE);
      if (code) { seen.add(code); }
    });
    return Array.from(seen);
  }

  //// รหัสสินค้าไม่ซ้ำของรอบที่จะพิมพ์ — โชว์ให้เห็นว่ากลุ่มนี้ต้องหยิบของตัวไหนมาสแกน
  //// ปกติมีตัวเดียว ถ้าได้หลายตัวก็โชว์ทั้งหมด (กลุ่มมีหลาย SKU)
  get activeItemIds(): string[] {
    const seen = new Set<string>();
    this.printRows.forEach(r => {
      const id = (r.ITEM_ID || '').toString().trim();
      if (id) { seen.add(id); }
    });
    return Array.from(seen);
  }

  //// ข้อความรหัสสินค้าสำหรับโชว์บน modal
  get activeItemText(): string {
    const ids = this.activeItemIds;
    return ids.length ? ids.join(', ') : '—';
  }

  //// กลุ่มนี้มี barcode ให้เทียบไหม — ไม่มี = ข้อมูลต้นทางไม่ครบ ต้องไปแก้ที่ข้อมูล
  get hasBarcodeData(): boolean {
    return this.activeBarcodes.length > 0;
  }

  //// ผ่านด่านสแกนแล้วหรือยัง — ต้องสแกนผ่านเสมอ ไม่มีทางลัด
  ////
  //// เดิมเคยปล่อยผ่านเมื่อไม่มี barcode ในข้อมูล ซึ่งกลับหัวกลับหาง:
  //// "ข้อมูลไม่ครบ" กลายเป็น "ข้ามด่านตรวจ" ทั้งที่เป็นกรณีที่ควรตรวจเข้มที่สุด
  //// กลุ่มที่ไม่มี barcode จึงพิมพ์ไม่ได้จนกว่าจะไปเติมข้อมูลให้ครบ — สินค้าจะได้ไม่ตกหล่น
  get isItemScanOk(): boolean {
    return this.itemScanned;
  }

  //// เทียบ barcode แบบตัดช่องว่างหัวท้ายและไม่สนตัวพิมพ์เล็ก/ใหญ่
  //// เครื่องสแกนบางรุ่นเติม space/ตัวพิมพ์มาไม่ตรงกับที่เก็บใน DB
  normalizeBarcode(value: any): string {
    return (value === null || value === undefined ? '' : String(value)).trim().toUpperCase();
  }

  //// จำนวนชิ้นทั้งหมดที่จะพิมพ์รอบนี้ — เอาไว้เช็คกับของจริงตรงหน้าก่อนกดพิมพ์
  get totalQty(): number {
    return this.printRows.reduce((sum, r) => sum + this.qtyOf(r), 0);
  }

  //// QTY ของแถว — คอลัมน์ใหม่อาจเป็น null ตอน job ต้นทางยังเติมไม่ครบ
  qtyOf(row: TrackingRow): number {
    const n = Number(row.QTY);
    return isNaN(n) ? 0 : n;
  }

  //// จำนวน order — นับ SHIPMENT_ID ที่ไม่ซ้ำ ไม่ใช่จำนวนแถว (เผื่อวันหนึ่ง 1 order มีหลาย SKU)
  countOrders(rows: TrackingRow[]): number {
    const ids = new Set<string>();
    rows.forEach(r => {
      const id = (r.SHIPMENT_ID || '').trim();
      if (id) { ids.add(id); }
    });
    return ids.size;
  }

  //// จำนวนชิ้นรวมของกลุ่มแถวที่ให้มา
  sumQty(rows: TrackingRow[]): number {
    return rows.reduce((sum, r) => sum + this.qtyOf(r), 0);
  }

  //// หน่วยนับของกลุ่มแถว — ปกติทั้งกลุ่มใช้หน่วยเดียว
  //// ถ้าเจอหลายหน่วยให้โชว์ทุกตัว จะได้เห็นว่าข้อมูลปนกัน ไม่ใช่เลือกมาโชว์ตัวเดียว
  uomOf(rows: TrackingRow[]): string {
    const set = new Set<string>();
    rows.forEach(r => {
      const u = (r.UOM === null || r.UOM === undefined ? '' : String(r.UOM)).trim();
      if (u) { set.add(u); }
    });
    return Array.from(set).join(' / ');
  }

  //// จำนวนชิ้นต่อ 1 order — รวม QTY ของแถวที่เป็น order เดียวกันก่อน
  //// (1 order มีได้หลาย SKU จึงห้ามอ่าน QTY ของแถวเดียวมาตอบตรงๆ)
  //// คืนค่าที่ไม่ซ้ำกัน ปกติจะได้ตัวเดียว ถ้าได้หลายตัวแปลว่าแต่ละ order มีของไม่เท่ากัน
  get qtyPerOrderValues(): number[] {
    const byOrder = new Map<string, number>();
    this.printRows.forEach(r => {
      const id = (r.SHIPMENT_ID || '').trim();
      if (!id) { return; }
      byOrder.set(id, (byOrder.get(id) || 0) + this.qtyOf(r));
    });
    return Array.from(new Set(byOrder.values())).sort((a, b) => a - b);
  }

  //// ข้อความจำนวนชิ้นต่อ order สำหรับโชว์บน modal
  get qtyPerOrderText(): string {
    return this.qtyRangeText(this.qtyPerOrderValues);
  }

  //// แปลงจำนวนชิ้นต่อ order เป็นข้อความ — ใช้ทั้งบนการ์ดและใน modal จะได้ไม่เขียนคนละแบบ
  //// 0 คือ job ต้นทางยังไม่เติม QTY มาให้ ต้องโชว์ '—' ไม่ใช่เลข 0
  //// (order ที่มีของ 0 ชิ้นไม่มีจริง ถ้าโชว์ 0 คนอ่านจะนึกว่าเป็นจำนวนที่ถูกต้อง)
  qtyRangeText(values: number[]): string {
    if (values.length === 0) { return '—'; }
    if (values.length === 1) { return values[0] > 0 ? String(values[0]) : '—'; }
    //// ไม่เท่ากันทุก order — โชว์ช่วงไว้ให้เห็นว่าข้อมูลผิดปกติ จะได้ไม่เผลอเชื่อเลขเดียว
    return values[0] + ' - ' + values[values.length - 1];
  }

  //// true = แต่ละ order มีของไม่เท่ากัน ควรเตือนก่อนพิมพ์
  get isQtyPerOrderMixed(): boolean {
    return this.qtyPerOrderValues.length > 1;
  }

  //// เสียงตอบรับการสแกน — ไฟล์ชุดเดียวกับหน้า audit-check
  ////
  //// หน้าอื่น hardcode เป็น http://10.26.1.21/TSDC/assets/... ซึ่งเล่นไม่ออกตอน ng serve
  //// และผูกกับเครื่อง production ตัวเดียว ตรงนี้อิง document.baseURI แทน จึงได้ path ที่ถูก
  //// ทั้งตอน dev (localhost:4200) และตอน deploy ทุก base-href (/TSDC/, /beta/, /dev/)
  playAudio(file: string): void {
    try {
      const audio = new Audio(new URL('assets/audio/' + file, document.baseURI).href);
      audio.load();
      //// เบราว์เซอร์บล็อกเสียงได้ถ้าผู้ใช้ยังไม่เคยคลิกอะไรในหน้านั้น — เงียบไปเฉยๆ พอ
      //// ห้ามให้ error เรื่องเสียงไปขวางการสแกน ซึ่งเป็นงานหลักตรงนี้
      const played: any = audio.play();
      if (played && played.catch) { played.catch(() => { /* เล่นไม่ได้ก็ข้าม */ }); }
    } catch (err) {
      console.log('playAudio', err);
    }
  }

  //// สแกน barcode ไอเทม — ถูกแล้วเด้งไปช่องขนาดกล่องทันที ผิดแล้วเตือนและให้สแกนใหม่
  //// สแกนสำเร็จครั้งเดียวพอต่อการเปิด modal 1 ครั้ง (ทั้งกลุ่มเป็นสินค้าตัวเดียวกัน)
  scanItem(): void {
    if (this.itemScanned) { return; }

    const code = this.normalizeBarcode(this.scanInput.ITEM_BARCODE);
    if (!code) { return; }

    //// ข้อมูลกลุ่มนี้ไม่มี barcode เลย — บอกตรงๆ ว่าต้องไปแก้ที่ข้อมูล
    //// ไม่ใช้ข้อความ "Item ไม่ถูกต้อง" เพราะของที่พนักงานถืออยู่อาจถูกแล้ว ปัญหาอยู่ที่ข้อมูล
    if (!this.hasBarcodeData) {
      this.scanInput.ITEM_BARCODE = '';
      this.playAudio('error.mp3');
      Swal.fire({
        icon: 'warning',
        title: 'กลุ่มนี้ไม่มีข้อมูล barcode สินค้า',
        html: 'Group Pick : <b>' + this.loadedGroupPick + '</b>'
      }).then(() => this.focusScanTarget());
      return;
    }

    if (this.activeBarcodes.indexOf(code) === -1) {
      this.scanInput.ITEM_BARCODE = '';
      this.playAudio('error.mp3');
      Swal.fire({
        icon: 'error',
        title: 'Item ไม่ถูกต้อง',
        html: 'barcode ที่สแกน : <b style="color:#dc3545">' + code + '</b><br>'
            + '<small>กลุ่มนี้ต้องเป็นสินค้า <b>' + this.activeItemText + '</b></small>'
      }).then(() => this.focusScanTarget());
      return;
    }

    this.itemScanned    = true;
    this.scannedBarcode = code;
    this.playAudio('ok.mp3');
    this.focusScanTarget();
  }

  //// โฟกัสช่องที่ต้องกรอกถัดไป — ยังไม่สแกน = ช่องไอเทม, สแกนผ่านแล้ว = ช่องขนาดกล่อง
  //// setTimeout เพราะตอนถูกเรียกจาก shown.bs.modal / หลังปิด Swal ช่องยังโฟกัสไม่ติด
  focusScanTarget(): void {
    setTimeout(() => {
      const target = this.isItemScanOk ? this.inputBoxSize : this.inputScanItem;
      if (target && target.nativeElement) {
        target.nativeElement.focus();
        target.nativeElement.select();
      }
    }, 150);
  }

  // ── กดการ์ด → เปิด modal ยืนยัน ──────────────────────────────
  //// รับทั้งใบ ไม่ใช่แค่ code เพราะ 1 การ์ด = transport + sub group
  openPrintModal(t: TransportSummary): void {
    if (this.isPrinting) { return; }

    this.activeCode     = t.code;
    this.activeSubGroup = t.subGroup;

    //// พิมพ์ครบแล้วไม่ให้กดซ้ำ — การ์ดก็ disabled อยู่แล้ว ตรงนี้กันอีกชั้น
    if (this.activePendingRows.length === 0) {
      Swal.fire({ icon: 'info', title: 'พิมพ์ไปแล้วทั้งหมด',
                  text: 'รายการของ ' + this.activeCardLabel + ' ถูกพิมพ์ครบแล้ว',
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
                  text: 'รายการของ ' + this.activeCardLabel + ' ไม่มี FILE_PACKING',
                  showConfirmButton: false, timer: 2500 });
      return;
    }

    //// ทั้ง 2 กลุ่มสแกนไอเทม → ระบุขนาดกล่อง → running — ต่างกันแค่พิมพ์อะไรต่อ
    this.resetBox();

    //// ต้องรอ shown.bs.modal จริงๆ ถึงจะโฟกัสติด — ตอนสั่ง show() ช่องยังถูกซ่อนอยู่
    //// one() = ผูกครั้งเดียวแล้วปลดเอง กันซ้อนกันทุกครั้งที่เปิด modal ใหม่
    $('#boxPrintModal').one('shown.bs.modal', () => this.focusScanTarget());
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

    //// ล้างผลสแกนด้วยทุกครั้งที่เปิด modal ใหม่ — คนละการ์ดคือคนละสินค้า ต้องสแกนใหม่เสมอ
    this.scanInput      = { ITEM_BARCODE: '' };
    this.itemScanned    = false;
    this.scannedBarcode = '';
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
    const rows = this.printRows;
    if (rows.length === 0) { return; }

    //// ปุ่มพิมพ์ disabled อยู่แล้วถ้ายังไม่สแกน ตรงนี้กันอีกชั้นเผื่อถูกเรียกทางอื่น
    if (!this.isItemScanOk) {
      Swal.fire({ icon: 'warning', title: 'สแกน barcode item ก่อน',
                  showConfirmButton: false, timer: 2500 });
      return;
    }

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
      const subGroup  = this.activeSubGroup;

      //// confirm outbound ก่อน จะได้เลขพาเลทมาทำเป็นหน้าแรกของเล่ม
      //// print dialog จึงเด้งครั้งเดียว ไม่ต้องแยกพิมพ์ใบปะหน้าด้วย window.print()
      return this.confirmOutbound(printedRows, transport, subGroup).then(pallet => {
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

  //// จำนวนแบบมีลูกน้ำคั่นหลักพัน — ยอดทั้ง group เป็นหลักพันได้
  numText(value: number): string {
    return (Number(value) || 0).toLocaleString('en-US');
  }

  //// ตัวเลขสรุปบนใบปะหน้า — ใช้ร่วมกันระหว่างตอนพิมพ์จริงกับตอนกดดูตัวอย่าง
  //// จะได้ไม่มีทางที่ใบตัวอย่างกับใบจริงคิดเลขคนละแบบ
  coverTotals(transport: string, subGroup: string) {
    const groupRows = this.data_list;
    const subRows   = this.rowsOf(transport, subGroup);
    const card      = this.transportList.find(
      x => x.code === transport && x.subGroup === subGroup
    );

    return {
      GROUP_ORDERS:   this.countOrders(groupRows),
      GROUP_QTY:      this.sumQty(groupRows),
      GROUP_UOM:      this.uomOf(groupRows),
      SUB_GROUP_PICK: subGroup,
      SUB_ORDERS:     this.countOrders(subRows),
      SUB_QTY:        this.sumQty(subRows),
      QTY_PER_BOX:    card ? card.qtyText : '—',
      UOM:            this.uomOf(subRows)
    };
  }

  //// เปิดดูใบปะหน้าเฉย ๆ ไม่แตะข้อมูลเลย
  //// ไม่ยิง confirm outbound (ไม่เกิดเลขพาเลทใหม่) ไม่อัปเดต PRINT_STATUS
  //// ไม่โหลดไฟล์ label ของใคร — ได้ PDF หน้าเดียวเปิดในแท็บใหม่ ไม่เด้ง print dialog
  //// ตัวเลขทุกตัวเป็นของจริงจากกลุ่มที่โหลดอยู่ ยกเว้นเลขพาเลทที่ยังไม่มีจึงใส่ PREVIEW ไว้
  async previewPalletCover(): Promise<void> {
    try {
      const sheet: PalletSheet = Object.assign({
        PALLET_NO:      'PREVIEW',
        GROUP_PICK:     this.loadedGroupPick,
        TRANSPORT_CODE: this.activeCode,
        QTY_SHIPMENT:   this.activePendingRows.length,
        QTY_BOX:        0,
        PRINT_DATE:     this.timeService.getNow(),
        REMOTE_ERROR:   ''
      }, this.coverTotals(this.activeCode, this.activeSubGroup));

      const doc = await PDFDocument.create();
      await this.addPalletCover(doc, sheet);
      const bytes = await doc.save();

      //// copy ลง ArrayBuffer ตรง ๆ เหมือน sendToPrinter (Uint8Array ของ TS ใหม่ไม่ใช่ BlobPart)
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);

      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);

    } catch (e) {
      console.log('preview pallet cover failed', e);
      Swal.fire({ icon: 'error', title: 'สร้างตัวอย่างใบปะหน้าไม่สำเร็จ',
                  showConfirmButton: false, timer: 2500 });
    }
  }

  //// รายละเอียดใต้บาร์โค้ด เรียงตามที่หน้างานขอ
  //// บล็อกบน = ภาพรวมทั้ง group + ตัวพาเลท · บล็อกล่าง = ของ sub group ที่พิมพ์รอบนี้
  //// บรรทัดสุดท้ายซ้ำ "จำนวนชิ้นต่อกล่องที่บรรจุ" ด้วยตัวใหญ่ ตั้งใจให้เห็นแต่ไกลตอนแพ็ก
  coverLines(sheet: PalletSheet): CoverLine[] {
    const uom      = sheet.UOM ? ' ' + sheet.UOM : '';
    //// ทั้ง group อาจมีหลาย sub ที่คนละหน่วย ตรงนี้จึงเป็นหน่วยของทั้ง group ไม่ใช่ของ sub
    const groupUom = sheet.GROUP_UOM ? ' ' + sheet.GROUP_UOM : '';
    return [
      { label: 'Group Pick',                value: sheet.GROUP_PICK },
      { label: 'จำนวน order ทั้งหมด',       value: this.numText(sheet.GROUP_ORDERS) + ' order' },
      //// 0 = job ต้นทางยังไม่เติม QTY มาให้ โชว์ '—' เหมือนที่อื่น ไม่ใช่เลข 0
      { label: 'จำนวนชิ้นทั้งหมด',          value: sheet.GROUP_QTY > 0 ? this.numText(sheet.GROUP_QTY) + groupUom : '—' },
      { label: 'Pallet No',                 value: sheet.PALLET_NO },
      //// 1 order = 1 กล่อง จำนวนกล่องของทั้ง group จึงเป็นเลขเดียวกับจำนวน order ด้านบน
      //// (ไม่ได้ใช้ QTY_BOX ที่ API คืนมา ตัวนั้นเป็นยอดสะสมเฉพาะพาเลทใบนั้น)
      { label: 'จำนวนกล่อง',                value: this.numText(sheet.GROUP_ORDERS) + ' กล่อง' },
      'divider',
      { label: 'ขนส่ง',                     value: sheet.TRANSPORT_CODE, big: true },
      { label: 'Sub Group Pick',            value: sheet.SUB_GROUP_PICK || '—' },
      { label: 'จำนวน order ใน sub group',  value: this.numText(sheet.SUB_ORDERS) + ' order' },
      { label: 'จำนวนชิ้นใน sub group',     value: sheet.SUB_QTY > 0 ? this.numText(sheet.SUB_QTY) + uom : '—' },
      { label: 'จำนวนชิ้นต่อกล่องที่บรรจุ', value: sheet.QTY_PER_BOX + uom },
      'divider',
      { label: 'จำนวนชิ้นต่อกล่องที่บรรจุ', value: sheet.QTY_PER_BOX + uom, big: true }
    ];
  }

  //// วาดบล็อกรายละเอียดลง canvas แล้วคืนเป็น PNG พร้อมขนาดที่จะวางบนกระดาษ (pt)
  ////
  //// ทำไมไม่เขียนด้วย pdf-lib ตรง ๆ: ฟอนต์มาตรฐานของ PDF เป็น WinAnsi ไม่มีตัวอักษรไทย
  //// (ของเดิมจึงต้องใช้ป้ายภาษาอังกฤษ) ถ้าจะเขียนไทยต้องลง @pdf-lib/fontkit เพิ่ม
  //// แล้วแนบไฟล์ฟอนต์ไทยไปกับแอปด้วย วาดผ่าน canvas ใช้ฟอนต์ไทยของเครื่องที่มีอยู่แล้ว
  //// ไม่ต้องเพิ่ม dependency และไม่ต้องเพิ่มไฟล์ฟอนต์ (แนวเดียวกับ barcodePng)
  coverDetailPng(sheet: PalletSheet): { dataUrl: string, wPt: number, hPt: number } {
    const S      = 3;      //// วาดใหญ่กว่าขนาดจริง 3 เท่า พอย่อลงกระดาษตัวหนังสือจะคม
    const wPt    = 455;    //// เท่าความกว้างระหว่าง margin ของ A4
    const labelX = 6;
    const valueX = 250;    //// คอลัมน์ค่า — เผื่อป้ายยาวสุด ('จำนวนชิ้นต่อกล่องที่บรรจุ')
    const rowH   = 30;
    const bigH   = 46;
    const gapH   = 20;
    const FONT   = '"Leelawadee UI","Segoe UI",Tahoma,sans-serif';

    const lines = this.coverLines(sheet);
    let hPt = 10;
    lines.forEach(l => { hPt += (l === 'divider' ? gapH : (l.big ? bigH : rowH)); });

    const canvas  = document.createElement('canvas');
    canvas.width  = Math.round(wPt * S);
    canvas.height = Math.round(hPt * S);

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.scale(S, S);
    //// พื้นขาวทึบ ไม่ใช้พื้นโปร่ง — เครื่องพิมพ์บางตัวตีความพื้นโปร่งเป็นสีดำ
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, wPt, hPt);
    ctx.textBaseline = 'alphabetic';

    let y = 0;
    lines.forEach(l => {
      if (l === 'divider') {
        y += gapH / 2;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(labelX, y);
        ctx.lineTo(wPt - labelX, y);
        ctx.stroke();
        y += gapH / 2;
        return;
      }
      y += (l.big ? bigH : rowH);
      ctx.fillStyle = '#000000';
      ctx.font = '15px ' + FONT;
      ctx.fillText(l.label, labelX, y - 7);
      ctx.font = (l.big ? 'bold 34px ' : 'bold 17px ') + FONT;
      ctx.fillText(l.value, valueX, y - 7);
    });

    return { dataUrl: canvas.toDataURL('image/png'), wPt: wPt, hPt: hPt };
  }

  //// ใบปะหน้าพาเลทเป็นหน้าแรกของเล่ม
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

    drawCenter('PALLET COVER SHEET', 24, fontBold);
    y -= 40;

    //// บาร์โค้ดกว้างไม่เกิน 400pt กันล้นขอบเมื่อเลขยาว
    const scaled = png.scaleToFit(400, 130);
    y -= scaled.height;
    page.drawImage(png, { x: (W - scaled.width) / 2, y: y, width: scaled.width, height: scaled.height });

    //// รายละเอียดเป็นรูปที่วาดจาก canvas เพราะมีตัวอักษรไทย
    const detail    = this.coverDetailPng(sheet);
    const detailImg = await doc.embedPng(detail.dataUrl);
    y -= 40 + detail.hPt;
    page.drawImage(detailImg, {
      x: (W - detail.wPt) / 2, y: y, width: detail.wPt, height: detail.hPt
    });

    y -= 30;
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
  confirmOutbound(rows: TrackingRow[], transport: string, subGroup: string): Promise<PalletSheet | null> {
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

        resolve(Object.assign({
          PALLET_NO:      d.PALLET_NO,
          GROUP_PICK:     d.GROUP_PICK,
          TRANSPORT_CODE: d.TRANSPORT_CODE,
          QTY_SHIPMENT:   shipments.size,
          QTY_BOX:        Number(d.QTY_BOX) || 0,
          PRINT_DATE:     this.timeService.getNow(),
          REMOTE_ERROR:   remoteError
        //// ยอดทั้ง group / ยอดของการ์ดนี้ — ต้องอ่านตอนนี้ ก่อน markPrinted() จะ refresh ข้อมูลทิ้ง
        }, this.coverTotals(transport, subGroup)));

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
