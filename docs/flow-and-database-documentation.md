# TSDC System - Flow และ Database Documentation

> อ่านข้อมูลจาก `D:\TSDC PROJECT\TSDC-Api.21\API\tsdc-project\server\api.js`  
> วันที่สร้างเอกสาร: 2026-06-20

---

## 1. Login

### Flow การทำงาน
1. ผู้ใช้กรอก USER_ID และ PASSWORD → เรียก POST /login
2. ระบบ query ตาราง TSDC_EMPLOYEE เพื่อตรวจสอบ USER_ID, PASSWORD และ STATUS = '1'
3. หากพบข้อมูล ระบบส่ง member data กลับ (INTERNAL_ID, USER_ID, CATEGORY, SUB_CATEGORY, FIRSTNAME, LASTNAME, WORKER_ID)
4. หากไม่พบ → status: 'null'

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /login | ตรวจสอบ user/password และดึงข้อมูลพนักงาน |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_EMPLOYEE | SELECT | USER_ID, PASSWORD, STATUS, INTERNAL_ID, CATEGORY, SUB_CATEGORY, WORKER_ID | STATUS = '1' คือ active |

---

## 2. Audit Check Online (Check Order)

เมนูนี้รองรับหลาย ORDER_TYPE: ONLINE, OFFLINE, SORTER, CF_ORDER และมีทั้งแบบ Legacy (ใช้ CONTAINER_ID lookup ผ่าน TSDC_CONTAINER_MAPORDER) และแบบ Upgrade (_ug suffix ที่รับ SHIPMENT_ID โดยตรง)

### Flow การทำงาน
1. ผู้ใช้ scan CONTAINER_ID → เรียก POST /CheckWork_ug (หรือ /CheckWork แบบเก่า)
2. ระบบค้นหา ORDER_TYPE และ SHIPMENT_ID → ตัดสิน branch:
   - ORDER_TYPE = 'ONLINE' → เรียก POST /CheckConOnline
   - ORDER_TYPE = 'OFFLINE' → เรียก POST /CheckConOffline
   - ORDER_TYPE = 'SORTER' → เรียก POST /CheckConSorter
   - ORDER_TYPE = 'CF_ORDER' → ใช้เส้น Cf_order
3. ตรวจสอบ order ว่าถูก Cancel หรือไม่ → POST /CheckOrder_Cancel
4. ตรวจสอบ block order → POST /Checkorder_block
5. แสดง summary item ที่ต้องเช็ค → POST /summaryCon (Online/Offline) หรือ /summaryConSorter
6. ผู้ใช้ scan barcode สินค้า → เรียก POST /matchItemInCon_ug เพื่อค้นหา item
7. ตรวจสอบว่าเช็คครบหรือยัง → POST /checkEqualCon
8. บันทึก box control detail ทีละชิ้น → POST /BOX_CONTROL_DETAIL (update TSDC_PICK_CHECK_NEW + insert BOX_CONTROL_DETAIL + insert LOG)
9. เมื่อ close box → POST /tracking_running (สร้าง REF_INDEX, insert TSDC_PICK_CHECK_BOX_CONTROL_NEW)
10. โหลด tracking list ที่ close แล้ว → POST /loadTracking
11. ยืนยัน order เสร็จ → POST /UpdateConfirmOrder (update CHECK_DATE, UPDATE TOTAL_QTY, insert TSDC_PICK_CHECK_CONFIRM_ORDER)
12. กรณี rescan → POST /Rescan_checkitem (ย้อน QTY_CHECK)

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /CheckWork_ug | ค้นหา CONTAINER_ID จาก TSDC_PICK_CHECK_NEW + TSDC_CONTAINER_MAPORDER (ตัด ORDER_TYPE=CANCEL) |
| POST | /CheckWork | แบบเก่า - ค้นหาผ่าน TSDC_CONTAINER_MAPORDER |
| POST | /CheckWork_V2 | ตรวจสอบ CONTAINER_ID และจำแนกประเภทตามความยาว |
| POST | /Checkorder_block | ตรวจสอบ block order จาก TCNM_BLOCK_ORDER_HD/DT |
| POST | /CheckOrder_Cancel | ตรวจสอบ order ที่ถูก cancel |
| POST | /CheckCon | สรุป QTY_CHECK vs QTY_PICK ทั้ง order |
| POST | /CheckConOnline | สรุปสำหรับ ONLINE พร้อม Print_Tracking status |
| POST | /CheckConOffline | สรุปสำหรับ OFFLINE พร้อมข้อมูล delivery |
| POST | /CheckConSorter | สรุปสำหรับ SORTER |
| POST | /CheckCon_Orderconfirm | สรุปสำหรับ CF_ORDER (Confirm Order) |
| POST | /summaryCon | รายการ item พร้อม STATUS_CHECK และ MaxBox_NO |
| POST | /summaryConSorter | รายการ item สำหรับ SORTER |
| POST | /matchItemInCon_ug | ค้นหา item ผ่าน SHIPMENT_ID+SELLER_NO โดยตรง (ONLINE/OFFLINE/CF_ORDER) |
| POST | /matchItemInCon | ค้นหา item ผ่าน CONTAINER_ID (แบบเก่า) |
| POST | /matchItemInConSORTER | ค้นหา item สำหรับ SORTER |
| POST | /checkEqualCon | ตรวจสอบ QTY_CHECK เทียบ QTY_PICK (ONLINE/OFFLINE/CF_ORDER) |
| POST | /BOX_CONTROL_DETAIL | insert/update box detail พร้อม QTY_CHECK |
| POST | /BOX_CONTROL_DETAIL_FULLCARTON | สำหรับ scan เต็มลัง (batch qty) |
| POST | /tracksum_qty | สรุป qty ต่อ tracking |
| POST | /tracking_running | สร้าง box (REF_INDEX) และ close DETAIL เข้า CONTROL |
| POST | /loadTracking | โหลดรายการ box ที่ปิดแล้วของ order |
| POST | /summary_ITEM_LACK | รายการ item ขาด (OFFLINE) |
| POST | /updateConQtyCheck | เพิ่ม QTY_CHECK ทีละ 1 (แบบเก่า) |
| POST | /updateConQtyCheck_SORTER | เพิ่ม QTY_CHECK ทีละ 1 สำหรับ SORTER |
| POST | /updateConQtyCheck_fullcarton | เพิ่ม QTY_CHECK แบบ batch |
| POST | /updateConQtyCheck_SORTER_fullcarton | เพิ่ม QTY_CHECK แบบ batch สำหรับ SORTER |
| POST | /Rescan_checkitem | ย้อน QTY_CHECK และลบ DETAIL ที่ยังไม่ close |
| POST | /Rescancheckitem_all | Reset QTY_CHECK เป็น 0 (เฉพาะ SORTER) |
| POST | /checkstatusUpdateConfirmOrder | ตรวจสอบว่า order confirm แล้วหรือยัง |
| POST | /UpdateConfirmOrder | ยืนยัน order เสร็จ |
| POST | /UpdateCheckdate | บันทึก CHECK_DATE |
| POST | /UpdateCheckdateSorter | บันทึก CHECK_DATE สำหรับ SORTER |
| POST | /updateCoverSheet | บันทึก check date และ CARTON_NO สำหรับ OFFLINE |
| GET | /tsdc_pick_vas | ดึงรายการ VAS |
| POST | /check_master_box | ตรวจสอบขนาดกล่อง |
| POST | /Insert_PICK_CHECK_LOG_NEW | บันทึก log เตือนพิเศษ |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_NEW | SELECT, UPDATE | SHIPMENT_ID, SELLER_NO, CONTAINER_ID, ORDER_TYPE, ITEM_ID, ITEM_ID_BARCODE, QTY_REQUESTED, QTY_PICK, QTY_CHECK, USER_CHECK, CHECK_DATE, TABLE_CHECK, START_DATE_TIME, END_DATE_TIME | ตารางหลักการเช็คสินค้า |
| TSDC_CONTAINER_MAPORDER | SELECT | CONTAINER_ID, SHIPMENT_ID, SELLER_NO | map container → order |
| TSDC_PICK_CHECK_BOX_CONTROL_NEW | SELECT, INSERT, UPDATE | REF_INDEX, CONTAINERID, PO_NO, SELLER_NO, QTY, BOX_NO_ORDER, TABLE_CHECK, TABLE_RUNNING, USER_CHECK, BOX_SIZE, WEIGHT, WIDTH, HIGH, DEEP, TRACKING, VAS_NAME_01..10, PRINT_DATE, REPRINT_DATE | ตาราง header box ที่ close แล้ว |
| TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW | SELECT, INSERT, UPDATE, DELETE | REF_INDEX, CONTAINERID, PO_NO, SELLER_NO, BOX_NO_ORDER, ITEM_ID, QTY, USER_CHECK, TABLE_CHECK, ITEM_ID_BARCODE, Tracking | ตาราง detail item ใน box ระหว่างเช็ค (REF_INDEX IS NULL = ยังไม่ close) |
| TSDC_PICK_CHECK_LOG_NEW | INSERT | CONTAINER_ID, ITEM_ID, QTY_CHECK, USER_NAME, SHIPMENT_ID, TABLE_CHECK, WARNING | log การเช็คแต่ละครั้ง |
| TSDC_PICK_CHECK_CONFIRM_ORDER | SELECT, INSERT | SHIPMENT_ID, COMPANY, WAREHOUSE, ORDER_TYPE, SHIP_TO, USER_STAMP | ยืนยัน order เสร็จสมบูรณ์ |
| [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_PICK_CHECK_CONFIRM_ORDER | INSERT | เหมือนด้านบน | replicate ไปยัง conveyor server |
| TSDC_PROCESS_ORDER_HEADER_ORDERPICK_PRINT | SELECT | SHIPMENT_ID, SHIP_TO, COMPANY | header order สำหรับ confirm |
| TSDC_PROCESS_ORDER_DETAIL_ORDERPICK_PRINT | UPDATE | INTERFACE_LINK_ID, ITEM, TOTAL_QTY | อัปเดต qty ที่เช็คได้จริง |
| TSDC_PICK_PRINT_SHIP_DELIVERY | SELECT, UPDATE | BILL_NO, BILL_N8_BLH, STORE_NO, STORE_NAME, CARTON_NO, PRINT_STATUS | ข้อมูล delivery สำหรับ OFFLINE |
| TSDC_CONTROL_PRINT_ONLINE_TRACKING | SELECT | SELLER_id, customer_id, status_print | ควบคุมการพิมพ์ tracking ONLINE |
| TSDC_INTERFACE_ORDER_HEADER | SELECT | SHIPPING_NAME, PO_NO, SHIP_NO, TCHANNEL | ข้อมูล channel |
| TSDC_PROCESS_ORDER_HEADER_TRANFER21 | SELECT | SHIPMENT_ID, COMPANY, ORDER_DATE | ข้อมูล header order |
| TCNM_BLOCK_ORDER_HD | SELECT | FTBlock_id, FNBlock_type, FTBlock_title, FTBlock_desc, FTUser_update | header block order |
| TCNM_BLOCK_ORDER_DT | SELECT | FTBlock_id, FTOrdernumber, FDLastupdate | detail block order |
| [10.26.1.11].[TSDC_Conveyor].dbo.ONLINE_ORDER_CANCEL | SELECT | ORDER_NUMBER_OOC | รายการ order cancel |
| tsdc_pick_vas | SELECT | VAS_NAME | รายการ VAS options |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_MASTER_CARTON_BOX_SIZE | SELECT | CARTON_NAME | ขนาดกล่อง |
| TSDC_USER_TABLECHECK | SELECT, INSERT, UPDATE | TABLE_CHECK, PIN_CODE, USER_NAME, WORKER_NAME, WORKING_TYPE, CHECKIN_DATE, CHECKOUT_DATE | tracking พนักงานที่ table |

---

## 3. Check Order Print Track (เช็คสินค้าแบบมี Tracking ต่อชิ้น)

เมนูนี้ใช้ตาราง `TSDC_PICK_CHECK_NEW_TRACKING` แทน `TSDC_PICK_CHECK_NEW` รองรับ ORDER_TYPE: ONLINE, OFFLINE, SORTER, CF_ORDER เหมือนเมนู 2 แต่มีการแบ่ง tracking ต่อชิ้นสินค้า

### Flow การทำงาน
1. พนักงาน check-in โต๊ะ → POST /LOAD_USERTABLECHECK, POST /insert_user_tablecheck2, GET /get_userpincode
2. **Pre-validation ก่อน scan**:
   - ตรวจสอบว่า order ยังไม่ปิดงาน (Man system) → POST /check_order_notclose (status='null' = ผ่าน, status='success' = ยังไม่ปิด → alert)
   - ตรวจสอบว่า order ถูกปิดงานแล้ว → POST /check_order_closed (status='success' = ผ่าน, status='null' = ยังไม่ปิด → insert log + alert)
3. ผู้ใช้ scan CONTAINER_ID → POST /CheckWork_track
4. ตรวจสอบ block order → POST /Checkorder_block
5. ตรวจสอบ order cancel → POST /CheckOrder_Cancel
6. ระบบค้นหา ORDER_TYPE และ SHIPMENT_ID → ตัดสิน branch:
   - ONLINE/CANCEL → POST /CheckConOnline_track
   - OFFLINE → POST /CheckConOffline
   - SORTER → POST /CheckConSorter
   - CF_ORDER → POST /CheckCon_Orderconfirm
7. แสดง summary item → POST /summaryContrack (ONLINE) หรือ /summaryConSorter (SORTER)
8. ตรวจสอบ tracking ที่ยังเช็คไม่ครบ → POST /checktracking_Inshipment
9. ดึง RTS status → POST /Get_ONLINE_ORDER_SHIPPING
10. ผู้ใช้ scan barcode → POST /matchItemInContrack (ONLINE) หรือ /matchItemInConSorter (SORTER)
11. ตรวจสอบว่าเช็คครบหรือยัง → POST /checkEqualContrack (ONLINE) หรือ /checkEqualConSorter (SORTER)
12. บันทึก box detail → POST /BOX_CONTROL_DETAIL + POST /updateConQtyChecktrack (ONLINE) หรือ /updateConQtyCheck_SORTER (SORTER)
13. สรุป qty ก่อน close → POST /tracksum_qty
14. Close box → POST /tracking_running
15. ตรวจสอบ file label → POST /checkpathfile_labeltracking → GET /DownloadFileFromNetwork
16. Reprint label → POST /ReprintTracking หรือ POST /ReprintTrackingAll
17. ยืนยัน order เสร็จ → POST /checkstatusUpdateConfirmOrder → POST /UpdateConfirmOrder
18. บันทึก check date → POST /UpdateChecktrackdate (ONLINE) หรือ /UpdateCheckdate หรือ /UpdateCheckdateSorter (SORTER)
19. Update cover sheet → POST /updateCoverSheettrack
20. พิมพ์สลิป cancel → POST /pickcheck_print_ordercancel
21. Rescan → POST /Rescan_checkitem_Track หรือ /Rescancheckitem_all (SORTER)
22. ตรวจสอบขนาดกล่อง → POST /check_master_box
23. ดู item ขาด → POST /summary_ITEM_LACK_Track
24. บันทึก log พิเศษ → POST /Insert_PICK_CHECK_LOG_NEW
25. check-out → POST /User_checkout

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /check_order_notclose | pre-check: order ยังไม่ถูกปิดงานบน Man → alert ถ้า status='success' |
| POST | /check_order_closed | pre-check: ตรวจสอบว่าปิดงานแล้ว → ดึง SHIPMENT_ID ถ้า status='success' |
| POST | /CheckWork_track | ค้นหา CONTAINER_ID จาก TSDC_PICK_CHECK_NEW_TRACKING |
| POST | /Checkorder_block | ตรวจสอบ block order |
| POST | /CheckOrder_Cancel | ตรวจสอบ cancel status |
| POST | /CheckConOnline_track | สรุป SUMCHECK/SUMCON สำหรับ ONLINE (TRACKING table) |
| POST | /CheckConOffline | สรุปสำหรับ OFFLINE |
| POST | /CheckConSorter | สรุปสำหรับ SORTER |
| POST | /CheckCon_Orderconfirm | สรุปสำหรับ CF_ORDER |
| POST | /summaryContrack | รายการ item พร้อม TRACKING และ REF_INDEX (ONLINE) |
| POST | /summaryConSorter | รายการ item สำหรับ SORTER |
| POST | /checktracking_Inshipment | ตรวจสอบ tracking ที่ยังเช็คไม่ครบ |
| POST | /Get_ONLINE_ORDER_SHIPPING | ดึง RTS status และ cancel status |
| POST | /matchItemInContrack | ค้นหา item ใน TSDC_PICK_CHECK_NEW_TRACKING (ONLINE) |
| POST | /matchItemInConSorter | ค้นหา item สำหรับ SORTER |
| POST | /checkEqualContrack | ตรวจสอบ QTY_CHECK vs QTY_PICK (ONLINE) |
| POST | /checkEqualConSorter | ตรวจสอบ QTY_CHECK vs QTY_PICK (SORTER) |
| POST | /BOX_CONTROL_DETAIL | insert/update box detail พร้อม QTY_CHECK |
| POST | /updateConQtyChecktrack | เพิ่ม QTY_CHECK ใน TRACKING table (ONLINE) |
| POST | /updateConQtyCheck_SORTER | เพิ่ม QTY_CHECK (SORTER) |
| POST | /tracksum_qty | สรุป qty ที่ยังไม่ปิดกล่อง |
| POST | /tracking_running | สร้าง box (REF_INDEX) และ close DETAIL เข้า CONTROL |
| POST | /loadTracking | โหลดรายการ box ที่ปิดแล้ว |
| POST | /checkpathfile_labeltracking | ค้นหา path file label tracking |
| GET | /DownloadFileFromNetwork | ดาวน์โหลด label จาก network path |
| POST | /ReprintTracking | reprint ทีละ box (update REPRINT_DATE) |
| POST | /ReprintTrackingAll | reprint ทั้ง CONTAINER_ID |
| POST | /checkstatusUpdateConfirmOrder | ตรวจสอบว่า order confirm แล้วหรือยัง |
| POST | /UpdateConfirmOrder | ยืนยัน order เสร็จ |
| POST | /UpdateChecktrackdate | บันทึก CHECK_DATE ใน TRACKING table (ONLINE) |
| POST | /UpdateCheckdate | บันทึก CHECK_DATE (OFFLINE) |
| POST | /UpdateCheckdateSorter | บันทึก CHECK_DATE (SORTER) |
| POST | /updateCoverSheettrack | บันทึก check date และ CARTON_NO |
| POST | /pickcheck_print_ordercancel | บันทึก log การพิมพ์สลิป cancel |
| POST | /Rescan_checkitem_Track | ย้อน QTY_CHECK ใน TRACKING table |
| POST | /Rescancheckitem_all | Reset QTY_CHECK เป็น 0 (SORTER) |
| POST | /check_master_box | ตรวจสอบขนาดกล่อง |
| POST | /summary_ITEM_LACK_Track | รายการ item ขาด (TRACKING table) |
| POST | /Insert_PICK_CHECK_LOG_NEW | บันทึก log เตือนพิเศษ |
| POST | /LOAD_USERTABLECHECK | โหลด user ปัจจุบันของโต๊ะ |
| POST | /insert_user_tablecheck2 | บันทึก check-in พนักงาน |
| POST | /load_checkinPack | โหลด user ที่ check-in วันนี้ |
| POST | /User_checkout | บันทึก checkout time |
| GET | /tsdc_pick_vas | ดึงรายการ VAS |
| GET | /get_userpincode | ดึงรายการ PIN CODE |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_NEW_TRACKING | SELECT, UPDATE | SHIPMENT_ID, SELLER_NO, CONTAINER_ID, ORDER_TYPE, ITEM_ID, ITEM_ID_BARCODE, QTY_REQUESTED, QTY_PICK, QTY_CHECK, TRACKING, USER_CHECK, CHECK_DATE, TABLE_CHECK, FILE_PACKING | ตารางหลักเช็คสินค้าแบบ tracking ต่อชิ้น |
| TSDC_PICK_CHECK_BOX_CONTROL_NEW | SELECT, INSERT, UPDATE | REF_INDEX, PO_NO, SELLER_NO, TRACKING, BOX_NO_ORDER, QTY, BOX_SIZE, REPRINT_DATE | header box ที่ close แล้ว |
| TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW | SELECT, INSERT, UPDATE, DELETE | REF_INDEX, PO_NO, SELLER_NO, ITEM_ID, QTY, Tracking | detail item ใน box |
| TSDC_PICK_CHECK_LOG_NEW | INSERT | CONTAINER_ID, ITEM_ID, QTY_CHECK, USER_NAME, SHIPMENT_ID, TABLE_CHECK, WARNING | log การเช็คและ log เตือน |
| TSDC_PICK_CHECK_CONFIRM_ORDER | SELECT, INSERT | SHIPMENT_ID, COMPANY, ORDER_TYPE, USER_STAMP | ยืนยัน order เสร็จ |
| TSDC_PICK_PRINT_SHIP_DELIVERY | UPDATE | BILL_N8_BLH, BILL_NO, STORE_NO, CARTON_NO, PRINT_STATUS | cover sheet (OFFLINE) |
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].ONLINE_ORDER_SHIPPING | SELECT, UPDATE | ORDER_NUMBER_OOS, RTS_STATUS_OOS, RTS_DATE_OOS, TRACKING_OOS | RTS tracking status |
| TSDC_PICK_CHECK_PRINTCANCEL | INSERT | container_id, shipment_id, user_check, table_check, zone, print_date | log พิมพ์สลิป cancel |
| TSDC_USER_TABLECHECK | SELECT, INSERT, UPDATE | TABLE_CHECK, PIN_CODE, USER_NAME, WORKING_TYPE, CHECKIN_DATE, CHECKOUT_DATE | check-in/out พนักงาน |
| V_WORK_INSTRUCTION_VIEW_ORDER_NOT_CLOSE | SELECT | CONTAINER_ID | VIEW ตรวจสอบ order ที่ยังไม่ปิดงาน |
| V_WORK_INSTRUCTION_VIEW_ORDER_CLOSED | SELECT | CONTAINER_ID, SHIPMENT_ID | VIEW ตรวจสอบ order ที่ปิดงานแล้ว |

---

## 4. Check Fullcarton (เช็คสินค้ายกลัง)

ฟีเจอร์นี้ถูก embed ภายใน Check Order โดยใช้ endpoint ต่างหากสำหรับ scan ทีละลัง

### Flow การทำงาน
1. ผู้ใช้เลือกโหมด fullcarton และ scan barcode → เรียก POST /updateConQtyCheck_fullcarton (ONLINE/OFFLINE) หรือ /updateConQtyCheck_SORTER_fullcarton (SORTER)
2. อัปเดต QTY_CHECK ด้วย QTY จากทั้งลัง (ไม่ใช่ +1 แต่ +QTY)
3. บันทึก BOX_CONTROL_DETAIL แบบ fullcarton → POST /BOX_CONTROL_DETAIL_FULLCARTON

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /updateConQtyCheck_fullcarton | เพิ่ม QTY_CHECK แบบ batch (ONLINE/OFFLINE) |
| POST | /updateConQtyCheck_SORTER_fullcarton | เพิ่ม QTY_CHECK แบบ batch (SORTER) |
| POST | /BOX_CONTROL_DETAIL_FULLCARTON | insert/update box detail แบบ fullcarton |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_NEW | UPDATE | QTY_CHECK = QTY_CHECK + QTY (batch) | อัปเดตทีละลัง |
| TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW | SELECT, INSERT, UPDATE | QTY (ใช้ค่า fromdata.QTY แทน 1) | detail fullcarton |
| TSDC_PICK_CHECK_LOG_NEW | INSERT | QTY_CHECK = QTY | log batch |

---

## 5. เช็คสินค้า&ปริ้น (แบบเก่า)

ใช้ endpoint รุ่น Legacy ที่มี suffix `_Old` lookup ผ่าน TSDC_CONTAINER_MAPORDER ก่อน ไม่ใช้ SHIPMENT_ID โดยตรง

### Flow การทำงาน
1. ผู้ใช้ scan CONTAINER_ID → POST /CheckWork_Old
2. ระบบ lookup WORK_TYPE (Normal/Online/Sorter) จาก TSDC_CONTAINER_MAPORDER
3. ตรวจสอบ summary → POST /CheckCon_Old (Normal), /CheckConOnline_Old (Online), /CheckConSorter_Old (Sorter)
4. แสดง item list → POST /summaryCon_Old หรือ /summaryConSorter_Old
5. scan barcode → POST /matchItemInCon_Old หรือ /matchItemInConSORTER_Old
6. ตรวจ equal → POST /checkEqualCon_Old หรือ /checkEqualConSorter_Old
7. อัปเดต QTY_CHECK → POST /updateConQtyCheck_Old
8. close box → POST /tracking_running_Old (ดึง list box ที่จะปริ้น)
9. อัปเดต CARTON PRINT status → POST /UPDATE_CARTON_PRINT
10. โหลดข้อมูล outbound → POST /loaddataToOut
11. ปริ้นและบันทึก → POST /tracking_running_Old2 (กรณีเลือก boxsize หลายรายการ)
12. ยืนยัน (Sorter) → POST /UpdateCheckdateSorter_old

### เงื่อนไขสำคัญ (จำแนก ORDER_TYPE จากความยาว CONTAINER_ID)
- ความยาว ≤ 4 = Online
- ความยาว 5–9 = Sorter
- ความยาว 10 = MASS
- ความยาว ≤ 17 = Online
- ความยาว 13 หรือ 20 = Normal (Offline)

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /CheckWork_Old | ค้นหา CONTAINER_ID และจำแนก WORK_TYPE |
| POST | /CheckCon_Old | สรุป QTY_CHECK vs QTY_PICK (Normal/Offline) |
| POST | /CheckConOnline_Old | สรุปสำหรับ ONLINE |
| POST | /CheckConSorter_Old | สรุปสำหรับ SORTER |
| POST | /summaryCon_Old | รายการ item (Normal/Online) |
| POST | /summaryConSorter_Old | รายการ item สำหรับ SORTER |
| POST | /matchItemInCon_Old | ค้นหา item (Normal/Online) |
| POST | /matchItemInConSORTER_Old | ค้นหา item สำหรับ SORTER |
| POST | /checkEqualCon_Old | ตรวจสอบ QTY_CHECK vs QTY_PICK (Normal/Online) |
| POST | /checkEqualConSorter_Old | ตรวจสอบ QTY_CHECK vs QTY_PICK (SORTER) |
| POST | /updateConQtyCheck_Old | อัปเดต QTY_CHECK ทีละ 1 |
| POST | /tracksum_qty_Old | สรุป qty ที่ยังไม่ปิดกล่อง (Normal/Online) |
| POST | /tracksum_qty_Sorter_Old | สรุป qty ที่ยังไม่ปิดกล่อง (SORTER) |
| POST | /tracking_running_Old | สร้าง box และ close DETAIL เข้า CONTROL |
| POST | /tracking_running_Old2 | สร้าง box แบบหลาย boxsize |
| POST | /UPDATE_CARTON_PRINT | อัปเดตสถานะการพิมพ์กล่อง |
| POST | /loaddataToOut | โหลดข้อมูล outbound สำหรับปริ้น |
| POST | /Rescan_checkitem_Old | ย้อน QTY_CHECK (Normal/Online) |
| POST | /Rescan_checkitem_Sorter_Old | ย้อน QTY_CHECK (SORTER) |
| POST | /summary_ITEM_LACK_Old | รายการ item ขาด |
| POST | /UpdateCheckdateSorter_old | บันทึก CHECK_DATE สำหรับ SORTER |
| POST | /insert_user_tablecheck2 | บันทึก check-in พนักงาน |
| POST | /load_checkinPack | โหลด user ที่ check-in ปัจจุบัน |

---

## 6. AWB (Airway Bill / Label Track Print)

ฟีเจอร์พิมพ์ label tracking และอัปเดต RTS (Return to Sender) status

### Flow การทำงาน
1. ผู้ใช้ input PIN CODE → GET /get_userpincode (ตรวจสอบ user)
2. ผู้ใช้ scan เลข P (REF_INDEX) → POST /CheckTrack (ดึงข้อมูล box)
3. ผู้ใช้ input SHIPMENT_ID → POST /Get_ONLINE_ORDER_SHIPPING (ดึง RTS status)
4. ผู้ใช้ scan TRACK_CODE → POST /UPDATE_TrackingAndRTS (อัปเดต tracking + RTS)
5. ระบบ refresh ข้อมูล → POST /Get_ONLINE_ORDER_SHIPPING อีกครั้ง
6. ดึงวันที่จาก server → GET /getServerDate

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /CheckTrack | ดึงข้อมูล box ด้วย REF_INDEX (ลอง ONLINE ก่อน fallback OFFLINE) |
| POST | /Get_ONLINE_ORDER_SHIPPING | ดึงข้อมูล RTS status และ TRACKING_OOS |
| POST | /UPDATE_TrackingAndRTS | อัปเดต RTS_DATE และ TRACKING_OOS |
| GET | /get_userpincode | ดึงรายการ PIN CODE สำหรับ login |
| GET | /getServerDate | ดึงวันที่จาก server |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_BOX_CONTROL_NEW | SELECT, UPDATE | REF_INDEX, PO_NO, SELLER_NO, BOX_SIZE, QTY, BOX_NO_ORDER, CUST_NAME, BILL_NO_REF, REPRINT_DATE | ข้อมูล box ที่จะพิมพ์ |
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].ONLINE_ORDER_SHIPPING | SELECT, UPDATE | ORDER_NUMBER_OOS, RTS_STATUS_OOS, RTS_DATE_OOS, TRACKING_OOS, FILE_PACKING_OOS, SHOPID_OOS | RTS tracking status |
| TSDC_INTERFACE_ORDER_HEADER | SELECT | PO_NO, SHIP_NO, TCHANNEL, SHIPPING_NAME | ระบุ channel |
| TSDC_PROCESS_ORDER_HEADER_TRANFER21 | SELECT | SHIPMENT_ID, COMPANY, ORDER_DATE | ข้อมูล order |

---

## 7. แก้ไขขนาดกล่อง (Edit Box Size)

### Flow การทำงาน
1. ผู้ใช้ค้นหา box ด้วย REF_INDEX → POST /CheckTrack
2. เลือกขนาดกล่องใหม่ → POST /check_master_box (ตรวจสอบ CARTON_NAME)
3. บันทึกการแก้ไข → POST /updateBoxTracking
   - บันทึก log ก่อน (LOG_EDITBOX_TRACKING)
   - UPDATE BOX_SIZE, WEIGHT, WIDTH, HIGH, DEEP ใน TSDC_PICK_CHECK_BOX_CONTROL_NEW
   - UPDATE BOX_SIZE ใน TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
   - อัปเดต REPRINT_DATE

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /CheckTrack | ค้นหา box ด้วย REF_INDEX |
| POST | /check_master_box | ตรวจสอบขนาดกล่องจาก master |
| POST | /updateBoxTracking | อัปเดตขนาดกล่อง + log |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| LOG_EDITBOX_TRACKING | INSERT | REF_INDEX, BEFORE_BOX_SIZE, BOX_SIZE, USER_NAME, date | log การแก้ไข |
| TSDC_PICK_CHECK_BOX_CONTROL_NEW | UPDATE | BOX_SIZE, WEIGHT, WIDTH, HIGH, DEEP, REPRINT_DATE | อัปเดตขนาดกล่อง |
| TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW | UPDATE | BOX_SIZE | อัปเดต detail |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_MASTER_CARTON_BOX_SIZE | SELECT | CARTON_NAME | master ขนาดกล่อง |

---

## 8. ลงทะเบียนแพคสินค้า (Pack Registration)

ระบบลงทะเบียน check-in/check-out พนักงานประจำโต๊ะแพค

### Flow การทำงาน
1. Load ข้อมูลปัจจุบันของโต๊ะ → POST /load_checkinPack
2. ตรวจสอบ PIN CODE จาก USER_PINCODE → GET /get_userpincode
3. ตรวจสอบว่า PIN นี้ check-in ที่อื่นอยู่หรือไม่ → POST /check_historyPack
4. ลงทะเบียน check-in → POST /insert_user_tablecheck2 (WORKING_TYPE = 'Pack')
5. ดู history ของวันนี้ → POST /load_historyPack
6. Check-out → POST /User_checkout

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /insert_user_tablecheck2 | insert check-in พร้อม WORKING_TYPE และ CHECKIN_DATE |
| GET | /get_userpincode | ดึงรายการ PIN CODE ทั้งหมด |
| POST | /load_checkinPack | โหลด user ที่ check-in Pack วันนี้ |
| POST | /load_historyPack | โหลด history ทั้งวัน (ทั้ง check-in และ check-out) |
| POST | /check_historyPack | ตรวจสอบว่า PIN อยู่โต๊ะอื่นหรือไม่ |
| POST | /User_checkout | บันทึก checkout time |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_USER_TABLECHECK | SELECT, INSERT, UPDATE | TABLE_CHECK, PIN_CODE, USER_NAME, WORKER_NAME, WORKER_SURNAME, WORKING_TYPE, DATETIME_STAMP, CHECKIN_DATE, CHECKOUT_DATE | ตารางหลัก check-in/out |
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].USER_PINCODE | SELECT | PIN_CODE, USER_NAME, WORKER_NAME, WORKER_SURNAME, WORKER_COMPANY | master PIN code พนักงาน |

---

## 9. Tracking Order (Outbound)

ระบบ scan tracking สำหรับ outbound ไปยัง courier แบบ pallet

### Flow การทำงาน
1. ผู้ใช้เลือก Pallet No → POST /check_Pallet_confirm_outbound (ดึง list ที่ scan แล้ววันนี้)
2. ตรวจสอบ pallet ว่ามี driver ผูกแล้วหรือยัง → POST /check_Pallet_confirm_outbound11
3. scan tracking code → POST /check_Tracking_Order_Cancel (ตรวจสอบ cancel)
4. ตรวจสอบว่า tracking นี้อยู่ใน ONLINE_ORDER หรือยัง → POST /check_Tracking_confirm_outbound
   - ถ้าอยู่ใน TSDC_CHECK_ORDERONLINE_OUTBOUNT → status: 'warning_PO'
   - ถ้าไม่อยู่ → ค้นใน TSDC_CONFIRM_OUTBOUND แบบ tracking ก่อนหน้า → status: 'warning_Track'
   - ถ้าไม่เจอเลย → ดำเนินการ insert ได้
5. Insert tracking ใหม่ → POST /insertTracking_confirmOutbound หรือ POST /update_Tracking_confirm_outbound2 (MERGE)
6. Sync ข้อมูลไป conveyor server → POST /interface_Tracking_confirm_outbound
7. ลบ tracking ที่ scan ผิด → POST /deleteTracking_outbount
8. ลบและ backup → POST /DeleteAndBackup_Track_Outbound

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /check_Pallet_confirm_outbound | ดึงรายการ tracking ใน pallet วันนี้ |
| POST | /check_Pallet_confirm_outbound11 | ตรวจสอบ driver ของ pallet (จาก conveyor server) |
| POST | /check_Tracking_Order_Cancel | ตรวจสอบ cancel status |
| POST | /check_Tracking_confirm_outbound | ตรวจสอบ tracking ซ้ำ |
| POST | /insertTracking_confirmOutbound | insert tracking ใหม่ |
| POST | /update_Tracking_confirm_outbound | update qty (แบบเก่า) |
| POST | /update_Tracking_confirm_outbound2 | MERGE (insert หรือ update) |
| POST | /interface_Tracking_confirm_outbound | sync insert ไป conveyor |
| POST | /deleteTracking_outbount | ลบ tracking ออกจาก pallet |
| POST | /DeleteAndBackup_Track_Outbound | backup แล้วลบ tracking (local + conveyor) |
| GET | /Get_TRANSPORTATION_NAME | ดึง master ชื่อขนส่งและ prefix code |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_CONFIRM_OUTBOUND | SELECT, INSERT, UPDATE, DELETE | BILL_NO, PALLET_NO, QTY_BOX, CREATE_DATE, PIN_ID, INTERNAL_ID, SHIP_PROVIDER_OOD, ORDER_NO, TCHANNEL, STATUS_DELIVERY | ตารางหลัก outbound tracking |
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND | SELECT, INSERT, DELETE | เหมือนกัน | สำเนาใน conveyor server |
| TSDC_CONFIRM_OUTBOUND_CancelLog | INSERT | ทุก field จาก TSDC_CONFIRM_OUTBOUND + PIN_ID ผู้ cancel | backup ก่อนลบ |
| TSDC_OUTBOUND_ORDER_CANCEL | SELECT | TRACK_NO | รายการ tracking ที่ cancel |
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CHECK_ORDERONLINE_OUTBOUNT | SELECT | PO_NO | ตรวจสอบ online order |
| ONLINE_ORDER_DETAIL | SELECT | TRACK_CODE_OOD, ORDER_NUMBER_OOD, SHOPID_OOD | ดึง ORDER_NO และ TCHANNEL |
| ONLINE_CUSTOMER_PARTNER | SELECT | SHOPID, PARTNERNAME | ดึงชื่อ partner |

---

## 10. Outbound Routing

ระบบจัดสรร routing สำหรับ outbound ตาม OUTBOUND_ROUTE_NO

### Flow การทำงาน
1. โหลด transport และ route list → GET /get_transport
2. ผู้ใช้เลือก Route → POST /get_ordership_delivery_partial (ดู partial list) + POST /get_ordership_delivery_daily (ดู daily list)
3. ผู้ใช้ scan barcode → POST /get_ordership_delivery (ค้นหา order ด้วย barcode)
4. อัปเดต delivery → POST /update_ordership_delivery
5. ยกเลิก delivery → POST /cancel_ordership_delivery

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| GET | /get_transport | ดึงรายการ transport และ OUTBOUND_ROUTE_NO ทั้งหมด |
| POST | /get_ordership_delivery | ค้นหา order ด้วย barcode และ route |
| POST | /get_ordership_delivery_partial | ดูรายการ delivery ที่ยังไม่ครบจำนวนกล่อง |
| POST | /get_ordership_delivery_daily | ดูรายการ delivery ทั้งหมดของวันนี้ |
| POST | /update_ordership_delivery | อัปเดต delivery (บันทึก scan) |
| POST | /cancel_ordership_delivery | ยกเลิก delivery |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| [10.26.1.11].TSDC_Conveyor.dbo.TSDC_TRANSPORT | SELECT | OUTBOUND_ROUTE_NO, TRANSPORT_CODE, TRANSPORT_NAME, TRANSPORT_LEN | master ข้อมูล transport และ route |

---

## 11. Report Sorter

ระบบรายงาน backlog สินค้า SORTER ตาม SHIPMENT_ID และ ORDER_DATE

### Flow การทำงาน
1. ผู้ใช้กรอก shipment_ID หรือ ORDER_DATE → POST /DATA_BACKLOG_SORTER (ดึงรายการ backlog)
2. ผู้ใช้คลิกดู detail → POST /VIEW_BACKLOG_SORTER (ดู detail ต่อ item)

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /DATA_BACKLOG_SORTER | ดึงรายการ backlog SORTER พร้อม SUM_TOTAL_QTY, SUM_QTY_CHECK, % ความคืบหน้า |
| POST | /VIEW_BACKLOG_SORTER | ดู detail item ใน shipment ที่เลือก |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_NEW | SELECT (aggregate) | SHIPMENT_ID, ORDER_DATE, SUM_TOTAL_QTY, SUM_QTY_CHECK | สรุป backlog SORTER |

---

## 12. Report Print Order Cancel

รายงานการพิมพ์สลิปยกเลิก order ที่เช็คสินค้าแล้ว

### Flow การทำงาน
1. ดึงรายการ table_check → GET /get_table_printcancel
2. ผู้ใช้เลือก filter วันที่, ช่วงเวลา, zone, table → POST /get_report_printcancel

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| GET | /get_table_printcancel | ดึงรายการ table_check ทั้งหมด |
| POST | /get_report_printcancel | รายงานสลิป cancel ตาม date/time/zone/table |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_PRINTCANCEL | SELECT, INSERT | container_id, shipment_id, user_check, table_check, zone, print_date | log การพิมพ์สลิป cancel |

---

## 13. Report Packing List (ATH)

รายงาน packing list สำหรับ order ที่ขึ้นต้นด้วย 'ATH' พร้อมระบบ confirm และส่งข้อมูลไปยัง ATMA system

### Flow การทำงาน
1. ค้นหา order ตามวันที่/เลขออเดอร์ → POST /packinglist_header
2. เลือก order ดูรายละเอียด → POST /packinglist_detail
3. Confirm packing list (2 steps):
   - Step 1: insert TSDC_ATMA_ORDER_HD + TSDC_COMFIRM_PACKINGLIST → POST /confirm_packinglist_header
   - Step 2: insert TSDC_ATMA_ORDER_ITEM → POST /confirm_packinglist_detail

### เงื่อนไขสำคัญ
- เฉพาะ order ที่ SHIPMENT_ID LIKE 'ATH%'
- กรอง VAS_NAME_10 != 'C' (ไม่นับ C-type)

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /packinglist_header | header รายการ order ATH พร้อม STATUS_CONFIRM |
| POST | /packinglist_detail | detail item ต่อ box |
| POST | /confirm_packinglist_header | confirm packing list (insert ATMA header + confirm table) |
| POST | /confirm_packinglist_detail | confirm packing list (insert ATMA item detail) |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_PICK_CHECK_NEW | SELECT | SHIPMENT_ID, SELLER_NO, QTY_PICK, QTY_CHECK | header ข้อมูล |
| TSDC_PICK_CHECK_BOX_CONTROL_NEW | SELECT | REF_INDEX, PO_NO, QTY, VAS_NAME_10, CREATE_DATE | ข้อมูล box |
| TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW | SELECT | REF_INDEX, PO_NO, ITEM_ID, ITEM_ID_BARCODE, QTY | รายการ item ต่อ box |
| TSDC_COMFIRM_PACKINGLIST | SELECT, INSERT | SHIPMENT_ID, SELLER_NO, REF_INDEX, TOTAL_ITEM, QTY, CONFIRM_DATE, USER_CONFIRM | tracking การ confirm |
| TSDC_ATMA_ORDER_HD | INSERT | FTCustomer_id, FTOrdernumber, FTCarton_id, FTSource_site, FTDestination_site, FNTotal_Item, FNTotal_qty | ส่งข้อมูลไป ATMA system |
| TSDC_ATMA_ORDER_ITEM | INSERT | FTOrdernumber, FTCarton_id, FNSeq, FTProduct_type, FTProduct_value, FNQty | รายการ item ส่ง ATMA |

---

## 14. Report Print Wave Order

รายงานและพิมพ์ใบ pick ตาม wave number (LAUNCH_NUM)

### Flow การทำงาน
1. ผู้ใช้กรอก wave no → POST /Get_OrderCountConfirmMan_PICK_PAPER (ตรวจสอบ confirm count ก่อน)
2. ถ้า confirm ครบ → POST /Get_MANHT_PICK_PAPER (ดึง summary รายการ pick)
3. ดูรายละเอียด item location (เฉพาะ GROUP_SINGLESKU) → POST /Get_ITEM_LOCATION_MANHT_PICK_PAPER
4. ผู้ใช้เลือก type แล้วพิมพ์ → POST /Update_MANHT_PICK_PAPER (อัปเดต STATUS_PRINT = 'Y')

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /Get_OrderCountConfirmMan_PICK_PAPER | ตรวจสอบ order count vs confirm count |
| POST | /Get_MANHT_PICK_PAPER | summary ของ wave (LAUNCH_NUM, REFERENCE_ID, QUANTITY, TYPE_PICK) |
| POST | /Get_ITEM_LOCATION_MANHT_PICK_PAPER | รายการ item+location ใน wave (GROUP_SINGLESKU เท่านั้น) |
| POST | /Update_MANHT_PICK_PAPER | อัปเดต STATUS_PRINT = 'Y' หลังพิมพ์ |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER | SELECT, UPDATE | LAUNCH_NUM, REFERENCE_ID, QUANTITY, TYPE_PICK, TYPE_PICK_DESC, STATUS_PRINT, FROM_LOC, ITEM, PROCRESS_DATE | ใบ pick ตาม wave |
| [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_MANHT_PICK_PAPER_CONFIRM_PRINT | SELECT | LAUNCH_NUM, order_count | confirm การพิมพ์ |

---

## 15. RTS Monitor

ตรวจสอบ status การ upload RTS (Return to Sender / Shopee Package)

### Flow การทำงาน
1. ผู้ใช้ filter ตาม condition → POST /Moniter_statusRTS (แสดง list)
2. ดูสรุปจำนวนตาม status → POST /Moniter_SumstatusRTS
3. อัปเดต status เพื่อ retry → POST /update_statusRTS (set FNStaUpLoad_rts = 0)

### สถานะ FNStaUpLoad_rts
| ค่า | ความหมาย |
|-----|---------|
| 0 | wait_update (รอ process) |
| 1 | success |
| 2 | processing |
| 5 | skip |
| 99 | error |

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /Moniter_statusRTS | รายการ RTS package พร้อม filter condition |
| POST | /Moniter_SumstatusRTS | สรุปจำนวนตาม status |
| POST | /update_statusRTS | reset status เป็น 0 (retry) |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| TSDC_SHOPEE_PACKAGE_HD | SELECT, UPDATE | FTOrdernumber, FNStaUpLoad_rts, FTStaUpLoad_rts_desc, FDCreatedate, FDLastupdate | tracking RTS upload status |

---

## 16. Interface Error Monitor

ตรวจสอบ error จาก Interface system (ILS - Inventory/Logistics System)

### Flow การทำงาน
1. เรียก POST /Moniter_InterfaceErrorManH เพื่อดึง error ของวันนี้

### ประเภท error ที่ตรวจสอบ (UNION 3 ชุด)
| ชุด | เงื่อนไข | ความหมาย |
|-----|---------|---------|
| 1 | INTERFACE_PROCESS = 'Shipping' และ SHIPMENT_ID ไม่อยู่ใน SHIPMENT_HEADER | Shipping error |
| 2 | process = 'Receiving' และ item ไม่อยู่ใน RECEIPT_DETAIL (ไม่มี REFERENCE_ID) | Receiving error (no ref) |
| 3 | process = 'Receiving' และ RECEIPT_ID ไม่อยู่ใน RECEIPT_HEADER (มี REFERENCE_ID) | Receiving error (with ref) |

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /Moniter_InterfaceErrorManH | รายการ interface error ของวันนี้ (UNION 3 ชุด) |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| [10.26.1.83].ILS.dbo.INTERFACE_ERROR | SELECT | ERROR_MSG, COMPANY, DATE_TIME_STAMP, REFERENCE_ID01, INTERFACE_PROCESS, REFERENCE_ID06, REFERENCE_ID07 | ตาราง error จาก ILS |
| [10.26.1.83].ILS.dbo.SHIPMENT_HEADER | SELECT | shipment_id | ตรวจว่า shipment มีอยู่ |
| [10.26.1.83].ILS.dbo.RECEIPT_DETAIL | SELECT | item, ERP_ORDER_LINE_NUM, DATE_TIME_STAMP | ตรวจว่า receiving item มีอยู่ |
| [10.26.1.83].ILS.dbo.RECEIPT_HEADER | SELECT | RECEIPT_ID | ตรวจว่า receipt มีอยู่ |

---

## 17. Track Order Internal Monitor

ตรวจสอบ tracking สถานะ order ภายในทั้งระบบ (ตาม company และวันที่)

### Flow การทำงาน
1. ผู้ใช้เลือก date range และ company → POST /Moniter_TrackingOrderInternal_Summary
2. คลิก drill-down ตาม status type → POST /Moniter_TrackingOrderInternal_Detail

### ประเภท type สำหรับ Detail
| type | ตาราง | ความหมาย |
|------|-------|---------|
| ORDER_WAIT_PROCESS_MANHT | TSDC_ORDER_TRACKING_INTERNAL_WAIT_PROCESS | รอ process manual |
| ORDER_WAIT_PROCESS_SHORT | TSDC_ORDER_TRACKING_INTERNAL_WAIT_PROCESS | รอ process (short) |
| ORDER_WAIT_PLAN | TSDC_ORDER_TRACKING_INTERNAL_WAIT_PLAN | รอจัดแผนงาน |
| ORDER_WAIT_CLOSEPICK | TSDC_ORDER_TRACKING_INTERNAL_WAIT_CLOSE_PICK | รอปิด pick |
| ORDER_WAIT_CHECK | TSDC_ORDER_TRACKING_INTERNAL_WAIT_CHECK | รอเช็คสินค้า |
| ORDER_WAIT_RTS | TSDC_ORDER_TRACKING_INTERNAL_WAIT_RTS | รอ RTS |
| ORDER_WAIT_OUTBOUND | TSDC_ORDER_TRACKING_INTERNAL_WAIT_OUTBOUND | รอ outbound |
| ORDER_WAIT_COURIER | TSDC_ORDER_TRACKING_INTERNAL_WAIT_COURIER_REC | รอ courier รับ |
| ORDER_COURIER_RECEIVE | TSDC_ORDER_TRACKING_INTERNAL_COURIER_REC | courier รับแล้ว |
| ORDER_CANCEL | TSDC_ORDER_TRACKING_INTERNAL_ORDER_CANCEL | ยกเลิก |

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| POST | /Moniter_TrackingOrderInternal_Summary | สรุปจำนวน order แต่ละ status ตาม company/วันที่ |
| POST | /Moniter_TrackingOrderInternal_Detail | รายละเอียด order แต่ละ type พร้อม filter |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_BY_COMPANY | SELECT | ORDER_DATE, COMPANY, WORK_TYPE, ORDER_ALL, ORDER_WAIT_*, PROCESS_DATE | ตาราง summary |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_PROCESS | SELECT | COMPANY, SHOPID_OOH, SHOP_NAME, ORDER_DATE, ORDER_COUNT, WORK_TRACKING | รอ process |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_PLAN | SELECT | COMPANY, SHOPID_OOH, SHOP_NAME, ORDER_DATE, MANHT_DATE, ORDER_NO, WORK_TYPE | รอวางแผน |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_CLOSE_PICK | SELECT | COMPANY, SHOPID_OOH, SHOP_NAME, ORDER_DATE, ZONE_PICK, ORDER_NO, CONTAINER_ID | รอ close pick |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_CHECK | SELECT | COMPANY, SHOPID_OOH, SHOP_NAME, ORDER_DATE, ZONE_PICK, ORDER_NO, CONTAINER_ID | รอเช็ค |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_RTS | SELECT | COMPANY, SHOPID_OOH, SHOP_NAME, ORDER_DATE, ORDER_COUNT, WORK_TYPE | รอ RTS |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_OUTBOUND | SELECT | COMPANY, SHOPID_OOH, TRANSPORT, ORDER_COUNT, WORK_TYPE | รอ outbound |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_WAIT_COURIER_REC | SELECT | TRANSPORT, COMPANY, SHOPID_OOH, ORDER_COUNT, WORK_TYPE | รอ courier รับ |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_COURIER_REC | SELECT | COMPANY, SHOPID_OOH, TRANSPORT, ORDER_COUNT | courier รับแล้ว |
| [10.26.1.11].[TSDC_Conveyor].[dbo].TSDC_ORDER_TRACKING_INTERNAL_ORDER_CANCEL | SELECT | COMPANY, SHOPID_OOH, ORDER_NO, WORK_PERIOD | cancel |

---

## 18. Monitor Wave Order

ตรวจสอบ wave order ที่รอพิมพ์และจัดการ pending wave

### Flow การทำงาน
1. โหลดรายการ wave ที่ยังมีรายการรอพิมพ์ (auto-refresh ทุก 5 นาที) → GET /Get_PendingPrint_WaveOrderList
2. ผู้ใช้กด Cancel เพื่อยกเลิก pending wave → POST /Cancel_PendingPrint_WaveOrder

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| GET | /Get_PendingPrint_WaveOrderList | รายการ wave ที่ยังมี STATUS_PRINT = 'N' |
| POST | /Cancel_PendingPrint_WaveOrder | ยกเลิก pending (set STATUS_PRINT = 'Y' เฉพาะที่ N) |

---

## 19. Report Tsuruha / Map Invoice

รายงานและจัดการ invoice สำหรับ Tsuruha channel

### Flow การทำงาน
1. ดึง channel และ period → GET /tsuruha_get_channel
2. ดู last process date → GET /tsuruha_get_lastprocess
3. Trigger process job → GET /tsuruha_process_job_TSRH_A5 (execute stored procedure)
4. ค้นหาข้อมูล order detail → POST /tsuruha_get_orderdetail
5. ดู invoice history → POST /tsuruha_get_orderdetail_invhistory
6. ค้นหา order เฉพาะ → POST /tsuruha_check_order
7. ตรวจสอบว่า invoice ซ้ำหรือไม่ → POST /tsuruha_check_invoice
8. **Map Invoice**: อัปเดต invoice number → POST /tsuruha_update_invoice
9. ยกเลิก invoice mapping → POST /tsuruha_cancel_invoice
10. บันทึก history invoice → POST /tsuruha_history_invoice
11. ดู history ของ invoice → POST /tsuruha_get_history_invoice
12. **Map Void**: ตรวจสอบ void ซ้ำ → POST /tsuruha_check_void
13. อัปเดต void number → POST /tsuruha_update_void

### API Endpoints
| Method | Endpoint | คำอธิบาย |
|--------|----------|-----------|
| GET | /tsuruha_get_channel | ดึง channel และ work_period |
| GET | /tsuruha_get_lastprocess | ดู process date ล่าสุด |
| GET | /tsuruha_process_job_TSRH_A5 | trigger stored procedure TSDC_PROCESS_JOB_TSRH_A5 |
| POST | /tsuruha_get_orderdetail | รายละเอียด order + invoice + void (filter channel/period/date) |
| POST | /tsuruha_get_orderdetail_invhistory | history invoice ต่อ order |
| POST | /tsuruha_check_order | ตรวจสอบ order เดียว |
| POST | /tsuruha_check_invoice | ตรวจสอบว่า invoice ถูกใช้กับ order อื่นหรือไม่ |
| POST | /tsuruha_update_invoice | อัปเดต invoice + clear void ถ้า invno เปลี่ยน |
| POST | /tsuruha_cancel_invoice | ยกเลิก invoice (delete mapping) |
| POST | /tsuruha_history_invoice | insert ประวัติ invoice |
| POST | /tsuruha_get_history_invoice | ดู history mapping ของ invoice |
| POST | /tsuruha_check_void | ตรวจสอบว่า void ซ้ำกับ invoice อื่นหรือไม่ |
| POST | /tsuruha_update_void | อัปเดต void number + void date + void amount |

### ตาราง Database
| ตาราง | Operation | คอลัมน์สำคัญ | หมายเหตุ |
|-------|-----------|--------------|---------|
| [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER | SELECT, UPDATE | ORDER_NUMBER, ORDER_DATE, CHANNEL, TSRH_AMT, TSRH_INVNO, TSRH_VOIDNO, TRACKING_NO, RTS_STATUS, WORK_PERIOD, Manht_process_date | header order Tsuruha |
| [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_DETAIL | SELECT | ORDER_NUMBER, ITEM, ITEM_NAME, ITEM_BARCODE, TOTAL_QTY, TSRH_SKU_AMT | detail item ต่อ order |
| [10.26.1.11].[TSDC_Conveyor].dbo.TSURUHA_INVOICE_MAPPING | SELECT, INSERT, UPDATE, DELETE | ORDER_NUMBER, TSRH_INVNO, TSRH_VOIDNO, CREATE_DATE, UPDATE_DATE, UPDATE_VOIDNO_DATE, REMARK, INV_DATE, VOID_DATE, VOID_AMT | mapping invoice และ void |
| [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_CONTROL_PICK_TSURUHA_HEADER_LOG_PROCESS | SELECT | TSRH_PROCESS_DATE | log process date |

---

## สรุปตาราง Database หลักของระบบ

| ตาราง | เมนูที่ใช้ | หมายเหตุ |
|-------|-----------|---------|
| TSDC_PICK_CHECK_NEW | 2, 4, 5, 11, 13 | ตารางหลักเช็คสินค้าทุกประเภท |
| TSDC_PICK_CHECK_NEW_TRACKING | 3 | เช็คสินค้าแบบมี tracking ต่อชิ้น |
| TSDC_PICK_CHECK_BOX_CONTROL_NEW | 2, 3, 4, 6, 7, 13 | header box ที่ปิดแล้ว |
| TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW | 2, 3, 4, 13 | detail item ในแต่ละ box |
| TSDC_PICK_CHECK_LOG_NEW | 2, 3 | log การ scan แต่ละครั้ง |
| TSDC_PICK_CHECK_CONFIRM_ORDER | 2 | ยืนยัน order เสร็จสมบูรณ์ |
| TSDC_CONFIRM_OUTBOUND | 9 | tracking outbound ส่ง courier |
| TSDC_CONTAINER_MAPORDER | 2, 5 | map container → order |
| TSDC_USER_TABLECHECK | 8 | check-in/out พนักงาน |
| TSDC_SHOPEE_PACKAGE_HD | 15 | RTS status |
| TSDC_PICK_CHECK_PRINTCANCEL | 12 | log พิมพ์สลิป cancel |
| TSDC_COMFIRM_PACKINGLIST | 13 | ยืนยัน packing list ATH |
| TSDC_CONTROL_PICK_TSURUHA_HEADER | 19 | Tsuruha order header |
| TSURUHA_INVOICE_MAPPING | 19 | invoice/void mapping |
| [ILS].INTERFACE_ERROR | 16 | error จาก ILS system (10.26.1.83) |
| TSDC_MANHT_PICK_PAPER | 14, 18 | ใบ pick ตาม wave |
| TSDC_ORDER_TRACKING_INTERNAL_* | 17 | tracking สถานะ order ภายใน |
