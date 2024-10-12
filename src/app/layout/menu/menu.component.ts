import { Component, OnInit,Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @Input() Pageactive: any ;


  page:any = {}
  USER: any = {};

  constructor(private router: Router,) { }

  ngOnInit(): void {
  this.activeMenu();

  }

  activeMenu(){  
    
    if(!this.Pageactive){

    }else{
      const user = JSON.parse(localStorage.getItem('currentUser') || '');
        //console.log(user)
       this.USER.user_firstname = user.FIRSTNAME,
       this.USER.user_lastname = user.LASTNAME,
       this.USER.worker_id = user.WORKER_ID

      switch (this.Pageactive[0].active ){
        
        case 'Dashboard':
          this.page.dashboard = true;
          break;
        case 'Audit&Check':
          this.page.audit = true;
          switch (this.Pageactive[0].pagename){
            case 'Check Order' : this.page.audit_CheckOrder = true;
              break;
            case 'Check fullcarton' : this.page.audit_fullcarton = true;
              break;
          }
          break;
        case 'EditBox':
          this.page.EditBox = true;
          switch (this.Pageactive[0].pagename){
            case 'แก้ไขขนาดกล่อง' : this.page.EditBox = true;
              break;
          }
          break;
        case 'Audit_Offline':
          this.page.audit_Offline = true;
          switch (this.Pageactive[0].pagename){
            case 'เช็คสินค้า&ปริ้น(แบบเก่า)' : this.page.audit_Old = true;
              break;
            case 'เช็คสินค้ายกลัง' : this.page.audit_Old_fullcarton = true;
              break;
          }
          break;  
        case 'Outbound':
          this.page.outbound = true;
          switch (this.Pageactive[0].pagename){
            case 'Outbound-Sacn-Tracking' : this.page.outbound_Scantracking = true;
              break;
          }
          break;  
        case 'RegistPack':
            this.page.RegistPack = true;
            break;
        case 'Reports':
          this.page.report = true;
          switch (this.Pageactive[0].pagename){
            case 'Report Sorter' : this.page.report_sorter = true;
              break;
          }
        break;

        default:
          throw Error('Invalid Menu');
      }
    
  }
  }

  // dashboard(){
  //   this.router.navigate(["/dashboard"]);
  // }
  
  // CheckOrder(){
  //   this.router.navigate(["/audit-check"]);
  // }

  // Checkfullcarton(){
  //   this.router.navigate(["/audit-check-fullcarton"]);
  // }

  // EditBox(){
  //   this.router.navigate(["/edit-box"]);
  // }

  // OldCheckOrder_Print(){
  //   this.router.navigate(["/audit-check-Print-Old"])
  //   // .then(() => {
  //   //   window.location.reload();
  //   // });
  // }

  // RegistPack(){
  //   this.router.navigate(["/register-pack"]);
  // }

  // Scantracking(){
  //   this.router.navigate(["/Outbound-Sacn-Tracking"]);
  // }

  Onclick_menu(page:string){
    switch(page){
      case 'dashboard':
        this.router.navigate(["/dashboard"]);
        break;
      case 'checkorder':
          this.router.navigate(["/audit-check"]);
        break;
      case 'checkfullcarton':
          this.router.navigate(["/audit-check-fullcarton"]);
        break;
      case 'editbox':
          this.router.navigate(["/edit-box"]);
        break;
      case 'oldcheckorder_print':
          this.router.navigate(["/audit-check-Print-Old"])
          // .then(() => {
          //   window.location.reload();
          // });
        break;
      case 'oldcheckfullcarton':
        this.router.navigate(["/audit-check-Print-Old-Full"])
        break;
      case 'registpack':
        this.router.navigate(["/register-pack"])
        break;
      case 'scantracking':
        this.router.navigate(["/Outbound-Sacn-Tracking"]);
        break;
      case 'report_sorter':
        this.router.navigate(["/report-sorter"]);
        break;
    }
  }

   


}
