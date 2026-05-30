import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService,TimeService } from '../../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';
declare var flatpickr: any;
declare var XLSX: any;
declare var jQuery: any;

@Component({
  selector: 'app-report-packinglist',
  templateUrl: './report-packinglist.component.html',
  styleUrls: ['./report-packinglist.component.scss']
})
export class ReportPackingListComponent implements OnInit {

  @ViewChild('myModalDetail') myModalDetail!: ElementRef;
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;


  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;
  printType = "";

  routeno_page = false;
  res : any = {};
  route = Array();
  data_list  : any = [];
  detail_list: any = [];
  isLoading = false;
  ListOrder: Array<any> = [];

  //selectedOrder: any = null;
  showModal: boolean = false;

  input = {
    date: '',
    orderno:'',
    SHIPMENT_ID:'',
    btn_confirm:false
  };

  constructor(
    private dataService: DataService,
    private timeService:TimeService,
    private router: Router,
  ) { }

  
  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Report Packing List',
      active: 'Reports',
    }
    page.push(array)
    this.pageactive = page;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
  
    this.input.date = `${yyyy}-${mm}-${dd}`;
  }


  getdata(){
    this.isLoading = true;
    this.dataService.packinglist_header(this.input).subscribe(res => {
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
        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล',
          showConfirmButton: false,
          timer: 2500
        });

      }else{
        this.data_list = this.res.data;
      }
    });

  }

  ViewDetail(shipment:string,confrim:string){
     this.input.SHIPMENT_ID = shipment;
     this.input.btn_confirm = confrim == 'true' ? true : false;

      this.dataService.packinglist_detail(this.input).subscribe(res => {
      this.res = res;

      if (this.res.status === 'error') {
        console.log(this.res)
        Swal.fire({
          icon: 'error',
          title: 'Error! can not get data detail',
          showConfirmButton: false,
          timer: 2500
        });
      }else if  (this.res.status === 'null'){
        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูล',
          showConfirmButton: false,
          timer: 2500
        });

      }else{
        this.detail_list = this.res.data;
        jQuery(this.myModalDetail.nativeElement).modal('show');
      }
    });
    
}

closeModal() {
   jQuery(this.myModalDetail.nativeElement).modal('hide');
}


  Print(shipment:string){
    this.input.SHIPMENT_ID = shipment;
    window.open("http://10.0.152.46/ReportServer/Pages/ReportViewer.aspx?%2fPACKING+LIST%2fATH_Packing_List4&rs:Command=Render&SHIPMENT_ID=" + this.input.SHIPMENT_ID, "_blank");
  }
  
  Confirm(shipment:string){
    this.input.SHIPMENT_ID = shipment;
     Swal.fire({
                  title: 'ต้องการยืนยัน?',
                  html: 'Shipment : ' + '<font color="blue">' + this.input.SHIPMENT_ID + '</font>' +
                  '<font color="red"> <br> หมายเหตุ : หลังจากยืนยันจะไม่สามารถ พิมพ์ Packing List ได้อีก ! </font>' ,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#3085d6',
                  cancelButtonColor: '#d33',
                  backdrop: false,
                  confirmButtonText: 'ยืนยัน',
                  cancelButtonText: 'ยกเลิก'
                }).then((result) => {
                  if (result.value) {

                       this.dataService.confirm_packinglist_detail(this.input).subscribe(res => {
                        this.res = res;

                        if (this.res.status === 'error') {
                           Swal.fire({
                              icon: 'error',
                              title: 'Error! Insert confirm packinglist detail',
                              showConfirmButton: false,
                              timer: 2500
                            });
                        }else{
                          this.dataService.confirm_packinglist_header(this.input).subscribe(res => {
                          this.res = res;

                            if (this.res.status === 'error') {
                              Swal.fire({
                                  icon: 'error',
                                  title: 'Error! Insert confirm packinglist header',
                                  showConfirmButton: false,
                                  timer: 2500
                                });
                            }else{
                                Swal.fire({
                                    icon: 'success',
                                    title: 'บันทึกสำเร็จ',
                                    showConfirmButton: false,
                                    timer: 2000
                                });

                                this.getdata();
                                this.input.btn_confirm = true
                            }
                          });
                        }

                       });

                  }
                  
                })
  }

  
  
}
