import { Component, OnInit, OnDestroy, ViewChild, ElementRef,AfterViewInit } from '@angular/core';
import { DataService } from '../../../services/index';
import { Subscription, Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
declare var jQuery: any;

@Component({
  selector: 'app-report-sorter',
  templateUrl: './report-sorter.component.html',
  styleUrls: ['./report-sorter.component.scss']
})
export class ReportSorterComponent implements OnInit, OnDestroy,AfterViewInit  {
  busy!: Subscription;
  pageactive: any;
  repageTime: any;
  userlogin: any = {};

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  //@ViewChild(DataTableDirective)
  //dtElement: any = DataTableDirective ;
  //atatableElement: any = DataTableDirective;
  @ViewChild('Disappear') Disappear!: ElementRef;
  dtOptions_reportsorter: DataTables.Settings = {};
  dtTrigger_reportsorter: Subject<any> = new Subject<any>();

  input: any = {};
  show: any = {};
  dataview: any = [];
  dataview_desc: any = [];
  data: any = {};
  data_percent: any = {};
  dashboard: any = {};
  isLoading = false;

  public data_out_Online: any;
  public data_out_Offline: any = [];
  public data_out_Sorter: any = [];
  public data_out_CFOrder: any = [];
  public Order_disappear: any = [];
  public data_order_disappear_detail: any = [];

  interval: any;

  constructor(private dataService: DataService, private http: HttpClient) {}

  ngOnInit(): void {
    var a = Array();
    let array = {
      active: 'Reports',
      pagename: 'Report Sorter'
    };
    a.push(array);
    this.pageactive = a;

    this.dtOptions_reportsorter = {
      pagingType: 'full_numbers',
      pageLength: 10,
      lengthMenu: [5, 10, 25],
      processing: true
    };
    this.data.percentage = 0;
  }

  ngAfterViewInit(): void {
    this.dtTrigger_reportsorter.next();
  }

  ngOnDestroy(): void {
    this.dtTrigger_reportsorter.unsubscribe();
  }

  close_Disappear() {
    jQuery(this.Disappear.nativeElement).modal('hide');
  }

  view() {
    this.isLoading = true;

    if (!this.input.shipment_ID) {
      this.input.shipment_ID = '%%';
    } else {
      this.show.shipment_ID = this.input.shipment_ID;
    }

    if (!this.input.ORDER_DATE) {
      this.input.ORDER_DATE = '%%';
    } else {
      this.show.ORDER_DATE = this.input.ORDER_DATE;
      this.input.ORDER_DATE = '%' + this.input.ORDER_DATE + '%';
    }

    if (this.input.shipment_ID !== '%%' || this.input.ORDER_DATE !== '%%') {
      this.busy = this.dataService.DATA_BACKLOG_SORTER(this.input).subscribe(Response => {
        var res: any = Response;
        this.isLoading = false;
        if (res.status === 'success') {
          this.dataview = res.data;
          this.data.SUM_TOTAL_QTY = this.dataview[0].SUM_TOTAL_QTY;
          this.data.SUM_QTY_CHECK = this.dataview[0].SUM_QTY_CHECK;
          this.data.percentage = Math.floor((this.data.SUM_QTY_CHECK / this.data.SUM_TOTAL_QTY) * 100);

          if (this.dtElement.dtInstance) {
            this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
              dtInstance.destroy();
              this.dtTrigger_reportsorter.next();
            });
          } else {
            this.dtTrigger_reportsorter.next();
          }

          //this.rerender();


        } else if (res.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            html: res.member.originalError.info.message,
            showConfirmButton: false,
            timer: 5500
          });
        } else if (res.status === 'null') {
          Swal.fire({
            icon: 'warning',
            title: 'No data found',
            html: 'Please check the Batch code',
            showConfirmButton: false,
            timer: 5500
          });
        }
      });
    }

    if (this.input.shipment_ID === '%%') {
      this.input.shipment_ID = '';
    } else {
      this.input.shipment_ID = this.show.shipment_ID;
    }

    if (this.input.ORDER_DATE === '%%') {
      this.input.ORDER_DATE = '';
    } else {
      this.input.ORDER_DATE = this.show.ORDER_DATE;
    }
  }

  ShowDiff(i: any) {
    console.log(i);
    this.input.ITEM = this.dataview[i].ITEM;
    this.input.SHIPMENT_ID = this.dataview[i].SHIPMENT_ID;

    this.busy = this.dataService.VIEW_BACKLOG_SORTER(this.input).subscribe(Response => {
      var res: any = Response;
      if (res.status === 'success') {
        this.dataview_desc = res.data;
        this.data.ITEM_ID = this.dataview_desc[0].ITEM_ID;
      } else if (res.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          html: res.member.originalError.info.message,
          showConfirmButton: false,
          timer: 5500
        });
      }
    });
  }
}
