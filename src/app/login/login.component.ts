import { Component, OnInit,ElementRef, ViewChild  } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { DataService } from '../services/index';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  @ViewChild('submit') submit!: ElementRef;
  appVersion = environment.version;
  
  public datalogin: any;
  public showmenu = true;
  loading = false;
  pageactive: any;
  userlogin :any = []
  login: any = {};
  error_message = false
  clssinput:any ={};

  staticAlertClosed = false;
  constructor(
    private dataService: DataService,
    private router: Router,


    //private data:{}

  ) { }



  ngOnInit(): void {
    setTimeout(() => {   this.submit.nativeElement.focus(); }, 200)
  }

  Submit() {
 
    if (this.login.user_id == null || this.login.password == null) {
      this.clssinput.error = true
      this.error_message = true
    } else {
      //this.loading = true;
      //console.log('login');
       this.dataService.login_(this.login).subscribe(res => {
        this.datalogin = res
        if (this.datalogin.status == "success") {
          localStorage.setItem('currentUser', JSON.stringify(this.datalogin.member));
          this.router.navigate(["/audit-check"]); ///หน้าแรกหลังจากที่ log in
        } else if (this.datalogin.status == "null") {
         // console.log('null');
          this.clssinput.error = true
          this.error_message = true
        } else {
         // console.log('error');
        }
      });       
    }
  }



}
