import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
//import {MatButton} from '@angular/material/button';
import { DataService } from '../../services/index'
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

declare var jQuery: any;

@Component({
  selector: 'app-audit-check',
  templateUrl: './audit-check.component.html',
  styleUrls: ['./audit-check.component.scss']
})
export class AuditCheckComponent implements OnInit {
  busy!: Subscription;
  @ViewChild('myModalBOX') myModalBOX!: ElementRef;
  @ViewChild('myModalSt') myModalSt!: ElementRef;

  @ViewChild('inputcontainer') inputcontainer!: ElementRef;
  @ViewChild('inputItem') inputItem!: ElementRef;
  @ViewChild('inputbox') inputbox!: ElementRef;
  @ViewChild('inputITEMBARCODE') inputITEMBARCODE!: ElementRef;

  @ViewChild('Btn_printTrack') Btn_printTrack!: ElementRef; 

  
  isLoading = false;
  pageactive: any;

  dtOptions: any = {};
  dataCon: any = [];

  private sumcon: any = {};
  private sumcheck: any = {};
  today = new Date();
  Datenow = this.today.toISOString().slice(0, 10);
  Timenow = this.today.toISOString().slice(11, 16);

  public scanConPage = false;
  public scanItemPage = true;
  public alertcancel = false;
  public scanQtyPage = true;
  public pagePrintShear = true;
  public pagePrintCoverSheet = true;
  public pagePrintTrack = true;
  public pagePrintTrackAll = true;
  public pagePrint = true;
  public summaryPage = true;

  public reButton = false;
  public box: any = {}

  public qtyFall = 0;

  public CheckWork: any;
  Block_order : any;

  BUTTONPRINT = false;
  res_summary: any = {};   ///////
  res_matchItemInCon: any = {};
  res_list: any = [];
  trackall: any = [];
  sumqty: any = [];
  res_QTY_equal: any = {};
  dataLACK_H: any = [];
  data: any = [];

  dataprintCoverSheet: any = [];
  dataprint: any = [];
  input: any = {};
  btn: any = {};
  dataprint_LIST_ITEM: any = [];
  interval: any;
  user: any;
  box_size: any = [];
  view  = true;

  user_listCheckIn:  Array<any>  = [];
  user_listCheckHis:  Array<any>  = [];

  VAS: any = [];
  vasFormArray: Array<any> = [];

  Status_Print_Track = 'Y';

  constructor(
    private dataService: DataService,
    private router: Router,
    //private busy: Subscription,
  ) { }

  ngOnInit(): void {

    var page = Array();
    let array = {
      pagename: 'Check Order',
      active: 'Audit&Check',
    }
    page.push(array)
    this.pageactive = page;

    this.LOAD_USERTABLECHECK();
    this.LOAD_USERCheckin();
    this.loadVas()
    setTimeout(() => { this.focusInput_con() }, 200)
    this.interval = setInterval(() => this.focusInput_item(), 2000);
    this.btn.Box = true;
    this.btn.Re = true;

    this.btn.CoverSheet = true;
    this.btn.CFOrder = true;
    this.btn.Printbill = true;
    this.input.OnclickCoverSheet = false;


  }

  //this.input.sa  = JSON.parse(localStorage.getItem('currentUser') || '')

  /* focusScrollMethod = function getFocus() {

    var element = document.getElementById("YourElementId")
              //element.focus();
    //document.getElementById("id").focus();

     
    var elem = document.getElementById('result');
    if(typeof elem != null  ) {
      document.getElementById("result").focus();
    }


  }  */


  focusInput_item() {


    if (this.scanItemPage === false) {
      this.inputItem.nativeElement.focus();
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
  CHECK_tracksum_qty() {

    this.busy = this.dataService.tracksum_qty(this.input).subscribe(res => {
      var data: any = res;
      console.log('checkt',data)
      console.log(data.data[0].TRACKSUM_QTY)
      if (data.status === 'success') {
        if (data.data[0].TRACKSUM_QTY == null) {
          this.btn.Box = true;
          this.btn.Re = true
          //console.log('ปิด re')

        } else {
          if(this.Status_Print_Track == 'N'){
            this.btn.Box = true;
          }else{
            this.btn.Box = false;
          }
          //this.btn.Box = false;
          this.btn.Re = false
         // console.log('เปิด re')

          if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_TYPE == 'CF_ORDER') {
            this.btn.CFOrder = false;
          } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_TYPE == 'CF_ORDER') {
            this.btn.CFOrder = true;
          }

          this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
          Swal.fire({
            icon: 'warning',
            title: 'สินค้าตรวจเช็คค้างไว้',
            html: 'จำนวน ' + '<font color="blue">' + this.input.tracksum_qty + '</font>' + 'ชิ้น',
            showConfirmButton: false,
            timer: 2000
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

    this.busy = this.dataService.tracksum_qty(this.input).subscribe(res => {
      var data: any = res
      this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
      Swal.fire({
        title: 'สแกนสินค้าใหม่ที่ยังไม่ทำการปิดกล่อง ?',
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
          this.busy = this.dataService.Rescan_checkitem(this.input).subscribe(res => {
            var data: any = res;
            if (data.status === 'success') {
              this.summaryConCheck();
              this.btn.Box = true;
              this.btn.Re = true
              //console.log('ปิด re')
              if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_TYPE == 'CF_ORDER') {
                this.btn.CFOrder = false;
              } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_TYPE == 'CF_ORDER') {
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
  RescanAll() {
    Swal.fire({
      title: 'ต้องการตรวจสอบใหม่ทั้งหมดหรือไม่ ?',
      html: 'Container: ' + '<font color="blue">' + this.input.CONTAINER_ID + '</font>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      backdrop: false,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.value) {
        this.busy = this.dataService.Rescancheckitem_all(this.input).subscribe(res => {
          var data: any = res;
          if (data.status === 'success'){
            this.summaryConCheck();
            this.CHECK_tracksum_qty();

          }
        })
      } 
    })
  }


  closeBox() {
    console.log('1')
    this.input.BOX_SIZE = ''
    this.input.OnclickCoverSheet = false;
    this.busy = this.dataService.tracksum_qty(this.input).subscribe(res => {
      var data: any = res;
      //console.log(data)
      //console.log(data.data[0].TRACKSUM_QTY)
      if (data.status === 'success') {
        if (data.data[0].TRACKSUM_QTY == null) {
          this.btn.Box = true;
          this.btn.Re = true;
        } else {
          if(this.Status_Print_Track == 'N'){
            this.btn.Box = true;
          }else{
            this.btn.Box = false;
          }
          //this.btn.Box = false;
          this.btn.Re = false;
          this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
          if(this.Status_Print_Track == 'N'){
            
            this.dataService.UpdateCheckdate(this.input).subscribe(res => {
              var data: any = res
              if(data.status == 'success'){
                this.Sweetalert();
                if(this.view == false){
                  this.Newscan();
                }

              }else{
                Swal.fire({
                  icon: 'warning',
                  title: 'update CHECK_DATE ไม่สำเร็จ',
                  showConfirmButton: false,
                  timer: 2500
                })
              }
            })
            
          }else{
            jQuery(this.myModalBOX.nativeElement).modal('show');
          }
          //jQuery(this.myModalBOX.nativeElement).modal('show');
          
          //this.inputbox.nativeElement.focus()
          this.interval = setInterval(() => this.inputbox.nativeElement.focus(), 500);   
         //this.interval = setInterval(() => this.inputItem.nativeElement.focus(), 100000000);

          this.check_size();
         
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

  async Sweetalert() {
    await Swal.fire({
      icon: 'success',
      title: 'บันทึกข้อมูลเรียบร้อย',
      showConfirmButton: false,
      timer: 2500
    })
}

  checkBoxVas(Vas: string, isChecked: any) {

    if (isChecked.currentTarget.checked == true) {
      this.vasFormArray.push(Vas);
    } else {
      let index = this.vasFormArray.indexOf(Vas);
      this.vasFormArray.splice(index, 1);
    }
    //console.log(this.vasFormArray);
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


  /* reloadComponent() {
    location.reload();
  } */


  scanCon() {
    this.view = true;
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
    this.pagePrintTrackAll = true;
    this.pagePrint = true
    this.pagePrintCoverSheet = true;
    this.pagePrintShear = true;
    this.LOAD_USERTABLECHECK();
    setTimeout(() => { this.focusInput_item() }, 3000);
    setTimeout(() => { this.focusInput_con() }, 1000);
    this.interval = setInterval(() => this.focusInput_item(), 3000);
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
        //console.log(this.input);
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

    this.alertcancel = false;
    this.dataService.CheckWork_ug(this.input).subscribe(res => {
      this.CheckWork = res;
      
      if (this.CheckWork.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
      } else if (this.CheckWork.status === 'null') {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.CONTAINER_ID = ''
      } else if (this.CheckWork.status === 'success') {
        this.input.ORDER_TYPE = this.CheckWork.data[0].ORDER_TYPE;
        this.input.shipment_id = this.CheckWork.data[0].SHIPMENT_ID;
        this.input.COMPANY = this.CheckWork.data[0].COMPANY;
        this.input.ORDER_DATE = this.CheckWork.data[0].ORDER_DATE;
        this.input.SELLER_NO = this.CheckWork.data[0].SELLER_NO;

        this.tablecheck_user();

        this.dataService.Checkorder_block(this.input).subscribe(res => {
          this.Block_order = res;
         if(this.Block_order.status == 'error'){
           Swal.fire({
             icon: 'error',
             title: 'เกิดข้อผิดพลาด Check รายการ block order ไม่ได้ ',
             showConfirmButton: false,
             timer: 2500
           });

           return;
         }else
         { 
            if (this.input.ORDER_TYPE == 'ONLINE' || this.input.ORDER_TYPE == 'CANCEL') {
              console.log('ONLINE');
              this.dataService.CheckConOnline(this.input).subscribe(res => {
                var data: any = res
                this.sumqty = data.data
                if (data.status === 'error') {
                  console.log(data);
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                    showConfirmButton: false,
                    timer: 2500
                  });
                } else if (data.status === 'null') {
                  console.log(data);
                  Swal.fire({
                    icon: 'warning',
                    title: 'ไม่พบข้อมูล CONTAINER นี้ หรือ PIN CODE ไม่ถูกต้อง',
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.input.CONTAINER_ID = ''
                } else if (data.status === 'success') {
                  this.Status_Print_Track = this.sumqty[0].Print_Tracking
                  this.input.shipment_id = this.sumqty[0].shipment_id
                  this.input.SELLER_NO = this.sumqty[0].SELLER_NO
                  this.input.BRAND = this.sumqty[0].USER_DEF5
                  this.input.SHIPPING_NAME = this.sumqty[0].SHIPPING_NAME
                  this.input.TCHANNEL = this.sumqty[0].TCHANNEL
                  this.input.SUMCHECK = this.sumqty[0].SUMCHECK
                  this.input.b = this.sumqty[0].USER_DEF5.substring(0, 1);
                  this.input.d = this.sumqty[0].USER_DEF5.substring(1, 2);
                  this.input.p = this.sumqty[0].USER_DEF5.substring(2, 3);

                  if (this.Block_order.status === 'success' && this.Block_order.data[0].FNBlock_type == 1) {
                    Swal.fire({
                      title:'Block : '+ this.Block_order.data[0].FTBlock_title,
                      html: 'รายละเอียด : '+ this.Block_order.data[0].FTBlock_desc ,
                      icon: 'warning',
                      showCancelButton: false,
                      confirmButtonColor: '#d33',
                      backdrop: false,
                      confirmButtonText: 'ตกลง',
                    }).then((result) => {
                      if (result.value) {
                        this.CheckWork.status = 'Block order',
                        this.scanCon();
                      }
                    })
                
                  }else {

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
                        
                        if(this.Block_order.status === 'success' && this.Block_order.data[0].FNBlock_type == 2){
                          Swal.fire({
                            title:'แจ้งเตือน : '+ this.Block_order.data[0].FTBlock_title,
                            html: 'รายละเอียด : '+this.Block_order.data[0].FTBlock_desc ,
                            icon: 'warning',
                            showCancelButton: false,
                            confirmButtonColor: '#d33',
                            backdrop: false,
                            confirmButtonText: 'ตกลง',
                          }).then((result) => {
                            if (result.value) {
                              this.dataService.CheckOrder_Cancel(this.input).subscribe(res => {
                                var ordercancel: any = res
                                console.log(ordercancel);
                                if (ordercancel.status === 'error') {
                                    console.log(data);
                                    Swal.fire({
                                      icon: 'error',
                                      title: 'Get ONLINE_ORDER_CANCEL Error!',
                                      showConfirmButton: false,
                                      timer: 2500
                                    });
                                    this.playAudioError();
                                }
                                else if(ordercancel.status === 'success'){
                                  this.alertcancel = true;
                                }
                              });

                              this.summaryConCheck();
                              this.CHECK_tracksum_qty();
                              this.scanConPage = true;
                              this.scanItemPage = false;
                              this.summaryPage = true;
                              // setTimeout(() => { this.focusInput_item() }, 150)

                            }
                          })
                        }else{
                          
                          this.dataService.CheckOrder_Cancel(this.input).subscribe(res => {
                            var ordercancel: any = res
                            console.log(ordercancel);
                            if (ordercancel.status === 'error') {
                                console.log(data);
                                Swal.fire({
                                  icon: 'error',
                                  title: 'Get ONLINE_ORDER_CANCEL Error!',
                                  showConfirmButton: false,
                                  timer: 2500
                                });
                                this.playAudioError();
                            }
                            else if(ordercancel.status === 'success'){
                              this.alertcancel = true;
                            }
                          });

                          this.summaryConCheck();
                          this.CHECK_tracksum_qty();
                          this.scanConPage = true;
                          this.scanItemPage = false;
                          this.summaryPage = true;
                          // setTimeout(() => { this.focusInput_item() }, 150)
                        }

                      } else {
                        this.input.CONTAINER_ID = ''
                      }
                    })
                  }
              }
                
              })
            } else if (this.input.ORDER_TYPE == 'OFFLINE') {
              
      

              this.dataService.CheckConOffline(this.input).subscribe(res => {
                var data: any = res
                this.sumqty = data.data
                console.log(data);
                if (data.status === 'error') {
                  console.log(data);
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
                  this.input.SELLER_NO = this.sumqty[0].SELLER_NO
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
                      // setTimeout(() => { this.focusInput_item() }, 150)
                    } else {
                      this.input.CONTAINER_ID = ''
                    }
                  })
                }
              })
            } else if (this.input.ORDER_TYPE == 'SORTER') {
              //console.log('SORTER');
              this.dataService.CheckConSorter(this.input).subscribe(res => {
                var data: any = res
                this.sumqty = data.data
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
                  this.input.shipment_id = this.sumqty[0].BATCH_CODE
                  this.input.SELLER_NO = 'SORTER'
                  this.input.BRAND = this.sumqty[0].BRAND
                  this.input.SUMCHECK = this.sumqty[0].SUMCHECK
                  this.input.b = this.sumqty[0].PRODUCT_BHS.substring(0, 1);
                  this.input.d = this.sumqty[0].PRODUCT_BHS.substring(1, 2);
                  this.input.p = this.sumqty[0].PRODUCT_BHS.substring(2, 3);

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
                    if (result.isConfirmed) {

                      this.summaryConCheck();
                      this.scanConPage = true;
                      this.scanItemPage = false;
                      this.summaryPage = true;
                    } else {
                      this.input.CONTAINER_ID = ''
                    }
                  })
                }
              })
            } else if (this.input.ORDER_TYPE == 'CF_ORDER') {
              
              this.dataService.CheckCon_Orderconfirm(this.input).subscribe(res => {
                var data: any = res
                this.sumqty = data.data
                if (data.status === 'error') {
                  console.log(data);
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
                  this.input.SELLER_NO = this.sumqty[0].SELLER_NO
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
                  this.input.TCHANNEL = 'CF_ORDER'
                  this.input.STATUS_DATA = this.sumqty[0].STATUS_DATA
                  this.input.SUMCHECK = this.sumqty[0].SUMCHECK
                  this.input.b = this.sumqty[0].USER_DEF5.substring(0, 1);
                  this.input.d = this.sumqty[0].USER_DEF5.substring(1, 2);
                  this.input.p = this.sumqty[0].USER_DEF5.substring(2, 3);

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

                      if (this.input.STATUS_DATA == 'N' && this.btn.Box == true) {
                        this.btn.CFOrder = false;
                      } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false) {
                        this.btn.CFOrder = true;
                      } else if (this.input.STATUS_DATA == 'S') {
                        this.btn.CFOrder = true;
                        this.btn.CoverSheet = false;
                        this.btn.Printbill = false;
                      }

                      setTimeout(() => { this.focusInput_item() }, 300)
                    } else {
                      this.input.CONTAINER_ID = ''
                    }
                  })
                }
              })
            } else if (this.input.ORDER_TYPE == 'DHL'){
              Swal.fire({
                icon: 'warning',
                title: 'เป็นงาน Order ช่องทาง DHL ให้นำส่งคืนผู้รับผิดชอบ"',
                showConfirmButton: false,
                timer: 3000
              });
              this.input.CONTAINER_ID = ''
            }
            else {
              Swal.fire({
                icon: 'warning',
                title: 'Work type ไม่ถูกต้อง',
                showConfirmButton: false,
                timer: 2500
              });
              this.input.CONTAINER_ID = ''
            }
         }
        })
      }
    })
  }

  summaryConCheck() {

    if (this.input.ORDER_TYPE != 'SORTER') {
      this.loadallsum()
      this.loadTracking()
      console.log('20');
      this.dataService.summaryCon(this.input).subscribe(res => {

        var data: any = res
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
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          this.res_list = data.data;
          //console.log(this.res_list[0].MaxBox_NO)
          this.input.MaxBox_NO = this.res_list[0].MaxBox_NO

        }
      })
    } else {
      this.loadallsumSorter()
      this.dataService.summaryConSorter(this.input).subscribe(res => {
        var data: any = res
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
            title: 'ไม่พบข้อมูล',
            showConfirmButton: false,
            timer: 2500
          });
        } else if (data.status === 'success') {
          this.res_list = data.data;
          this.input.MaxBox_NO = '0'
        }
      })
    }


  }
  loadTracking() {

    this.dataService.loadTracking(this.input).subscribe(res => {
      var data: any = res
      this.trackall = data.data
      if (!this.trackall) {
      } else {
        this.input.MaxBox_NO = this.trackall[0].MaxBox_NO;
        if (this.input.ORDER_TYPE == 'OFFLINE') {
          this.btn.CoverSheet = false;
          //this.CHECK_tracksum_qty();
        } else if (this.input.ORDER_TYPE == 'CF_ORDER') {


          //this.CHECK_tracksum_qty();
        }
      }
    })
  }

  CFOrder() {
    console.log('ยืนยัน order');

    Swal.fire({
      title: 'คุณต้องการปิดงาน Orderนี้ ?',
      html: 'ถ้ากดยืนยันแล้วไม่สามารถแก้ไขได้อีก!!!',
      // html: 'ASN_NO: ' + '<font color="blue">' + this.input.ASN_NO + '</font>',
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


  loadallsum() {
    this.dataService.CheckCon(this.input).subscribe(res => {
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
       

        //   //console.log(this.sumcon + 'sumcon');
        //  //console.log(this.sumcheck + 'sumcheck');

        if (this.sumcon == this.sumcheck && this.res_summary.QTY_CHECK == this.res_summary.QTY_PICK) {

          this.playAudioNice();
          this.closeBox();
          if(this.Status_Print_Track == 'N'){
            this.btn.Box = true;
          }else{
            this.btn.Box = false;
          }
          //this.btn.Box = false
          this.btn.Re = false
          //console.log('เปิด re')

          
        }

        if (this.input.STATUS_DATA == 'N' && this.btn.Box == true && this.input.ORDER_TYPE == 'CF_ORDER') {
          this.btn.CFOrder = false;
        } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false && this.input.ORDER_TYPE == 'CF_ORDER') {
          this.btn.CFOrder = true;
        }

        this.busy = this.dataService.tracksum_qty(this.input).subscribe(res => {
          var data: any = res
          this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
          if(this.input.tracksum_qty == null){
            this.btn.Re = true
          }else{
            this.btn.Re = false
          }
        })
        

        if (this.sumcon == this.sumcheck) {
          this.BUTTONPRINT = true;

        } else {
          //console.log('ไม่เท่ากัน');
        }




      }
    })
  }


  loadallsumSorter() {

    const user = JSON.parse(localStorage.getItem('currentUser') || '');
    this.input.TABLE_CHECK = user.WORKER_ID;
    //console.log(this.input.TABLE_CHECK + 'TABLE');


    this.dataService.CheckConSorter(this.input).subscribe(res => {
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
        this.btn.Re = true;

   
        //   //console.log(this.sumcon + 'sumcon');
        //  //console.log(this.sumcheck + 'sumcheck');

        if (this.sumcon == this.sumcheck && this.res_summary.QTY_CHECK == this.res_summary.QTY_PICK) {

          this.playAudioNice();
          this.dataService.UpdateCheckdateSorter(this.input).subscribe(res => {
            //var data: any = res
            //console.log(data.status);
          })


        }
      }
    })
  }

  CheckItemInCon() {

    if (!this.input.ITEM_ID_BARCODE) { return; }
    this.view = false;
    if(this.alertcancel){
      this.playAudioError();
      Swal.fire({
        icon: 'warning',
        title: 'ORDER ถูกยกเลิก',
        html : 'นำใบงานติดไปกับสินค้าเพื่อทำรับคืน',
        showConfirmButton: true,
      });
      this.input.ITEM_ID_BARCODE = '';
    }else{
    if ((this.input.ORDER_TYPE == 'ONLINE' || this.input.ORDER_TYPE == 'OFFLINE' || this.input.ORDER_TYPE == 'CF_ORDER')) {

      this.dataService.matchItemInCon_ug(this.input).subscribe(res => {
        //console.log(res);
        var data: any = res

        if (data.status === 'error') {
          console.log(data)
          this.playAudioError();
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
              ' ใน SHIPMENT_ID: ' + '<font color="blue">' + this.input.shipment_id + '</font>' + ' นี้',
            showConfirmButton: true,
            backdrop: false,
            confirmButtonText: 'ตกลง',
          });
          this.input.ITEM_ID_BARCODE = ''
        } else if (data.status === 'success') {
          this.res_matchItemInCon = data.data[0];
          if(this.res_matchItemInCon.ORDER_TYPE == "CANCEL"){
            this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'รายการนี้ถูกยกเลิก',
              html : 'นำใบงานติดไปกับสินค้าเพื่อทำรับคืน',
              showConfirmButton: false,
              timer: 3500
            });
            this.input.ITEM_ID_BARCODE = ''
          }else{
            this.input.ITEM_ID = this.res_matchItemInCon.ITEM_ID;
            this.input.QTY_REQUESTED = this.res_matchItemInCon.QTY_REQUESTED;
            this.input.QTY_PICK = this.res_matchItemInCon.QTY_PICK;
            this.updateConQtyCheck();
          }

        }

      })
    } else if (this.input.ORDER_TYPE == 'SORTER') {

      this.dataService.matchItemInConSorter(this.input).subscribe(res => {
        //console.log(res);
        var data: any = res

        if (data.status === 'error') {
          console.log(data)
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

          this.input.ITEM_ID = this.res_matchItemInCon.ITEM_ID;
          this.input.QTY_REQUESTED = this.res_matchItemInCon.QTY_REQUESTED;
          this.input.QTY_PICK = this.res_matchItemInCon.QTY_PICK;
          this.updateConQtyCheck();
        }

        //  //console.log(this.qtyFall);
      })
    }
  }

  }

  updateConQtyCheck() {
    //console.log("UPDATE");
    //const user = JSON.parse(localStorage.getItem('currentUser')||'');
    //this.input.USER_CHECK = user.WORKER_ID;
    // this.input.TABLE_CHECK = this.input.USER_CHECK
    // //console.log(this.input.USER_CHECK,this.input.TABLE_CHECK)
    // ตรวจ ว่า barcode_item นี้ qty_check มันถูกหรือยัง
    // ถ้าสแกนอันที่ถูกอยู่แล้ว ถามเขาว่า ต้องการเพิ่มข้อมูล item... อีก ....ชิ้น ใช่หรือไม่
    // ถ้าสแกนอันที่ผิด ซึ่งตรงกับที่เขากดปุ่มมา ก็ทำงาน อัพเดทเพิ่มตามปกติ

    if (this.input.ORDER_TYPE == 'ONLINE' || this.input.ORDER_TYPE == 'OFFLINE' || this.input.ORDER_TYPE == 'CF_ORDER') {
      this.dataService.checkEqualCon(this.input).subscribe(res => {
        var data: any = res
        if (data.status === 'error') {
          //console.log(data);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
          this.input.ITEM_ID_BARCODE = ''
        } else if (data.status === 'success') {
          this.res_QTY_equal = data.data[0];
          this.input.check_QTY_PICK = data.data[0].QTY_PICK
console.log(this.input.check_QTY_PICK,this.res_QTY_equal,this.Status_Print_Track)
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
            if(this.Status_Print_Track == 'N'){
              this.btn.Box = true;
              
            }else{
              this.btn.Box = false;
              console.log('ปิดกล่อง')
            }
            //this.btn.Box = false
            this.btn.CFOrder = true;
            this.dataService.BOX_CONTROL_DETAIL(this.input).subscribe(res => {
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
                this.dataService.updateConQtyCheck(this.input).subscribe(res => {
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
                    //console.log('OK')
                    this.playAudioOK();
                    this.summaryConCheck()

                    this.input.ITEM_ID_BARCODE = ''
                  }
                })
              }
            })
          }
        }
      })

    } else {
      this.dataService.checkEqualConSorter(this.input).subscribe(res => {
        var data: any = res
        //console.log(res)
        if (data.status === 'error') {
          //console.log(data);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
          this.input.ITEM_ID_BARCODE = ''
        } else if (data.status === 'success') {
          this.res_QTY_equal = data.data[0];

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
            this.btn.Box = true;
              this.btn.Re = true;
         
           

            this.dataService.updateConQtyCheck_SORTER(this.input).subscribe(res => {
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
                //console.log('OK')
                this.playAudioOK();
                this.summaryConCheck()

                this.input.ITEM_ID_BARCODE = ''
              }
            })
          }
        }
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

  tracking_box() {
    this.isLoading = true;
    this.box.btn = false
    let array = this.vasFormArray;
    for (let i = 0; i < 9; i++) {
      array[array.length] = ''
      this.input.VAS_NAME_01 = array[0]
      this.input.VAS_NAME_02 = array[1]
      this.input.VAS_NAME_03 = array[2]
      this.input.VAS_NAME_04 = array[3]
      this.input.VAS_NAME_05 = array[4]
      this.input.VAS_NAME_06 = array[5]
      this.input.VAS_NAME_07 = array[6]
      this.input.VAS_NAME_08 = array[7]
      this.input.VAS_NAME_09 = array[8]
    }
    ////console.log(this.input)
    if(this.input.ORDER_TYPE == 'ONLINE'){
     this.dataService.UpdateCheckdate(this.input).subscribe(res => {
      var data: any = res
      console.log(data);
    })
    }
//console.log(this.input.TABLE_CHECK)
    this.busy = this.dataService.tracking_running(this.input).subscribe(res => {
      var data: any = res
      //console.log('1',data);
      if (data.status === 'error') {
        console.log(data);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
          html:data.member.originalError.info.message,
          showConfirmButton: false,
          timer: 2500
        });
      } else if (data.status === 'success') {
        var a = Array();
        let array = {
          REF_INDEX: data.data[0].REF_INDEX,
          QTY: data.data[0].QTY,
          PO_NO: data.data[0].PO_NO,
          SELLER_NO: data.data[0].SELLER_NO,
          BOX_NO_ORDER: data.data[0].BOX_NO_ORDER,
          SHIPPING_NAME: this.input.SHIPPING_NAME,
          SHIPMENT_ID: this.input.shipment_id,
          TABLE_CHECK: this.input.TABLE_CHECK,
          BOX_SIZE: this.input.BOX_SIZE,
          TCHANNEL: this.input.TCHANNEL,
          COMPANY : this.input.COMPANY,
          ORDER_DATE : this.input.ORDER_DATE

        }
        a.push(array)
        this.dataprint = a
        //console.log(this.dataprint)
        jQuery(this.myModalBOX.nativeElement).modal('hide');
        this.pagePrint = false
        this.pagePrintTrack = false;
        this.pagePrintTrackAll = true;
        this.isLoading = false;
      

        if (this.input.OnclickCoverSheet == true) {
          this.coverSheet();
        } else {
          this.pagePrintCoverSheet = true;
        }

      }
    })

  }

  async printTracking() {
    await window.print();
    await new Promise(f => setTimeout(f, 1000));
    this.scanCon();
  }

  
  async Newscan() {
    await new Promise(f => setTimeout(f, 2000));
    this.scanCon();
  }

  ReprintTracking(i:any){


    this.busy = this.dataService.ReprintTracking(this.trackall[i]).subscribe(res => {
      var data: any = res
      //console.log(data);
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
          REF_INDEX: data.data[0].REF_INDEX,
          QTY: data.data[0].QTY,
          PO_NO: data.data[0].PO_NO,
          SELLER_NO: data.data[0].SELLER_NO,
          BOX_NO_ORDER: data.data[0].BOX_NO_ORDER,
          SHIPPING_NAME: this.input.SHIPPING_NAME,
          SHIPMENT_ID: this.input.shipment_id,
          TABLE_CHECK: data.data[0].TABLE_CHECK,
          BOX_SIZE: data.data[0].BOX_SIZE,
          TCHANNEL: this.input.TCHANNEL,
          MaxBox_NO : this.input.MaxBox_NO,
          COMPANY : this.input.COMPANY,
          ORDER_DATE : this.input.ORDER_DATE
        }
        a.push(array)
        this.dataprint = a
        //console.log(this.dataprint)
     
        this.pagePrint = false
        this.pagePrintTrack = false;
        this.pagePrintTrackAll = true;
        this.pagePrintCoverSheet = true;

      

      }
    })

  }

  ReprintTrackingALL(){

    this.busy = this.dataService.ReprintTrackingAll(this.input).subscribe(res => {
      var data: any = res
      //console.log(data);
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
        console.log(data.data.length)
        for (var i = 0;i < data.data.length; i++) {
          let array = {
            REF_INDEX: data.data[i].REF_INDEX,
            QTY: data.data[i].QTY,
            PO_NO: data.data[i].PO_NO,
            SELLER_NO: data.data[i].SELLER_NO,
            BOX_NO_ORDER: data.data[i].BOX_NO_ORDER,
            SHIPPING_NAME: this.input.SHIPPING_NAME,
            SHIPMENT_ID: this.input.shipment_id,
            TABLE_CHECK: data.data[i].TABLE_CHECK,
            BOX_SIZE: data.data[i].BOX_SIZE,
            TCHANNEL: this.input.TCHANNEL,
            MaxBox_NO : this.input.MaxBox_NO,
            COMPANY : this.input.COMPANY,
            ORDER_DATE : this.input.ORDER_DATE

          }
          a.push(array)
        }
        this.dataprint = a
        console.log(this.dataprint)
     
        this.pagePrint = false
        this.pagePrintTrackAll = false;
        this.pagePrintTrack = true;
        this.pagePrintCoverSheet = true;

        setTimeout(() => { this.printTracking(); }, 500)  
      

      }
    })

  }

  Excel(){
    
  }

  backScanitem() {
    this.pagePrint = true;
    this.pagePrintTrack = true;
    this.pagePrintTrackAll = true;
    this.pagePrintCoverSheet = true;
    this.input.OnclickCoverSheet = true;
    this.loadTracking();
    this.btn.Box = true;
    
    //console.log('ปิด re')
    
    this.busy = this.dataService.tracksum_qty(this.input).subscribe(res => {
      var data: any = res
      this.input.tracksum_qty = data.data[0].TRACKSUM_QTY
      if (this.input.tracksum_qty == null){
        this.btn.Re = true;
      }
    })

    
    this.dataService.CheckCon_Orderconfirm(this.input).subscribe(res => {
      var data: any = res

      if (this.input.ORDER_TYPE == 'CF_ORDER') {
        this.input.STATUS_DATA = data.data[0].STATUS_DATA
        if (this.input.STATUS_DATA == 'N' && this.btn.Box == true) {
          this.btn.CFOrder = false;
        } else if (this.input.STATUS_DATA == 'N' && this.btn.Box == false) {
          this.btn.CFOrder = true;
        } else if (this.input.STATUS_DATA == 'S') {

          this.btn.CFOrder = true;
          this.btn.CoverSheet = false;
          this.btn.Printbill = false;
        }
      }
    })



  }

  coverSheet() { //// ใบปะกล่อง
    //console.log(this.input)
    this.input.OnclickCoverSheet = true;
    this.loadTracking();
    //console.log(this.input.MaxBox_NO)
    this.busy = this.dataService.tracksum_qty(this.input).subscribe(res => {
      var data: any = res;
      //console.log(data.data[0].TRACKSUM_QTY)
      if (data.data[0].TRACKSUM_QTY > '0') {
        Swal.fire({
          title: 'มีสินค้าที่ยังไม่ได้ปิดกล่อง',
          html: 'จำนวน: ' + '<font color="red">' + data.data[0].TRACKSUM_QTY + '</font>' + 'ชิ้น',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          backdrop: false,
          confirmButtonText: 'ปิดกล่อง',
          cancelButtonText: 'ยกเลิก'
        }).then((result) => {
          if (result.value) {
            this.input.BOX_SIZE = ''
            jQuery(this.myModalBOX.nativeElement).modal('show');

            this.interval = setInterval(() => this.inputbox.nativeElement.focus(), 500);
            //this.inputbox.nativeElement.focus()
            //this.interval = setInterval(() => this.inputItem.nativeElement.focus(), 100000000);

            this.check_size();
          }
        })

      } else {

        this.isLoading = true; 

        this.dataService.updateCoverSheet(this.input).subscribe(res => {
          var data: any = res
          if (data.status === 'error') {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
              showConfirmButton: false,
              timer: 2500
            });
          }
        });
        var a = Array();
        for (var i = 1; i <= this.input.MaxBox_NO; i++) {
          let array = {
            shipment_id: this.input.shipment_id,
            SELLER_NO: this.input.SELLER_NO,
            BILL_N8_BLH: this.input.BILL_N8_BLH,
            BILL_NO: this.input.BILL_NO,
            STORE_ADDRESS: this.input.STORE_ADDRESS,
            CORNER_ID_BLH: this.input.CORNER_ID_BLH,
            BILL_DATE: this.input.BILL_DATE,
            SITE_ID_BLH: this.input.SITE_ID_BLH,
            BATCH_CODE: this.input.BATCH_CODE,
            TRANSPORT_ID: this.input.TRANSPORT_ID,
            TRANSPORT_NAME: this.input.TRANSPORT_NAME,
            BRAND: this.input.BRAND,
            BRAND_NAME: this.input.BRAND_NAME,
            SHIPPING_NAME: this.input.SHIPPING_NAME,
            TCHANNEL: this.input.TCHANNEL,
            MESSAGE_1: this.input.MESSAGE_1,
            MESSAGE_2: this.input.MESSAGE_2,
            MESSAGE_3: this.input.MESSAGE_3

          }
          a.push(array)
        }
        this.dataprintCoverSheet = a
        //console.log(this.dataprintCoverSheet)
         this.PRINT_ITEM_LACK();

        this.isLoading = false; 
      }

    })



  }

  PRINT_ITEM_LACK() {
    //console.log('OFFLINE');
    this.dataService.summary_ITEM_LACK(this.input).subscribe(res => {
      //console.log(res.data[0].QTY_CHECK);
      //console.log(res);
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

        var a = Array();
        for (var i = 1; i <= 3; i++) { ////// ก๊อปปี้ 3 ชุด
          let array = {
            TO_DAY_SHOW: this.dataprint_LIST_ITEM[0].TO_DAY,
            BILL_N8_BLH: this.input.BILL_N8_BLH,
            BILL_DATE: this.input.BILL_DATE,
            SELLER_NO: this.input.SELLER_NO,
            CORNER_ID_BLH: this.input.CORNER_ID_BLH,
            SHIPPING_NAME: this.input.SHIPPING_NAME,
          }
          a.push(array)
        }
        this.dataLACK_H = a

        this.pagePrintCoverSheet = false;
        this.pagePrintShear = false;
        this.pagePrint = false;
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
