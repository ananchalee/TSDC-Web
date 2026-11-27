// report-print-waveorder.component.ts
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { DataService } from '../../../services/index';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { ActivatedRoute, Router } from '@angular/router';
declare var $: any;

interface PrintRow {
  LAUNCH_NUM:     string;   
  REFERENCE_ID:   string;   
  Total_QTY:      number;   
  TYPE_PICK:      string;   
  TYPE_PICK_DESC: string;
  STATUS_PRINT:   string;   
  GETDATEDATE: Date;
}

interface TypeItem {
  key:       string;   // TYPE_PICK_DESC (การ์ด 1 ใบ = 1 ประเภท)
  label:     string;
  pickTypes: string[]; // TYPE_PICK ทั้งหมดในประเภทนี้ — ตัวที่ส่งให้ API
}

@Component({
  selector:    'app-report-print-waveorder',
  templateUrl: './report-print-waveorder.component.html',
  styleUrls:   ['./report-print-waveorder.component.scss']
})
export class ReportPrintWaveOrderComponent implements OnInit {

  @ViewChild('myModalDetail') myModalDetail!: ElementRef;
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  busy!:        Subscription;
  pageactive:   any;
  interval:     any;
  isLoading   = false;
  isPrinting  = false;   // รอ API บันทึกสถานะพิมพ์ — กันกดซ้ำระหว่างรอ
  //isSearched  = false;
  activeType  = '';
  selectedPaper = 'A4';
  res: any    = {};

  input = { waveno: '', type: '' };

  data_list:   PrintRow[] = [];
  detail_list: any[]      = [];
  typeList:    TypeItem[] = [];

  fromMonitor = false;

  constructor(
    private dataService: DataService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data;
    const page: any[] = [];
    page.push({ pagename: 'Report Print Wave Order', active: 'Reports', menubar: d['menubar'], version: d['version'], lastupdate: d['lastupdate'] });
    this.pageactive = page;

    this.route.queryParams.subscribe(params => {
      if (params['waveno']) {
        this.input.waveno = params['waveno'];
        this.fromMonitor = true;
        this.getdata();
      }
    });
  }

  goBackToMonitor(): void {
    this.router.navigate(['/monitor-waveorde']);
  }

  // ── ค้นหา ──────────────────────────────────────────────────
  getdata(): void {
    if (!this.input.waveno.trim()) return;
    this.isLoading = true;

     this.dataService.Get_OrderCountConfirmMan_PICK_PAPER(this.input).subscribe((res: any) => {
        this.isLoading = false;
      if (res.status === 'error') {
        Swal.fire({ icon: 'error', title: 'Error! can not get data',
                    showConfirmButton: false, timer: 2500 });
        return;
      }else if (res.status === 'null') {
        Swal.fire({ icon: 'warning', title: 'ไม่พบข้อมูล',
                        showConfirmButton: false, timer: 2500 });

              this.data_list = [];
      } else {
        this.res       = res;
        if(this.res && this.res.data[0] && this.res.data[0].order_count_confirm != this.res.data[0].order_count){
          Swal.fire({ icon: 'warning', title: 'Processing', text: 'กำลัง Process Wave นี้อยู่ กรุณารอซักครู่...',
                        showConfirmButton: false, timer: 2500 });

              this.data_list = [];
        }else{
          this.isLoading = true;
          this.dataService.Get_MANHT_PICK_PAPER(this.input).subscribe((res: any) => {
            this.res       = res;
            this.isLoading = false;

            if (this.res.status === 'error') {
              Swal.fire({ icon: 'error', title: 'Error! can not get data',
                          showConfirmButton: false, timer: 2500 });

            } else if (this.res.status === 'null') {
              Swal.fire({ icon: 'warning', title: 'ไม่พบข้อมูล',
                          showConfirmButton: false, timer: 2500 });

                this.data_list = [];

            } else {
              this.data_list  = this.res.data as PrintRow[];
              this.activeType = '';
              //this.isSearched = true;

              // สร้าง typeList จาก API — 1 การ์ด = 1 TYPE_PICK_DESC
              // เก็บ TYPE_PICK ทุกตัวในประเภทนั้นไว้ด้วย เพราะ API กับ SSRS ยังกรองด้วย TYPE_PICK
              const groupMap = new Map<string, TypeItem>();
              this.data_list.forEach((r: PrintRow) => {
                const group = groupMap.get(r.TYPE_PICK_DESC);
                if (group) {
                  if (!group.pickTypes.includes(r.TYPE_PICK)) {
                    group.pickTypes.push(r.TYPE_PICK);
                  }
                } else {
                  groupMap.set(r.TYPE_PICK_DESC, {
                    key:       r.TYPE_PICK_DESC,
                    label:     r.TYPE_PICK_DESC,
                    pickTypes: [r.TYPE_PICK]
                  });
                }
              });
              const fromData: TypeItem[] = [...groupMap.values()];

              if (!fromData.some((g: TypeItem) => g.pickTypes.includes('SORTER'))) {
                // เพิ่ม ORDER ไว้ลำดับแรก
                this.typeList = [
                  {
                    key:        'Order',
                    label:      'เรียงลำดับ ORDER ทั้งหมด',
                    pickTypes:  []
                  },
                  ...fromData
                ];
              }else{
                this.typeList = [
                  ...fromData
                ];
              }


            }
          });
        }
      }
      });

  }

  // ── map SSRS report path ────────────────────────────────────
  getReportPath(type: string): string {
    const map: Record<string, string> = {
      pick:    '%2fPACKING+LIST%2fATH_Pick_List',
      pack:    '%2fPACKING+LIST%2fATH_Packing_List4',
      ship:    '%2fPACKING+LIST%2fATH_Shipping_Label',
      invoice: '%2fPACKING+LIST%2fATH_Invoice',
    };
    return map[type] ?? '';
  }

  // ── Type tab ────────────────────────────────────────────────
  setType(key: string): void {
    this.activeType = this.activeType === key ? '' : key;
  }

  get filteredList(): PrintRow[] {
    if (!this.activeType) return this.data_list;
  
    if (this.activeType === 'Order') {
      // คืนเฉพาะรายการที่ยังไม่พิมพ์
      return this.data_list.filter((r: PrintRow) => r.STATUS_PRINT === 'N');
    }
    return this.data_list.filter((r: PrintRow) => r.TYPE_PICK_DESC === this.activeType);
  }

  get firstRow(): PrintRow | null {
  return this.filteredList.length > 0 ? this.filteredList[0] : null;
  }

  // ── TYPE_PICK ทั้งหมดของประเภทที่เลือกอยู่ — สะพานไป API/SSRS ──
  get activePickTypes(): string[] {
    const found = this.typeList.find((t: TypeItem) => t.key === this.activeType);
    return found ? found.pickTypes : [];
  }

  getTypeCount(key: string): number {
    if (key === 'Order') {
      // นับเฉพาะรายการที่ยังไม่พิมพ์
      return this.data_list.filter((r: PrintRow) => r.STATUS_PRINT === 'N').length;
    }
    return this.data_list.filter((r: PrintRow) => r.TYPE_PICK_DESC === key).length;
  }

  get activeLabel(): string {
    const found = this.typeList.find((t: TypeItem) => t.key === this.activeType);
    return found ? found.label : this.activeType;
  }

  // ── เช็คว่ามีรายการที่ยังไม่พิมพ์ไหม ──────────────────────
  get hasPending(): boolean {
    return this.filteredList.some((r: PrintRow) => r.STATUS_PRINT === 'N');
  }
  // ── Modal ───────────────────────────────────────────────────
  openModal(): void {
    if (this.isPrinting) return;
    if (!this.hasPending) {
      Swal.fire({
        icon: 'warning',
        title: 'พิมพ์แล้ว',
        text: 'รายการนี้ถูกพิมพ์ไปแล้วทั้งหมด',
        showConfirmButton: false,
        timer: 2000
      });
      return;
    }
    $('#printModal').modal('show');
  }

  closeModal(): void {
  $('#printModal').modal('hide');
}

  readonly REPORT_BASE = 'http://10.26.1.83/ReportServer/Pages/ReportViewer.aspx';

  // ── พิมพ์ทั้งหมดตาม activeType ─────────────────────────────
 confirmPrint(): void {
  if (this.isPrinting) return;

  $('#printModal').modal('hide');

  const wave = encodeURIComponent(this.input.waveno);

  let url = '';

  if (this.activePickTypes.includes('SORTER')) {
    // ── กรณี SORTER ──────────────────────────────────────────
    url = `${this.REPORT_BASE}`
        + `?%2fILS%2fReporting%2fSorterTest`
        + `&rs:Command=Render`
        + `&Wave_No=${wave}`;
    window.open(url, '_blank');

  } else if (this.activeType === 'Order') {
    // ── กรณี ORDER (เรียงลำดับ) → เปิดทีเดียวทั้งหมด ────────
    url = `${this.REPORT_BASE}`
        + `?%2fILS%2fReporting%2fTsdcOrderPicking_SortByShipment`
        + `&rs:Command=Render`
        + `&Wave_No=${wave}`;
    window.open(url, '_blank');

  } else {
    // ── กรณีอื่นๆ → ส่ง TYPE_PICK_DESC ตัวเดียว ─────────────
    // SSRS วนสร้างใบปะหน้า + ใบ pick ให้ครบทุก TYPE_PICK ในประเภทนั้นเอง
    if (!this.activeType || this.filteredList.length === 0) return;

    url = `${this.REPORT_BASE}`
        + `?%2fILS%2fReporting%2fTsdcOrderPicking_SortByTypeDesc`
        + `&rs:Command=Render`
        + `&Wave_No=${wave}`
        + `&TYPE_PICK_DESC=${encodeURIComponent(this.activeType)}`;
    window.open(url, '_blank');
  }

  const payload = this.activeType === 'Order'
    ? { waveno: this.input.waveno }
    : { waveno: this.input.waveno, typeDesc: this.activeType };

  this.savePrintStatus(payload);

}

// ── บันทึก STATUS_PRINT = 'Y' ─────────────────────────────────
// เดิมไม่เช็คผลลัพธ์เลย ถ้า update ล้มเหลว (เช่น timeout เพราะ job บน .11
// ล็อกตารางอยู่) หน้าจอจะยังเป็น "รอพิมพ์" และผู้ใช้ต้องกดพิมพ์ซ้ำ
// ตอนนี้ถ้าล้มเหลวให้ลองบันทึกซ้ำได้เลย โดยไม่ต้องเปิดใบ pick ใหม่
savePrintStatus(payload: any): void {
  this.isPrinting = true;

  const fail = (message?: string) => {
    this.isPrinting = false;
    Swal.fire({
      icon: 'error',
      title: 'บันทึกสถานะพิมพ์ไม่สำเร็จ',
      text: message || 'ใบ pick เปิดแล้ว แต่สถานะยังไม่เปลี่ยน',
      showCancelButton: true,
      confirmButtonText: 'บันทึกอีกครั้ง',
      cancelButtonText: 'ปิด'
    }).then((r: any) => {
      if (r.isConfirmed || r.value) {
        this.savePrintStatus(payload);
      } else {
        this.getdata();
      }
    });
  };

  this.dataService.Update_MANHT_PICK_PAPER(payload).subscribe(
    (res: any) => {
      this.res = res;
      if (!res || res.status !== 'success') {
        fail(res && res.message);
        return;
      }
      this.isPrinting = false;
      this.getdata();
    },
    () => fail('เชื่อมต่อ API ไม่ได้')
  );
}

// ── Sum QTY ทั้งหมดใน filteredList ──────────────────────────
get totalQty(): number {
  return this.filteredList.reduce((sum: number, r: PrintRow) => sum + r.Total_QTY, 0);
}


// ── พิมพ์ใบ Pick ──────────────────────────────────────────────
printTracking(): void {
  window.print();
}

printSingleRow(row: PrintRow): void {
  const wave  = encodeURIComponent(this.input.waveno);
  let url = '';

}

}
