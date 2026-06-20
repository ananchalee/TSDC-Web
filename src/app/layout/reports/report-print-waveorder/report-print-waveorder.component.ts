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
  key:   string;
  label: string;
}

interface ItemLocationRow {
  ITEM:   string;
  FROM_LOC:  string;
  Total_QTY: number;
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
  pagePrintCoverSheet = true;  
  isLoading   = false;
  //isSearched  = false;
  activeType  = '';
  selectedPaper = 'A4';
  res: any    = {};

  input = { waveno: '', type: '' };

  data_list:   PrintRow[] = [];
  detail_list: any[]      = [];
  typeList:    TypeItem[] = [];
  itemLocationList: ItemLocationRow[] = [];

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

              // สร้าง typeList จาก API
              const fromData: TypeItem[] = [
                ...new Map(
                  this.data_list.map((r: PrintRow) => [
                    r.TYPE_PICK,
                    {
                      key:        r.TYPE_PICK,
                      label:      r.TYPE_PICK_DESC
                    } as TypeItem
                  ])
                ).values()
              ];

              console.log(fromData)
              if(fromData[0].key != "SORTER"){
                // เพิ่ม ORDER ไว้ลำดับแรก
                this.typeList = [
                  {
                    key:        'Order',
                    label:      'เรียงลำดับ ORDER ทั้งหมด'
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
    return this.data_list.filter((r: PrintRow) => r.TYPE_PICK === this.activeType);
  }

  get firstRow(): PrintRow | null {
  return this.filteredList.length > 0 ? this.filteredList[0] : null;
  }

  getTypeCount(key: string): number {
    if (key === 'Order') {
      // นับเฉพาะรายการที่ยังไม่พิมพ์
      return this.data_list.filter((r: PrintRow) => r.STATUS_PRINT === 'N').length;
    }
    return this.data_list.filter((r: PrintRow) => r.TYPE_PICK === key).length;
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

  $('#printModal').modal('hide');

  const wave = encodeURIComponent(this.input.waveno);

  let url = '';

  if (this.activeType === 'SORTER') {
    this.input.type  = this.activeType;

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
    // ── กรณีอื่นๆ → ส่ง TYPE_PICK ด้วย ──────────────────────
    if (!this.activeType || this.filteredList.length === 0) return;
    this.input.type  = this.activeType;

    url = `${this.REPORT_BASE}`
        + `?%2fILS%2fReporting%2fTsdcOrderPicking_SortByType`
        + `&rs:Command=Render`
        + `&Wave_No=${wave}`
        + `&TYPE_PICK=${encodeURIComponent(this.activeType)}`;
    window.open(url, '_blank');
  }

  this.dataService.Update_MANHT_PICK_PAPER(this.input).subscribe((res: any) => {
    this.res       = res;
    this.getdata();
  })

}

// ── Sum QTY ทั้งหมดใน filteredList ──────────────────────────
get totalQty(): number {
  return this.filteredList.reduce((sum: number, r: PrintRow) => sum + r.Total_QTY, 0);
}

// ── พิมพ์ใบปะหน้า ────────────────────────────────────────────
printCoverPage(): void {
  $('#printModal').modal('hide');

  if (this.activeType.startsWith('GROUP_SINGLESKU')) {
    this.isLoading = true;
    this.input.type  = this.activeType;
    this.dataService.Get_ITEM_LOCATION_MANHT_PICK_PAPER(this.input).subscribe((res: any) => {
      this.isLoading = false;
      if (res.status === 'success') {
        this.itemLocationList = res.data as ItemLocationRow[];
        this.doPrint();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถดึงข้อมูล Item Location',
          showConfirmButton: false,
          timer: 2000
        });
      }
    });
  } else {
    // พิมพ์ใบปะหน้าอย่างเดียว
    this.itemLocationList = [];
    this.doPrint();
  }
}

// ── function สั่งพิมพ์จริง ───────────────────────────────────
doPrint(): void {
  this.pagePrintCoverSheet = false;
  setTimeout(() => {
    window.print();
    this.pagePrintCoverSheet = true;
  }, 500);
}

// ── getter ตรวจว่าเป็น GROUP_SINGLESKU ──────────────────────
get isGroupSingleSku(): boolean {
  return this.activeType.startsWith('GROUP_SINGLESKU');
}

// ── sum qty ของ itemLocationList ─────────────────────────────
get totalItemQty(): number {
  return this.itemLocationList.reduce(
    (sum: number, r: ItemLocationRow) => sum + r.Total_QTY, 0
  );
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