import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-outbound-routing',
  templateUrl: './outbound-routing.component.html',
  styleUrls: ['./outbound-routing.component.scss']
})
export class OutboundRoutingComponent implements OnInit {
  @ViewChild('inputbarcode') inputbarcode!: ElementRef;

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;

  routeno_page = false;
  res : any = {};
  resdata = Array();
  input: any = {};
  route = Array();
  detail_list: any = [];
  partial_list  : any = [];
  routeid = 0;
  

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Outbound-Routing',
      active: 'Outbound',
    }
    page.push(array)
    this.pageactive = page;
    this.routeno_page = false;
    this.input.barcode = '';

    this.get_transport();

  }

  pagesacn(id :any ){
    //console.log(id);
    this.routeno_page = true;
    this.routeid = id;
    var num =  id < 10 ?"0"+id : id ;
    this.input.route = "R"+num ;
    this.interval = setInterval(() => this.inputbarcode.nativeElement.focus(), 1000); 

    this.dataService.get_ordership_delivery_partial(this.input).subscribe(res => {
      this.res = res;
      //console.log(this.res)
      if (this.res.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'Error! Can not get delivery partial',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.inputbarcode.nativeElement.focus();
      }else{
        this.partial_list = this.res.data
      }

    });

    this.dataService.get_ordership_delivery_daily(this.input).subscribe(res => {
      var resdata : any;
      resdata= res;
      //console.log(resdata)
      if (resdata.status === 'error') {
        Swal.fire({
          icon: 'error',
          title: 'Error! Can not get delivery partial',
          showConfirmButton: false,
          timer: 2500
        });
        this.playAudioError();
        this.inputbarcode.nativeElement.focus();
      }else{
        this.detail_list = resdata.data
        
      }
      
    });

  }



  get_transport() {

    this.dataService.get_transport().subscribe(resp => {
      this.res = resp;
      if (resp ) {
        if (this.res.status === 'error') {
          console.log(resp)
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด ในการ Get_TRANSPORTATION_NAME !',
            text: 'Get_TRANSPORTATION_NAME',
            showConfirmButton: false,
            timer: 2500
          });
        }else{
          this.resdata = this.res.data;
          this.route = [...new Set(this.resdata.map(item => item.OUTBOUND_ROUTE_NO))].sort((a, b) => a - b);
        }
      } else {
        console.error('No data get_transport');
      }
    }, error => {
      console.error('Error fetching transport data', error);
    });
  }
  
 scan_barcode(){
  if (!this.input.barcode) { return; }
  this.dataService.get_ordership_delivery(this.input).subscribe(res => {
    this.res = res;
    if (this.res.status === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'Error! can not get order ship',
        showConfirmButton: false,
        timer: 2500
      });
      this.playAudioError();
    }else if  (this.res.status === 'null'){
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบข้อมูล Order ' + this.input.barcode,
        showConfirmButton: false,
        timer: 2000
      });
      this.playAudioError();
      this.input.barcode = '';
    }else{
      this.resdata = this.res.data;
     //console.log(this.resdata)

      var order_route = this.resdata.map(item =>item.ROUTE_NO.trim());
      if(this.input.route == order_route[0]){

        if(this.resdata[0].CONFIRM_CARTON_NO != null && this.resdata[0].CARTON_NO < (this.resdata[0].CONFIRM_CARTON_NO+1)){
          Swal.fire({
            icon: 'warning',
            title: 'เกินจำนวน ' + this.input.barcode,
            showConfirmButton: false,
            timer: 2000
          });
          this.playAudioError();
          this.input.barcode = '';
        }else{
          this.dataService.update_ordership_delivery(this.input).subscribe(res => {
            this.res = res;
            console.log(this.res)
            if (this.res.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'Error! Can not update order ship',
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.inputbarcode.nativeElement.focus();
            }else{

              this.playAudioOK();
              this.input.barcode = '';
              this.dataService.get_ordership_delivery_partial(this.input).subscribe(res => {
                this.res = res;
                if (this.res.status === 'error') {
                  Swal.fire({
                    icon: 'error',
                    title: 'Error! Can not get delivery partial',
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.playAudioError();
                  this.inputbarcode.nativeElement.focus();
                }else{
                  this.partial_list = this.res.data
                  console.log(this.partial_list);
                }

              });

              this.dataService.get_ordership_delivery_daily(this.input).subscribe(res => {
                var resdata : any;
                resdata= res;
                if (resdata.status === 'error') {
                  Swal.fire({
                    icon: 'error',
                    title: 'Error! Can not get delivery partial',
                    showConfirmButton: false,
                    timer: 2500
                  });
                  this.playAudioError();
                  this.inputbarcode.nativeElement.focus();
                }else{
                  this.detail_list = resdata.data
                }
              });

            }
          });


        }
      }else{
        
        Swal.fire({
          icon: 'warning',
          title: 'Order ของ Route' + order_route[0],
          showConfirmButton: false,
          timer: 2000
        });
        this.playAudioError();
        this.input.barcode = '';
        this.inputbarcode.nativeElement.focus();
      }

    }
  });
    
 }

 cancel_check(shipmentid:any){
  this.input.shipmentid = shipmentid;

  Swal.fire({
    icon: 'warning',
    title:'ต้องการลบรายการ ' + this.input.shipmentid + ' ?' ,
    showCancelButton: true,
    confirmButtonColor: 'btn btn-success',
    cancelButtonColor: 'btn btn-danger',
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก'
    }).then((result) => {
    if (result.value) {

      this.dataService.cancel_ordership_delivery(this.input).subscribe(res => {
        this.res = res;
        console.log(this.res)
        if (this.res.status === 'error') {
          Swal.fire({
            icon: 'error',
            title: 'Error! Can not cancel order ship',
            showConfirmButton: false,
            timer: 2500
          });
          this.playAudioError();
          this.inputbarcode.nativeElement.focus();
        }else{
          
          this.input.barcode = '';
          Swal.fire({
            icon: 'success',
            title: 'ลบรายการ สำเร็จ!',
            showConfirmButton: false,
            timer: 2500
          });

          this.dataService.get_ordership_delivery_partial(this.input).subscribe(res => {
            this.res = res;
            if (this.res.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'Error! Can not get delivery partial',
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.inputbarcode.nativeElement.focus();
            }else{
              this.partial_list = this.res.data
            }
          });

          this.dataService.get_ordership_delivery_daily(this.input).subscribe(res => {
            var resdata : any;
            resdata= res;
            if (resdata.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: 'Error! Can not get delivery partial',
                showConfirmButton: false,
                timer: 2500
              });
              this.playAudioError();
              this.inputbarcode.nativeElement.focus();
            }else{
              this.detail_list = resdata.data
            }
          });


        }
      });
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


    var TableCheck = this.routeid % 2

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
