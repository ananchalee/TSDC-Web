import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
//import {MatButton} from '@angular/material/button';
import { DataService } from '../../services/index'
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

declare var jQuery: any;

@Component({
  selector: 'app-audit-check-Print-Old',
  templateUrl: './audit-check-Print-Old.component.html',
  styleUrls: ['./audit-check-Print-Old.component.scss']
})
export class AuditCheckPrintOldComponent implements OnInit {
  busy!: Subscription;
  @ViewChild('myModalBOX') myModalBOX!: ElementRef;
  @ViewChild('myModalSt') myModalSt!: ElementRef;

  @ViewChild('inputcontainer') inputcontainer!: ElementRef;
  @ViewChild('inputItem2') inputItem2!: ElementRef;
  @ViewChild('inputboxoffline') inputboxoffline!: ElementRef;
  @ViewChild('inputITEMBARCODE') inputITEMBARCODE!: ElementRef;
  @ViewChild('inputqtybox') inputqtybox!: ElementRef;
  @ViewChild('Btn_printTrack') Btn_printTrack!: ElementRef; 

  //@ViewChild('myModalList') myModalList!: ElementRef;
  @ViewChild('myModalP') myModalP!: ElementRef;

  isLoading = false;
  
  pageactive: any;

  dtOptions: any = {};
  dataCon: any = [];
  
  res_listSummary: any = [];

   sumcon: any = {};
   sumcheck: any = {};
 
 
  user_listCheckIn:  Array<any>  = [];
  user_listCheckHis:  Array<any>  = [];


  today = new Date();
  Datenow = this.today.toISOString().slice(0, 10);
  Timenow = this.today.toISOString().slice(11, 16);

  public scanConPage = false;
  public scanItemPage = true;
  public scanQtyPage = true;
  public pagePrintShear = true;
  public pagePrintCoverSheet = true;
  public pagePrintTrack = true;
  public pagePrint = true;
  public summaryPage = true;
  public scanbox = false;



  public reButton = false;


  public box: any = {}

  public qtyFall = 0;


  public CheckWork: any

  BUTTONPRINT = false;
  res_summary: any = {};   ///////
  res_matchItemInCon: any = {};
  res_list: any = [];
  trackall: any = [];
  sumqty: any = [];
  res_QTY_equal: any = {};
  dataLACK_H: any = [];
  data: any = [];
  DATA_PRINT_H: any = [];

  dataprintCoverSheet: any = [];
  dataprint: any = [];
  input: any = {};
  btn: any = {};
  dataprint_LIST_ITEM: any = [];
  interval: any;
  user: any;
  userPack: any[] = [];
  box_size: any = [];

  userpin: Array<any> = [];
  totalbox: Array<any> = [];
  Pinall: string[] = [];

  VAS: any = [];
  vasFormArray: Array<any> = [];

  private options: string[] = ["10", "20", "50"];
  selectedQuantity = "10";

  constructor(
    private dataService: DataService,
    private router: Router,
    //private busy: Subscription,
  ) { }

  ngOnInit(): void {
    
    var a = Array();
    let array = {
      pagename: 'เช็คสินค้า&ปริ้น(แบบเก่า)',
      active: 'Audit_Offline',
    }
    a.push(array)
    this.pageactive = a

    this.LOAD_USERTABLECHECK();
    this.LOAD_USERCheckin();
    this.get_userpincode();
    setTimeout(() => { this.focusInput_con() }, 2000)
    //this.interval = setInterval(() => this.focusInput_item(), 5000);
    this.btn.Box = true;
    this.btn.Re = true;

    this.btn.CoverSheet = false;
    this.btn.CFOrder = true;
    this.btn.Printbill = true;
   

  }

  //this.input.sa  = JSON.parse(localStorage.getItem('currentUser') || '')

  /* focusScrollMethod = function getFocus() {

    var element = document.getElementById("YourElementId")
              //element.focus();
    //document.getElementById("id").focus();

     
    var elem = document.getElementById('result');
    if(iconof elem != null  ) {
      document.getElementById("result").focus();
    }


  }  */


  focusInput_item() {
    
    if (this.scanItemPage === false ) {
      this.inputItem2.nativeElement.focus();
    }
    if (this.pagePrint === false){
      this.Btn_printTrack.nativeElement.focus();
    }
   
  }

  focusInput_con() {

    if (this.scanConPage === false) {
      this.inputcontainer.nativeElement.focus();
    }
  }

  
  checkout(i:number){
    var U_checkout = this.user_listCheckIn[i];
   this.busy =  this.dataService.User_checkout(U_checkout).subscribe(res => {
      this.user = res
      if (this.user.status === 'error') {
        console.log(res)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          text: 'User_checkout',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (this.user.status === 'success') {
        this.LOAD_USERCheckin();
      }

    })
 }

 LOAD_USERCheckin() {

  const user = JSON.parse(localStorage.getItem('currentUser') || '');
  this.input.USER_CHECK = user.WORKER_ID;
  this.input.TABLE_CHECK = this.input.USER_CHECK
  this.busy = this.dataService.load_checkinPack(this.input).subscribe(res => {
    //console.log( res);
    this.user = res

    if (this.user.status === 'error') {
      console.log(res);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
        text: 'LOAD_USER CheckIn:' + user.data,
        showConfirmButton: false,
        timer: 2500
      })
    } else if(this.user.status === 'null'){
      this.input.sumusercheck = 0;
      this.user_listCheckIn = [];
    }
    else if (this.user.status === 'success') {
      this.input.sumusercheck = this.user.data.length;
      this.user_listCheckIn = this.user.data;
    }

  })
}

  get_userpincode(){
  this.busy = this.dataService.get_userpincode().subscribe(res => {
      var data: any = res;
      if (data.status === 'success') {
        this.userpin = data.data ;
        this.Pinall =  this.userpin.map(item => item.PIN_CODE);
        
      } else if (data.status === 'error') {
        console.log(data);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          showConfirmButton: false,
          timer: 2500
        });
      }
    })

  }

  userpack(){
    
      if(this.input.PIN_CODE_Ref != ''){
        console.log(this.userPack );
        var foundUser = this.userpin.find(user => user.PIN_CODE === String(this.input.PIN_CODE_Ref));
        if (foundUser) {
          var foundUser_scan = this.userPack.find(user => user.Pincode === String(this.input.PIN_CODE_Ref));
          if(!foundUser_scan){
            var array = {
              Pincode: this.input.PIN_CODE_Ref,
              User: foundUser.WORKER_NAME + " " + foundUser.WORKER_SURNAME
            };

            this.userPack.push(array);
          }else{
            Swal.fire({
              icon: 'error',
              title: 'pincode ซ้ำ',
              showConfirmButton: false,
              timer: 2500
            });
          }
        } else {
          Swal.fire({
            icon: 'error',
            title: 'ไม่พบ pincode',
            showConfirmButton: false,
            timer: 2500
          });
        }
      }

      this.input.PIN_CODE_Ref = '';
  }

  remove_userpack(i:any){
    console.log(this.userPack[i]);
    this.userPack = this.userPack.filter(item => item !== this.userPack[i]);
  }

  CHECK_tracksum_qty() {

    this.busy = this.dataService.tracksum_qty_Old(this.input).subscribe(res => {
      var data: any = res;
      //console.log(data)
      console.log(data.data[0].TRACKSUM_QTY)
      if (data.status === 'success') {
        if (data.data[0].TRACKSUM_QTY == null || data.data[0].TRACKSUM_QTY == 0 ) {
          this.btn.Box = true;
          this.btn.Re = true
          //console.log('ปิด re')

        } else {
          this.btn.Box = false;
          this.btn.Re = false;
         // console.log('เปิด re')

          if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_icon == 'CF_ORDER') {
            this.btn.CFOrder = false;
          } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_icon == 'CF_ORDER') {
            this.btn.CFOrder = true;
          }

          this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
          Swal.fire({
            icon: 'warning',
            title: 'สินค้าตรวจเช็คแล้ว',
            html: 'จำนวน ' + '<font color="blue">' + this.input.tracksum_qty + '</font>' + 'ชิ้น',
            showConfirmButton: false,
            timer: 2500
          })
        }

      } else if (data.status === 'error') {
        console.log(data);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          showConfirmButton: false,
          timer: 2500
        });
      }
    })

  }

  Rescan() {

    if(this.CheckWork[0].WORK_TYPE == 'Sorter'){

      this.busy = this.dataService.tracksum_qty_Sorter_Old(this.input).subscribe(res => {
        var data: any = res
        console.log(data.data[0].TRACKSUM_QTY)
        this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
        Swal.fire({
          title: 'สแกนสินค้าใหม่ทั้งหมดหรือไม่ ?',
          html: 'จำนวน ' + '<font color="blue">' + this.input.tracksum_qty + '</font>' + 'ชิ้น',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          backdrop: false,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
        }).then((result) => {
          if (result.value) {
            this.busy = this.dataService.Rescan_checkitem_Sorter_Old(this.input).subscribe(res => {
              var data: any = res;
              if (data.status === 'success') {
                this.summaryConCheck();
                this.btn.Box = true;
                this.btn.Re = true
                //console.log('ปิด re')
                if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_icon == 'CF_ORDER') {
                  this.btn.CFOrder = false;
                } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_icon == 'CF_ORDER') {
                  this.btn.CFOrder = true;
                }
  
              } else if (data.status === 'error') {
                console.log(data);
                Swal.fire({
                  icon: 'error',
                  title: 'Error Rescan',
                  showConfirmButton: false,
                  timer: 2500
                });
              }
  
            })
            // setTimeout(() => { this.focusInput_item() }, 150)
          }
        })
      })
    }else{

      this.busy = this.dataService.tracksum_qty_Old(this.input).subscribe(res => {
        var data: any = res
        console.log(data.data[0].TRACKSUM_QTY)
        this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
        Swal.fire({
          title: 'สแกนสินค้าใหม่ทั้งหมดหรือไม่ ?',
          html: 'จำนวน ' + '<font color="blue">' + this.input.tracksum_qty + '</font>' + 'ชิ้น',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          backdrop: false,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
        }).then((result) => {
          if (result.value) {
            this.busy = this.dataService.Rescan_checkitem_Old(this.input).subscribe(res => {
              var data: any = res;
              if (data.status === 'success') {
                this.summaryConCheck();
                this.btn.Box = true;
                this.btn.Re = true
                //console.log('ปิด re')
                if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_icon == 'CF_ORDER') {
                  this.btn.CFOrder = false;
                } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_icon == 'CF_ORDER') {
                  this.btn.CFOrder = true;
                }
  
              } else if (data.status === 'error') {
                console.log(data);
                Swal.fire({
                  icon: 'error',
                  title: 'Error Rescan',
                  showConfirmButton: false,
                  timer: 2500
                });
              }
  
            })
            // setTimeout(() => { this.focusInput_item() }, 150)
          }
        })
      })
    }


  }

  check_size() {

    //console.log(this.input)
    this.dataService.check_master_box(this.input).subscribe(res => {
      var data: any = res
      //console.log(data)
      if (!this.input.BOX_SIZE) {
        this.box.Errorhide = false
        this.box.Suchide = true
        this.box.des = 'ระบุขนาดกล่อง'

        this.inputboxoffline.nativeElement.focus(console.log("Focus ขนาดกล่อง"));

      } else {
        if (data.status === 'success') {
          this.box = data.data[0]
          this.input.CARTON_BOX_W = this.box.CARTON_BOX_W == undefined ? 0 : this.box.CARTON_BOX_W
          this.input.CARTON_BOX_L = this.box.CARTON_BOX_L  == undefined ? 0 : this.box.CARTON_BOX_L
          this.input.CARTON_BOX_H = this.box.CARTON_BOX_H == undefined ? 0 : this.box.CARTON_BOX_L
          this.input.CARTON_BOX_WEIGHT = this.box.CARTON_BOX_WEIGHT == undefined ? 0 :this.box.CARTON_BOX_L
          //this.tracking_box();

          //console.log(this.input)
          if (this.box.ACTIVE == 'Y') {
            this.box.Errorhide = true
            this.box.Suchide = false
            //this.inputqtybox.nativeElement.focus(console.log("Focus QTY"));
            //setTimeout(() => { this.inputqtybox.nativeElement.focus(); }, 1500)
            
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

  addsize_box(){
    this.check_size();
    if(this.box.des == undefined){
  
      var foundbox = this.totalbox.find(id => id.Boxid === String(this.input.BOX_SIZE));
      if (!foundbox) {
          var array = {
            Boxid: this.input.BOX_SIZE,
            Qty: this.input.BOX_QTY,
            CARTON_BOX_W:this.input.CARTON_BOX_W ,
            CARTON_BOX_L: this.input.CARTON_BOX_L ,
            CARTON_BOX_H:this.input.CARTON_BOX_H  ,
            CARTON_BOX_WEIGHT:this.input.CARTON_BOX_WEIGHT 
          };

          this.totalbox.push(array);
          this.input.BOX_NUM  = this.input.BOX_NUM == undefined ? this.input.BOX_QTY : this.input.BOX_NUM + this.input.BOX_QTY;
          this.input.BOX_SIZE = '';
          this.input.BOX_QTY = '';
          
          this.box = {};
            this.inputboxoffline.nativeElement.focus(console.log("Focus ขนาดกล่อง 1"));
            
        }else{
          Swal.fire({
            icon: 'error',
            title: 'รายการกล่องซ้ำ',
            showConfirmButton: false,
            timer: 2500
          });

          this.input.BOX_SIZE = '';
          this.input.BOX_QTY = '';
          this.box = {};
          
          setTimeout(() => {this.inputboxoffline.nativeElement.focus(console.log("Focus ขนาดกล่อง2"));}, 2800)
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: this.box.des,
          showConfirmButton: false,
          timer: 2500
        });
        this.input.BOX_SIZE = '';
        this.input.BOX_QTY = '';
        this.box = {};

        setTimeout(() => { this.inputboxoffline.nativeElement.focus(console.log("Focus ขนาดกล่อง3"));}, 2800)

      }
      
  }

  remove_box(i : number){
    console.log(this.totalbox[i]);
    this.totalbox = this.totalbox.filter(item => item !== this.totalbox[i]);
    this.input.BOX_NUM = 0;
    this.totalbox.forEach(b => {
      this.input.BOX_NUM = b.Qty +this.input.BOX_NUM 
    });
  }

  closeBox() {
    
    this.input.BOX_SIZE = ''
   
    this.busy = this.dataService.tracksum_qty_Old(this.input).subscribe(res => {
      var data: any = res;
      //console.log(data)
      //console.log(data.data[0].TRACKSUM_QTY)
      if (data.status === 'success') {
        if (data.data[0].TRACKSUM_QTY == null) {
          this.btn.Box = true;
          this.btn.Re = true;
        } else {
          this.btn.Box = false;
          this.btn.Re = false;
          this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
          jQuery(this.myModalBOX.nativeElement).modal('show');
          //this.inputboxoffline.nativeElement.focus(console.log("focus boxsize"));
          setTimeout(() => { this.inputboxoffline.nativeElement.focus();  console.log("focus boxsize")
          }, 1000)   
        }

      } else if (data.status === 'error') {
        console.log(data);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          showConfirmButton: false,
          timer: 2500
        });
      }
    })


  }

  /* reloadComponent() {
    location.reload();
  } */


  scanCon() {
    this.scanConPage = false;
    this.scanItemPage = true;
    this.btn.Box = true;
    this.btn.Re = true;
    //console.log('ปิด re')
    this.btn.CoverSheet = true;
    this.btn.Printbill = true;
    this.input = {};
    this.trackall = [];
    this.pagePrintTrack = true;
    this.pagePrintCoverSheet = true;
    this.pagePrintShear = true;
    this.pagePrint = true
    this.LOAD_USERTABLECHECK();
    setTimeout(() => { this.focusInput_item() }, 3000);
    setTimeout(() => { this.focusInput_con() }, 1000);
    //this.interval = setInterval(() => this.focusInput_item(), 3000);
    //console.log(this.input)
  }


  LOAD_USERTABLECHECK() {

    const user = JSON.parse(localStorage.getItem('currentUser') || '');
    this.input.USER_CHECK = user.WORKER_ID;
    this.input.TABLE_CHECK = this.input.USER_CHECK
    console.log(this.input.TABLE_CHECK)
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
        this.input.PIN_CODE = this.user.data[0].PIN_CODE
        console.log(this.input);
      }

    })
  }

  tablecheck_user() {
    /*  const user = JSON.parse(localStorage.getItem('currentUser') || '');
     this.input.USER_CHECK = user.WORKER_ID;
     this.input.TABLE_CHECK = this.input.USER_CHECK */
    this.input.WORKING_TYPE = 'Check';
    this.dataService.insert_user_tablecheck2(this.input).subscribe(res => {
      ////console.log(res);
      this.user = res
      if (this.user.status === 'error') {
        console.log(res)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          text: 'tablecheck_user',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (this.user.status === 'success') {
        this.LOAD_USERTABLECHECK();
      }

    })
  }

  WorkType() {
console.log(this.input)
      this.dataService.CheckWork_Old(this.input).subscribe(res => {
        var data: any = res
        this.CheckWork = data.data
  
        if (data.status === 'error') {

          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });

        } else if (data.status === 'null') {
          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
            showConfirmButton: false,
            timer: 2500
          });
          this.input.CONTAINER_ID = ''
        } else if (data.status === 'success') {
          //console.log('Okay');
          //console.log(this.CheckWork[0].len_con);
          this.tablecheck_user();

          if (this.CheckWork[0].WORK_TYPE == 'Normal') {
            console.log('Single and Group');
            this.dataService.CheckCon_Old(this.input).subscribe(res => {
              var data: any = res
              this.sumqty = data.data
              console.log(this.input.CONTAINER_ID);
  
              if (data.status === 'error') {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                  showConfirmButton: false,
                  timer: 2500
                });
              } else if (data.status === 'null') {
                Swal.fire({
                  icon: 'warning',
                  title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.input.CONTAINER_ID = ''
              } else if (data.status === 'success') {

              this.input.shipment_id = this.sumqty[0].shipment_id
              this.input.SELLER_NO = this.sumqty[0].STORE_NO
              this.input.BILL_N8_BLH = this.sumqty[0].BILL_N8_BLH
              this.input.BILL_NO = this.sumqty[0].BILL_NO
              this.input.STORE_ADDRESS = this.sumqty[0].STORE_ADDRESS
              this.input.CORNER_ID_BLH = this.sumqty[0].CORNER_ID_BLH
              this.input.BILL_DATE = this.sumqty[0].BILL_DATE
              this.input.SITE_ID_BLH = this.sumqty[0].SITE_ID_BLH
              this.input.BATCH_CODE = this.sumqty[0].BATCH_CODE
              this.input.TRANSPORT_ID = this.sumqty[0].TRANSPORT_ID
              this.input.TRANSPORT_NAME = this.sumqty[0].TRANSPORT_NAME
              this.input.BRAND = this.sumqty[0].USER_DEF5
              this.input.BRAND_NAME = this.sumqty[0].BRAND_NAME
              this.input.SHIPPING_NAME = this.sumqty[0].STORE_NAME
              this.input.SUMCHECK = this.sumqty[0].SUMCHECK
              this.input.TCHANNEL = 'Offline'
              this.input.b = this.sumqty[0].USER_DEF5.substring(0, 1);
              this.input.d = this.sumqty[0].USER_DEF5.substring(1, 2);
              this.input.p = this.sumqty[0].USER_DEF5.substring(2, 3);
                //console.log(this.input.shipment_id );
  
                // this.res_listOfAsn = data.data;
                // this.input.CONTAINER_ID = data.data[0].CONTAINER_ID;
                Swal.fire({
                  title: 'คุณต้องการเริ่มงานนี้หรือไม่ ?',
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
                    this.summaryConCheck();
                    this.CHECK_tracksum_qty();
                    this.scanConPage = true;
                    this.scanItemPage = false;
                    this.summaryPage = true;
                    setTimeout(() => { this.focusInput_item() }, 1500)
                  } else {
                    this.input.CONTAINER_ID = ''
                  }
                })
              }
            })
          } else if (this.CheckWork[0].WORK_TYPE == 'Online') {
            console.log('Online');
            this.dataService.CheckConOnline_Old(this.input).subscribe(res => {
              var data: any = res;
              this.sumqty = data.data

              console.log(data.status);
  
              this.input.shipment_id = this.sumqty[0].shipment_id
              this.input.b = this.sumqty[0].USER_DEF5.substring(0, 1);
              this.input.d = this.sumqty[0].USER_DEF5.substring(1, 2);
              this.input.p = this.sumqty[0].USER_DEF5.substring(2, 3);
 
              if (data.status === 'error') {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                  showConfirmButton: false,
                  timer: 2500
                });
              } else if (data.status === 'null') {
  
                Swal.fire({
                  icon: 'warning',
                  title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.input.CONTAINER_ID = ''
              } else if (data.status === 'success') {
                //console.log(this.input.shipment_id );
  
                // this.res_listOfAsn = data.data;
                // this.input.CONTAINER_ID = data.data[0].CONTAINER_ID;
                Swal.fire({
                  title: 'คุณต้องการเริ่มงานนี้หรือไม่ ?',
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
                    this.summaryConCheck();
                    //jQuery(this.myModalList.nativeElement).modal('show');
                    // this.page = 'scanItemPage'
                    this.scanConPage = true;
                    this.scanItemPage = false;
                    // this.scanQtyPage = true;
                    this.summaryPage = true;
                    setTimeout(() => { this.focusInput_item() }, 1500)
                    //  console.log(this.input.CONTAINER_ID);
                  } else {
                    this.input.CONTAINER_ID = ''
                  }
                })
              }
            })
          } else {
            console.log('Sorter');
            this.dataService.CheckConSorter_Old(this.input).subscribe(res => {
              var data: any = res
              this.sumqty = data.data
              this.input.shipment_id = this.sumqty[0].BATCH_CODE
              console.log(this.sumqty);
  
              if (data.status === 'error') {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                  showConfirmButton: false,
                  timer: 2500
                });
              } else if (data.status === 'null') {
  
                Swal.fire({
                  icon: 'warning',
                  title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.input.CONTAINER_ID = ''
              } else if (data.status === 'success') {
  
                this.input.b = this.sumqty[0].PRODUCT_BHS.substring(0, 1);
                this.input.d = this.sumqty[0].PRODUCT_BHS.substring(1, 2);
                this.input.p = this.sumqty[0].PRODUCT_BHS.substring(2, 3);
  
  
  
                // this.res_listOfAsn = data.data;
                // this.input.CONTAINER_ID = data.data[0].CONTAINER_ID;
                Swal.fire({
                  title: 'คุณต้องการเริ่มงานนี้หรือไม่ ?',
                  html: 'CONTAINER_ID: ' + '<font color="blue">' + this.input.CONTAINER_ID + '</font>',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#3085d6',
                  cancelButtonColor: '#d33',
                  backdrop: false,
                  confirmButtonText: 'ยืนยัน',
                  cancelButtonText: 'ยกเลิก'
                }).then((result) => {
                  if (result.value) {
                    this.summaryConCheck();
                    //jQuery(this.myModalList.nativeElement).modal('show');
                    // this.page = 'scanItemPage'
                    this.scanConPage = true;
                    this.scanItemPage = false;
                    // this.scanQtyPage = true;
                    this.summaryPage = true;
                    setTimeout(() => { this.focusInput_item() }, 1500)
                    //  console.log(this.input.CONTAINER_ID);
                  } else {
                    this.input.CONTAINER_ID = ''
                  }
                })
              }
            })
          }
  
        }
      })
  }

  summaryConCheck() {
    //loadallsumOnline
    this.pagePrint = true
    if (this.CheckWork[0].WORK_TYPE == 'Normal') {
      console.log('N')
      //this.loadallsum()
      this.dataService.summaryCon_Old(this.input).subscribe(res => {
        var data: any = res
        if (data.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          var a = data.data[0].QTY_CHECK;
          console.log('data check');
          this.res_listSummary = data.data;
          this.res_summary = data.data[0];
          var sumi = 0;
          var sumcon = 0;
         for(var i = 0; i < this.res_listSummary.length;i++){
          sumi = this.res_listSummary[i].QTY_CHECK + sumi
          sumcon = this.res_listSummary[i].QTY_PICK + sumcon
         }
         this.sumcon = sumcon;
         this.sumcheck = sumi;

         this.input.SUMCHECK = sumi;
        //#region  action on success
        if (this.sumcon == this.sumcheck && this.res_summary.QTY_CHECK == this.res_summary.QTY_PICK) {

          this.playAudioNice();
          this.closeBox();
          this.btn.Re = false;      
        }

        if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_icon == 'CF_ORDER') {
          this.btn.CFOrder = false;

        } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_icon == 'CF_ORDER') {
          this.btn.CFOrder = true;
          
        }

        if (this.sumcon == this.sumcheck) {
          this.BUTTONPRINT = true;
          //console.log('เท่ากัน');
        }else if (this.sumcheck > 0){
          this.btn.Box = false;
          this.btn.Re = false;
        }
        //#endregion

        }
      })
    } else if (this.CheckWork[0].WORK_TYPE == 'Online') {
      console.log('O')
      this.loadallsumOnline()
      this.dataService.summaryCon_Old(this.input).subscribe(res => {
        var data: any = res
        if (data.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          //  console.log( this.res_summary.QTY_CHECK);
          //  console.log( this.res_summary.QTY_PICK);
          var a = data.data[0].QTY_CHECK;
          this.res_listSummary = data.data;
          this.res_summary = data.data[0];
          // this.input.ASN_NO = data.data[0].ASN_NO;
          //this.checkForSubmit();
        }
      })
    } else {
      this.loadallsumSorter();
      this.dataService.summaryConSorter_Old(this.input).subscribe(res => {
        var data: any = res
        console.log(data)
        if (data.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          //  console.log( this.res_summary.QTY_CHECK);
          //  console.log( this.res_summary.QTY_PICK);
          var a = data.data[0].QTY_CHECK;
          this.res_listSummary = data.data;
          this.res_summary = data.data[0];
          // this.input.ASN_NO = data.data[0].ASN_NO;
          //this.checkForSubmit();

          console.log("sumcheck sorter"+this.sumcheck+ "/"+ this.sumcon);
          if(this.sumcon == this.sumcheck){
            Swal.fire({
              title: 'ตรวจเช็คสินค้าครบแล้ว เริ่มสแกนงานใหม่?',
              html: 'CONTAINER_ID: ' + '<font color="blue">' + this.input.CONTAINER_ID +': '+this.sumcheck+ ' ชิ้น'+'</font>',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              backdrop: false,
              confirmButtonText: 'ยืนยัน',
              cancelButtonText: 'ยกเลิก'
            }).then((result) => {
              if (result.value) {
                console.log(this.input);
                this.dataService.UpdateCheckdateSorter_old(this.input).subscribe(res => {
                  var data: any = res
                  console.log(data)
                  if(data != null){
                    setTimeout(() => { this.scanCon(); }, 1500) 
                  }
                })
                
              }
            })
          }
        }
      })
    }


  }

  loadallsumOnline() {

    this.dataService.CheckConOnline_Old(this.input).subscribe(res => {
      var data: any = res
      this.sumqty = data.data
      console.log(data.data[0].SUMCHECK);
      console.log(data.data[0].SUMCON);

      if (data.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'null') {

        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.CONTAINER_ID = ''
      } else if (data.status === 'success') {
        this.sumcon = this.sumqty[0].SUMCON
        this.sumcheck = this.sumqty[0].SUMCHECK

        //   console.log(this.sumcon + 'sumcon');
        //  console.log(this.sumcheck + 'sumcheck');

        if (this.sumcon == this.sumcheck && this.res_summary.QTY_CHECK == this.res_summary.QTY_PICK) {
          // && this.res_summaryAsn.QTY_CHECK == this.res_summaryAsn.QTY_PICK
          this.playAudioNice();

        }

        //    console.log( 'QTY_CHECK ' + this.res_summaryAsn.QTY_CHECK);
        //   console.log( 'QTY_PICK ' + this.res_summaryAsn.QTY_PICK);
        //  if(){

        //  }

      }
    })
  }


  loadallsum() {
    this.dataService.CheckCon_Old(this.input).subscribe(res => {
      var data: any = res
      this.sumqty = data.data

      //console.log(this.sumqty[0].SUMCHECK);
      //console.log(this.sumqty[0].SUMCON);

      if (data.status === 'error') {
        console.log(data)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'null') {

        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.CONTAINER_ID = ''
      } else if (data.status === 'success') {
        this.sumcon = this.sumqty[0].SUMCON
        this.sumcheck = this.sumqty[0].SUMCHECK
        this.input.SUMCHECK = this.sumqty[0].SUMCHECK

        if (this.sumcon == this.sumcheck && this.res_summary.QTY_CHECK == this.res_summary.QTY_PICK) {

          this.playAudioNice();
          this.closeBox();
          this.btn.Re = false;      
        }

        if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_icon == 'CF_ORDER') {
          this.btn.CFOrder = false;

        } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_icon == 'CF_ORDER') {
          this.btn.CFOrder = true;
          
        }

        if (this.sumcon == this.sumcheck) {
          this.BUTTONPRINT = true;
          //console.log('เท่ากัน');
        }else if (this.sumcheck > 0){
          this.btn.Box = false;
          this.btn.Re = false;
        }




      }
    })
  }


  loadallsumSorter() {

    //console.log(this.input.TABLE_CHECK + 'TABLE');
    this.dataService.CheckConSorter_Old(this.input).subscribe(res => {
      var data: any = res
      this.sumqty = data.data
      //console.log(this.sumqty[0].SUMCHECK);
      //console.log(this.sumqty[0].SUMCON);
      if (data.status === 'error') {
        console.log(data)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'null') {

        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.CONTAINER_ID = ''
      } else if (data.status === 'success') {
        this.sumcon = this.sumqty[0].SUMCON
        this.sumcheck = this.sumqty[0].SUMCHECK
        this.input.SUMCHECK = this.sumqty[0].SUMCHECK
        this.btn.Re = false;

   
        //   //console.log(this.sumcon + 'sumcon');
        //  //console.log(this.sumcheck + 'sumcheck');

        if (this.sumcon == this.sumcheck && this.res_summary.QTY_CHECK == this.res_summary.QTY_PICK) {
          this.btn.Re = false;
          this.playAudioNice();


        }
      }
    })
  }

  CheckItemInCon() {

    if (!this.input.ITEM_ID_BARCODE) { return; }
    if (this.input.ITEM_ID_BARCODE == 'ENTER'){ 
      this.input.ITEM_ID_BARCODE = ''
      this.summaryConCheckPrint()
      jQuery(this.myModalP.nativeElement).modal('show');
  
    }else{
      if (this.CheckWork[0].WORK_TYPE == 'Normal') {
        console.log('ปกติ');

        /////// ปกติ /////

        this.dataService.matchItemInCon_Old(this.input).subscribe(res => {
          var data: any = res
          console.log(data.status);

          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          } else if (data.status === 'notfound') {
            this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'ไม่พบข้อมูล',
              html: 'ITEM_ID: ' + '<font color="blue">' + this.input.ITEM_ID_BARCODE + '</font>' +
                ' ใน CONTAINER_ID: ' + '<font color="blue">' + this.input.CONTAINER_ID + '</font>' + ' นี้',
              showConfirmButton: true,
              backdrop: false,
              confirmButtonText: 'ตกลง',
            });
            this.input.ITEM_ID_BARCODE = ''
          } else if (data.status === 'success') {
            this.res_matchItemInCon = data.data[0];
            this.input.ITEM_ID = data.data[0].ITEM_ID;
            this.input.QTY_REQUESTED = data.data[0].QTY_REQUESTED;
            this.input.QTY_PICK = data.data[0].QTY_PICK;


            this.updateConQtyCheck();
            this.btn.CoverSheet = false;
          }

          //  console.log(this.qtyFall);
        })

      } else if (this.CheckWork[0].WORK_TYPE == 'Online') {
        console.log('Online');

        /////// Online /////

        this.dataService.matchItemInCon_Old(this.input).subscribe(res => {
          var data: any = res
          console.log(data.status);

          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          } else if (data.status === 'notfound') {
            this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'ไม่พบข้อมูล',
              html: 'ITEM_ID: ' + '<font color="blue">' + this.input.ITEM_ID_BARCODE + '</font>' +
                ' ใน CONTAINER_ID: ' + '<font color="blue">' + this.input.CONTAINER_ID + '</font>' + ' นี้',
              showConfirmButton: true,
              backdrop: false,
              confirmButtonText: 'ตกลง',
            });
            this.input.ITEM_ID_BARCODE = ''
          } else if (data.status === 'success') {

            this.res_matchItemInCon = data.data[0];
            this.input.ITEM_ID = data.data[0].ITEM_ID;
            this.input.QTY_REQUESTED = data.data[0].QTY_REQUESTED;
            this.input.QTY_PICK = data.data[0].QTY_PICK;


            this.updateConQtyCheck();

          }

          console.log(this.qtyFall);
        })

      } else {
        console.log('sorter');
        console.log(this.input.b);
        this.dataService.matchItemInConSORTER_Old(this.input).subscribe(res => {
          var data: any = res
          console.log(data.status);

          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          } else if (data.status === 'notfound') {
            this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'ไม่พบข้อมูล',
              html: 'ITEM_ID: ' + '<font color="blue">' + this.input.ITEM_ID_BARCODE + '</font>' +
                ' ใน CONTAINER_ID: ' + '<font color="blue">' + this.input.CONTAINER_ID + '</font>' + ' นี้',
              showConfirmButton: true,
              backdrop: false,
              confirmButtonText: 'ตกลง',
            });
            this.input.ITEM_ID_BARCODE = ''
          } else if (data.status === 'success') {

            this.res_matchItemInCon = data.data[0];
            this.input.ITEM_ID = data.data[0].ITEM_ID;
            this.input.QTY_REQUESTED = data.data[0].QTY_REQUESTED;
            this.input.QTY_PICK = data.data[0].QTY_PICK;


            this.updateConQtyCheckSorter();

          }

          //  console.log(this.qtyFall);
        })

      }
  }
  }

  updateConQtyCheck() {
    console.log("UPDATE");
    this.dataService.checkEqualCon_Old(this.input).subscribe(res => {
      var data: any = res
      console.log(data);
      if (data.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.ITEM_ID_BARCODE = ''
      } else if (data.status === 'success') {

        this.res_QTY_equal = data.data[0];
        console.log('1');

        //    console.log(this.res_QTY_equal.QTY_equal);

        if (this.res_QTY_equal.QTY_equal == "equal") {
          this.playAudioError();

          Swal.fire({
            icon: 'warning',
            title: 'ITEM เกินจำนวน',
            html: 'ITEM_ID: ' + '<font color="red">' + this.input.ITEM_ID + '</font>' +
              ' ใน CONTAINER_ID: ' + '<font color="red">' + this.input.CONTAINER_ID + '</font>',
            showConfirmButton: true,
            backdrop: false,
            confirmButtonText: 'ตกลง',
          });
          this.input.ITEM_ID_BARCODE = ''
        } else if (this.res_QTY_equal.QTY_equal == 'not_equal') {
          this.dataService.updateConQtyCheck_Old(this.input).subscribe(res => {
            
            if (data.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                showConfirmButton: false,
                timer: 2500
              });
            } else if (data.status === 'success') {
              console.log('OK')
              this.playAudioOK();
              this.summaryConCheck()


              this.input.ITEM_ID_BARCODE = ''
            }
          })
        }
      }
    })
  }

  
  updateConQtyCheckSorter() {
    console.log("UPDATE");
    // console.log(this.input);
    // this.input.ASN_NO = ASN;
    // this.input.ITEM_ID_BARCODE = BARCODE;
    // this.input.QTY_CHECK = QTYCHECK;
    // console.log(ASN, BARCODE, QTYCHECK);

    this.dataService.checkEqualConSorter_Old(this.input).subscribe(res => {
      var data: any = res
      console.log(data);
      if (data.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'success') {

        this.res_QTY_equal = data.data[0];
        //  console.log(this.res_QTY_equal.QTY_equal);
        console.log('3');
        if (this.res_QTY_equal.QTY_equal == "equal") {

          this.playAudioError();

          Swal.fire({
            icon: 'warning',
            title: 'ITEM เกินจำนวน',
            html: 'ITEM_ID: ' + '<font color="red">' + this.input.ITEM_ID + '</font>' +
              ' ใน CONTAINER_ID: ' + '<font color="red">' + this.input.CONTAINER_ID + '</font>',
            showConfirmButton: true,
            backdrop: false,
            confirmButtonText: 'ตกลง',
          });
          this.input.ITEM_ID_BARCODE = ''
        } else if (this.res_QTY_equal.QTY_equal == 'not_equal') {
          this.dataService.updateConQtyCheck_Old(this.input).subscribe(res => {
            if (data.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                showConfirmButton: false,
                timer: 2500
              });
            } else if (data.status === 'success') {
              console.log('OK')
              this.playAudioOK();
              this.summaryConCheck()

              this.input.ITEM_ID_BARCODE = ''
            }
          })
        }
      }
    })
  }



summaryConCheckPrint() {
    
 console.log('Print')
    this.pagePrint = false

    console.log(this.pagePrint);
    console.log(this.scanItemPage);
    console.log(this.scanQtyPage);
    if (this.CheckWork[0].WORK_TYPE == 'Normal') {
      this.loadallsum()
      this.dataService.summaryCon_Old(this.input).subscribe(res => {
        var data: any = res
        //var a = data.data[0].QTY_CHECK;
        if (data.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          //  console.log( this.res_summaryAsn.QTY_CHECK);
          //  console.log( this.res_summaryAsn.QTY_PICK);
          var a = data.data[0].QTY_CHECK;
          this.res_listSummary = data.data;
          this.res_summary = data.data[0];
          // this.input.ASN_NO = data.data[0].ASN_NO;
          //this.checkForSubmit();
        }
      })
    } else if (this.CheckWork[0].WORK_TYPE == 'Online') {
      this.loadallsumOnline()
      console.log('15');
      this.dataService.summaryCon(this.input).subscribe(res => {
        var data: any = res
        //console.log(data.data[0].QTY_CHECK);

        //var a = data.data[0].QTY_CHECK;
        if (data.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          //  console.log( this.res_summaryAsn.QTY_CHECK);
          //  console.log( this.res_summaryAsn.QTY_PICK);
          var a = data.data[0].QTY_CHECK;
          this.res_listSummary = data.data;
          this.res_summary = data.data[0];
          // this.input.ASN_NO = data.data[0].ASN_NO;
          //this.checkForSubmit();
        }
      })
    } else {
      this.loadallsumSorter()
      this.dataService.summaryConSorter_Old(this.input).subscribe(res => {
        var data: any = res
  console.log('SS')
        if (data.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          //  console.log( this.res_summaryAsn.QTY_CHECK);
          //  console.log( this.res_summaryAsn.QTY_PICK);
          var a = data.data[0].QTY_CHECK;
          this.res_listSummary = data.data;
          this.res_summary = data.data[0];
          // this.input.ASN_NO = data.data[0].ASN_NO;
          //this.checkForSubmit();
        }
      })
    }

  }




  async printTracking() {
    console.log('print');
    await window.print();
    await new Promise(f => setTimeout(f, 1000));
    this.scanCon();
  }




 
  PRINT_ITEM_LACK() {
    console.log(this.input)
    this.dataService.summary_ITEM_LACK_Old(this.input).subscribe(res => {
      var data: any = res
      if (data.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'null') {
        this.pagePrintCoverSheet = false;
        this.pagePrintShear = true;
        this.pagePrint = false;

      } else if (data.status === 'success') {
        this.dataprint_LIST_ITEM = data.data;

        console.log(this.dataprint_LIST_ITEM)
        var a = Array();
        for (var i = 1; i <= 3; i++) { ////// ก๊อปปี้ 3 ชุด
          let array = {
            TO_DAY_SHOW: this.dataprint_LIST_ITEM[0].TO_DAY,
            BILL_N8_BLH: this.dataprint_LIST_ITEM[0].SHIPMENT_ID,
            BILL_DATE: this.dataprint_LIST_ITEM[0].ORDER_DATE,
            SELLER_NO: this.dataprint_LIST_ITEM[0].STORE_NO,
            CORNER_ID_BLH: this.dataprint_LIST_ITEM[0].CORNER_ID_BLH,
            SHIPPING_NAME: this.dataprint_LIST_ITEM[0].STORE_NAME,
          }
          a.push(array)
        }
        this.dataLACK_H = a

        this.pagePrintCoverSheet = false;
        this.pagePrintShear = false;
        this.pagePrint = false;

        setTimeout(() => { this.printTracking(); }, 500)  
        
      }
    })
  }


  coverSheet() { //// ใบปะกล่อง
  
        this.PRINT_ITEM_LACK();

        console.log(this.input);
        this.dataService.UPDATE_CARTON_PRINT(this.input).subscribe(res => {
          var data: any = res
          console.log('UPDATE_CARTON_PRINT',data)
          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          }else{
            this.dataService.loaddataToOut(this.input).subscribe(res => {
              var data: any = res
              if (data.status === 'error') {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                  showConfirmButton: false,
                  timer: 2500
                });
              }else if (data.status === 'null') {
                Swal.fire({
                  icon: 'error',
                  title: 'ข้อมูลไม่ถูกต้อง!',
                  text: 'กรุณาตรวจสอบข้อมูลอีกครั้ง',
                  showConfirmButton: false,
                  timer: 2000
                });
                this.input.BILL_N8_BLH = '';
                this.input.CHUTENO = '';
                this.input.BOX_NUM = '';
        
              }else{

               this.busy = this.dataService.tracking_running_Old(this.input).subscribe(res => {
                var datatrack: any = res
                console.log(datatrack);

                if(datatrack.status == 'success'){
                  var a = Array();
                  for (var i = 0; i < datatrack.data.length; i++) {
                    let array = {
                      BOX_NO_ORDER : datatrack.data[i].BOX_NO_ORDER,
                      REF_INDEX : datatrack.data[i].REF_INDEX,
                      SELLER_NO: data.data[0].SELLER_NO,
                      BILL_N8_BLH: data.data[0].BILL_N8_BLH,
                      BILL_NO: data.data[0].BILL_NO,
                      STORE_ADDRESS: data.data[0].STORE_ADDRESS,
                      CORNER_ID_BLH: data.data[0].CORNER_ID_BLH,
                      BILL_DATE: data.data[0].BILL_DATE,
                      SITE_ID_BLH: data.data[0].SITE_ID_BLH,
                      BATCH_CODE: data.data[0].BATCH_CODE,
                      TRANSPORT_ID: data.data[0].TRANSPORT_ID,
                      TRANSPORT_NAME: data.data[0].TRANSPORT_NAME,
                      BRAND: data.data[0].BRAND,
                      BRAND_NAME: data.data[0].BRAND_NAME,
                      SHIPPING_NAME: data.data[0].SHIPPING_NAME,
                      TCHANNEL: data.data[0].TCHANNEL,
                      MESSAGE_1: data.data[0].MESSAGE_1,
                      MESSAGE_2: data.data[0].MESSAGE_2,
                      MESSAGE_3: data.data[0].MESSAGE_3,
                      BOX_SIZE :  datatrack.data[i].REF_INDEX,
                      BILL_NO_REF : datatrack.data[i].Bill_NO_REF,
                    }
                    a.push(array)
                  }
                    this.dataprintCoverSheet = a

                    console.log(this.dataprintCoverSheet)

                }else{
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                    showConfirmButton: false,
                    timer: 2500
                  });
                }
                jQuery(this.myModalBOX.nativeElement).modal('hide');
                setTimeout(() => { this.focusInput_item(); }, 1500) 
                });
              }
            });
          }
        });
}

coverSheet2() { //// ใบปะกล่อง
  
  this.input.listbox = this.totalbox;
  console.log(this.input);
  if(this.input.listbox.length > 0){

    //this.pagePrintCoverSheet = false;
    //this.pagePrint = false;
    this.isLoading = true; 

    this.dataService.UPDATE_CARTON_PRINT(this.input).subscribe(res => {
      var data: any = res
      console.log('UPDATE_CARTON_PRINT',data)
      if (data.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      }else{
        this.dataService.loaddataToOut(this.input).subscribe(res => {
          var data: any = res
          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          }else if (data.status === 'null') {
            Swal.fire({
              icon: 'error',
              title: 'ข้อมูลไม่ถูกต้อง!',
              text: 'กรุณาตรวจสอบข้อมูลอีกครั้ง',
              showConfirmButton: false,
              timer: 2000
            });
            this.input.BILL_N8_BLH = '';
            this.input.CHUTENO = '';
            this.input.BOX_QTY = '';
    
          }else{
  
           this.busy = this.dataService.tracking_running_Old2(this.input).subscribe(res => {
            var datatrack: any = res
            console.log(datatrack);
  
            if(datatrack.status == 'success'){
              var a = Array();
              for (var i = 0; i < datatrack.data.length; i++) {
                let array = {
                  BOX_NO_ORDER : datatrack.data[i].BOX_NO_ORDER,
                  REF_INDEX : datatrack.data[i].REF_INDEX,
                  SELLER_NO: data.data[0].SELLER_NO,
                  BILL_N8_BLH: data.data[0].BILL_N8_BLH,
                  BILL_NO: data.data[0].BILL_NO,
                  STORE_ADDRESS: data.data[0].STORE_ADDRESS,
                  CORNER_ID_BLH: data.data[0].CORNER_ID_BLH,
                  BILL_DATE: data.data[0].BILL_DATE,
                  SITE_ID_BLH: data.data[0].SITE_ID_BLH,
                  BATCH_CODE: data.data[0].BATCH_CODE,
                  TRANSPORT_ID: data.data[0].TRANSPORT_ID,
                  TRANSPORT_NAME: data.data[0].TRANSPORT_NAME,
                  BRAND: data.data[0].BRAND,
                  BRAND_NAME: data.data[0].BRAND_NAME,
                  SHIPPING_NAME: data.data[0].SHIPPING_NAME,
                  TCHANNEL: data.data[0].TCHANNEL,
                  MESSAGE_1: data.data[0].MESSAGE_1,
                  MESSAGE_2: data.data[0].MESSAGE_2,
                  MESSAGE_3: data.data[0].MESSAGE_3,
                  BOX_SIZE :  datatrack.data[i].BOX_SIZE,
                  BILL_NO_REF : datatrack.data[i].Bill_NO_REF,
                }
                a.push(array)
              }
                this.dataprintCoverSheet = a
  
                console.log(this.dataprintCoverSheet)
                this.totalbox = [];
  
                this.PRINT_ITEM_LACK();
                this.isLoading = false;

            }else{
              console.log(datatrack);
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                html:datatrack.member.originalError.info.message,
                showConfirmButton: false,
                timer: 5500
              });
            }
            jQuery(this.myModalBOX.nativeElement).modal('hide');
            setTimeout(() => { this.focusInput_item(); }, 1500) 
            });
          }
        });
      }
    });
  }else{
    Swal.fire({
      icon: 'warning',
      title: 'กรุณาเลือกขนาดกล่อง!',
      showConfirmButton: false,
      timer: 2500
    });
  }
}


  CFOrder() {
    console.log('ยืนยัน order');

    Swal.fire({
      title: 'คุณต้องการปิดงาน Orderนี้ ?',
      html: 'ถ้ากดยืนยันแล้วไม่สามารถแก้ไขได้อีก!!!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      backdrop: false,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.value) {
        this.dataService.checkstatusUpdateConfirmOrder(this.input).subscribe(res => {
          var data: any = res
          console.log(data.status);
          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          } else if (data.status === 'success') {
            Swal.fire({
              icon: 'error',
              title: 'Order นี้ มีการปิดงานไปแล้ว!!!',
              showConfirmButton: false,
              timer: 2500
            });
          } else if (data.status === 'null') {

            console.log('update + insert');
            this.dataService.UpdateConfirmOrder(this.input).subscribe(res => {
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
                Swal.fire({
                  icon: 'success',
                  title: 'บันทึกข้อมูลเรียบร้อยแล้ว',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.loadallsum();
                this.btn.CoverSheet = false;
                this.btn.Printbill = false;
                this.btn.CFOrder = true;
              }
            })

          }
        })
      } else {
        return
      }
    })


  }

  print_Transfer_Slip() {


    window.open("http://10.0.152.46/ReportServer/Pages/ReportViewer.aspx?%2fReport+Project2%2fReport1&SHIPMENT_ID=" + this.input.shipment_id, "_blank");

    //   window.open("http://10.0.152.46/ReportServer/Pages/ReportViewer.aspx?%2freport+sorter+2%2fReport5_V2&PCPERIOD_NO=" + this.ROUTE_NO[i].PCPERIOD_NO, "_blank");

  }


  playAudioNice() {
    let audio = new Audio();
    //audio.src = "../../../assets/audio/nice.mp3";
    audio.src = "http://10.26.1.21/TSDC/assets/audio/nice.mp3";
    audio.load();
    audio.play();

  }

  playAudioError() {
    

    let audio = new Audio();
    //audio.src = "../../../assets/audio/error.mp3";
    audio.src = "http://10.26.1.21/TSDC/assets/audio/error.mp3";
    audio.load();
    audio.play();

  }

  playAudioOK() {
    let audio = new Audio
    //('../../../assets/audio/ok.mp3');
    //audio.src = "../../../assets/audio/ok.mp3";
    //console.log(this.input);


    var TableCheck = this.input.TABLE_CHECK.substring(1, 3) % 2

    if (TableCheck == 1) {
      audio.src = "http://10.26.1.21/TSDC/assets/audio/ok.mp3";
    } else if (TableCheck == 0) {
      audio.src = "http://10.26.1.21/TSDC/assets/audio/OK3.mp3";
    }

    audio.load();
    audio.play();

  }

}
