import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';
import { SignaturePad } from 'angular2-signaturepad';
import { HttpClient } from '@angular/common/http';
declare var flatpickr: any;

@Component({
  selector: 'app-outbound-signature-ordercancel',
  templateUrl: './outbound-signature-ordercancel.component.html',
  styleUrls: ['./outbound-signature-ordercancel.component.scss']
})
export class OutboundSignatureOrderCancelComponent implements OnInit {

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  @ViewChild(SignaturePad) 
  signaturePad!: SignaturePad;


  signaturePadOptions = {
    minWidth: 1,
    canvasWidth: 600,
    canvasHeight: 250
  };

 

  
  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;

  routeno_page = false;
  res : any = {};
  resSum : any = {};
  route = Array();
  data_list  : any = [];
  isLoading = false;
  intervalId: any;
  countdown: any;
  isUpdateButtonDisabled: boolean = true;
  ListOrder: Array<any> = [];

  timeFromPicker: any;
  timeToPicker: any;

  zones = ['Zone F1A', 'Zone F1B','Zone 2 CoolRoom','Zone 3A', 'Zone 3B', 'Zone 3C'];
  tablecheck_list : any = [];

  input = {
    printDate: '',
    timeFrom: '00:00',
    timeTo: '23:59' ,
    zone:null,
    tablecheck:null,
    printreport:''
  };

  constructor(
    private dataService: DataService,
    //private timeService:TimeService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Reports Print Order Cancel',
      active: 'Reports',
    }
    page.push(array)
    this.pageactive = page;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
  
    this.input.printDate = `${yyyy}-${mm}-${dd}`;

    setTimeout(() => {


      flatpickr('#timeFrom', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        allowInput: true,
        defaultDate: this.input.timeFrom,
        onChange: (dates: any, timeStr: string) => {
          this.input.timeFrom = timeStr;
          this.checkTimeRange();
        }
      });
      
      flatpickr('#timeTo', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        allowInput: true,
        defaultDate: this.input.timeTo,
        onChange: (dates: any, timeStr: string) => {
          this.input.timeTo = timeStr;
          this.checkTimeRange();
        }
      });

  
    }, 0);
  
    this.getdatatablecheck();
  }


  ngOnDestroy(): void {
    // Clear the intervals when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
  }
  clearSignature() {
    this.signaturePad.clear();
  }

  uploadSignature() {

    if (this.signaturePad.isEmpty()) {
      alert('กรุณาเซ็นก่อน');
      return;
    }

    const base64 = this.signaturePad.toDataURL();

    const payload = {
      shipment_id: 'TEST123',  // ใส่ id จริงของคุณ
      signature: base64
    };

    this.http.post('http://localhost:3000/api/signature/save', payload)
      .subscribe((res: any) => {
        alert('บันทึกสำเร็จ');
      });
  }

  
  checkTimeRange(): boolean {
    if (!this.input.timeFrom || !this.input.timeTo) {
      return true;
    }
  
    const from = this.timeToMinutes(this.input.timeFrom);
    const to = this.timeToMinutes(this.input.timeTo);
  
    if (from > to) {
      Swal.fire({
        icon: 'warning',
        title: 'เวลาไม่ถูกต้อง',
        text: 'Time From ต้องน้อยกว่าหรือเท่ากับ Time To',
        confirmButtonText: 'ตกลง'
      });
  
      this.input.timeTo = this.input.timeFrom;
      this.timeToPicker.setDate(this.input.timeFrom, true);
  
      return false;
    }
  
    return true;
  }
  
  
  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  
  getdatatablecheck(){
    this.dataService.get_table_printcancel().subscribe(res => {
      this.res = res;
      console.log(this.res);

      if (this.res.status === 'error') {
        console.log(this.res)
        Swal.fire({
          icon: 'error',
          title: 'Error! can not get table_printcancel',
          showConfirmButton: false,
          timer: 2500
        });
      }else {
        this.tablecheck_list = this.res.data;
      }
    });
  }

  getdata(){
    this.checkTimeRange();
    this.isLoading = true;
    this.dataService.get_report_printcancel(this.input).subscribe(res => {
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

  print(){
    //this.input.printreport = this.timeService.getNow()
    setTimeout(() => {
      window.print();
    }, 100);
  }

  
  
  
}
