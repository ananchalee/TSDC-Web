import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-outbound-scantracking',
  templateUrl: './outbound-scantracking.component.html',
  styleUrls: ['./outbound-scantracking.component.scss']
})
export class OutboundScantrackingComponent implements OnInit {
  @ViewChild('inputTrack') inputTrack!: ElementRef;
  @ViewChild('inputPallet') inputPallet!: ElementRef;
  @ViewChild('inputPin') inputPin!: ElementRef; 

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  dtOptions_outbound: DataTables.Settings = {};
  dtTrigger_outbound: Subject<any> = new Subject<any>();

  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;

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
  
  public pagePrint = true;
  public pagePrintTrack = true;
  public scanTrackPage = false;
  public scanBoxPage = true;

  public box: any = {}
  public CheckTrack: any

  tracking_page = false;

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Outbound-Sacn-Tracking',
      active: 'Outbound',
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

    this.LOAD_USERTABLECHECK();
    this.getserverdate();
  }

  ngAfterViewInit(): void {
    this.dtTrigger_outbound.next();
  }

  ngOnDestroy(): void {
    this.dtTrigger_outbound.unsubscribe();
  }

  LOAD_USERTABLECHECK() {

    const user = JSON.parse(localStorage.getItem('currentUser') || '');
    this.input.USER_CHECK = user.WORKER_ID;
    this.input.TABLE_CHECK = this.input.USER_CHECK
    this.busy = this.dataService.LOAD_USERTABLECHECK(this.input).subscribe(res => {
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

        this.Get_TRANSPORTATION_NAME();
        //console.log(this.input);
        setTimeout(() => { this.inputPallet.nativeElement.focus(); }, 1000);
      }else{
        setTimeout(() => { this.inputPin.nativeElement.focus(); }, 1000);
      }

    })
  }

  Get_TRANSPORTATION_NAME(){
    this.dataService.Get_TRANSPORTATION_NAME().subscribe(res => {
      if (this.user.status === 'error') {
        console.log(res)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด ในการ Get_TRANSPORTATION_NAME !',
          text: 'Get_TRANSPORTATION_NAME',
          showConfirmButton: false,
          timer: 2500
        });
      }else if (this.user.status === 'NULL') {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล TRANSPORTATION_NAME  !',
          text: 'Get_TRANSPORTATION_NAME',
          showConfirmButton: false,
          timer: 2500
        });
      }else{
        this.transport = res;
      }
    })
  }

  // Function to get the transport name based on the input string
 getTransportName(input : string) {
  // Loop through the data to find a match
  for (let i = 0; i < this.transport.data.length; i++) {
    // Extract the first `TRANSPORT_LEN` characters from the input
    const transportCodePrefix = input.substring(0, this.transport.data[i].TRANSPORT_LEN);
    // Check if the transport code prefix matches
    if (transportCodePrefix.toUpperCase() == this.transport.data[i].TRANSPORT_CODE.toUpperCase()) {
      return this.transport.data[i].TRANSPORT_NAME;
      
    }
  }
  return null;  // Return null if no match is found
}


  tablecheck_user() {
    /*  const user = JSON.parse(localStorage.getItem('currentUser') || '');
     this.input.USER_CHECK = user.WORKER_ID;
     this.input.TABLE_CHECK = this.input.USER_CHECK */

    this.dataService.insert_user_tablecheck(this.input).subscribe(res => {
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
        this.input.USER_NAME = this.user.data[0].USER_NAME
        this.input.WORKER_NAME = this.user.data[0].WORKER_NAME
        this.input.WORKER_SURNAME = this.user.data[0].WORKER_SURNAME
        this.input.WORKER_COMPANY = this.user.data[0].WORKER_COMPANY
        this.input.PIN_CODE = this.user.data[0].PIN_CODE
        ////console.log( this.input);
        //setTimeout(() => { this.inputPallet.nativeElement.focus(); }, 1000);
      }

    })
  }

  getserverdate(){
     
    this.dataService.getServerDate().subscribe(resp => {
      if (resp && resp.date) {
        const currentDate = new Date(resp.date);//เวลาserver
        this.input.currentDateString = currentDate.toISOString().split('T')[0];
      }else{
        const currentDate = new Date();//เวลาเครื่อง
        this.input.currentDateString = currentDate.toISOString().split('T')[0];

      }
    });
  }

  model_1(){
    this.tracking_page = false;
    this.input.TRACK_CODE = '';
  }
    
  model_2(){
    this.tracking_page = true;
    this.input.TRACK_CODE = '';
  }
    

  interface(){
    this.dataService.interface_Tracking_confirm_outbound(this.input).subscribe(res => {
      this.res_datas = res;
      if (this.res_datas.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'โอนย้ายข้อมูลไม่สำเร็จ ',
          showConfirmButton: false,
          timer: 2500
        });
      }else{
        Swal.fire({
          icon: 'success',
          title: 'โอนย้ายข้อมูลสำเร็จ ',
          showConfirmButton: false,
          timer: 2000
        });
      }
    });
  }

  check_Pallet(){
    if (!this.input.Pallet_NO || this.input.Pallet_NO == ' '){
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาใส่เลขพาเลท!',
        showConfirmButton: false,
        timer: 2000
      });
      this.input.Pallet_NO = '';
      setTimeout(() => { this.inputPallet.nativeElement.focus(); }, 1000);
    }else{
      
      this.busy =  this.dataService.check_Pallet_confirm_outbound(this.input).subscribe(res => {
      this.res_datas = res;
      if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
      } 
      // else if (res.status === 'success') {
      //   swal({
      //     type: 'warning',
      //     title: 'เลขที่ Pallet'+this.input.Pallet_NO + 'ถูกรับสินค้าแล้ว',
      //     showConfirmButton: false,
      //     timer: 2500
      //   });
      //   this.playAudioError();
      
      // }
      else if (this.res_datas.status === 'NULL'){
        this.inputTrack.nativeElement.focus();
        this.showdataPage = false;
      }else{
        this.showdataPage = true;
        this.data = this.res_datas.data
        this.input.LastTrack = this.data[0].BILL_NO
        this.input.count_qty = this.data[0].count_qty
        this.inputTrack.nativeElement.focus();

        if (this.dtElement.dtInstance) {
          this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
            dtInstance.destroy();
            this.dtTrigger_outbound.next();
          });
        } else {
          this.dtTrigger_outbound.next();
        }
  
      }
      })

    } 
  }

  check_Tracking(){ 
    if (!this.input.Pallet_NO || this.input.Pallet_NO == ' '){
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาใส่เลขพาเลท!',
        showConfirmButton: false,
        timer: 2000
      });
      this.input.Pallet_NO = '';
      setTimeout(() => { this.inputPallet.nativeElement.focus(); }, 1000);
  }else{

    if(this.data.length == 0){

      this.dataService.check_Pallet_confirm_outbound(this.input).subscribe(res => {
      this.res_datas = res;
      if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
        console.log(res);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
      } 
      else{

        var transport_name =  this.getTransportName(this.input.TRACK_CODE)

        if(transport_name != null){
          this.input.SHIP_PROVIDER_OOD = transport_name
          this.input.PIN_ID = this.input.USER_NAME
          this.input.INTERNAL_ID = this.input.PIN_CODE
          
          this.dataService.check_Tracking_confirm_outbound(this.input).subscribe(res=>{
            this.res_datas = res;
            if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
              console.log(res);
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.input.TRACK_CODE = ''
            }else if (this.res_datas.status === 'warning_PO') {
              Swal.fire({
                icon: 'warning',
                title: 'Tracking'+ this.input.TRACK_CODE + ' ตรงกับเลข PO',
                showConfirmButton: false,
                timer: 3000
              });
              this.playAudioError();
              this.input.TRACK_CODE = '';
              
            }else if (this.res_datas.status === 'null') {
              // this.dataService.check_ordercancel_online(this.input).subscribe(res=>{
              //   this.res_datas = res;
              //   if (this.res_datas.status === 'error'){
              //     Swal.fire({
              //       icon: 'error',
              //       title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
              //       showConfirmButton: false,
              //       timer: 2500
              //     });
              //     this.playAudioError();
              //     this.input.TRACK_CODE = ''
              //   }else if (this.res_datas.status === 'success'){
              //     Swal.fire({
              //       icon: 'error',
              //       title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
              //       showConfirmButton: false,
              //       timer: 2500
              //     });
              //     this.playAudioError();
              //     this.input.TRACK_CODE = ''
              //   }else{
  
              //   }
              // })
              
              this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                this.res_datas = res;
                if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.playAudioError();
                  this.input.TRACK_CODE = ''
                } else if (this.res_datas.status === 'null') {
                  Swal.fire({
                    icon: 'warning',
                    title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.playAudioError();
                  this.input.TRACK_CODE = ''
                  
                }else if (this.res_datas.status === 'success') {
                  this.input.TRACK_CODE = ''
                  this.data = this.res_datas.data
                  this.showdataPage = true;

                  if (this.dtElement.dtInstance) {
                    this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                      dtInstance.destroy();
                      this.dtTrigger_outbound.next();
                    });
                  } else {
                    this.dtTrigger_outbound.next();
                  }

                  this.input.LastTrack = this.data[0].BILL_NO
                  this.input.count_qty = this.data[0].count_qty
                  
                  this.playAudioOK();
                  setTimeout(() => { this.inputTrack.nativeElement.focus(); }, 1000);
                }
        
              })
        
            }else if (this.res_datas.data[0].STATUS_DELIVERY === 'S' ) {
              Swal.fire({
                icon: 'warning',
                title: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
                html: 'ขนส่งรับสินค้าแล้ว' +  this.res_datas.data[0].delivery_no ,
                showConfirmButton: true,
                timer: 5000
              });
              this.input.TRACK_CODE = ''
              this.playAudioError();
            }else if (this.res_datas.status === 'warning_Track' ) { 
              Swal.fire({
                icon: 'warning',
                title:'ต้องการส่งสินค้าอีกครั้ง ? ' ,
                html: 'Tracking '+ this.input.TRACK_CODE  +'แสกนรับสินค้าพาเลท' +this.res_datas.data[0].PALLET_NO + ' '+ 'วันที่'  +  this.res_datas.data[0].scandate,
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
              confirmButtonText: 'ยืนยัน',
              cancelButtonText: 'ยกเลิก'
            }).then((result) => {
              if (result.value) {
                this.dataService.DeleteAndBackup_Track_Outbound(this.input).subscribe(res=>{
                  this.res_datas = res;
                  if (this.res_datas.status === 'error') {
                    console.log(res)
                    Swal.fire({
                      icon: 'error',
                      title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                      showConfirmButton: false,
                      timer: 2500
                    });
                    this.playAudioError();
                    this.input.TRACK_CODE = ''
                  } else if (this.res_datas.status === 'success') {

                    this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                      this.res_datas = res;
                      if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                        console.log(res)
                        Swal.fire({
                          icon: 'error',
                          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                          showConfirmButton: false,
                          timer: 2500
                        });
                        this.playAudioError();
                        this.input.TRACK_CODE = ''
                      } else if (this.res_datas.status === 'null') {
                        Swal.fire({
                          icon: 'warning',
                          title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                          showConfirmButton: false,
                          timer: 2500
                        });
                        this.playAudioError();
                        this.input.TRACK_CODE = ''
                        
                      }else if (this.res_datas.status === 'success') {
                        this.input.TRACK_CODE = ''
                        this.data = this.res_datas.data
                        this.showdataPage = true;
                        this.input.LastTrack = this.data[0].BILL_NO
                        this.input.count_qty = this.data[0].count_qty
                        
                        if (this.dtElement.dtInstance) {
                          this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                            dtInstance.destroy();
                            this.dtTrigger_outbound.next();
                          });
                        } else {
                          this.dtTrigger_outbound.next();
                        }
                        
                        this.playAudioOK();
                        setTimeout(() => { this.inputTrack.nativeElement.focus(); }, 1000);
                      }
              
                    })
                  }
          
                })
              }
            });
              this.playAudioError();
            
            }
          })


        }else if (transport_name == null){
          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบรายชื่อขนส่ง' ,
            html: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
            showConfirmButton: true,
            timer: 5000
          });
          this.input.TRACK_CODE = ''
          this.playAudioError();
        }
       
      }
    }) 

  }else{

    var transport_name =  this.getTransportName(this.input.TRACK_CODE)

    if(transport_name != null){
      this.input.SHIP_PROVIDER_OOD = transport_name
      this.input.PIN_ID = this.input.USER_NAME
      this.input.INTERNAL_ID = this.input.PIN_CODE
      
      this.dataService.check_Tracking_confirm_outbound(this.input).subscribe(res=>{
        this.res_datas = res;
        if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
          console.log(res);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.input.TRACK_CODE = ''
        }else if (this.res_datas.status === 'warning_PO') {
          Swal.fire({
            icon: 'warning',
            title: 'Tracking'+ this.input.TRACK_CODE + ' ตรงกับเลข PO',
            showConfirmButton: false,
            timer: 3000
          });
          this.playAudioError();
          this.input.TRACK_CODE = '';
          
        }else if (this.res_datas.status === 'null') {
          // this.dataService.check_ordercancel_online(this.input).subscribe(res=>{
          //   this.res_datas = res;
          //   if (this.res_datas.status === 'error'){
          //     Swal.fire({
          //       icon: 'error',
          //       title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
          //       showConfirmButton: false,
          //       timer: 2500
          //     });
          //     this.playAudioError();
          //     this.input.TRACK_CODE = ''
          //   }else if (this.res_datas.status === 'success'){
          //     Swal.fire({
          //       icon: 'error',
          //       title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
          //       showConfirmButton: false,
          //       timer: 2500
          //     });
          //     this.playAudioError();
          //     this.input.TRACK_CODE = ''
          //   }else{

          //   }
          // })
          
          this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
            this.res_datas = res;
            if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.input.TRACK_CODE = ''
            } else if (this.res_datas.status === 'null') {
              Swal.fire({
                icon: 'warning',
                title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.input.TRACK_CODE = ''
              
            }else if (this.res_datas.status === 'success') {
              this.input.TRACK_CODE = ''
              this.data = this.res_datas.data
              this.showdataPage = true;

              if (this.dtElement.dtInstance) {
                this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                  dtInstance.destroy();
                  this.dtTrigger_outbound.next();
                });
              } else {
                this.dtTrigger_outbound.next();
              }

              this.input.LastTrack = this.data[0].BILL_NO
              this.input.count_qty = this.data[0].count_qty
              
              this.playAudioOK();
              setTimeout(() => { this.inputTrack.nativeElement.focus(); }, 1000);
            }
    
          })
    
        }else if (this.res_datas.data[0].STATUS_DELIVERY === 'S' ) {
          Swal.fire({
            icon: 'warning',
            title: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
            html: 'ขนส่งรับสินค้าแล้ว' +  this.res_datas.data[0].delivery_no ,
            showConfirmButton: true,
            timer: 5000
          });
          this.input.TRACK_CODE = ''
          this.playAudioError();
        }else if (this.res_datas.status === 'warning_Track' ) { 
          Swal.fire({
            icon: 'warning',
            title:'ต้องการส่งสินค้าอีกครั้ง ? ' ,
            html: 'Tracking '+ this.input.TRACK_CODE  +'แสกนรับสินค้าพาเลท' +this.res_datas.data[0].PALLET_NO + ' '+ 'วันที่'  +  this.res_datas.data[0].scandate,
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
        }).then((result) => {
          if (result.value) {
            this.dataService.DeleteAndBackup_Track_Outbound(this.input).subscribe(res=>{
              this.res_datas = res;
              if (this.res_datas.status === 'error') {
                console.log(res)
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.playAudioError();
                this.input.TRACK_CODE = ''
              } else if (this.res_datas.status === 'success') {

                this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                  this.res_datas = res;
                  if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                    console.log(res)
                    Swal.fire({
                      icon: 'error',
                      title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                      showConfirmButton: false,
                      timer: 2500
                    });
                    this.playAudioError();
                    this.input.TRACK_CODE = ''
                  } else if (this.res_datas.status === 'null') {
                    Swal.fire({
                      icon: 'warning',
                      title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                      showConfirmButton: false,
                      timer: 2500
                    });
                    this.playAudioError();
                    this.input.TRACK_CODE = ''
                    
                  }else if (this.res_datas.status === 'success') {
                    this.input.TRACK_CODE = ''
                    this.data = this.res_datas.data
                    this.showdataPage = true;
                    this.input.LastTrack = this.data[0].BILL_NO
                    this.input.count_qty = this.data[0].count_qty
                    
                    if (this.dtElement.dtInstance) {
                      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                        dtInstance.destroy();
                        this.dtTrigger_outbound.next();
                      });
                    } else {
                      this.dtTrigger_outbound.next();
                    }
                    
                    this.playAudioOK();
                    setTimeout(() => { this.inputTrack.nativeElement.focus(); }, 1000);
                  }
          
                })
              }
      
            })
          }
        });
          this.playAudioError();
        
        }
      })
    }else if (transport_name == null){
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบรายชื่อขนส่ง' ,
        html: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
        showConfirmButton: true,
        timer: 5000
      });
      this.input.TRACK_CODE = ''
      this.playAudioError();
    }


    }




  }
  }

  check_Tracking2(){ 
    if (!this.input.Pallet_NO || this.input.Pallet_NO == ' '){
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาใส่เลขพาเลท!',
        showConfirmButton: false,
        timer: 2000
      });
      this.input.Pallet_NO = '';
      this.inputPallet.nativeElement.focus();
    }else{
  
      if(this.data.length == 0){
        this.dataService.check_Pallet_confirm_outbound(this.input).subscribe(res => {
          this.res_datas = res;
        if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
          console.log(res);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
        } 
        else{
          
          var transport_name =  this.getTransportName(this.input.TRACK_CODE)

          if(transport_name != null){
            this.input.SHIP_PROVIDER_OOD = transport_name
            this.input.PIN_ID = this.input.USER_NAME
            this.input.INTERNAL_ID = this.input.PIN_CODE

            this.dataService.check_Tracking_confirm_outbound(this.input).subscribe(res=>{
              this.res_datas = res;
              if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
                Swal.fire({
                  icon: 'error',
                  title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.playAudioError();
                this.input.TRACK_CODE = ''
              }else if (this.res_datas.status === 'warning_PO') {
                
                Swal.fire({
                  icon: 'warning',
                  title: 'Tracking'+ this.input.TRACK_CODE + ' ตรงกับเลข PO',
                  showConfirmButton: false,
                  timer: 3000
                });
                this.playAudioError();
                this.input.TRACK_CODE = '';
                
              }else if (this.res_datas.status === 'null') {
                
                
                this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                  this.res_datas = res;
                  if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                    Swal.fire({
                      icon: 'error',
                      title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                      showConfirmButton: false,
                      timer: 2500
                    });
                    this.playAudioError();
                    this.input.TRACK_CODE = ''
                  } else if (this.res_datas.status === 'null') {
                    Swal.fire({
                      icon: 'warning',
                      title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                      showConfirmButton: false,
                      timer: 2500
                    });
                    this.playAudioError();
                    this.input.TRACK_CODE = ''
                    
                  }else if (this.res_datas.status === 'success') {
                    this.input.TRACK_CODE = ''
                    this.data = this.res_datas.data
                    this.showdataPage = true;
                    this.input.LastTrack = this.res_datas.data[0].BILL_NO
                    this.input.count_qty = this.res_datas.data[0].count_qty
                    
                    if (this.dtElement.dtInstance) {
                      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                        dtInstance.destroy();
                        this.dtTrigger_outbound.next();
                      });
                    } else {
                      this.dtTrigger_outbound.next();
                    }

                    this.playAudioOK();
                      this.inputTrack.nativeElement.focus();
                  }
          
                })
          
              }else if (this.res_datas.data[0].STATUS_DELIVERY === 'S' ) {
                Swal.fire({
                  icon: 'warning',
                  title: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
                  html: 'ขนส่งรับสินค้าแล้ว' +  this.res_datas.data[0].delivery_no ,
                  showConfirmButton: true,
                  timer: 5000
                });
                this.input.TRACK_CODE = ''
                this.playAudioError();
              }else if (this.res_datas.status === 'warning_Track' ) { 

                Swal.fire({
                  icon: 'warning',
                  title:'ต้องการส่งสินค้าเพิ่ม ? ' ,
                  html: 'Tracking '+ this.input.TRACK_CODE  +'แสกนรับสินค้าพาเลท' +this.res_datas.data[0].PALLET_NO + ' '+ 'วันที่'  +  this.res_datas.data[0].scandate,
                  showCancelButton: true,
                  confirmButtonColor: 'btn btn-success',
                  cancelButtonColor: 'btn btn-danger',
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก'
              }).then((result) => {
                if (result.value) {

                  const specifiedDate = new Date(this.res_datas.data[0].scandate);
                  const specifiedDateString = specifiedDate.toISOString().split('T')[0];

                  const isSameDate = specifiedDateString ===  this.input.currentDateString;
                  const isSamePallet = this.res_datas.data[0].PALLET_NO == this.input.Pallet_NO;

                  if (isSameDate && isSamePallet) {
                    this.dataService.update_Tracking_confirm_outbound(this.input).subscribe(res=>{
                      this.res_datas = res;
                      if (this.res_datas.status === 'error') {
                        Swal.fire({
                          icon: 'error',
                          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                          showConfirmButton: false,
                          timer: 2500
                        });
                        this.playAudioError();
                        this.input.TRACK_CODE = ''
                      } else if (this.res_datas.status === 'success') {
    
                        this.input.TRACK_CODE = ''
                        this.data = this.res_datas.data
                        this.showdataPage = true;

                        if (this.dtElement.dtInstance) {
                          this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                            dtInstance.destroy();
                            this.dtTrigger_outbound.next();
                          });
                        } else {
                          this.dtTrigger_outbound.next();
                        }


                        this.input.LastTrack = this.res_datas.data[0].BILL_NO
                        this.input.count_qty = this.res_datas.data[0].count_qty
                        
                        this.playAudioOK();
                        this.inputTrack.nativeElement.focus();
                      }
                    })
                  } else {
                    this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                      this.res_datas = res;
                      if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                        Swal.fire({
                          icon: 'error',
                          title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                          showConfirmButton: false,
                          timer: 2500
                        });
                        this.playAudioError();
                        this.input.TRACK_CODE = ''
                      } else if (this.res_datas.status === 'null') {
                        Swal.fire({
                          icon: 'warning',
                          title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                          showConfirmButton: false,
                          timer: 2500
                        });
                        this.playAudioError();
                        this.input.TRACK_CODE = ''
                        
                      }else if (this.res_datas.status === 'success') {
                        this.input.TRACK_CODE = ''
                        this.data = this.res_datas.data
                    
                        this.showdataPage = true;
                        this.input.LastTrack = this.res_datas.data[0].BILL_NO
                        this.input.count_qty = this.res_datas.data[0].count_qty
                        
                        if (this.dtElement.dtInstance) {
                          this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                            dtInstance.destroy();
                            this.dtTrigger_outbound.next();
                          });
                        } else {
                          this.dtTrigger_outbound.next();
                        }

                        this.playAudioOK();
                          this.inputTrack.nativeElement.focus();
                      }
              
                    })

                  }
                }
              });
                this.playAudioError();
              
              }
            })
          }else if (transport_name == null){
            Swal.fire({
              icon: 'warning',
              title: 'ไม่พบรายชื่อขนส่ง' ,
              html: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
              showConfirmButton: true,
              timer: 5000
            });
            this.input.TRACK_CODE = ''
            this.playAudioError();
          }
            
        }
      }) 
      }else{
        var transport_name =  this.getTransportName(this.input.TRACK_CODE)

        if(transport_name != null){
          this.input.SHIP_PROVIDER_OOD = transport_name
          this.input.PIN_ID = this.input.USER_NAME
          this.input.INTERNAL_ID = this.input.PIN_CODE

          this.dataService.check_Tracking_confirm_outbound(this.input).subscribe(res=>{
            this.res_datas = res;
            if (this.res_datas.status === 'error'||this.res_datas.status === 'error2') {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.input.TRACK_CODE = ''
            }else if (this.res_datas.status === 'warning_PO') {
              
              Swal.fire({
                icon: 'warning',
                title: 'Tracking'+ this.input.TRACK_CODE + ' ตรงกับเลข PO',
                showConfirmButton: false,
                timer: 3000
              });
              this.playAudioError();
              this.input.TRACK_CODE = '';
              
            }else if (this.res_datas.status === 'null') {
              
              
              this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                this.res_datas = res;
                if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.playAudioError();
                  this.input.TRACK_CODE = ''
                } else if (this.res_datas.status === 'null') {
                  Swal.fire({
                    icon: 'warning',
                    title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.playAudioError();
                  this.input.TRACK_CODE = ''
                  
                }else if (this.res_datas.status === 'success') {
                  this.input.TRACK_CODE = ''
                  this.data = this.res_datas.data
                  this.showdataPage = true;
                  this.input.LastTrack = this.res_datas.data[0].BILL_NO
                  this.input.count_qty = this.res_datas.data[0].count_qty
                  
                  if (this.dtElement.dtInstance) {
                    this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                      dtInstance.destroy();
                      this.dtTrigger_outbound.next();
                    });
                  } else {
                    this.dtTrigger_outbound.next();
                  }

                  this.playAudioOK();
                    this.inputTrack.nativeElement.focus();
                }
        
              })
        
            }else if (this.res_datas.data[0].STATUS_DELIVERY === 'S' ) {
              Swal.fire({
                icon: 'warning',
                title: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
                html: 'ขนส่งรับสินค้าแล้ว' +  this.res_datas.data[0].delivery_no ,
                showConfirmButton: true,
                timer: 5000
              });
              this.input.TRACK_CODE = ''
              this.playAudioError();
            }else if (this.res_datas.status === 'warning_Track' ) { 

              Swal.fire({
                icon: 'warning',
                title:'ต้องการส่งสินค้าเพิ่ม ? ' ,
                html: 'Tracking '+ this.input.TRACK_CODE  +'แสกนรับสินค้าพาเลท' +this.res_datas.data[0].PALLET_NO + ' '+ 'วันที่'  +  this.res_datas.data[0].scandate,
                showCancelButton: true,
                confirmButtonColor: 'btn btn-success',
                cancelButtonColor: 'btn btn-danger',
              confirmButtonText: 'ยืนยัน',
              cancelButtonText: 'ยกเลิก'
            }).then((result) => {
              if (result.value) {

                const specifiedDate = new Date(this.res_datas.data[0].scandate);
                const specifiedDateString = specifiedDate.toISOString().split('T')[0];

                const isSameDate = specifiedDateString ===  this.input.currentDateString;
                const isSamePallet = this.res_datas.data[0].PALLET_NO == this.input.Pallet_NO;

                if (isSameDate && isSamePallet) {
                  this.dataService.update_Tracking_confirm_outbound(this.input).subscribe(res=>{
                    this.res_datas = res;
                    if (this.res_datas.status === 'error') {
                      Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                        showConfirmButton: false,
                        timer: 2500
                      });
                      this.playAudioError();
                      this.input.TRACK_CODE = ''
                    } else if (this.res_datas.status === 'success') {
  
                      this.input.TRACK_CODE = ''
                      this.data = this.res_datas.data
                      this.showdataPage = true;

                      if (this.dtElement.dtInstance) {
                        this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                          dtInstance.destroy();
                          this.dtTrigger_outbound.next();
                        });
                      } else {
                        this.dtTrigger_outbound.next();
                      }


                      this.input.LastTrack = this.res_datas.data[0].BILL_NO
                      this.input.count_qty = this.res_datas.data[0].count_qty
                      
                      this.playAudioOK();
                      this.inputTrack.nativeElement.focus();
                    }
                  })
                } else {
                  this.dataService.insertTracking_confirmOutbound(this.input).subscribe(res=>{
                    this.res_datas = res;
                    if (this.res_datas.status === 'error1'||this.res_datas.status === 'error') {
                      Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!,TSDC_CONFIRM_OUTBOUND',
                        showConfirmButton: false,
                        timer: 2500
                      });
                      this.playAudioError();
                      this.input.TRACK_CODE = ''
                    } else if (this.res_datas.status === 'null') {
                      Swal.fire({
                        icon: 'warning',
                        title: 'insert Tracking ไม่เข้า'+ this.input.TRACK_CODE,
                        showConfirmButton: false,
                        timer: 2500
                      });
                      this.playAudioError();
                      this.input.TRACK_CODE = ''
                      
                    }else if (this.res_datas.status === 'success') {
                      this.input.TRACK_CODE = ''
                      this.data = this.res_datas.data
                  
                      this.showdataPage = true;
                      this.input.LastTrack = this.res_datas.data[0].BILL_NO
                      this.input.count_qty = this.res_datas.data[0].count_qty
                      
                      if (this.dtElement.dtInstance) {
                        this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
                          dtInstance.destroy();
                          this.dtTrigger_outbound.next();
                        });
                      } else {
                        this.dtTrigger_outbound.next();
                      }

                      this.playAudioOK();
                        this.inputTrack.nativeElement.focus();
                    }
            
                  })

                }
              }
            });
              this.playAudioError();
            
            }
          })
        }else if (transport_name == null){
          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบรายชื่อขนส่ง' ,
            html: 'เลขที่ Tracking '+ this.input.TRACK_CODE ,
            showConfirmButton: true,
            timer: 5000
          });
          this.input.TRACK_CODE = ''
          this.playAudioError();
        }
      }
    }
  }
  


  delete(id: number) {
    Swal.fire({
      title: 'ต้องการ ลบ'+ this.data[id].BILL_NO +'ใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.value) {
        this.item_id.TRACK_CODE = this.data[id].BILL_NO;
        this.item_id.Pallet_NO = this.data[id].PALLET_NO;
        this.busy = this.dataService.deleteTracking_outbount(this.item_id).subscribe(res => {
        this.res_datas = res;
          if (this.res_datas.status === 'error') {
            console.log(res)
            Swal.fire({
              icon: 'error',
              title: 'มีข้อผิดพลาดในการลบ!',
              text: 'กรุณาตรวจติดต่อ ADMIN',
              showConfirmButton: false,
              timer: 2000
            });
            this.input.item = '';
          } else if (this.res_datas.status === 'success') {
            this.data = this.res_datas.data;
           this.showdataPage = true
           this.input.LastTrack = this.data[0].BILL_NO
           this.input.count_qty = this.data.length

           if (this.dtElement.dtInstance) {
            this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
              dtInstance.destroy();
              this.dtTrigger_outbound.next();
            });
          } else {
            this.dtTrigger_outbound.next();
          }

  
          } else if (this.res_datas.status === 'null') {
            this.showdataPage = false
  
          }
        })
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
    }else if(this.input.TABLE_CHECK == "CHOutb01" ){
      audio.src = "http://10.26.1.21/TSDC/assets/audio/OK3.mp3";
    }else if(this.input.TABLE_CHECK == "CHOutb02" ){
      audio.src = "http://10.26.1.21/TSDC/assets/audio/ok.mp3";
    }else if(this.input.TABLE_CHECK == "CHOutb01" ){
      audio.src = "http://10.26.1.21/TSDC/assets/audio/OK3.mp3";
    }else{
      audio.src = "http://10.26.1.21/TSDC/assets/audio/ok.mp3";
    }

    audio.load();
    audio.play();

  }

}


/* function startTime() {
  var today = new Date();
  var Datenow = today.toISOString().slice(0, 10);
  var h = today.getHours();
  var m = today.getMinutes();
  var s = today.getSeconds();
  m = checkTime(m);
  s = checkTime(s);
  document.getElementById("date")?.innerHTML = "เวลาพิมพ์" +" "+ Datenow + " " +  h + ":" + m + ":" + s ;
  //document.getElementById('date').innerHTML = "เวลาพิมพ์" +" "+ Datenow + " " +  h + ":" + m + ":" + s ;
  setTimeout(startTime, 500);
}

function checkTime(i) {
  if (i < 10) { i = "0" + i };
  return i;
} */