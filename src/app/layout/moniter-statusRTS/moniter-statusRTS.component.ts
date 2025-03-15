import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-moniter-statusRTS',
  templateUrl: './moniter-statusRTS.component.html',
  styleUrls: ['./moniter-statusRTS.component.scss']
})
export class MoniterStatusRTSComponent implements OnInit {
  @ViewChild('inputbarcode') inputbarcode!: ElementRef;

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
  route = Array();
  detail_list: any = [];
  data_list  : any = [];
  isLoading = false;
  intervalId: any;
  countdown: any;
  isUpdateButtonDisabled: boolean = true;
  ListOrder: Array<any> = [];

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Moniter-Status-RTS',
      active: 'Moniter',
    }
    page.push(array)
    this.pageactive = page;

    this.input.order = '';
    this.input.statusRTS = '';
    this.getserverdate();
    this.input.count = 301; ////ค่านับถอยหลัง รีเฟส 301 วิ
    this.intervalId = setInterval(() =>  this.getdata(), 300000);
    this.startTime();
    setInterval(() => this.startTime(), 1000);
  
  }

  startTime() {

    this.input.count = this.checkTime(this.input.count);
    this.countdown = this.input.count;

  }

  checkTime(i: any) {
    if (i > 0) { i = i - 1 };
    return i;
  }

  ngOnDestroy(): void {
    // Clear the intervals when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
  }



  updateMaxDate() {
    if (this.input.dateTo && this.input.dateFrom && this.input.dateTo < this.input.dateFrom) {
      this.input.dateTo = this.input.dateFrom; // ป้องกันไม่ให้เลือกวันที่เกิน
    }
  }

  getserverdate(){
     
    this.dataService.getServerDate().subscribe(resp => {
      if (resp && resp.date) {
        const currentDate = new Date(resp.date);//เวลาserver
        this.input.dateFrom = currentDate.toISOString().split('T')[0];
        this.input.dateTo = currentDate.toISOString().split('T')[0];
        
      }else{
        const currentDate = new Date();//เวลาเครื่อง
        this.input.dateFrom = currentDate.toISOString().split('T')[0];
        this.input.dateTo = currentDate.toISOString().split('T')[0];

      }
      this.getdata();
    });
  }

  getdata(){
    this.input.count = 301;////ค่านับถอยหลัง รีเฟส 301 วิ
    this.startTime();
    this.isLoading = true;
    if(this.input.order != ''){
      this.input.condition = "where FTOrdernumber = '"+ this.input.order +"'"
    }else if(this.input.statusRTS == ''){
      this.input.condition = "where FDCreatedate BETWEEN '"+ this.input.dateFrom +"' AND DATEADD(DAY, 1,'"+this.input.dateTo+"')"
    }else{
      this.input.condition = "where FDCreatedate BETWEEN '"+ this.input.dateFrom +"' AND DATEADD(DAY, 1,'"+this.input.dateTo+"')"+
      "and FNStaUpLoad_rts = '"+this.input.statusRTS+"'"
    }
    
    this.input.conditionSum = "where FDCreatedate BETWEEN '"+ this.input.dateFrom +"' AND DATEADD(DAY, 1,'"+this.input.dateTo+"')"

    this.dataService.Moniter_SumstatusRTS(this.input).subscribe(res => {
      this.resSum = res;

      if (this.resSum.status === 'error') {
      }else if  (this.resSum.status === 'null'){
      }else{
        this.input.sumstatus_0 = this.resSum.data[0].status_0;
        this.input.sumstatus_2 = this.resSum.data[0].status_2;
        this.input.sumstatus_99 = this.resSum.data[0].status_99;
        this.input.sumstatus_1 = this.resSum.data[0].status_1;
        this.input.sumstatus_5 = this.resSum.data[0].status_5;
      }

      
      const selectedData = this.getSelectedData();
      this.isUpdateButtonDisabled = selectedData.length === 0; 
    });


    this.dataService.Moniter_statusRTS(this.input).subscribe(res => {
      this.res = res;
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
        this.data_list = this.res.data;
        console.log(this.data_list)
  
  
      }
    });


  }


  // Toggle "Select All"
toggleSelectAll(event: any): void {
  const isChecked = event.target.checked;
  this.data_list.forEach((data: TSDC_SHOPEE_PACKAGE_HD) => {
    data.selected = isChecked;
  });
  const selectedData = this.getSelectedData();
  this.isUpdateButtonDisabled = selectedData.length === 0; 
}

// Check if all items are selected
isAllSelected(): boolean {
  return this.data_list.length > 0 && this.data_list.every((data: TSDC_SHOPEE_PACKAGE_HD) => data.selected);
}

getSelectedData(): TSDC_SHOPEE_PACKAGE_HD[] {
  return this.data_list.filter((data: TSDC_SHOPEE_PACKAGE_HD) => data.selected);
}

checkAllSelected(): void {
  const allSelected = this.data_list.every((data: TSDC_SHOPEE_PACKAGE_HD) => data.selected);

  const selectedData = this.getSelectedData();
  this.isUpdateButtonDisabled = selectedData.length === 0; 
}

// Example method to update selected items
updateSelectedData(): void {
  const selectedData = this.getSelectedData();

  if(selectedData.length > 0){
    Swal.fire({
      title: 'Restatus กลับสู่เริ่มต้น?',
      html: 'Order ที่ต้องการ update: ' + '<font color="blue">' + selectedData.length + '</font>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      backdrop: false,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.value) {
        this.ListOrder = selectedData;
        this.busy = this.dataService.update_statusRTS(this.ListOrder).subscribe(res => {
          var data: any = res;
          if (data.status === 'success'){

            this.getdata();
          }
        })
      } 
    })
  }else{
    Swal.fire({
      icon: 'warning',
      title: 'เลือกมากกว่า 1 รายการ',
      showConfirmButton: false,
      timer: 2500
    });

    const selectedData = this.getSelectedData();
    this.isUpdateButtonDisabled = selectedData.length === 0; 
  }
 

  
}

  

}

interface TSDC_SHOPEE_PACKAGE_HD {
  FTOrdernumber: string;
  FTShop_id: string;
  FTCustomer_id: string;
  Createdate: string;
  Lastupdate: string;
  FTStaUpLoad_rts_desc: string;
  selected: boolean; // This is for tracking checkbox state
}