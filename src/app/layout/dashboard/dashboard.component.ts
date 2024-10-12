import { Component, OnInit, OnDestroy, ViewChild ,ElementRef} from '@angular/core';
import { DataService } from '../../services/index'
import { Subscription, Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';

import { HttpClient } from '@angular/common/http';


declare var jQuery: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  busy!: Subscription;
  pageactive: any;
  repageTime : any; 
  userlogin: any = {}

  @ViewChild(DataTableDirective) dtElement!: DataTableDirective;

  @ViewChild('Disappear') Disappear!: ElementRef;
  dtOptions: DataTables.Settings = {};
  dtOptions2: DataTables.Settings = {};
 
  dtTrigger: Subject<any> = new Subject<any>();
  dtTrigger2: Subject<any> = new Subject<any>();
  dtTrigger3: Subject<any> = new Subject<any>();
  dtTrigger4: Subject<any> = new Subject<any>();
  dtTrigger5: Subject<any> = new Subject<any>();

  constructor(
    private dataService: DataService, private http: HttpClient
  ) { }


  input: any = {};
  data_percent: any= {};
  dashboard : any = {};
  
  
  public data_out_Online: any;
  public data_out_Offline: any = [];
  public data_out_Sorter: any = [];
  public data_out_CFOrder: any = [];
  public Order_disappear : any = [];
  public data_order_disappear_detail : any = [];

  interval: any;

  ngOnInit(): void { 
    ////โชว์ตาราง งานค้าง
    this.dashboard.ONLINE = true;
    this.dashboard.OFFLINE = true;
    this.dashboard.SORTER = true;
    this.dashboard.CFOrder = true;

    this.loadall()
    this.interval = setInterval(() =>  location.reload(), 300000); /// รีเฟส5นาที(300 วิ) *1000 = 1วิ
   

    var a = Array();
    let array = {
      pagename: 'Dashboard',
      active: 'true',
    }
    a.push(array)
    this.pageactive = a


    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 5,
      lengthMenu: [5, 10, 25],
      processing: true
    };

    this.dtOptions2 = {
      pagingType: 'full_numbers',
      pageLength: 10,
      lengthMenu: [5, 10, 25],
      processing: true
    };


    this.input.count = 301; ////ค่านับถอยหลัง รีเฟส 301 วิ
    
    this.startTime();
    setInterval(() => this.startTime(), 1000);
  
  }

  startTime() {

    this.input.count = this.checkTime(this.input.count);
    this.repageTime =   this.input.count
    
  }

  checkTime(i: any) {
    if (i > 0) { i = i - 1 };
    return i;
  }

  showdetail_out(type:any){

    if(type == 'ONLINE'){
      this.dashboard.ONLINE = true;
      this.dashboard.OFFLINE = false;
      this.dashboard.SORTER = false;
      this.dashboard.CFOrder = false;
    }
    if(type == 'OFFLINE'){
      this.dashboard.ONLINE = false;
      this.dashboard.OFFLINE = true;
      this.dashboard.SORTER = false;
      this.dashboard.CFOrder = false;
    }
    if(type == 'SORTER'){
      this.dashboard.ONLINE = false;
      this.dashboard.OFFLINE = false;
      this.dashboard.SORTER = true;
      this.dashboard.CFOrder = false;
    }
    if(type == 'CFOrder'){
      this.dashboard.ONLINE = false;
      this.dashboard.OFFLINE = false;
      this.dashboard.SORTER = false;
      this.dashboard.CFOrder = true;
    }

  }


  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
    this.dtTrigger2.unsubscribe();
    /*   this.dtTrigger3.unsubscribe();
       this.dtTrigger4.unsubscribe(); */
  }

  rerender(): void {
    this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
      // Destroy the table first
      dtInstance.destroy();
      // Call the dtTrigger to rerender again
      this.dtTrigger.next();
      //this.dtTrigger2.next();
     

    });
  }




  loadall() {
 
    this.load_outstanding();
    this.load_Order_disappear();
    this.load_percent();
  
  }

  load_percent() {
   
    ///// online
    this.busy = this.dataService.percent_online().subscribe(res => {
      var data: any = res;
     
      if (data.status === 'error') {
        console.log(data)
      } else {
        this.data_percent.P_online = data.data[0].P_online
        console.log( this.data_percent.P_online)
      }
    });
    //////  offline
    this.busy = this.dataService.percent_offline().subscribe(res => {
      var data: any = res;
      if (data.status === 'error') {
        console.log(data)
      } else {
        this.data_percent.P_offline = data.data[0].P_offline
      }
    });

    ///// sorter
    this.busy = this.dataService.percent_sorter().subscribe(res => {
      var data: any = res;
      if (data.status === 'error') {
        console.log(data)
      } else {
        this.data_percent.P_sorter = data.data[0].P_sorter
      }
    });
    /////cf_order order confirm ก่อนตัดบิล 
    this.busy = this.dataService.percent_CForder().subscribe(res => {
      var data: any = res;
      if (data.status === 'error') {
        console.log(data)
      } else {
        this.data_percent.P_CF_ORDER = data.data[0].P_CF_ORDER
      }
    });


  }


  load_outstanding() {
 
    this.busy = this.dataService.outstanding_online().subscribe(res => {
      var data: any = res;

      if (data.status === 'error') {
        console.log(data)
      } else if (data.status === 'null'){
        this.dashboard.ONLINE = false;
        this.input.order_out_online = 0 

      }else if (data.status === 'success'){
        this.data_out_Online = data.data
        this.input.order_out_online = data.data.length
        this.dtTrigger.next();
        //this.rerender()

      }
    });

    this.busy = this.dataService.outstanding_offline().subscribe(res => {
      var data: any = res;

      if (data.status === 'error') {
        console.log(data)
      } else if (data.status === 'null'){
        this.dashboard.OFFLINE = false;
        this.input.order_out_offline = 0 

      }else if (data.status === 'success'){
        this.data_out_Offline = data.data
        this.input.order_out_offline = data.data.length
        this.dtTrigger2.next();
      }
    });

    this.busy = this.dataService.outstanding_sorter().subscribe(res => {
      var data: any = res;

      if (data.status === 'error') {
        console.log(data)
      } else if (data.status === 'null'){
        this.dashboard.SORTER = false;
        this.input.order_out_sorter = 0 

      }else if (data.status === 'success'){
        this.data_out_Sorter = data.data
        this.input.order_out_sorter = data.data.length
         this.dtTrigger3.next();
      }
    });

    this.busy = this.dataService.outstanding_CfOrder().subscribe(res => {
      var data: any = res;

      if (data.status === 'error') {
        console.log(data)
      } else if (data.status === 'null'){
        this.dashboard.CFOrder = false;
        this.input.order_out_CFOrder = 0 

      }else if (data.status === 'success'){
        this.data_out_CFOrder = data.data
        this.input.order_out_CFOrder = data.data.length
        this.dtTrigger4.next();
      }
    });



  }



  load_Order_disappear() {

    this.busy = this.dataService.Order_disappear().subscribe(res => {
      var data: any = res;

      if (data.status === 'error') {
        console.log(data)
      } else {
        this.Order_disappear = data.data
        this.dtTrigger5.next();
      }
    })
  }

  Order_disappear_detail(i:any) {

    this.busy = this.dataService.Order_disappear_detail(this.Order_disappear[i]).subscribe(res => {
      var data: any = res;

      console.log(data)
      if (data.status === 'error') {
        console.log(data)
      } else if (data.status === 'success') {
        this.data_order_disappear_detail = data.data
        this.input.data_shipment_id = this.data_order_disappear_detail[0].SHIPMENT_ID
        this.input.data_disappear_QTY = this.Order_disappear[i].QTY
        jQuery(this.Disappear.nativeElement).modal('show');
      }
    })
  }

  close_Disappear(){
    jQuery(this.Disappear.nativeElement).modal('hide');
  }




}


