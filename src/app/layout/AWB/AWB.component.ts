import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-AWB',
  templateUrl: './AWB.component.html',
  styleUrls: ['./AWB.component.scss']
})
export class AWBComponent implements OnInit {
  @ViewChild('inputTrackP') inputTrackP!: ElementRef;
  @ViewChild('inputTrack') inputTrack!: ElementRef;
  @ViewChild('inputPin') inputPin!: ElementRef; 
  @ViewChild('inputOrder') inputOrder!: ElementRef; 

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  dtOptions_outbound: DataTables.Settings = {};
  dtTrigger_outbound: Subject<any> = new Subject<any>();

  busy!: Subscription;
  pageactive: any;
  users: any[] = [];
  interval: any;
  isLoading = false;
  user_pincode: any = {};

  showdataPage = false;
  itemdesc = false;
  updatePage = false;
  scanlocatPage = true;
  showtable = true;

  CUST_NAME = {};
  input: any = {};
  res_datas: any = [];
  data: any = [];
  Showdata: any = [];
  sumQTY: any;
  qtynum: any;
  sumPRICE: any;
  item_id: any = {};

  transport: any = {};
  
  checkscan: any = [];
  

  public box: any = {}

  CheckTrack: any
  CheckORDER: any

  tracking_page = false;

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'AWB',
      active: 'AWB',
    }
    page.push(array)
    this.pageactive = page;

    this.dtOptions_outbound = {
      pagingType: 'full_numbers',
      pageLength: 30,
      lengthMenu: [5, 10, 20,30],
      processing: true,

    };
    this.data.percentage = 0;
    this.getserverdate();
  }

  ngAfterViewInit(): void {
    this.focusInput(); 
  }

  focusInput() {
    if (!this.input.PIN_CODE && this.inputPin) {
      setTimeout(() => {
        this.inputPin.nativeElement.focus();
      });
    }else if(!this.input.REF_INDEX && this.inputTrackP){
      setTimeout(() => {
        this.inputTrackP.nativeElement.focus();
      });
    }else if(!this.input.shipment_id && this.inputOrder){
      setTimeout(() => {
        this.inputOrder.nativeElement.focus();
      });
    }else if(!this.input.TRACK_CODE && this.inputTrack){
      setTimeout(() => {
        this.inputTrack.nativeElement.focus();
      });
    }
  }

  check_user() {

    this.dataService.get_userpincode().subscribe(res => {
      ////console.log(res);
      var Response : any;
      Response = res;
      this.users = Response.data;
      if (Response.status === 'error') {
        console.log(res)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          text: 'tablecheck_user',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.input.PIN_CODE = "";
      } else if (Response.status === 'success') {

        var user = this.users.filter(item => item.PIN_CODE == this.input.PIN_CODE);
        if(user.length == 0){
          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูลผู้ใช้',
            text: 'Pin code ไม่ถูกต้อง',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.input.PIN_CODE = "";
        }else{

          this.input.USER_NAME = user[0].USER_NAME
          this.input.WORKER_NAME = user[0].WORKER_NAME
          this.input.WORKER_COMPANY = user[0].WORKER_COMPANY
          this.input.PIN_CODE = user[0].PIN_CODE
        }
        this.focusInput();
      }

    })
  }

  getserverdate(){
     
    this.dataService.getServerDate().subscribe(resp => {
      if (resp && resp.date) {
        const currentDate = new Date(resp.date);//เวลาserver
        this.input.currentDateString = currentDate.toISOString().split('T')[0];
        this.input.currentDateString_status = "server"
      }else{
        const currentDate = new Date();//เวลาเครื่อง
        this.input.currentDateString = currentDate.toISOString().split('T')[0];
        this.input.currentDateString_status = "client"
      }
    });
  }


  CheckTrackingP(){
    this.dataService.CheckTrack(this.input).subscribe(res => {
      this.CheckTrack = res
      if (this.CheckTrack.status === 'error') {
        console.log(res);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.input.REF_INDEX = ''
      } else if (this.CheckTrack.status === 'null') {

        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบเลขใบ P นี้',
          html:  '<font color="red">' + this.input.REF_INDEX + '</font>',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.input.REF_INDEX = ''
      } else if (this.CheckTrack.status === 'success') {

        console.log(this.input)
        this.input.BEFORE_BOX_SIZE = this.CheckTrack.data[0].BOX_SIZE;
        this.input.REF_INDEX = this.CheckTrack.data[0].REF_INDEX;
        this.input.PO_NO = this.CheckTrack.data[0].PO_NO;
        this.input.SELLER_NO = this.CheckTrack.data[0].SELLER_NO;
        this.input.QTY = this.CheckTrack.data[0].QTY;
        this.input.BOX_NO_ORDER = this.CheckTrack.data[0].BOX_NO_ORDER;
        this.input.TABLE_CHECK = this.CheckTrack.data[0].TABLE_CHECK;
        this.input.CUST_NAME = this.CheckTrack.data[0].CUST_NAME;
        this.input.ORDER_DATE = this.CheckTrack.data[0].ORDER_DATE;

        
      } 
      this.focusInput();
    })
  }

  checkOrderRTS(){
    if(!this.input.REF_INDEX){
      this.input.REF_INDEX = ''
      this.input.shipment_id = ''
      
    this.focusInput();
      return;
    }
    this.dataService.Get_ONLINE_ORDER_SHIPPING(this.input).subscribe(res => {
      this.CheckORDER = res
      if (this.CheckORDER.status === 'error') {
        console.log(res);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.input.shipment_id = ''
      } else if (this.CheckORDER.status === 'null') {

        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล ORDER ใน ONLINE_ORDER_SHIPPING',
          html:  '<font color="red">' + this.input.shipment_id + '</font>',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.input.shipment_id = ''
      } else if (this.CheckORDER.status === 'success') {

        if(this.CheckORDER.data[0].ORDER_NUMBER_OOS != this.input.PO_NO){
          Swal.fire({
            icon: 'warning',
            title: 'ORDER ไม่ตรงกับ ORDER ในกล่อง',
            html:  '<font color="red">' + this.input.PO_NO + '</font>',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.input.shipment_id = ''

        }else{
          console.log(this.CheckORDER.data[0]);
          this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER_OOS
          this.input.ORDER_DATE = this.CheckORDER.data[0].PICK_DATE_OOS
          this.input.TRACKING = this.CheckORDER.data[0].TRACKING_OOS
          this.input.RTS_DATE = this.CheckORDER.data[0].RTS_DATE
          this.input.STATUS_RTS = this.CheckORDER.data[0].INF_STATUS_OOS
        }
      } 

    })
    
    this.focusInput();
  }

  Check_RTS(){
    if(!this.input.REF_INDEX){
      this.input.REF_INDEX = ''
      this.input.shipment_id = ''
      this.input.TRACK_CODE = '';
      
    this.focusInput();
      return;
    }

    if(this.input.STATUS_RTS == "S"){
      Swal.fire({
        title: 'คุณต้องการ Update Tracking และเวลา RTS ใหม่หรือไม่ ?',
        html: 'SHIPMENT: ' + '<font color="blue">' + this.input.shipment_id + '</font>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        backdrop: false,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      }).then((result) => {
        if (result.value) {
          this.Update_RTS();
        } else{
          this.input.TRACK_CODE = '';
        }
      })

    }else{
      this.Update_RTS();
    }
    this.focusInput();
   
  }

  Update_RTS(){
    this.dataService.UPDATE_TrackingAndRTS(this.input).subscribe(res => {
      
      this.CheckORDER = res
      console.log(this.CheckORDER);
      if (this.CheckORDER.status === 'error') {
        console.log(res);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.TRACK_CODE = '';
        this.playAudioError();
      }else{

        this.dataService.Get_ONLINE_ORDER_SHIPPING(this.input).subscribe(res => {
          this.CheckORDER = res
          if (this.CheckORDER.status === 'success') {
            this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER_OOS
            this.input.ORDER_DATE = this.CheckORDER.data[0].PICK_DATE_OOS
            this.input.TRACKING = this.CheckORDER.data[0].TRACKING_OOS
            this.input.RTS_DATE = this.CheckORDER.data[0].RTS_DATE_OOS
            this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_DATE_OOS

            this.input.TRACK_CODE = '';
            this.input.shipment_id = '';
            this.input.REF_INDEX = '';

            Swal.fire({
              icon: 'success',
              title: 'บันทึกสำเร็จ',
              showConfirmButton: false,
              timer: 2500
            });
            
            this.focusInput();
            
          }
        })

        this.playAudioNice();
      }
    })
  }

  

  playAudioError() {
    

    let audio = new Audio();
    //audio.src = "../../../assets/audio/error.mp3";
    audio.src = "http://10.26.1.21/TSDC/assets/audio/error.mp3";
    audio.load();
    audio.play();

  }

  playAudioNice() {
    let audio = new Audio();
    //audio.src = "../../../assets/audio/nice.mp3";
    audio.src = "http://10.26.1.21/TSDC/assets/audio/nice.mp3";
    audio.load();
    audio.play();

  }

}

