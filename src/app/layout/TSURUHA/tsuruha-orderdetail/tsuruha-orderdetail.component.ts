import { Component, OnInit ,ElementRef, ViewChild} from '@angular/core';
import { DataService,TimeService } from '../../../services/index';
import { Subscription,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { DataTableDirective } from 'angular-datatables';
import { Router, ActivatedRoute } from '@angular/router';
declare var flatpickr: any;
declare var XLSX: any;

@Component({
  selector: 'app-tsuruha-orderdetail',
  templateUrl: './tsuruha-orderdetail.component.html',
  styleUrls: ['./tsuruha-orderdetail.component.scss']
})
export class TsuruhaOrderdetailComponent implements OnInit {

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
  groupedData: any[] = [];
  data_invhistory: any[] = [];
  isLoading = false;
  ListOrder: Array<any> = [];

  channel_list : any = [];
  period_list : any = [];

  includeSku: boolean = true;


  input = {
    datef: '',
    datet:'',
    channel:null,
    period:null,
    printreport:'',
    lastprocess:'',
    workperiod:'',
    ordercount:''
  };

  constructor(
    private dataService: DataService,
    private timeService:TimeService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }


  ngOnInit(): void {
    const d = this.activatedRoute.snapshot.data;
    var page = Array();
    let array = {
      pagename: 'Tsuruha-Orderdetail',
      active: 'Tsuruha',
      menubar: d['menubar'],
      version: d['version'],
      lastupdate: d['lastupdate'],
    }
    page.push(array)
    this.pageactive = page;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
  
    this.input.datef = `${yyyy}-${mm}-${dd}`;
    this.input.datet = `${yyyy}-${mm}-${dd}`;

    this.getdatachannel();
    this.getlastprocess();
  }

  
  getdatachannel(){
    this.dataService.tsuruha_get_channel().subscribe(res => {
      this.res = res;
      console.log(this.res);

      if (this.res.status === 'error') {
        console.log(this.res)
        Swal.fire({
          icon: 'error',
          title: 'Error! can not get table_printcancel',
          showConfirmButton: false,
          timer: 2500
        });
      }else {

        this.channel_list = [
          ...new Set(this.res.data.map((x: any) => x.channel))
        ];
        this.period_list = [
          ...new Set(this.res.data.map((x: any) => x.work_period))
        ];
        
        console.log(this.channel_list);
        
        
      }
    });
  }



  getdata(){
    this.isLoading = true;
    this.dataService.tsuruha_get_orderdetail(this.input).subscribe(res => {
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
        this.groupedData = [];

      }else{
        // this.data_list = this.res.data;
        // console.log(this.data_list)
        this.groupData(this.res.data);
      }
    });

  }

   getdatamaphistory(){
    this.dataService.tsuruha_get_orderdetail_invhistory(this.input).subscribe(res => {
      this.res = res;
      this.isLoading = false;

      if (this.res.status === 'success') {
        this.data_invhistory = this.res.data
      }
    });

  }

  groupData(data: any[]) {

    const grouped = data.reduce((acc: any, curr: any) => {
  
      if (!acc[curr.ORDER_NUMBER]) {
        acc[curr.ORDER_NUMBER] = {
          orderNumber: curr.ORDER_NUMBER,
          orderDate:curr.ORDER_DATE,
          totalQty: 0,  
          totalAmt: curr.TSRH_AMT,
          invNo:curr.TSRH_INVNO,
          trackingNo:curr.TRACKING_NO,
          RTSstatus:curr.RTS_STATUS,
          CHANNEL : curr.CHANNEL,
          voidno : curr.TSRH_VOIDNO,
          Manht_process_date : curr.Manht_process_date,
          WORK_PERIOD : curr.WORK_PERIOD,
          invdate : curr.INV_DATE,
          voiddate :  curr.VOID_DATE,
          voidamt:  curr.VOID_AMT,
          items: []
        };
      }
      acc[curr.ORDER_NUMBER].totalQty += curr.TOTAL_QTY;

      acc[curr.ORDER_NUMBER].items.push({
        ITEM: curr.ITEM,
        ITEM_NAME: curr.ITEM_NAME,
        ITEM_BARCODE: curr.ITEM_BARCODE,
        TOTAL_QTY: curr.TOTAL_QTY,
        TSRH_SKU_AMT: curr.TSRH_SKU_AMT
      });
  
      return acc;
  
    }, {});
  
    this.groupedData = Object.values(grouped);
  }
  
  get grandTotalQty(): number {
    return this.groupedData?.reduce((sum, order) => sum + (order.totalQty || 0), 0);
  }
  
  get totalOrderCount(): number {
    return this.groupedData?.reduce((count, order) => order.orderNumber ? count + 1 : count, 0) ?? 0;
  }

  get grandTotalAmt(): number {
    return this.groupedData?.reduce((sum, order) => sum + (order.totalAmt || 0), 0);
  }
  
  
  print(type: 'A4' | 'A5' |'A4_Inv') {

    if (this.groupedData.length === 0) return;
  
    this.printType = type;
  
    setTimeout(() => {
      window.print();
      this.printType = '';
    }, 300);
  }
  
  openExportDialog() {
      Swal.fire({
        title: 'เลือกเงื่อนไข Export',
        html: `
         <div style="text-align:center;">
          <label>
            <input type="radio" name="skuOption" value="yes" checked> แสดง SKU
          </label><br/>
          <label>
            <input type="radio" name="skuOption" value="no"> ไม่แสดง SKU
          </label>
        </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        focusConfirm: false,

       preConfirm: () => {
          const value = (document.querySelector('input[name="skuOption"]:checked') as HTMLInputElement)?.value;
          return {
            includeSku: value === 'yes'
          };
        }
      }).then((result) => {
        if (result.isConfirmed) {

          this.includeSku = result.value?.includeSku ?? true;
          this.exportExcel();

        }
      });
  }

  formatDate(date: any){
    const d = new Date(date);

    if (isNaN(d.getTime())) return ''; 

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };


  formatDateTime(date: Date){
    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
          + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  };
 

  getlastprocess(){
    this.dataService.tsuruha_get_lastprocess().subscribe(res => {
            this.res = res;
            this.input.lastprocess = this.formatDateTime(new Date(this.res.data[0].TSRH_PROCESS_DATE));
            this.input.workperiod = this.res.data[0].WORK_PERIOD ;
            this.input.ordercount = this.res.data[0].ORDER_COUNT;

            this.input.period = this.res.data[0].WORK_PERIOD;
            this.input.datef = this.formatDate(new Date(this.res.data[0].MANHT_PROCESS_DATE));
            this.input.datet = this.formatDate(new Date(this.res.data[0].MANHT_PROCESS_DATE));
            this.getdata();
          })
  }

  RunProcress(){

    Swal.fire({
                title: 'ยืนยัน Run รอบ Procress งาน',
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
                  
                  this.isLoading = true;
                  this.dataService.tsuruha_process_job_TSRH_A5().subscribe(res => {
                      this.res = res;
                       if (this.res.status === 'error') {
                        this.isLoading = false;
                        console.log(this.res)
                        Swal.fire({
                          icon: 'error',
                          title: 'TSDC_PROCESS_JOB_TSRH_A5 Error!',
                          showConfirmButton: false,
                          timer: 2500
                        });
                      }else{
                        this.isLoading = false;
                        Swal.fire(
                          {
                            icon: 'success',
                            title: 'Run process job success.',
                            showConfirmButton: false,
                            timer: 2000
                          });

                        this.getlastprocess();
                      }
                  })
                }
              })

  }

  exportExcel() {
    
    if (this.groupedData.length === 0) return;
    //#region  sheet 1

    const wb = XLSX.utils.book_new();

    const rows: any[] = [];
  

    const header = this.includeSku 
      ? ["#","ORDER_DATE","ORDER","SKU","SKU Name","SKU Barcode","QTY","NET PRICE","INVOICE_DATE","INVOICE","TRACKING NO","STATUS","VOID_DATE","VOID NO","CHANNEL"]
      : ["#","ORDER_DATE","ORDER","QTY","NET PRICE","INVOICE_DATE","INVOICE","TRACKING NO","STATUS","VOID_DATE","VOID NO","CHANNEL"]
      ;
  
    rows.push(header);
  
    const orderRows: number[] = [];
  
    this.groupedData.forEach((order: any, index: number) => {
  
      const orderRowIndex = rows.length;
      orderRows.push(orderRowIndex);
  
      const orderDate = order.orderDate
      ? this.formatDate(order.orderDate)
      : '';

      const invdate = order.invdate
      ? this.formatDate(order.invdate)
      : '';

       const voiddate = order.voiddate
      ? this.formatDate(order.voiddate)
      : '';


      // ORDER ROW
      if (this.includeSku) {
        rows.push([
          index + 1,
          orderDate,
          order.orderNumber,
          "",
          "",
          "",
          order.totalQty,
          order.totalAmt,
          invdate,
          order.invNo,
          order.trackingNo,
          order.RTSstatus,
          voiddate,
          order.voidno,
          order.CHANNEL
        ]);
      }else{
        rows.push([
          index + 1,
          orderDate,
          order.orderNumber,
          order.totalQty,
          order.totalAmt,
          invdate,
          order.invNo,
          order.trackingNo,
          order.RTSstatus,
          voiddate,
          order.voidno,
          order.CHANNEL
        ]);
      }
  
      // SKU ROW
      if (this.includeSku) {
        order.items.forEach((item: any) => {
    
          rows.push([
            "",
            "",
            "",
            item.ITEM,
            item.ITEM_NAME,
            item.ITEM_BARCODE,
            item.TOTAL_QTY,
            item.TSRH_SKU_AMT,
            "",
            "",
            "",
            "",
            "",
            "",
            ""
          ]);
    
        });
      }
  
    });
  
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
  
    const range = XLSX.utils.decode_range(ws1['!ref']);
  
    const border = {
      top:{style:"thin"},
      bottom:{style:"thin"},
      left:{style:"thin"},
      right:{style:"thin"}
    };
  
    // STYLE LOOP
    for (let R = 0; R <= range.e.r; R++) {
  
      for (let C = 0; C <= range.e.c; C++) {
  
        const ref = XLSX.utils.encode_cell({r:R,c:C});
        if (!ws1[ref]) {
          ws1[ref] = { t: 's', v: '' }; //cell เปล่า
        }

        const cell = ws1[ref];
        if(!cell) continue;
  
        if(!cell.s)cell.s = {};
  
        cell.s.border = border;
  
        // HEADER STYLE
        if(R === 0){
          cell.s.font = {bold:true,color:{rgb:"FFFFFF"}};
          cell.s.fill = {fgColor:{rgb:"333333"}};
          cell.s.alignment = {horizontal:"center",vertical:"center"};
        }
  
        // NUMBER FORMAT
        if(this.includeSku){
          if(R > 0 && C === 6) cell.z = "#,##0";
          if(R > 0 && C === 7) cell.z = "#,##0.00";
        }else{
          if(R > 0 && C === 3) cell.z = "#,##0";
          if(R > 0 && C === 4) cell.z = "#,##0.00";
        }
  
      }
  
    }
  
    // ORDER ROW COLOR
    orderRows.forEach(r => {
  
      for(let C=0; C<header.length; C++){
  
        const ref = XLSX.utils.encode_cell({r:r,c:C});
        const cell = ws1[ref];
  
        if(cell){
          if(!cell.s) cell.s = {};
  
          cell.s.fill = {fgColor:{rgb:"E7F3FF"}};
          cell.s.font = {bold:true};
        }
  
      }
  
    });
  
    // AUTO WIDTH
    ws1['!cols'] = header.map((_:any,col:number)=>{
      const max = Math.max(...rows.map(r => (r[col] ? r[col].toString().length : 0)));
      return {wch:max+3};
    });
  
    // FREEZE HEADER
    ws1['!freeze'] = {ySplit:1};

    
    XLSX.utils.book_append_sheet(wb,ws1,"Tsuruha Detail");

  //#endregion

   //#region  sheet 2

   this.dataService.tsuruha_get_orderdetail_invhistory(this.input).subscribe(res => {
      this.res = res;
      this.isLoading = false;
      console.log(this.res);
      

      if (this.res.status === 'success') {
        this.data_invhistory = this.res.data

        const rows_sheet2: any[] = [];
  
        const header_2 = [
          "#","ORDER_DATE","ORDER","INVOICE_DATE","INVOICE","DATEMAPPING_INV","VOID_DATE","VOID NO","VOID_AMOUNT","DATEMAPPING_VOID","REMARK","TRACKING NO","STATUS","CHANNEL"
        ];
      
        rows_sheet2.push(header_2);
      
        const orderRows_sheet2: number[] = [];
        this.data_invhistory.forEach((order: any, index: number) => {
  
        const orderRowIndex = rows_sheet2.length;
        orderRows_sheet2.push(orderRowIndex);
    
        const orderDate = order.ORDER_DATE
        ? this.formatDate(order.ORDER_DATE)
        : '';

        const map_invDate = order.CREATE_DATE
          ? this.formatDateTime(new Date(order.CREATE_DATE))
          : '';

        const invDate = order.INV_DATE
          ? this.formatDate(order.INV_DATE)
          : '';  

        const map_voidDate = order.UPDATE_VOIDNO_DATE
        ? this.formatDateTime(order.UPDATE_VOIDNO_DATE)
        : '';

        const voidDate = order.VOID_DATE
          ? this.formatDate(order.VOID_DATE)
          : '';  

        // ORDER ROW
        rows_sheet2.push([
          index + 1,
          orderDate??'',
          order.ORDER_NUMBER??'',
          invDate??'',
          order.TSRH_INVNO??'',
          map_invDate??'',
          voidDate??'',
          order.TSRH_VOIDNO??'',
          order.VOID_AMT??'',
          map_voidDate??'',
          order.REMARK??'',
          order.TRACKING_NO??'',
          order.RTSstatus??'',
          order.CHANNEL??''
        ]);
      });

      const ws2 = XLSX.utils.aoa_to_sheet(rows_sheet2);
      // AUTO WIDTH
      ws2['!cols'] = header_2.map((_:any,col:number)=>{
        const max = Math.max(...rows_sheet2.map(r => (r[col] ? r[col].toString().length : 0)));
        return {wch:max+3};
      });

      const range2 = XLSX.utils.decode_range(ws2['!ref']);
     
      // STYLE LOOP
      for (let R = 0; R <= range2.e.r; R++) {
    
        for (let C = 0; C <= range2.e.c; C++) {
    
          const ref = XLSX.utils.encode_cell({r:R,c:C});
          if (!ws2[ref]) {
            ws2[ref] = { t: 's', v: '' };
          }
          const cell = ws2[ref];
          if(!cell) continue;
    
          if(!cell.s) cell.s = {};
    
          cell.s.border = border;
    
          // HEADER STYLE
          if(R === 0){
            cell.s.font = {bold:true,color:{rgb:"FFFFFF"}};
            cell.s.fill = {fgColor:{rgb:"333333"}};
            cell.s.alignment = {horizontal:"center",vertical:"center"};
          }
    
        }
    
      }


      XLSX.utils.book_append_sheet(wb,ws2,"Tsuruha Mapping History"); 

      }
      //รอ resp ค่อยออก report

      const now = new Date();

      const pad = (n: number) => n.toString().padStart(2, '0');

      const fileName = `Tsuruha_order_${
        now.getFullYear()
      }${pad(now.getMonth() + 1)}${pad(now.getDate())}_${
        pad(now.getHours())
      }${pad(now.getMinutes())
      }${pad(now.getSeconds())
      }.xlsx`;

      XLSX.writeFile(wb, fileName);
      //XLSX.writeFile(wb,"Tsuruha_order.xlsx");
    });
   //#endregion

  
  }
  
  
  
}
