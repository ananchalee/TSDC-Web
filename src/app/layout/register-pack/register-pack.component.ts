import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';

@Component({
  selector: 'app-register-pack',
  templateUrl: './register-pack.component.html',
  styleUrls: ['./register-pack.component.scss']
})
export class RegisterPackComponent implements OnInit {
  @ViewChild('inputpincode') inputpincode!: ElementRef;

  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;
  user_listCheckIn:  Array<any>  = [];
  user_listCheckHis:  Array<any>  = [];


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

  userpin: Array<any> = [];
  Pinall: string[] = [];

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'ลงทะเบียนแพคสินค้า',
      active: 'RegistPack',
    }
    page.push(array)
    this.pageactive = page;

    this.LOAD_USERCheckin();
    this.LOAD_userhistory();
    this.get_userpincode();
    setTimeout(() => { this.focusInput_pin() }, 200)
  }

  focusInput_pin() {
    if (this.scanTrackPage === false) {
      this.inputpincode.nativeElement.focus();
    }
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

  LOAD_userhistory() {

    const user = JSON.parse(localStorage.getItem('currentUser') || '');
    this.input.USER_CHECK = user.WORKER_ID;
    this.input.TABLE_CHECK = this.input.USER_CHECK
    this.busy = this.dataService.load_historyPack(this.input).subscribe(res => {
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
        this.user_listCheckHis = [];
      }
      else if (this.user.status === 'success') {
        this.input.sumusercheck_OUT = this.user.data.length;
        this.user_listCheckHis = this.user.data;
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

  checkin(){
   
    if(this.input.PIN_CODE != ''){
      const user = JSON.parse(localStorage.getItem('currentUser') || '');
      this.input.USER_CHECK = user.WORKER_ID;
      this.input.TABLE_CHECK = this.input.USER_CHECK
      this.input.WORKING_TYPE = "Pack"

      var foundUser = this.userpin.find(user => user.PIN_CODE === String(this.input.PIN_CODE));
      if (foundUser) {

        var foundUsercheckin = this.user_listCheckIn.find(user => user.PIN_CODE === String(this.input.PIN_CODE));
        if (foundUsercheckin) {
          Swal.fire({
            icon: 'warning',
            title: 'Check in ค้างอยู่',
            showConfirmButton: false,
            timer: 2500
          });
          this.input.PIN_CODE = '';
        }else{

          this.busy = this.dataService.check_historyPack(this.input).subscribe(res => {
       
            this.user = res
            if (this.user.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                text: 'check_historyPack' + user.data,
                showConfirmButton: false,
                timer: 2500
              });
               this.input.PIN_CODE = '';
            } else if (this.user.status === 'success') {
         
              Swal.fire({
                text: this.user.data[0].PIN_CODE +' Check in ค้างอยู่ Table '+ this.user.data[0].TABLE_CHECK,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                backdrop: false,
                confirmButtonText: 'ยืนยัน Check In',
                cancelButtonText: 'ยกเลิก'
              }).then((result) => {
                if (result.value) {
                  this.busy =  this.dataService.User_checkout(this.input).subscribe(res => {
                    console.log(res);
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
                      this.input.PIN_CODE = '';
                    } else if (this.user.status === 'success') {
                      this.busy = this.dataService.insert_user_tablecheck2(this.input).subscribe(res => {
                        this.user = res
                        if (this.user.status === 'error') {
                          
                          Swal.fire({
                            icon: 'error',
                            title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                            text: 'tablecheck_user',
                            showConfirmButton: false,
                            timer: 2500
                          });
                          this.input.PIN_CODE = '';
                        } else if (this.user.status === 'success') {
                          this.input.sumusercheck = this.user.data.length;
                          this.user_listCheckIn = this.user.data;
                          this.input.PIN_CODE = '';
                          this.LOAD_userhistory();
                        }
                      })
                    }
              
                  })
                } else {
                  this.input.PIN_CODE = ''
                }
              })
            }else{
              this.busy = this.dataService.insert_user_tablecheck2(this.input).subscribe(res => {
                this.user = res
                if (this.user.status === 'error') {
                  this.input.PIN_CODE = '';
                  Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด กรุณาติดต่อ ADMIN!',
                    text: 'tablecheck_user',
                    showConfirmButton: false,
                    timer: 2500
                  });
                } else if (this.user.status === 'success') {
                  this.input.sumusercheck = this.user.data.length;
                  this.user_listCheckIn = this.user.data;
                  this.input.PIN_CODE = '';
                  this.LOAD_userhistory();
                  
                }
      
              })
            }
          })
          
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่พบ pincode',
          showConfirmButton: false,
          timer: 2500
        });
        this.input.PIN_CODE = '';
      }

    }

  }

 checkout(i:number){
    var U_checkout = this.user_listCheckIn[i];
   this.busy =  this.dataService.User_checkout(U_checkout).subscribe(res => {
      console.log(res);
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
        this.LOAD_userhistory();
      }

    })
 }








}

