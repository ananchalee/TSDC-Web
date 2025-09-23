import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService } from '../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-moniter-TrackingOrderInternal',
  templateUrl: './moniter-TrackingOrderInternal.component.html',
  styleUrls: ['./moniter-TrackingOrderInternal.component.scss']
})
export class MoniterTrackingOrderInternalComponent implements OnInit {

  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  busy!: Subscription;
  pageactive: any;
  user: any;
  interval: any;

  routeno_page = false;
  res : any = {};
  resSum : any = {};
  input: any = {};
  route = Array();
  detail_list: any = [];
  data_list  : any = [];
  isLoading = false;
  intervalId: any;
  countdown: any;
  isUpdateButtonDisabled: boolean = true;
  ListOrder: Array<any> = [];

  constructor(
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    var page = Array();
    let array = {
      pagename: 'Moniter-TrackorderInternal',
      active: 'Moniter',
    }
    page.push(array)
    this.pageactive = page;
    
    document.addEventListener("fullscreenchange", () => {
      const table = document.querySelector('.table-responsive') as HTMLElement;
      if (!document.fullscreenElement && table) {
        table.classList.remove('fullscreen');
      }
    });

    this.getdata()
    this.input.count = 301; ////ค่านับถอยหลัง รีเฟส 301 วิ
    this.intervalId = setInterval(() =>  this.getdata(), 300000);
    this.startTime();
    setInterval(() => this.startTime(), 1000);
  
  }

  startTime() {

    this.input.count = this.checkTime(this.input.count);
    this.countdown = this.input.count;

  }

  checkTime(i: any) {
    if (i > 0) { i = i - 1 };
    return i;
  }

  ngOnDestroy(): void {
    // Clear the intervals when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
  }


  getdata(){
    this.input.count = 301;////ค่านับถอยหลัง รีเฟส 301 วิ
    this.startTime();
    this.isLoading = true;
    this.dataService.Moniter_InterfaceErrorManH(this.input).subscribe(res => {
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
      }
    });

  }


  toggleFullScreen() {
    const elem = document.querySelector('.content-wrapper') as HTMLElement;
    const table = document.querySelector('.table-responsive') as HTMLElement;
  
    if (!document.fullscreenElement) {
      elem.requestFullscreen();
      if (table) {
        table.classList.add('fullscreen'); 
      }
    } else {
      document.exitFullscreen();
      if (table) {
        table.classList.remove('fullscreen'); 
      }
    }
  }
  
  
  
}
