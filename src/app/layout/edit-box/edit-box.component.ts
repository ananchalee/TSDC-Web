import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-box',
  templateUrl: './edit-box.component.html',
  styleUrls: ['./edit-box.component.scss']
})
export class EditBoxComponent implements OnInit {
  @ViewChild('inputTrack') inputTrack!: ElementRef;
  @ViewChild('inputbox') inputbox!: ElementRef;
  @ViewChild('Btn_printTrack') Btn_printTrack!: ElementRef; 

  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;

  input: any = {};
  dataprint: any = [];
  box_size: any = [];

  VAS: any = [];
  vasFormArray: Array<any> = [];

  public pagePrint = true;
  public pagePrintTrack = true;
  public scanTrackPage = false;
  public scanBoxPage = true;

  public box: any = {}
  public CheckTrack: any

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'แก้ไขขนาดกล่อง',
      active: 'EditBox',
    }
    page.push(array)
    this.pageactive = page;

    this.LOAD_USERTABLECHECK()
    this.loadVas()
    setTimeout(() => { this.focusInput_Track() }, 200)
    this.interval = setInterval(() => this.focusInput_Box(), 2000);
  }

  focusInput_Track() {
    if (this.scanTrackPage === false) {
      this.inputTrack.nativeElement.focus();
    }
  }

  focusInput_Box() {
    if (this.scanBoxPage === false) {
      this.inputbox.nativeElement.focus();
    }if (this.pagePrint === false){
      this.Btn_printTrack.nativeElement.focus();
    }
  }

  loadVas() {
    this.vasFormArray = [];
    this.dataService.tsdc_pick_vas().subscribe(res => {
      var data: any = res
      if (data.status === 'success') {
        this.VAS = data.data
        //console.log(this.VAS)
      }
    })
  }

  LOAD_USERTABLECHECK() {

    const user = JSON.parse(localStorage.getItem('currentUser') || '');
    this.input.USER_CHECK = user.WORKER_ID;
    this.input.TABLE_CHECK = this.input.USER_CHECK
    this.busy = this.dataService.LOAD_USERTABLECHECK(this.input).subscribe(res => {
      //console.log( res);
      this.user = res

      if (this.user.status === 'error') {
        console.log(res);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          text: 'LOAD_USERTABLECHECK',
          showConfirmButton: false,
          timer: 2500
        })
      } else if (this.user.status === 'success') {
        this.input.USER_NAME = this.user.data[0].USER_NAME
        this.input.WORKER_NAME = this.user.data[0].WORKER_NAME
        this.input.WORKER_SURNAME = this.user.data[0].WORKER_SURNAME
        this.input.WORKER_COMPANY = this.user.data[0].WORKER_COMPANY
        this.input.TABLE_CHECK = this.user.data[0].TABLE_CHECK
        this.input.PIN_CODE = this.user.data[0].PIN_CODE
        //console.log(this.input);
      }

    })
  }
  backScanitem() {
    this.pagePrint = true;
    this.pagePrintTrack = true;
    this.CheckTracking();
  }

  scanTrack(){
    this.scanTrackPage = false;
    this.scanBoxPage = true;
    this.pagePrintTrack = true;
    this.pagePrint = true
    this.input = {};
    this.LOAD_USERTABLECHECK();
    setTimeout(() => { this.focusInput_Track() }, 1000);
  }

  CheckTracking(){
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
      } else if (this.CheckTrack.status === 'null') {

        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบเลข Tracking นี้',
          html:  '<font color="red">' + this.input.REF_INDEX + '</font>',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.REF_INDEX = ''
      } else if (this.CheckTrack.status === 'success') {
        this.check_size();
        this.input.BEFORE_BOX_SIZE = this.CheckTrack.data[0].BOX_SIZE;
        this.input.REF_INDEX = this.CheckTrack.data[0].REF_INDEX;
        this.input.PO_NO = this.CheckTrack.data[0].PO_NO;
        this.input.SELLER_NO = this.CheckTrack.data[0].SELLER_NO;
        this.input.QTY = this.CheckTrack.data[0].QTY;
        this.input.BOX_NO_ORDER = this.CheckTrack.data[0].BOX_NO_ORDER;
        this.input.TABLE_CHECK = this.CheckTrack.data[0].TABLE_CHECK;
        this.input.CUST_NAME = this.CheckTrack.data[0].CUST_NAME;
        this.input.TCHANNEL = this.CheckTrack.data[0].TCHANNEL;
        this.input.COMPANY = this.CheckTrack.data[0].COMPANY;
        this.input.ORDER_DATE = this.CheckTrack.data[0].ORDER_DATE;
        this.scanBoxPage = false;
        this.scanTrackPage = true;

        
      } 
    })
  }


  check_size() {

    this.dataService.check_master_box(this.input).subscribe(res => {
      var data: any = res
      //console.log(data)
      if (!this.input.BOX_SIZE) {
        this.box.Errorhide = false
        this.box.Suchide = true
        this.box.des = 'ระบุขนาดกล่อง'
      } else {
        if (data.status === 'success') {
          this.box = data.data[0]
          this.input.CARTON_BOX_W = this.box.CARTON_BOX_W
          this.input.CARTON_BOX_L = this.box.CARTON_BOX_L
          this.input.CARTON_BOX_H = this.box.CARTON_BOX_H
          this.input.CARTON_BOX_WEIGHT = this.box.CARTON_BOX_WEIGHT
          //this.tracking_box();

          //console.log(this.input)
          if (this.box.ACTIVE == 'Y') {
            this.box.Errorhide = true
            this.box.Suchide = false
            
            //this.interval = setInterval(() => this.BtnTRACK.nativeElement.focus(), 0);
            //this.BtnTRACK.nativeElement.focus();

          } else {
            this.box.Errorhide = false
            this.box.Suchide = true
            this.box.des = 'งดใช้ขนาดกล่องนี้'

          }
        } else if (data.status === 'null') {
          this.box.Errorhide = false
          this.box.Suchide = true
          this.box.des = 'ไม่พบขนาดกล่องนี้'
        } else if (data.status === 'error') {
          console.log(data);
          this.box.Errorhide = false
          this.box.Suchide = true
          this.box.des = 'Error ติดต่อ ADMIN'
        }
      }

    })

  }

  submit(){
    this.dataService.updateBoxTracking(this.input).subscribe(res => {
      var data: any = res
      if (data.status === 'error') {
        console.log(data);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'success') {
        var a = Array();
        let array = {
          REF_INDEX: this.input.REF_INDEX,
          QTY: this.input.QTY,
          PO_NO: this.input.PO_NO,
          SELLER_NO: this.input.SELLER_NO,
          BOX_NO_ORDER: this.input.BOX_NO_ORDER,
          SHIPPING_NAME: this.input.CUST_NAME,
          SHIPMENT_ID: this.input.PO_NO,
          TABLE_CHECK: this.input.TABLE_CHECK,
          TCHANNEL: this.input.TCHANNEL,
          BOX_SIZE: data.data[0].BOX_SIZE,
          COMPANY : this.input.COMPANY,
          ORDER_DATE : this.input.ORDER_DATE
        }
        a.push(array)
        this.dataprint = a;
        this.pagePrint = false;
        this.pagePrintTrack = false;
      }

    })
  }

  
  printTracking() {
    window.print();
  }



}
