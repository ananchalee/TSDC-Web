import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';
declare var bootstrap: any;

@Component({
  selector: 'app-moniter-TrackingOrderInternal',
  templateUrl: './moniter-TrackingOrderInternal.component.html',
  styleUrls: ['./moniter-TrackingOrderInternal.component.scss']
})
export class MoniterTrackingOrderInternalComponent implements OnInit {


  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;

  routeno_page = false;
  res : any = {};
  resSum : any = {};
  input: any = {};
  filter: any = {};
  route = Array();
  detail_list: any = [];
  data_list  : any = [];
  isLoading = false;
  //intervalId: any;
  //countdown: any;
  isUpdateButtonDisabled: boolean = true;
  ListOrder: Array<any> = [];

  selectedDetail: any[] = [];
  dynamicColumns: string[] = [];  

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Moniter-TrackorderInternal',
      active: 'Moniter',
    }
    page.push(array)
    this.pageactive = page;
    
    document.addEventListener("fullscreenchange", () => {
      const table = document.querySelector('.table-responsive') as HTMLElement;
      if (!document.fullscreenElement && table) {
        table.classList.remove('fullscreen');
      }
    });

    this.getdata()
  
  }


  
  updateMaxDate() {
    if (this.input.dateTo && this.input.dateFrom && this.input.dateTo < this.input.dateFrom) {
      this.input.dateTo = this.input.dateFrom; // ป้องกันไม่ให้เลือกวันที่เกิน
    }

    if (this.input.PCdateTo && this.input.PCdateFrom && this.input.PCdateTo < this.input.PCdateFrom) {
      this.input.PCdateTo = this.input.PCdateFrom; // ป้องกันไม่ให้เลือกวันที่เกิน
    }

  }

  getdata(){
   
      console.log("===== getdata() called =====");  //คอมเม้น log
      console.log("this.input:", this.input);    //คอมเม้นมา log
      
      //this.input.count = 301;////ค่านับถอยหลัง รีเฟส 301 วิ
      //this.startTime();
      this.isLoading = true;  
      console.log("this.input:", this.input ,this.input.dateFrom); //log ที่เพิ่มมา
      if(this.input.dateTo != "" && (this.input.dateFrom == "" || this.input.dateFrom == undefined)){
        this.input.dateFrom = this.input.dateTo
      }

      if(this.input.PCdateTo != "" &&(this.input.PCdateFrom == "" || this.input.PCdateFrom == undefined)){
        this.input.PCdateFrom = this.input.PCdateTo
        }

      this.dataService.Moniter_TrackingOrderInternal_Summary(this.input).subscribe(res => {
  this.res = res;
   console.log(this.res)
  this.isLoading = false;
  
  if (this.res.status === 'error') {
    console.log(this.res)
    Swal.fire({
      icon: 'error',
      title: 'Error! can not get data',
      showConfirmButton: false,
      timer: 2500
    });
  }else if  (this.res.status === 'null'){
    this.data_list = [];
    
  }else{
     //this.data_list = this.res;
    this.data_list = this.res.data;
  }
});
   
    }

  toggleFullScreen() {
    const elem = document.querySelector('.content-wrapper') as HTMLElement;
    const table = document.querySelector('.table-responsive') as HTMLElement;
  
    if (!document.fullscreenElement) {
      elem.requestFullscreen();
      if (table) {
        table.classList.add('fullscreen'); 
      }
    } else {
      document.exitFullscreen();
      if (table) {
        table.classList.remove('fullscreen'); 
      }
    }
  }
  
  onCellClickDetail(type: string, rowData: any) {
  
  this.filter.type = type;

    switch(type){
      case "ORDER_WAIT_PROCESS_MANHT" : 
      
          this.filter.date = rowData.ORDER_DATE;
          this.filter.company = rowData.COMPANY;
          this.filter.worktype = "Normal"
      break;
       case "ORDER_WAIT_PROCESS_SHORT" : 

          this.filter.date = rowData.ORDER_DATE;
          this.filter.company = rowData.COMPANY;
          this.filter.worktype = "Shortage"
      break;
      case "ORDER_CANCEL" : 
          this.filter.date = rowData.ORDER_DATE;
          this.filter.company = rowData.COMPANY;
          this.filter.worktype = "ORDER CANCEL"
      break;

      default:
          this.filter.date = rowData.ORDER_DATE;
          this.filter.company = rowData.COMPANY;
          this.filter.worktype = rowData.WORK_TYPE
        break;

    } 


    this.dataService.Moniter_TrackingOrderInternal_Detail(this.filter).subscribe(res => {
      this.res = res;

      if (this.res.status === 'error') 
      {
         console.log(this.res)
        Swal.fire({
          icon: 'error',
          title: 'Error! can not get data',
          showConfirmButton: false,
          timer: 2500
        });
      }else if  (this.res.status === 'null'){
          Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล',
          showConfirmButton: false,
          timer: 2500
        });
      }else{

        const modalEl = document.getElementById('detailModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
          this.selectedDetail = this.res.data;   // res เป็น array ของ object
          this.dynamicColumns = Object.keys(this.res.data[0]); // อ่าน key จาก object เพื่อสร้าง column
        
      }

    });

    

  }

  
}
