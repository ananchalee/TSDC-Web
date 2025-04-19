import { Injectable, ErrorHandler } from '@angular/core';
//import { Http, RequestOptions, ResponseContentType, Response } from '@angular/http';
 import { Observable,throwError } from 'rxjs';
 import { catchError,map } from 'rxjs/operators';
//import 'rxjs/add/operator/map'
import { HttpClient,HttpHeaders,HttpErrorResponse } from '@angular/common/http';
//import { errorHandler } from '@angular/platform-browser/src/browser';
//import { error } from 'util';


@Injectable()
export class DataService {



  constructor(private http: HttpClient) { }


  getServerDate(): Observable<{ date: string }> {
    return this.http.get<{ date: string }>('http://10.26.1.21:1661/api/serverdate');
  }
    
  login_(data:any){
    //console.log(data)
  return this.http.post('http://10.26.1.21:1661/api/login',data);
 }

LOAD_USERTABLECHECK(data:any) {
   //console.log(data)
  return this.http.post('http://10.26.1.21:1661/api/LOAD_USERTABLECHECK', data)
}
get_userpincode() {
  //console.log(data)
 return this.http.get('http://10.26.1.21:1661/api/get_userpincode')
}
insert_user_tablecheck(data:any){
  return this.http.post('http://10.26.1.21:1661/api/insert_user_tablecheck', data)
}

insert_user_tablecheck2(data:any){
  return this.http.post('http://10.26.1.21:1661/api/insert_user_tablecheck2', data)
}

load_checkinPack(data:any){
  return this.http.post('http://10.26.1.21:1661/api/load_checkinPack', data)
}
load_historyPack(data:any){
  return this.http.post('http://10.26.1.21:1661/api/load_historyPack', data)
}
User_checkout(data:any){
  return this.http.post('http://10.26.1.21:1661/api/User_checkout', data)
}
check_historyPack(data:any){
  return this.http.post('http://10.26.1.21:1661/api/check_historyPack', data)
}
CheckWork_V2(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckWork_V2',data)
    
}

CheckCon(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckCon',data)

}

Checkorder_block(data:any){
  return this.http.post('http://10.26.1.21:1661/api/Checkorder_block',data)

}

CheckConOnline(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckConOnline',data)
   
}


CheckConOnline_ug(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckConOnline_ug',data)
   
}

CheckConSorter(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckConSorter',data)
}

summaryCon(data:any){
  return this.http.post('http://10.26.1.21:1661/api/summaryCon',data)

}

summaryConSorter(data:any){
  return this.http.post('http://10.26.1.21:1661/api/summaryConSorter',data)
    
}

matchItemInCon(data:any){
  return this.http.post('http://10.26.1.21:1661/api/matchItemInCon',data)
}

matchItemInCon_ug(data:any){
  return this.http.post('http://10.26.1.21:1661/api/matchItemInCon_ug',data)
}

matchItemInConSorter(data:any){
  return this.http.post('http://10.26.1.21:1661/api/matchItemInConSorter',data)
}

checkEqualCon(data:any){
  return this.http.post('http://10.26.1.21:1661/api/checkEqualCon',data)
    
}

checkEqualCon_ug(data:any){
  return this.http.post('http://10.26.1.21:1661/api/checkEqualCon_ug',data)
    
}

checkEqualConSorter(data:any){
  return this.http.post('http://10.26.1.21:1661/api/checkEqualConSorter',data)

}

updateConQtyCheck(data:any){
  return this.http.post('http://10.26.1.21:1661/api/updateConQtyCheck',data)
}

updateConQtyCheck_SORTER(data:any){
  return this.http.post('http://10.26.1.21:1661/api/updateConQtyCheck_SORTER',data)
}


BOX_CONTROL_DETAIL(data:any){
  return this.http.post('http://10.26.1.21:1661/api/BOX_CONTROL_DETAIL',data)
}

BOX_CONTROL_DETAIL_ug(data:any){
  return this.http.post('http://10.26.1.21:1661/api/BOX_CONTROL_DETAIL_ug)',data)
}

check_master_box(data:any){
  return this.http.post('http://10.26.1.21:1661/api/check_master_box',data)
}


tsdc_pick_vas(){
  return this.http.get('http://10.26.1.21:1661/api/tsdc_pick_vas')
}

tracksum_qty(data:any){
  return this.http.post('http://10.26.1.21:1661/api/tracksum_qty',data)
}

tracking_running(data:any){
  return this.http.post('http://10.26.1.21:1661/api/tracking_running',data)
}


loadTracking(data:any){
  return this.http.post('http://10.26.1.21:1661/api/loadTracking',data)

}

CheckConOffline(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckConOffline',data)
   
}

CheckWork(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckWork',data)
   
}

CheckOrder_Cancel(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckOrder_Cancel',data)
}

CheckWork_ug(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckWork_ug',data)
   
}

summary_ITEM_LACK(data:any) {
  return this.http.post('http://10.26.1.21:1661/api/summary_ITEM_LACK', data)
   
}


summary_ITEM_LACK_SORTER(data:any) {
  return this.http.post('http://10.26.1.21:1661/api/summary_ITEM_LACK_SORTER', data)
   
}


updateConQtyCheck_fullcarton(data:any){
  return this.http.post('http://10.26.1.21:1661/api/updateConQtyCheck_fullcarton',data)
}

updateConQtyCheck_SORTER_fullcarton(data:any){
  return this.http.post('http://10.26.1.21:1661/api/updateConQtyCheck_SORTER_fullcarton',data)
}

BOX_CONTROL_DETAIL_FULLCARTON(data:any){
  return this.http.post('http://10.26.1.21:1661/api/BOX_CONTROL_DETAIL_FULLCARTON',data)
}

updateCoverSheet(data:any){
  return this.http.post('http://10.26.1.21:1661/api/updateCoverSheet',data)

}

CheckCon_Orderconfirm(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckCon_Orderconfirm',data)

}

Rescan_checkitem(data:any){
  return this.http.post('http://10.26.1.21:1661/api/Rescan_checkitem',data)

}

checkstatusUpdateConfirmOrder(data:any){
  return this.http.post('http://10.26.1.21:1661/api/checkstatusUpdateConfirmOrder',data)

}

UpdateConfirmOrder(data:any){
  return this.http.post('http://10.26.1.21:1661/api/UpdateConfirmOrder',data)

}

Rescancheckitem_all(data:any){
  return this.http.post('http://10.26.1.21:1661/api/Rescancheckitem_all',data)

}

UpdateCheckdate(data:any){
  return this.http.post('http://10.26.1.21:1661/api/UpdateCheckdate',data)

}

UpdateCheckdateSorter(data:any){
  return this.http.post('http://10.26.1.21:1661/api/UpdateCheckdateSorter',data)

}


ReprintTracking(data:any){
  return this.http.post('http://10.26.1.21:1661/api/ReprintTracking',data)
}

ReprintTrackingAll(data:any){
  return this.http.post('http://10.26.1.21:1661/api/ReprintTrackingAll',data)
}

outstanding_online(){
  return this.http.get('http://10.26.1.21:1661/api/outstanding_online')

}
outstanding_offline(){
  return this.http.get('http://10.26.1.21:1661/api/outstanding_offline')
}

outstanding_sorter(){
  return this.http.get('http://10.26.1.21:1661/api/outstanding_sorter')
}

outstanding_CfOrder(){
  return this.http.get('http://10.26.1.21:1661/api/outstanding_CfOrder')
}
Order_disappear(){
  return this.http.get('http://10.26.1.21:1661/api/Order_disappear')
}

Order_disappear_detail(data:any){
  return this.http.post('http://10.26.1.21:1661/api/Order_disappear_detail',data)
}

percent_online(){
  return this.http.get('http://10.26.1.21:1661/api/percent_online')
}
percent_offline(){
  return this.http.get('http://10.26.1.21:1661/api/percent_offline')
}

percent_sorter(){
  return this.http.get('http://10.26.1.21:1661/api/percent_sorter')
}

percent_CForder(){
  return this.http.get('http://10.26.1.21:1661/api/percent_CForder')
}

CheckTrack(data:any){
  return this.http.post('http://10.26.1.21:1661/api/CheckTrack',data)
   
}

updateBoxTracking(data:any){
  return this.http.post('http://10.26.1.21:1661/api/updateBoxTracking',data)
}

//////////////////////// Check Old ///////
CheckWork_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/CheckWork_Old',data)
}
CheckCon_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/CheckCon_Old',data)
}
CheckConOnline_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/CheckConOnline_Old',data)
}
CheckConSorter_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/CheckConSorter_Old',data)
}
summaryCon_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/summaryCon_Old',data)
}
summaryConSorter_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/summaryConSorter_Old',data)
}
matchItemInCon_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/matchItemInCon_Old',data)
}
matchItemInConSORTER_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/matchItemInCon_Old',data)
}
checkEqualCon_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/checkEqualCon_Old',data)
}
checkEqualConSorter_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/checkEqualConSorter_Old',data)
}
tracksum_qty_Sorter_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/tracksum_qty_Sorter_Old',data)
}
updateConQtyCheck_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/updateConQtyCheck_Old',data)
}

updateConQtyCheck_Old_full(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/updateConQtyCheck_Old_full',data)
}

UpdateCheckdateSorter_old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/UpdateCheckdateSorter',data)

}
loaddataToOut(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/loaddataToOut',data)
}
UPDATE_CARTON_PRINT(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/UPDATE_CARTON_PRINT',data)
}
summary_ITEM_LACK_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/summary_ITEM_LACK_Old',data)
}
summary_ITEM_LACK_SORTER_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/summary_ITEM_LACK_SORTER_Old',data)
}
Rescan_checkitem_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/Rescan_checkitem_Old',data)
}
Rescan_checkitem_Sorter_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/Rescan_checkitem_Sorter_Old',data)
}
tracksum_qty_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/tracksum_qty_Old',data)
}

tracking_running_Old(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/tracking_running_Old',data)
}

tracking_running_Old2(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/tracking_running_Old2',data)
}
////////////////////// Outbound check tracking ////////////////////////////

check_Pallet_confirm_outbound(data:any){
  return this.http.post('http://10.26.1.21:1661/api/check_Pallet_confirm_outbound',data)
}
check_Pallet_confirm_outbound11(data:any){
  return this.http.post('http://10.26.1.21:1661/api/check_Pallet_confirm_outbound11',data)
}

Check_TRANSPORTATION_NAME(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/Check_TRANSPORTATION_NAME',data)
}

Get_TRANSPORTATION_NAME(){
  return this.http.get('http://10.26.1.13:1665/api99/Get_TRANSPORTATION_NAME')
}
check_Tracking_Order_Cancel(data:any){
  return this.http.post('http://10.26.1.21:1661/api/check_Tracking_Order_Cancel',data)
}

check_Tracking_confirm_outbound(data:any){
  return this.http.post('http://10.26.1.21:1661/api/check_Tracking_confirm_outbound2',data)
}
insertTracking_confirmOutbound(data:any){
  return this.http.post('http://10.26.1.21:1661/api/insertTracking_confirmOutbound',data)
}

update_Tracking_confirm_outbound(data:any){
  return this.http.post('http://10.26.1.21:1661/api/update_Tracking_confirm_outbound', data)
}
update_Tracking_confirm_outbound2(data:any){
  return this.http.post('http://10.26.1.21:1661/api/update_Tracking_confirm_outbound2', data)
}
DeleteAndBackup_Track_Outbound(data:any){
  return this.http.post('http://10.26.1.21:1661/api/DeleteAndBackup_Track_Outbound',data)
}
deleteTracking_outbount(data:any){
  return this.http.post('http://10.26.1.21:1661/api/deleteTracking_outbount',data)
}

check_ordercancel_online(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/check_ordercancel_online', data);
}

interface_Tracking_confirm_outbound(data:any){
  return this.http.post('http://10.26.1.21:1661/api/interface_Tracking_confirm_outbound',data)
}

///////// outbount routeing
get_transport(){
  return this.http.get('http://10.26.1.21:1661/api/get_transport')
}

get_ordership_delivery(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/get_ordership_delivery', data);
}

get_ordership_delivery_daily(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/get_ordership_delivery_daily', data);
}
get_ordership_delivery_partial(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/get_ordership_delivery_partial', data);
}

update_ordership_delivery(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/update_ordership_delivery', data);
}

cancel_ordership_delivery(data:any){
  return this.http.post('http://10.26.1.13:1665/api99/cancel_ordership_delivery', data);
}


////// report

DATA_BACKLOG_SORTER(data:any){
  return this.http.post('http://10.26.1.21:1665/api2/DATA_BACKLOG_SORTER',data)
}

VIEW_BACKLOG_SORTER(data:any) {
  return this.http.post('http://10.26.1.21:1665/api2/VIEW_BACKLOG_SORTER', data)
}
/////

//////// moniter 
Moniter_SumstatusRTS(data:any){
  return this.http.post('http://10.26.1.21:1661/api/Moniter_SumstatusRTS',data)
}
Moniter_statusRTS(data:any){
  return this.http.post('http://10.26.1.21:1661/api/Moniter_statusRTS',data)
}
update_statusRTS(data:any){
  return this.http.post('http://10.26.1.21:1661/api/update_statusRTS',data)
}


}





