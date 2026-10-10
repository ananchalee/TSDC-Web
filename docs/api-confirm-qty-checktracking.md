# API Spec — Confirm Qty (Check Order Print Track แบบไม่สแกน item)

หน้าจอ: `/audit-check-tracking-confirm` (เมนู **Audit Check Online C**)
Component: `src/app/layout/audit-check-tracking-confirm/`
Backend source: `D:\TSDC PROJECT\TSDC-Api.21\API\tsdc-project\server\api.js`

เมนูนี้ก๊อปมาจาก `/audit-check-tracking` โดย **ตัดการสแกนบาร์โค้ดสินค้าออก**
เปลี่ยนเป็นแสดงรายการสินค้า + จำนวน + ผลรวมที่ต้องจัดลงกล่อง แล้วให้กดปุ่มยืนยันครั้งเดียว
ขั้นตอนหลังจากนั้น (เลือก tracking / สแกนขนาดกล่อง / พิมพ์ / อัดวิดีโอ) **เหมือนเมนูเดิมทั้งหมด**

---

## ลำดับการทำงานบนหน้าจอ

```
1. สแกน CONTAINER        -> CheckWork_track -> CheckConOnlinetrack / CheckConOffline /
                            CheckCon_Orderconfirm  (เหมือนเมนูเดิม)
2. ออเดอร์หลาย tracking   -> หน้าเลือก TRACKING -> กดเริ่มงาน (startWork)
                            จากนั้นสั่ง agent เริ่มอัดวิดีโอเหมือนเดิม
3. หน้ายืนยันจำนวน        -> ตารางรายการสินค้า + จำนวนที่ต้องจัด + ผลรวม (ไม่มีช่องสแกน item)
   กด "ยืนยันจำนวน"       -> tracksum_qty (ด่านกัน tracking อื่นค้าง)
                            -> confirmQtyChecktrack  << endpoint ใหม่ตัวเดียวที่เพิ่ม
                            -> summaryConCheck/loadallsum เห็น SUMCHECK = SUMCON
                               จึงเปิด modal ปิดกล่องให้เอง
4. สแกนขนาดกล่อง          -> check_master_box -> tracking_running -> พิมพ์ -> วิดีโอหยุด
```

งาน **SORTER ใช้เมนูนี้ไม่ได้** (ไม่มี tracking / เขียนคนละเส้น) หน้าจอจะเตือนให้กลับไปใช้เมนูสแกนเดิม

---

## `POST /api/confirmQtyChecktrack`

แทนลูปเดิมที่ยิงทีละชิ้น (`BOX_CONTROL_DETAIL` + `updateConQtyChecktrack`)
ออเดอร์ 100 ชิ้นเดิมต้องยิง ~300 request ตัวนี้ยิงครั้งเดียว

### payload

ส่ง `this.input` ทั้งก้อนเหมือน endpoint อื่นของหน้านี้ ตัวที่ใช้จริง:

| field | ใช้ทำอะไร |
|---|---|
| `shipment_id`, `SELLER_NO` | key ของออเดอร์ |
| `conditiontracking` | ถ้ามีค่า = กรองเฉพาะ tracking ที่เลือก (frontend ส่งมาเป็นชิ้นส่วน SQL, API แกะเอาแต่ค่า) |
| `TRACKING` | เลข tracking ที่จะประทับลงแถวกล่องใหม่ (ว่าง = NULL เหมือน flow สแกน) |
| `CONTAINER_ID` | ลงใน `CONTAINERID` ของแถวกล่อง และใน log |
| `TABLE_CHECK` | โต๊ะเช็ค ใช้เป็น key หาแถวกล่องที่ยังไม่ปิด |
| `USER_NAME` | ลง `USER_CHECK` ของ `TSDC_PICK_CHECK_NEW_TRACKING` + log |
| `PIN_CODE` | ลง `USER_CHECK` ของแถวกล่อง (ตามที่ flow สแกนทำ) |

### ทำอะไรกับฐานข้อมูล (ครอบ transaction เดียว)

คิด `@remain` = `sum(QTY_PICK - QTY_CHECK)` ต่อ `ITEM_ID` + `ITEM_ID_BARCODE`
โดยข้าม `ORDER_TYPE = 'CANCEL'` (ให้ตรงกับ `CheckConOnlinetrack` ที่ไม่นับ CANCEL ใน SUMCON/SUMCHECK)

1. `TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW` — แถวที่ `REF_INDEX is null` ของบาร์โค้ดนั้นอยู่แล้ว
   (เคยสแกนค้างไว้) → `QTY = QTY + remain`
2. บาร์โค้ดที่ยังไม่มีแถว → insert แถวใหม่ `REF_INDEX = NULL`, `QTY = remain`
   **ต้องมีแถวนี้ ไม่ใช่แค่ QTY_CHECK** เพราะ `tracking_running` (ตอนปิดกล่อง) รวมจำนวนจากตารางนี้
3. `TSDC_PICK_CHECK_NEW_TRACKING` → `QTY_CHECK = QTY_PICK`, `USER_CHECK`, `TABLE_CHECK`,
   `END_DATE_TIME = getdate()`, `START_DATE_TIME` เซ็ตให้ถ้ายังเป็น 0 ชิ้น
4. `TSDC_PICK_CHECK_LOG_NEW` → 1 แถวต่อ item (ไม่ใช่ต่อชิ้นแบบตอนสแกน)

### response

| `status` | หมายความว่า | หน้าจอทำอะไร |
|---|---|---|
| `success` | เขียนครบแล้ว `data[0].QTY_CONFIRM` = จำนวนที่เพิ่งยืนยัน | เสียง OK แล้วรีเฟรช → modal ปิดกล่องเปิดเอง |
| `nothing` | ไม่มีจำนวนคงเหลือ (ยืนยันไปแล้ว) | เตือนแล้วรีเฟรช — กดซ้ำจึงไม่ทำให้จำนวนเกิน |
| `nobarcode` | มี item ที่ `ITEM_ID_BARCODE` ว่าง (`data[0].ITEM_LIST` = รายชื่อ) | **บล็อกทั้งออเดอร์** ให้ไปแก้ข้อมูลต้นทางก่อน |
| `error` | SQL error อยู่ใน `member` | เตือนติดต่อ ADMIN |

`nobarcode` ไม่ยอมข้ามให้เพราะแถวกล่องที่ไม่มีบาร์โค้ดจะย้อนด้วย `Rescan_checkitem_track` ไม่ได้

---

## ด่านกัน tracking อื่นค้าง

`tracking_running` รวม `QTY` ของแถวที่ `REF_INDEX is null` **ทั้งออเดอร์** แต่ประทับ `REF_INDEX`
แค่ tracking ที่เลือก ถ้ายืนยัน tracking B ขณะที่ของ tracking A ยังไม่ปิดกล่องค้างอยู่
จำนวนบนกล่องจะเกินจริงและของ A จะค้างเปิดต่อไป

เมนูสแกนกันด้วย `checktracking_Inshipment` (กันตอนสแกน item) — เมนูนี้ไม่มีการสแกน
จึงกันก่อนยืนยันด้วย `tracksum_qty` แบบ**ไม่กรอง tracking** ถ้ามีแถวของ tracking อื่นค้างอยู่
จะเตือนและไม่ให้ยืนยัน ตรวจเฉพาะกรณีออเดอร์หลาย tracking (ออเดอร์ tracking เดียว
ตอนปิดกล่องเก็บแถวที่ค้างทั้งออเดอร์อยู่แล้ว)

---

## Deploy

**API ก่อน Angular** — ถ้า Angular ขึ้นก่อน ปุ่มยืนยันจะได้ 404
ไม่มี ALTER / ไม่ต้องแก้ SQL object ใดๆ (ใช้ตารางเดิมทั้งหมด)

1. `server/api.js` (endpoint `confirmQtyChecktrack`) ขึ้น API server แล้ว restart
2. build Angular (`NODE_OPTIONS=--openssl-legacy-provider ng build --configuration production`)
   แล้ว copy ลง IIS ตามปกติ
