import { Component, OnInit, Input } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input() Pageactive: any; ///รับค่าเมนูจากค่าต่างๆ
  @Input() RepageTime: any; ///รับค่าหน้ารีเฟสจาก Dashboard

  page: any = {}
  Repage: any = {}
  input: any = {};

  pushRightClass: string = 'push-right';

  today = new Date();
  Datenow = this.today.toISOString().slice(0, 10);
  Timenow = this.today.toISOString().slice(11, 16);

  constructor(public router: Router) {

  }

  ngOnInit(): void {
 ///console.log(this.Pageactive);
    if (!this.Pageactive) {
       //console.log(this.Pageactive)
    } else {
      this.page = this.Pageactive[0].pagename
      //console.log(this.page)
      if(this.page == 'Dashboard'){
        this.input.PageDashboard = true
      }else{
        this.input.PageDashboard = false

      }
      
    }
    
    this.TimeRepage();
    setInterval(() => this.TimeRepage(), 1000);
    

    this.startTime();
    setInterval(() => this.startTime(), 1000);

  }

    
  TimeRepage() {

    this.RepageTime = this.checkTime(this.RepageTime);
    this.Repage =   this.RepageTime
    //console.log(this.Repage)
  }

  checkTimeRe(i: any) {
    if (i > 0) { i = i - 1 };
    return i;
  }



  startTime() {
    var today = new Date();


    var Datenow = today.toISOString().slice(0, 10);
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();
    m = this.checkTime(m);
    s = this.checkTime(s);
    this.input.time = h + ":" + m + ":" + s
    this.input.datetimetoday = Datenow + " " + h + ":" + m + ":" + s

  }

  checkTime(i: any) {
    if (i < 10) { i = "0" + i };
    return i;
  }


}




