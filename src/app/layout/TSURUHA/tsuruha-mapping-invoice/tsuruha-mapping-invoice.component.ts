import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tsuruha-mapping-invoice',
  templateUrl: './tsuruha-mapping-invoice.component.html',
  styleUrls: ['./tsuruha-mapping-invoice.component.scss']
})
export class TsuruhaMapInvoiceComponent implements OnInit {
  @ViewChild('inputInv') inputInv!: ElementRef; 
  @ViewChild('inputOrder') inputOrder!: ElementRef; 
  @ViewChild('inputReturn') inputReturn! : ElementRef;

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

  CheckInvoice: any
  DatamapInvoice : any
  CheckORDER: any

  tracking_page = false;

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Tsuruha-MappingInvoice',
      active: 'Tsuruha',
    }
    page.push(array)
    this.pageactive = page;

    this.dtOptions_outbound = {
      pagingType: 'full_numbers',
      pageLength: 30,
      lengthMenu: [5, 10, 20,30],
      processing: true,

    };
    this.input.tab = "invoice"
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
  
    this.input.invdate = `${yyyy}-${mm}-${dd}`;
    this.input.voiddate = `${yyyy}-${mm}-${dd}`;

    this.focusInput();
  }

  isNullOrEmpty(value?: string | null): boolean {
    return !value || value.trim() === '';
  }

  focusInput() {
      if ((!this.input.orderno || this.input.orderno == '') && (this.input.tab == "invoice")) {
        setTimeout(() => {
          this.inputOrder.nativeElement.focus();
        },100);
        
      }
      else if ((!this.input.invno || this.input.invno == '') ) {
        setTimeout(() => {
        this.inputInv.nativeElement.focus();
        },100);
      }
      else if((!this.input.voidno || this.input.voidno == '') && (this.input.tab == "goodreturn")){
        setTimeout(() => {
          this.inputReturn.nativeElement.focus();
          },100);
      }
  }

  Activetab(tab:string){
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    if(tab == "invoice"){
      this.input = {};
      this.input.tab = "invoice"
      this.focusInput();
    }else{
      this.input = {};
      this.input.tab = "goodreturn"
      this.focusInput();
    }
  
    this.input.invdate = `${yyyy}-${mm}-${dd}`;
    this.input.voiddate = `${yyyy}-${mm}-${dd}`;

  }


  checkOrder(){
     if(this.isNullOrEmpty(this.input.orderno)){
     Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุ Order!',
        showConfirmButton: false,
        timer: 2500
      });
      this.playAudioError();
      this.input.orderno = ''
      setTimeout(() => {
        this.focusInput();
      }, 2200); 
    }else{
      this.dataService.tsuruha_check_order(this.input).subscribe(res => {
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
          this.input.orderno = ''
          this.focusInput();
        } else if (this.CheckORDER.status === 'null') {

          Swal.fire({
            icon: 'warning',
            title: 'ไม่พบ Order Number นี้',
            html:  '<font color="red">' + this.input.orderno + '</font>',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.input.orderno = ''
          this.focusInput();
        } else if (this.CheckORDER.status === 'success') {

          if(this.input.tab == "invoice" &&(this.CheckORDER.data[0].TSRH_INVNO != null && this.CheckORDER.data[0].TSRH_INVNO != '')){

            this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER
            this.input.TSRH_INVNO = this.CheckORDER.data[0].TSRH_INVNO
            this.input.CHANNEL = this.CheckORDER.data[0].CHANNEL
            this.input.TRACKING_NO = this.CheckORDER.data[0].TRACKING_NO
            this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_STATUS
            this.input.TSRH_VOIDNO = this.CheckORDER.data[0].TSRH_VOIDNO
            this.input.INV_DATE = this.CheckORDER.data[0].INV_DATE
            this.input.VOID_DATE = this.CheckORDER.data[0].VOID_DATE
            this.playAudioError();
            Swal.fire({
              title: 'ต้องการแก้ไข Invoice ใหม่ ?',
              html: 'Invoice ปัจจุบัน: ' + '<font color="red">' + this.CheckORDER.data[0].TSRH_INVNO + '</font>',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              backdrop: false,
              confirmButtonText: 'ยืนยัน',
              cancelButtonText: 'ยกเลิก'
            }).then((result) => {
              console.log(!result.value);
              if (!result.value) {
                this.input.orderno = '';
              }else{
                setTimeout(() => {
                  this.inputInv.nativeElement.focus();
                },500)
              }
              
            })

          }else if (this.input.tab == "goodreturn" && this.CheckORDER.data[0].TSRH_VOIDNO != null && this.CheckORDER.data[0].TSRH_VOIDNO != ''){

            this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER
            this.input.TSRH_INVNO = this.CheckORDER.data[0].TSRH_INVNO
            this.input.CHANNEL = this.CheckORDER.data[0].CHANNEL
            this.input.TRACKING_NO = this.CheckORDER.data[0].TRACKING_NO
            this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_STATUS
            this.input.TSRH_VOIDNO = this.CheckORDER.data[0].TSRH_VOIDNO
            this.playAudioError();
            Swal.fire({
              title: 'ต้องการแก้ไข Void ใหม่ ?',
              html: 'Void ปัจจุบัน: ' + '<font color="red">' + this.CheckORDER.data[0].TSRH_VOIDNO + '</font>',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              backdrop: false,
              confirmButtonText: 'ยืนยัน',
              cancelButtonText: 'ยกเลิก'
            }).then((result) => {
              console.log(!result.value);
              if (!result.value) {
                this.input.orderno = '';
              }else{
                setTimeout(() => {
                  this.inputReturn.nativeElement.focus();
                },500)
              }
              
            })

          }else{
            this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER
            this.input.TSRH_INVNO = this.CheckORDER.data[0].TSRH_INVNO
            this.input.CHANNEL = this.CheckORDER.data[0].CHANNEL
            this.input.TRACKING_NO = this.CheckORDER.data[0].TRACKING_NO
            this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_STATUS
            this.input.TSRH_VOIDNO = this.CheckORDER.data[0].TSRH_VOIDNO
            this.focusInput();
          }
        } 
      })
    }
  }

  CheckInvno(){
    if(this.isNullOrEmpty(this.input.invno)){
     Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุ invoice!',
        showConfirmButton: false,
        timer: 2500
      });
      this.playAudioError();
      this.input.invno = ''
      setTimeout(() => {
        this.focusInput();
      }, 2200); 
    }else{

      this.dataService.tsuruha_check_invoice(this.input).subscribe(res => {
        this.CheckInvoice = res
        if (this.CheckInvoice.status === 'error') {
          console.log(res);
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.input.invno = ''
          this.focusInput();
        } else if (this.CheckInvoice.status === 'success') {

          if(this.input.tab == "invoice" ){
            this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'กรุณายกเลิกการจับคู่ Order ก่อนหน้า!',
              html: 'Order Number : ' + '<font color="red">' + this.CheckInvoice.data[0].ORDER_NUMBER + '</font>',
              showConfirmButton: true,
            });

            this.focusInput();
          }else{
            this.input.orderno = this.CheckInvoice.data[0].ORDER_NUMBER;
            this.input.void_amt = this.CheckInvoice.data[0].TSRH_AMT;
            this.dataService.tsuruha_get_history_invoice(this.input).subscribe(res => {
              this.DatamapInvoice = res
              if (this.DatamapInvoice.status === 'success')
                {
                  this.input.ORDER_NO = this.DatamapInvoice.data[0].ORDER_NUMBER
                  this.input.TSRH_INVNO = this.DatamapInvoice.data[0].TSRH_INVNO
                  this.input.INV_DATE = this.DatamapInvoice.data[0].INV_DATE
                  this.input.VOID_DATE = this.DatamapInvoice.data[0].VOID_DATE
                  this.input.TSRH_VOIDNO = this.DatamapInvoice.data[0].TSRH_VOIDNO

                  this.input.CHANNEL = this.CheckInvoice.data[0].CHANNEL
                  this.input.TRACKING_NO = this.CheckInvoice.data[0].TRACKING_NO
                  this.input.STATUS_RTS = this.CheckInvoice.data[0].RTS_STATUS
                  this.focusInput();
                }
              });
          }
        }else{
           if(this.input.tab == "invoice" ){
            this.warning_update_invoice();
           }else{
            this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'Invoice นี้ ยังไม่จับคู่ Order!',
              showConfirmButton: false,
              timer:2500
            });
            this.input.invno = '';
            this.focusInput();
           }
        }
      })
   }
    
    
  }

  
  async warning_update_invoice(){

    if(!this.isNullOrEmpty(this.input.TSRH_INVNO)){
    
      Swal.fire({
            title: 'ยืนยันการจับคู่ Invoie ใหม่',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            backdrop: false,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
          })
          .then((result) => {
            if (result.value) {
            this.input.old_invno = this.input.TSRH_INVNO;
            this.Update_invoice();
            }
            
            this.focusInput();
          })

    }else{

      this.Update_invoice();
    }

  }

  delete_invoice(){
    this.input.old_invno = this.input.TSRH_INVNO;
    this.dataService.tsuruha_cancel_invoice(this.input).subscribe(res => {
      this.CheckORDER = res
      if (this.CheckORDER.status === 'success') {

        this.dataService.tsuruha_check_order(this.input).subscribe(res => {
          this.CheckORDER = res
          if (this.CheckORDER.status === 'success') {
              this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER
              this.input.TSRH_INVNO = this.CheckORDER.data[0].TSRH_INVNO
              this.input.CHANNEL = this.CheckORDER.data[0].CHANNEL
              this.input.TRACKING_NO = this.CheckORDER.data[0].TRACKING_NO
              this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_STATUS
              this.input.TSRH_VOIDNO = this.CheckORDER.data[0].TSRH_VOIDNO
              this.input.INV_DATE = this.CheckORDER.data[0].INV_DATE
              this.input.VOID_DATE = this.CheckORDER.data[0].VOID_DATE
              this.input.orderno = '';
              this.input.invno = '';
              this.input.voidno = '';

              Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                showConfirmButton: false,
                timer: 2000
              });

              setTimeout(() => {
                  this.focusInput();
                }, 2200); 
                  
                }
              })

              this.playAudioNice();
                
      }
    });
  }

  Update_invoice(){
 
    this.dataService.tsuruha_update_invoice(this.input).subscribe(res => {
        
        this.CheckORDER = res;
        if (this.CheckORDER.status === 'error') {
          console.log(res);
          Swal.fire({
            icon: 'error',
            title: 'Update Error! กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
          this.input.invno = '';
          this.playAudioError();
          this.focusInput();
        }else{

          if(!this.isNullOrEmpty(this.input.invno)){
            this.dataService.tsuruha_history_invoice(this.input).subscribe(res => {
              this.CheckORDER = res

              if (this.CheckORDER.status === 'success') {

                this.dataService.tsuruha_check_order(this.input).subscribe(res => {
                    this.CheckORDER = res
                    if (this.CheckORDER.status === 'success') {
                      this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER
                      this.input.TSRH_INVNO = this.CheckORDER.data[0].TSRH_INVNO
                      this.input.CHANNEL = this.CheckORDER.data[0].CHANNEL
                      this.input.TRACKING_NO = this.CheckORDER.data[0].TRACKING_NO
                      this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_STATUS
                      this.input.TSRH_VOIDNO = this.CheckORDER.data[0].TSRH_VOIDNO
                      this.input.INV_DATE = this.CheckORDER.data[0].INV_DATE
                      this.input.VOID_DATE = this.CheckORDER.data[0].VOID_DATE
                      this.input.orderno = '';
                      this.input.invno = '';
                      this.input.voidno = '';

                      Swal.fire({
                        icon: 'success',
                        title: 'บันทึกสำเร็จ',
                        showConfirmButton: false,
                        timer: 2000
                      });

                      setTimeout(() => {
                        this.focusInput();
                      }, 2200); 
                      
                    }
                })
              }else{
                console.log(res);
                Swal.fire({
                  icon: 'error',
                  title: 'Update Error! กรุณาติดต่อ ADMIN!',
                  showConfirmButton: false,
                  timer: 2500
                });
                this.input.invno = '';
                this.playAudioError();
                this.focusInput();
              }

            });
          }else{
            this.dataService.tsuruha_check_order(this.input).subscribe(res => {
              this.CheckORDER = res
              if (this.CheckORDER.status === 'success') {
                this.input.ORDER_NO = this.CheckORDER.data[0].ORDER_NUMBER
                this.input.TSRH_INVNO = this.CheckORDER.data[0].TSRH_INVNO
                this.input.CHANNEL = this.CheckORDER.data[0].CHANNEL
                this.input.TRACKING_NO = this.CheckORDER.data[0].TRACKING_NO
                this.input.STATUS_RTS = this.CheckORDER.data[0].RTS_STATUS
                this.input.TSRH_VOIDNO = this.CheckORDER.data[0].TSRH_VOIDNO
                this.input.INV_DATE = this.CheckORDER.data[0].INV_DATE
                this.input.VOID_DATE = this.CheckORDER.data[0].VOID_DATE
                this.input.orderno = '';
                this.input.invno = '';
                this.input.voidno = '';

                Swal.fire({
                  icon: 'success',
                  title: 'บันทึกสำเร็จ',
                  showConfirmButton: false,
                  timer: 2000
                });

                setTimeout(() => {
                  this.focusInput();
                }, 2200); 
                
              }
            })

            this.playAudioNice();
          }
        }
      })
      
  }


  CheckVoidno(){
    if(this.isNullOrEmpty(this.input.invno) ||  this.isNullOrEmpty(this.input.voidno)){
      
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุ voidno!',
        showConfirmButton: false,
        timer: 2500
      });
      this.playAudioError();
      this.input.voidno = ''
      setTimeout(() => {
        this.focusInput();
      }, 2200); 

    }else{

      this.dataService.tsuruha_check_void(this.input).subscribe(res => {
        this.CheckInvoice = res
        if (this.CheckInvoice.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.input.voidno = ''
          this.focusInput();
        } else if (this.CheckInvoice.status === 'success') {
          this.playAudioError();
            Swal.fire({
              icon: 'warning',
              title: 'กรุณายกเลิกการจับคู่ Invoice ก่อนหน้า!',
              html: 'จับคู่กับ Invoice : ' + '<font color="red">' + this.CheckInvoice.data[0].TSRH_INVNO + '</font>',
              showConfirmButton: true,
            });
            this.focusInput();
        }else{
          this.warning_update_void();
        }
      })
   }
  }

  async warning_update_void(){
     if (!this.isNullOrEmpty(this.input.TSRH_INVNO)) {
        const { value: formValues } = await Swal.fire({
        title: 'กรุณาระบุเหตุผลที่ Void',
        html: `
          <div style="text-align:center;">

            <select id="remarkSelect" class="swal2-select" style="width:80%; margin:1em auto; text-align:center;">
              <option value="">-- กรุณาเลือก --</option>
              <option value="คืนสินค้า">คืนสินค้า</option>
              <option value="จัดส่งไม่สำเร็จ">จัดส่งไม่สำเร็จ</option>
              <option value="ยิงขายผิด">ยิงขายผิด</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>

            <div style="margin-top:10px; font-size:14px;">
              ระบุจำนวนเงิน Void
            </div>

            <input id="void_amt" 
                  type="number"
                  value="${this.input.void_amt ?? ''}"
                  class="swal2-input" 
                  placeholder="ระบุจำนวนเงิน Void"
                  style="width:80%; margin:0.5em auto; text-align:center;">

            <input id="remarkText" 
                  class="swal2-input" 
                  placeholder="โปรดระบุเหตุผล" 
                  style="visibility:hidden; width:80%; margin:0.5em auto;">

          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        confirmButtonText: 'ยืนยัน',
        didOpen: () => {
          const select = document.getElementById('remarkSelect') as HTMLSelectElement;
          const void_amt = document.getElementById('void_amt') as HTMLInputElement;
          const input = document.getElementById('remarkText') as HTMLInputElement;

          select.addEventListener('change', () => {
            if (select.value === 'อื่นๆ') {
              input.style.visibility = 'visible';
            } else {
              input.style.visibility = 'hidden';
              input.value = '';
            }
          });
        },
        preConfirm: () => {
          const select = (document.getElementById('remarkSelect') as HTMLSelectElement)?.value;
          const void_amt = (document.getElementById('void_amt') as HTMLInputElement)?.value;
          const input = (document.getElementById('remarkText') as HTMLInputElement)?.value;

          if (!select) {
            Swal.showValidationMessage('กรุณาเลือกหมายเหตุ');
            return;
          }

          if (!void_amt) {
            Swal.showValidationMessage('กรุณาระบุจำนวนเงิน Void');
            return;
          }

          if (select === 'อื่นๆ' && !input) {
            Swal.showValidationMessage('กรุณาระบุรายละเอียด');
            return;
          }

          return {
            remark: select === 'อื่นๆ' ? input : select,
            void_amt: Number(void_amt)
          };
        }
      });

      if (!formValues) return;
      this.input.old_invno = this.input.TSRH_INVNO;
      this.input.remark = formValues.remark;
      this.input.void_amt = formValues.void_amt; 

      this.Update_void();

    }

  }


  Update_void(){
    this.dataService.tsuruha_update_void(this.input).subscribe(res => {
      
      this.CheckORDER = res;
      if (this.CheckORDER.status === 'error') {
        console.log(res);
        Swal.fire({
          icon: 'error',
          title: 'Update Error! กรุณาติดต่อ ADMIN!',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.voidno = '';
        this.playAudioError();
        this.focusInput();
      }else{

        this.dataService.tsuruha_get_history_invoice(this.input).subscribe(res => {
          this.CheckORDER = res
          if (this.CheckORDER.status === 'success' && this.CheckORDER.data.length > 0) {
            const lastRow = this.CheckORDER.data[this.CheckORDER.data.length - 1];

            this.input.ORDER_NO = lastRow.ORDER_NUMBER
            this.input.TSRH_INVNO = lastRow.TSRH_INVNO
            this.input.CHANNEL = lastRow.CHANNEL
            this.input.TRACKING_NO = lastRow.TRACKING_NO
            this.input.STATUS_RTS = lastRow.RTS_STATUS
            this.input.TSRH_VOIDNO = lastRow.TSRH_VOIDNO
            this.input.INV_DATE = lastRow.INV_DATE
            this.input.VOID_DATE = lastRow.VOID_DATE

            this.input.orderno = '';
            this.input.invno = '';
            this.input.voidno = '';

            Swal.fire({
              icon: 'success',
              title: 'บันทึกสำเร็จ',
              showConfirmButton: false,
              timer: 2000
            });

            setTimeout(() => {
              this.focusInput();
            }, 2200); 
            
          }
          else{
            this.input.TSRH_VOIDNO = ""

          }
        })

        this.playAudioNice();
      }
    })
  }

  Cancel(){
    
    if(this.input.tab == "invoice" && this.input.ORDER_NO && this.input.TSRH_INVNO){

      Swal.fire({
          title: 'ต้องการยกเลิกการจับคู่ Invoice ใช่หรือไม่!',
          html: 'ยกเลิกจับคู่กับ Order Number : ' + '<font color="red">' + this.input.ORDER_NO  + '</font>'
          +'<br> Invoice : '+ '<font color="red">' + this.input.TSRH_INVNO + '</font>',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          backdrop: false,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
      }).then((result) => {
          if (result.value) {
            this.input.orderno = this.input.ORDER_NO;
            this.input.invno = '';
            this.delete_invoice();
          }
      })

    }else if(this.input.tab == "goodreturn" && this.input.TSRH_INVNO && this.input.TSRH_VOIDNO){

      Swal.fire({
          title: 'ต้องการยกเลิกการจับคู่ Void รับคืน ใช่หรือไม่!',
          html: 'ยกเลิกจับคู่กับ Invoice Number : ' + '<font color="red">' + this.input.TSRH_INVNO  + '</font>'
          +'<br> Void รับคืน : '+ '<font color="red">' + this.input.TSRH_VOIDNO + '</font>',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          backdrop: false,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
      }).then((result) => {
          if (result.value) {
            this.input.orderno = this.input.ORDER_NO;
            this.input.voidno = '';
            this.Update_void();
          }
          
          this.focusInput();
      })

    }else{
      this.focusInput();
    }
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


