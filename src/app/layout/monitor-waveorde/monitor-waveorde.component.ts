import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../services/index';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface WavePendingRow {
  LAUNCH_NUM:    string;
  ORDER_COUNT:   number;
  TOTAL_QTY:     number;
  PRINTED_COUNT: number;
  UNPRINT_COUNT: number;
  CREATE_DATE:   string;
}

@Component({
  selector:    'app-monitor-waveorde',
  templateUrl: './monitor-waveorde.component.html',
  styleUrls:   ['./monitor-waveorde.component.scss']
})
export class MonitorWaveOrdeComponent implements OnInit, OnDestroy {

  pageactive: any;
  data_list: WavePendingRow[] = [];
  isLoading  = false;
  countdown  = 301;

  readonly CIRCLE_R = 80;

  private intervalRefresh:   any;
  private intervalCountdown: any;

  constructor(
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const page: any[] = [];
    page.push({ pagename: 'Monitor-WaveOrder', active: 'Moniter' });
    this.pageactive = page;

    this.getdata();
    this.intervalRefresh   = setInterval(() => this.getdata(), 300000);
    this.intervalCountdown = setInterval(() => {
      if (this.countdown > 0) this.countdown--;
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalRefresh);
    clearInterval(this.intervalCountdown);
  }

  getdata(): void {
    this.countdown = 301;
    this.isLoading = true;
    this.dataService.Get_PendingPrint_WaveOrderList().subscribe((res: any) => {
      this.isLoading = false;
      if (res.status === 'error') {
        Swal.fire({ icon: 'error', title: 'Error! ไม่สามารถดึงข้อมูลได้',
                    showConfirmButton: false, timer: 2500 });
      } else if (res.status === 'null') {
        this.data_list = [];
      } else {
        this.data_list = res.data as WavePendingRow[];
      }
    });
  }

  goToPrint(row: WavePendingRow): void {
    this.router.navigate(['/report-printWaveOrder'], { queryParams: { waveno: row.LAUNCH_NUM } });
  }

  cancelPrint(row: WavePendingRow): void {
    Swal.fire({
      title: 'ยืนยันยกเลิก?',
      html: `ยกเลิกการพิมพ์ Wave: <b>${row.LAUNCH_NUM}</b>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ไม่ยกเลิก',
      backdrop: false
    }).then(result => {
      if (result.value) {
        this.dataService.Cancel_PendingPrint_WaveOrder({ waveno: row.LAUNCH_NUM })
          .subscribe((res: any) => {
            if (res.status === 'success') {
              Swal.fire({ icon: 'success', title: 'ยกเลิกสำเร็จ',
                          showConfirmButton: false, timer: 1500 });
              this.getdata();
            } else {
              Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด',
                          showConfirmButton: false, timer: 2000 });
            }
          });
      }
    });
  }

  // ── Summary getters ──────────────────────────────────────────
  get totalWaves():     number { return this.data_list.length; }
  get totalOrders():    number { return this.data_list.reduce((s, r) => s + r.ORDER_COUNT,   0); }
  get totalQty():       number { return this.data_list.reduce((s, r) => s + r.TOTAL_QTY,     0); }
  get totalUnprinted(): number { return this.data_list.reduce((s, r) => s + r.UNPRINT_COUNT, 0); }
  get totalPrinted():   number { return this.totalOrders - this.totalUnprinted; }

  // ── Donut chart getters ──────────────────────────────────────
  get circumference(): number { return 2 * Math.PI * this.CIRCLE_R; }

  get unprintedArc(): number {
    if (!this.totalOrders) return 0;
    return (this.totalUnprinted / this.totalOrders) * this.circumference;
  }

  get printedArc(): number {
    if (!this.totalOrders) return 0;
    return (this.totalPrinted / this.totalOrders) * this.circumference;
  }

  get printedOffset(): number { return -this.unprintedArc; }

  get printedPercent(): number {
    if (!this.totalOrders) return 0;
    return Math.round((this.totalPrinted / this.totalOrders) * 100);
  }
}
