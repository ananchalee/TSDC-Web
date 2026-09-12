# API Spec — Print Tracking Group SKU

หน้าจอ: `/report-printTrackingGroupSku`
Component: `src/app/layout/reports/report-print-tracking-groupsku/`
Service methods: `src/app/services/data.service.ts`

Base URL เดิมของระบบ: `http://10.26.1.21:1661`
Backend source: `D:\TSDC PROJECT\TSDC-Api.21\API\tsdc-project\server\api.js`

ทั้ง frontend และ backend ทำครบแล้ว

---

## 1. `POST /api/Get_TrackingGroupSku`

ค้นหารายการทั้งหมดใน Group Pick หนึ่ง ๆ

### Request
```json
{ "GROUP_PICK": "G-SKU002" }
```

### Response — พบข้อมูล
```json
{
  "status": "success",
  "data": [
    {
      "COMPANY":        "LION",
      "GROUP_PICK":     "G-SKU002",
      "SHIPMENT_ID":    "1108123071536012",
      "CONTAINER_ID":   "00004000000007278523",
      "SELLER_NO":      "TH102BN",
      "TRANSPORT_CODE": "Lex",
      "TRACKING":       "LEXPU0701300632",
      "FILE_PACKING":   "Dev\\PrintLabel\\TSDC_LAZADA\\TrackingDocument\\TH102BN\\2026\\07\\20\\TH102BN_LEXPU0701300632_1108123071536012.pdf",
      "STATUS_PRINT":   "1",
      "TRACKING_DOC_P": "",
      "PALLET_NO":      "",
      "PRINT_STATUS":   "N",
      "PRINT_DATE":     "2026-07-27 15:32:27.160",
      "TABLE_CHECK":    "P999",
      "ITEM_ID":         "SKU-00123",
      "ITEM_ID_BARCODE": "8850002001234",
      "QTY":             2
    }
  ]
}
```

### `ITEM_ID` / `ITEM_ID_BARCODE` / `QTY` — สแกนไอเทมก่อนพิมพ์ + สรุปจำนวนชิ้น

3 คอลัมน์ที่เพิ่มในตาราง `TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU`
(สคริปต์ `ALTER TABLE` อยู่ที่ `docs/sql/alter-group-sku-item-columns.sql`)

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| `ITEM_ID` | `varchar(50)` | รหัสสินค้า — โชว์บน modal ว่ากลุ่มนี้ต้องหยิบของตัวไหน **ไม่ได้ใช้ตรวจตอนสแกน** |
| `ITEM_ID_BARCODE` | `varchar(50)` | barcode สินค้าของแถวนั้น ใช้เทียบกับที่พนักงานสแกนใน modal |
| `QTY` | `int` | จำนวนชิ้นของแถวนั้น (1 แถว = 1 `SHIPMENT_ID` = 1 order) |

modal โชว์ `ITEM_ID` แต่ **ไม่โชว์ `ITEM_ID_BARCODE`** ก่อนสแกน — ถ้าโชว์ barcode ไว้บนจอ
พนักงานพิมพ์ตามได้โดยไม่ต้องหยิบของจริงมาสแกน ด่านนี้ก็ไม่เหลือความหมาย

**ทำไมไม่มีคอลัมน์ "จำนวนต่อ order" แยกอีกตัว** — 1 แถวคือ 1 order อยู่แล้ว `QTY`
กับ "จำนวนชิ้นต่อ 1 order" จึงเป็นเลขตัวเดียวกัน เก็บสองที่คือเก็บค่าซ้ำ และเสี่ยงว่า
วันหนึ่งสองค่าไม่ตรงกันเพราะ job เติมมาไม่เท่ากัน frontend คำนวณจาก `QTY` ตัวเดียว:

- **ยอดรวม** = `SUM(QTY)` ของแถวที่จะพิมพ์
- **ต่อ 1 order** = รวม `QTY` ของแถวที่ `SHIPMENT_ID` เดียวกันก่อน แล้วดูว่าทุก order ได้เท่ากันไหม
  ถ้าไม่เท่ากันจะโชว์เป็นช่วง (`2 - 5`) พร้อมป้ายเตือนสีส้ม แทนที่จะโชว์เลขเดียวให้เข้าใจผิด

วิธีนี้ยังถูกต้องแม้ 1 order มีหลาย SKU ซึ่งคอลัมน์ตายตัวตอบไม่ได้

**⚠ ใครเป็นคนเติมค่า** — `api.js` ไม่มี `INSERT` ลงตารางนี้เลย แถวถูกสร้างจากระบบ/job
ภายนอก ต้องตามไปแก้ตัวที่ insert ให้เติม 2 คอลัมน์นี้ด้วย ค่าที่ควรเติมอ้างจาก
`TSDC_PICK_CHECK_NEW_TRACKING` (`ITEM_ID_BARCODE` ของไอเทม, `SUM(QTY_PICK)` ของ shipment นั้น)

**⚠ ไม่มี `ITEM_ID_BARCODE` = พิมพ์ไม่ได้** — ช่องสแกนแสดงเสมอ ไม่มีการซ่อนหรือข้าม
กลุ่มที่ข้อมูลไม่มี barcode จะสแกนไม่ผ่าน ช่องขนาดกล่องและปุ่มพิมพ์เลย disabled ค้างไว้
พร้อมป้ายเตือนว่าต้องไปเติมข้อมูลก่อน

เคยออกแบบให้ "ไม่มี barcode = ข้ามขั้นสแกน" เพื่อให้ใช้งานต่อได้ระหว่างรอ job ต้นทาง
แต่แบบนั้นกลับหัวกลับหาง — **ข้อมูลไม่ครบกลายเป็นข้ามด่านตรวจ** ทั้งที่เป็นกรณีที่ควร
ตรวจเข้มที่สุด เสี่ยงหยิบของผิดแล้วพิมพ์ทับจนสินค้าตกหล่น ตอนนี้จึงบังคับสแกนเสมอ

ไม่มี `QTY` → การ์ดสรุปโชว์ `0` (ไม่บล็อกการพิมพ์ เพราะเป็นตัวเลขไว้ดูเฉยๆ ไม่ใช่ด่านตรวจ)

### Response — ไม่พบข้อมูล
```json
{ "status": "null", "data": [] }
```

### Response — error
```json
{ "status": "error", "message": "..." }
```

### `SUB_GROUP_PICK` — กลุ่มย่อยที่ทำให้พิมพ์แยกรอบ

คอลัมน์ที่เพิ่มในตาราง (สคริปต์ที่ `docs/sql/alter-group-sku-subgroup-column.sql`)

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| `SUB_GROUP_PICK` | `varchar(50)` | กลุ่มย่อยภายใน `GROUP_PICK` เดียวกัน ใช้แยกออเดอร์ที่ `QTY` ไม่เท่ากัน |

`GROUP_PICK` ยังเป็นกลุ่มใหญ่เหมือนเดิม แต่ภายในกลุ่มอาจมีออเดอร์ที่จำนวนชิ้นไม่เท่ากัน
ซึ่งใช้ขนาดกล่องคนละแบบ จึงต้องพิมพ์แยกรอบ

**ผลกับหน้าจอ**

- **การ์ดสรุปกลายเป็น 1 ใบ ต่อ 1 คู่ `TRANSPORT_CODE` + `SUB_GROUP_PICK`**
  (เดิม 1 ใบ ต่อ 1 `TRANSPORT_CODE`) กดการ์ดไหนก็พิมพ์เฉพาะ sub นั้น ระบุขนาดกล่องแยกกันได้
- การ์ดที่ `SUB_GROUP_PICK` ว่างจะไม่โชว์บรรทัดกลุ่มย่อย — ค่าว่างเป็นค่าที่ถูกต้อง
  (กลุ่มที่ไม่ได้แบ่ง sub) ไม่ใช่ข้อมูลขาด จึงไม่มีการเตือน
- ตารางรายละเอียดเพิ่มคอลัมน์ **Sub Group** ค่าว่างแสดงเป็น `—`
- ลำดับแสดงผล = `STATUS_PRINT, TRANSPORT_CODE, SUB_GROUP_PICK, TRACKING`

**หน้า `/confirm-qty-groupsku` ไม่สนค่านี้** — นับ `QTY` และจำนวน order ตาม `GROUP_PICK`
ทั้งก้อน เพราะตอนเบิกของหยิบมาทีเดียวทั้งกลุ่ม (จึงไม่มีตัวเลข "ต่อ 1 order" ในหน้านั้น)

#### เลขพาเลทยัง**ไม่**แยกตาม sub group — ตั้งใจให้เป็นแบบนี้

`insertTracking_confirmOutbound_groupsku` หาเลขพาเลทเดิมโดยดูแค่ `GROUP_PICK + TRANSPORT_CODE`
ไม่ได้ดู `SUB_GROUP_PICK` ดังนั้นทุก sub ของ group+ขนส่งเดียวกัน **ใช้เลขพาเลทใบเดียวกัน**

- sub แรกที่พิมพ์ = run เลขใหม่ `FA+YYMMDD+running`
- sub ถัดมา = เจอเลขเดิมแล้วใช้ต่อ **ไม่ run ใหม่**

ตรวจแล้วว่า**ไม่ชนกันและไม่ error**: `TSDC_CONFIRM_OUTBOUND` กันซ้ำด้วยคู่ `BILL_NO + PALLET_NO`
และ tracking ของคนละ sub ไม่ซ้ำกันอยู่แล้ว ส่วนการ stamp `PALLET_NO` กลับก็กรองด้วย
`TRACKING in (...)` ที่ส่งเฉพาะของ sub นั้น

**ผลที่ตามมา — ใบปะหน้าพาเลทออกมามากกว่า 1 ใบ ต่อ 1 พาเลท**
ใบปะหน้าพิมพ์ 2 บรรทัด: `SHIPMENTS (this print)` = เฉพาะรอบนั้น และ `TOTAL ON PALLET` = สะสมทั้งพาเลท
พิมพ์ sub A ได้ `10 / 10` แล้วพิมพ์ sub B ได้ `8 / 18` — เลข 18 ถูกต้อง แต่ใบแรกกลายเป็นข้อมูลเก่า

> **กติกาหน้างาน: ใช้ใบปะหน้าใบล่าสุด เอาใบเก่าออก**

ถ้าวันหนึ่งต้องการให้แต่ละ sub มีพาเลทของตัวเอง ต้องแก้ 2 ที่ — เพิ่ม `SUB_GROUP_PICK`
ในเงื่อนไขหาเลขเดิม/ตอน update ใน `api.js` และให้ Angular ส่งค่านั้นไปใน payload ด้วย

### `STATUS_PRINT` — ตัวแยกว่าแถวนี้พิมพ์แบบไหน

| `STATUS_PRINT` | ตัวอย่าง `TRANSPORT_CODE` | `TRACKING` / `FILE_PACKING` | ทำอะไร |
|---|---|---|---|
| `1` | Lex, Flash, ... | มีทั้งคู่ | สแกนไอเทม → ระบุขนาดกล่อง → **running** → พิมพ์ PDF จาก `FILE_PACKING` |
| `2` | DocP | ว่างทั้งคู่ | สแกนไอเทม → ระบุขนาดกล่อง → **running** → พิมพ์ใบ tracking running (html) |
| `3` | Cancel | ว่างทั้งคู่ | เลือก Zone → พิมพ์ใบ Cancel — **ไม่ running** |

`1` กับ `2` ใช้ modal ระบุขนาดกล่องตัวเดียวกัน ต่างกันแค่พิมพ์อะไรหลัง running เสร็จ

ทั้งคู่ต้อง **สแกน barcode ไอเทมให้ผ่านก่อน** ช่องขนาดกล่องถึงจะกรอกได้ (สแกนครั้งเดียวต่อการเปิด modal 1 ครั้ง)

frontend แยกทางด้วย `STATUS_PRINT` เป็นหลัก เพราะเป็นเลขที่ระบบคุมเอง —
ขนส่งเจ้าใหม่เข้ามาก็ได้ `1` อัตโนมัติ ไม่ต้องแก้โค้ด ส่วน `TRANSPORT_CODE`
เป็น free text ใช้แค่ group การ์ดกับแสดงผล

ถ้า `STATUS_PRINT` ว่าง/ไม่ใช่ 1-3 จะ fallback ไปดู `TRANSPORT_CODE`
(`Cancel` → 3, `DocP` → 2, นอกนั้น → 1) กันข้อมูลไม่ครบ

### หมายเหตุการใช้งานฝั่ง frontend
- `TRANSPORT_CODE` ใช้ group เป็นการ์ดสรุป + นับจำนวน (ค่าว่างจะถูกจัดเป็นกลุ่ม `(ไม่ระบุ)`)
- `PRINT_STATUS === 'N'` ถือว่า **ยังไม่พิมพ์** ใช้แสดง badge "รอพิมพ์" บนการ์ด
  (คนละตัวกับ `STATUS_PRINT` ที่เป็นชนิดของการพิมพ์)
- **พิมพ์แล้วจะพิมพ์ซ้ำไม่ได้** — ทุก flow ใช้เฉพาะแถวที่ `PRINT_STATUS = 'N'` เป็นตัวตั้ง
  การ์ดที่ไม่เหลือรายการรอพิมพ์จะถูก `disabled`
- ลำดับการแสดงผล (ทั้งการ์ดและตาราง) = `STATUS_PRINT, TRANSPORT_CODE, TRACKING`
- ตารางแสดง `TRACKING_DOC_P` (เลข running) และ `PALLET_NO` ด้วย ค่าว่างแสดงเป็น `—`
- `FILE_PACKING` ที่เป็นค่าว่าง/null จะถูกข้ามตอนพิมพ์ และนับเป็น badge "ไม่มีไฟล์"
  (นับเฉพาะกลุ่ม `STATUS_PRINT = 1` — กลุ่ม 2/3 ไม่ได้ใช้ไฟล์อยู่แล้ว)
- `TRACKING_DOC_P` = เลข running (`REF_INDEX`) ที่ระบบเขียนกลับหลังกดพิมพ์

---

## 2. `POST /api/Update_PrintStatus_TrackingGroupSku`

อัปเดต `PRINT_STATUS` + `PRINT_DATE` ในตาราง **`TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU`**
— frontend เรียกหลังสั่งพิมพ์สำเร็จ ใช้ทั้ง 2 ทาง: พิมพ์ PDF ปกติ และพิมพ์ใบ Cancel

### Request
```json
{
  "GROUP_PICK":     "G-SKU002",
  "TRANSPORT_CODE": "Lex",
  "ROWS": [
    { "SHIPMENT_ID": "1108123071536012", "TRACKING": "LEXPU0701300632" },
    { "SHIPMENT_ID": "1108123071536013", "TRACKING": "LEXPU0701283189" },
    { "SHIPMENT_ID": "1108123071536014", "TRACKING": "" }
  ]
}
```

`ROWS` = เฉพาะรายการที่ **ถูกส่งเข้าเครื่องพิมพ์จริง** (ตัดคู่ซ้ำออกแล้ว)
รายการที่ไม่มี `FILE_PACKING` จะไม่อยู่ใน array นี้

**ใบ Cancel ไม่มี `TRACKING`** จะส่ง `"TRACKING": ""` มา — กรณีนี้ `SHIPMENT_ID`
เป็น 1 ต่อ 1 อยู่แล้ว ให้ใช้ `GROUP_PICK + SHIPMENT_ID` เป็น key ได้เลย

`PRINT_STATUS` / `PRINT_DATE` **ไม่ต้องส่งมา** — API เซ็ตเองเป็น `'Y'` + `GETDATE()`
(ใช้เวลาของ DB จะได้ไม่เพี้ยนตามนาฬิกาเครื่อง client)

เงื่อนไขที่ API สร้าง (1 element ใน `ROWS` → 1 วงเล็บ ต่อกันด้วย `or`):
```sql
UPDATE TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
   SET PRINT_STATUS = 'Y', PRINT_DATE = GETDATE()
 WHERE LTRIM(RTRIM(GROUP_PICK)) = @GROUP_PICK
   AND (
         (SHIPMENT_ID = '1108123071536012' and TRACKING = 'LEXPU0701300632')
      or (SHIPMENT_ID = '1108123071536014')          -- ใบ Cancel: ไม่มี TRACKING
       )
   AND LTRIM(RTRIM(TRANSPORT_CODE)) = @TRANSPORT_CODE
```

ค่าที่เป็นค่าว่างจะถูกตัดออกจากวงเล็บนั้นเอง (ไม่มี `TRACKING` → เหลือ `SHIPMENT_ID` อย่างเดียว)

### Response
```json
{ "status": "success" }
```
```json
{ "status": "error", "message": "..." }
```

หลังได้ `success` ฝั่ง frontend จะยิง `Get_TrackingGroupSku` ซ้ำเพื่อ refresh หน้าจอเอง

---

## 2.1 `POST /api/tracking_running_groupsku` (เส้นใหม่)

สร้างเลข running (`REF_INDEX`) ให้ 1 shipment แล้วเก็บกลับที่ `TRACKING_DOC_P`
เรียกก่อนพิมพ์เสมอสำหรับ `STATUS_PRINT = 1` และ `2`

### ทำไมต้องเขียนเส้นใหม่ ไม่ใช้ `/tracking_running` เดิม

`/tracking_running` ออกแบบมาให้หน้า `audit-check-tracking` ซึ่ง**สแกนไอเทมทีละชิ้น** —
แถวใน `TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW` ถูกสร้างไว้ตั้งแต่ตอนสแกนแล้ว
เส้นนั้นจึงแค่ **insert 1 (`BOX_CONTROL_NEW`) + update 1 (`DETAIL_NEW`)**

หน้ารายงานนี้ไม่ได้สแกนทีละชิ้นแบบนั้น (สแกนไอเทมใน modal เป็นแค่การ **ตรวจว่าหยิบของถูกกลุ่ม**
ไม่ได้เขียนแถวลง `DETAIL_NEW`) → ไม่มีแถว `DETAIL_NEW` ที่ `REF_INDEX is null`
ถ้าเรียกเส้นเดิมจะ insert ได้ 0 แถว และ update ไม่โดนอะไรเลย
เส้นใหม่จึง **insert ทั้ง 2 ตาราง** โดยหลักการ running คงเดิมทุกอย่าง

### Request
```json
{
  "GROUP_PICK":    "G-SKU000",
  "shipment_id":   "1116452398888092",
  "SELLER_NO":     "TH102BN",
  "CONTAINER_ID":  "00004000000007278301",
  "TABLE_CHECK":   "P999",
  "TRACKING":      "",
  "SHIPPING_NAME": "LION",
  "BOX_SIZE":      "A3",
  "CARTON_BOX_W":  45, "CARTON_BOX_H": 30, "CARTON_BOX_L": 35, "CARTON_BOX_WEIGHT": 0.8
}
```
`TRACKING` ว่างได้ (DocP ไม่มี) — ถ้าว่างจะไม่เอาไปกรองตอนหาไอเทม
ส่วนขนาดกล่องมาจาก `check_master_box` ทั้ง `STATUS_PRINT = 1` และ `2`

`TABLE_CHECK` ว่างได้ — API จะ fix เป็น **`P999`** ให้ (frontend ก็เติมให้เหมือนกัน
ผ่าน `DEFAULT_TABLE_CHECK` เพื่อให้ใบที่พิมพ์ออกมาโชว์เลขโต๊ะตรงกับที่บันทึกลง DB)

`SHIPPING_NAME` ใช้ค่าจาก **`COMPANY`** ของแถวนั้น (ลงคอลัมน์ `CUST_NAME` ใน
`TSDC_PICK_CHECK_BOX_CONTROL_NEW` และแสดงบนใบ track ช่อง Shipping Name)

### ⚠ 2 บั๊กในสูตร running เดิมที่แก้แล้วในเส้นนี้

เส้นเดิม `/tracking_running` สมมติว่า `TABLE_CHECK` ยาว **3 ตัว** ซึ่งไม่จริงกับ `P999`:

| ปัญหา | ของเดิม | เส้นใหม่ |
|---|---|---|
| กรองงานของวันนี้ | `SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate())` — `P999` ทำให้ได้ `'926080'` → **convert เป็น date ไม่ได้** | `CAST(CREATE_DATE AS date) = CAST(getdate() AS date)` |
| ความยาวตัวแปร | `varchar(13)` แต่ `'P999'+'260801'+'0001'` = **14 ตัว** → ถูกตัดเงียบ ๆ **`REF_INDEX` ซ้ำกันทั้งวัน** | `varchar(20)` |

บั๊กตัวแรกจะเงียบตอนใบแรก (ยังไม่มีแถวของโต๊ะนั้นให้ประเมิน `SUBSTRING`)
แล้วค่อยระเบิดตอน **ใบที่ 2**

### ⚠ ต้องเรียกทีละใบ ห้ามยิงขนาน

`REF_INDEX` มาจาก `MAX(TABLE_RUNNING)+1` ถ้ายิงหลายคำขอพร้อมกัน ทุกคำขอจะอ่าน
`MAX` ได้ค่าเดียวกันก่อนที่ใบแรกจะ insert เสร็จ → ได้ `REF_INDEX` ซ้ำ →
`Violation of PRIMARY KEY constraint 'PK_TSDC_PICK_CHECK_BOX_CONTROL_NEW'`

กันไว้ 2 ชั้น:
- **frontend** — `runTracking()` ต่อ promise เป็นสายเดียว (`reduce`) ยิงทีละใบตามลำดับ
  ไม่ใช้ `Promise.all` เหมือน flow อื่นในหน้านี้
- **API** — ทั้งก้อนอยู่ใน `BEGIN TRANSACTION` + `sp_getapplock` ชื่อ
  `tracking_running_groupsku_<TABLE_CHECK>` (`@LockOwner = 'Transaction'` ปล่อยอัตโนมัติตอน commit/rollback)
  ถ้าพังกลางทางจะ `ROLLBACK` ทั้งหมด ไม่เหลือแถวค้างครึ่ง ๆ กลาง ๆ

### ทำไมใช้ `sp_getapplock` ไม่ใช่ `UPDLOCK, HOLDLOCK`

แต่ละเครื่องใช้ `TABLE_CHECK` คนละตัว เลข running จึงไม่มีทางชนกันข้ามเครื่องอยู่แล้ว —
**ล็อกควรกันเฉพาะเครื่องเดียวกัน ไม่ควรกระทบเครื่องอื่น**

`WITH (UPDLOCK, HOLDLOCK)` ทำแบบนั้นไม่ได้ เพราะ where ครอบ column ด้วย
`LTRIM(RTRIM(TABLE_CHECK))` และ `CAST(CREATE_DATE AS date)` → **non-SARGable**
SQL Server จึง seek ไม่ได้ ต้อง scan ทั้งตารางแล้วล็อกทุกแถวที่อ่านผ่าน
กลายเป็นบล็อกงานของโต๊ะอื่นไปด้วย

`sp_getapplock` ล็อกแค่ "ชื่อทรัพยากร" ที่เราตั้งเอง ไม่แตะแถวในตารางเลย
คนละ `TABLE_CHECK` = คนละชื่อ = วิ่งขนานกันได้เต็มที่

รอคิวได้สูงสุด 15 วินาที (`@LockTimeout = 15000`) เกินนั้นคืน error
`คิวสร้างเลข running ของโต๊ะนี้ไม่ว่าง กรุณาลองใหม่อีกครั้ง` แล้ว rollback

### เงื่อนไขหา `MAX(TABLE_RUNNING)` เขียนแบบ SARGable

```sql
WHERE TABLE_CHECK  = @TABLE_CHECK
  AND CREATE_DATE >= CAST(getdate() AS date)
  AND CREATE_DATE  < DATEADD(day, 1, CAST(getdate() AS date))
```

ไม่ครอบ column ด้วย `LTRIM`/`RTRIM`/`CAST` เพราะทำแบบนั้นจะใช้ index seek ไม่ได้
ต้อง scan ทั้งตารางทุกครั้งที่ running — ค่าที่ส่งมาถูก `.trim()` ตั้งแต่ฝั่ง Angular
(`fetchTrackSheet()`) และ `esc()` ฝั่ง API ตัดซ้ำอีกชั้น จึงไม่ต้องพึ่ง `LTRIM` ใน where

> ถ้าจะให้เร็วขึ้นอีก ควรมี index บน `TSDC_PICK_CHECK_BOX_CONTROL_NEW (TABLE_CHECK, CREATE_DATE)`

### ลำดับการทำงานใน SQL batch เดียว

1. คำนวณ `@TABLE_RUNNING` / `@BOX_NO_ORDER` / `@REF_INDEX` — **ยกจาก `/tracking_running` ทุกบรรทัด**
   `REF_INDEX = TABLE_CHECK + YY + MM + DD + lpad(TABLE_RUNNING,4)`
2. `INSERT` เข้า `TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW` โดย `SELECT` รายการไอเทมจริงจาก
   `TSDC_PICK_CHECK_NEW_TRACKING` (`where SHIPMENT_ID + SELLER_NO` และ `TRACKING` ถ้ามี)
   `group by ITEM_ID`, `QTY = SUM(QTY_PICK)`
3. `INSERT` เข้า `TSDC_PICK_CHECK_BOX_CONTROL_NEW` โดยรวม `sum(QTY)` จากแถวที่เพิ่ง insert
4. `UPDATE TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU SET TRACKING_DOC_P = @REF_INDEX`

### Response
```json
{ "status": "success",
  "data": [{ "REF_INDEX": "P9992608010001", "BOX_NO_ORDER": 1, "TABLE_RUNNING": 1,
             "PO_NO": "1116452398888092", "SELLER_NO": "TH102BN", "QTY": 12 }] }
```
```json
{ "status": "null", "message": "ไม่พบรายการไอเทมของ shipment นี้" }
```

> ⚠ `status: 'null'` เกิดเมื่อหา shipment นั้นใน `TSDC_PICK_CHECK_NEW_TRACKING` ไม่เจอ
> (`QTY = 0`) — frontend จะข้ามใบนั้นแล้วไปรวมในรายการ "ไม่สำเร็จ" ท้ายงาน
> ไม่พิมพ์ใบที่ไม่มีของ

---

## 2.2 `POST /api/insertTracking_confirmOutbound_groupsku` (เส้นใหม่)

confirm outbound ยกชุด + run เลขพาเลท — เรียกหลังพิมพ์ PDF สำเร็จ **เฉพาะ `STATUS_PRINT = 1`**

### ทำไมต้องเขียนเส้นใหม่

`/insertTracking_confirmOutbound` เดิม insert ได้ **ทีละ 1 tracking** และรับ `PALLET_NO`
ที่คนสแกนพิมพ์เข้ามาเอง (ใช้ในหน้า `outbound-scantracking`)
หน้านี้ต้อง insert หลาย tracking ในคำขอเดียว และต้อง **run เลขพาเลทให้เอง**

### Request
```json
{
  "GROUP_PICK":        "G-SKU000",
  "TRANSPORT_CODE":    "Lex",
  "PIN_ID":            "P999",
  "INTERNAL_ID":       "",
  "SHIP_PROVIDER_OOD": "Lex",
  "ROWS": [ { "TRACKING": "LEXPU0701300632" }, { "TRACKING": "TH29108Z0E8V2F" } ]
}
```
`ROWS` = เฉพาะ tracking ที่ **โหลดไฟล์ได้และถูกส่งเข้าเครื่องพิมพ์จริง**
(ไฟล์เสีย/โหลดไม่ได้ จะไม่เข้าพาเลท)

### เลขพาเลท

รูปแบบ **`FA` + `YY` + `MM` + `DD` + running 4 หลัก** (รวม 12 ตัว) เช่น `FA2608010001`

- **1 เลข ต่อ 1 `GROUP_PICK` + `TRANSPORT_CODE`** — กดพิมพ์ซ้ำหรือพิมพ์เพิ่มทีหลัง
  จะได้เลขเดิม ไม่สร้างใหม่ (หาจากคอลัมน์ `PALLET_NO` ใน `TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU`)
- running นับต่อวันจาก `MAX(RIGHT(PALLET_NO,4))` ใน `TSDC_CONFIRM_OUTBOUND`
  กรองเฉพาะ `LIKE 'FA' + YYMMDD + '%'`, `LEN = 12` และ 4 ตัวท้ายเป็นตัวเลขล้วน
  (กันเลขพาเลทที่คนพิมพ์มือรูปแบบอื่นมาปนแล้ว `CAST` พัง)
- ล็อกด้วย `sp_getapplock` ชื่อ `pallet_running_groupsku` — เป็น counter รวมทั้งระบบ
  จึงต้องใช้ชื่อเดียว (ต่างจาก running ของ `REF_INDEX` ที่แยกตาม `TABLE_CHECK`)

### ลำดับการทำงาน

1. หา `PALLET_NO` เดิมของ `GROUP_PICK + TRANSPORT_CODE` — ถ้าไม่มีค่อย run ใหม่
2. `UPDATE ..._GROUP_SKU SET PALLET_NO = @PALLET_NO` เฉพาะแถวที่อยู่ใน `ROWS`
3. `INSERT INTO TSDC_CONFIRM_OUTBOUND` (local) ทีเดียวหลายแถวผ่าน `(values (...),(...)) v(TRACK_CODE)`
   กันซ้ำด้วย `NOT EXISTS` ที่ key = **`BILL_NO` + `PALLET_NO`** (ไม่ใช่ `BILL_NO` อย่างเดียว)

   > ⚠ ห้าม key ด้วย `BILL_NO` อย่างเดียว — tracking หนึ่งอาจเคยถูก confirm มาก่อนจากหน้า
   > `outbound-scantracking` หรือจากพาเลทอื่น ถ้าเช็คแค่ `BILL_NO` จะโดนกรองทิ้งหมด
   > แล้วพาเลทใหม่จะไม่มีข้อมูลเลย (`INSERTED = 0`)
   > — ยึดตามแบบเดียวกับ `/update_Tracking_confirm_outbound2` ที่ key ด้วย `bill_no + pallet_no`
4. `COMMIT` — จบ query ที่ 1

จากนั้น **ยิง query ที่ 2 แยกต่างหาก** เพื่อ sync ไป
`[10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND`
โดย select จาก local ด้วยเลขพาเลทที่เพิ่งได้:

```sql
insert into [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND
select A.* from TSDC_CONFIRM_OUTBOUND A
where LTRIM(RTRIM(A.PALLET_NO)) = '<PALLET_NO>'
and not exists (select 1 from [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_CONFIRM_OUTBOUND B
                where LTRIM(RTRIM(B.BILL_NO)) = LTRIM(RTRIM(A.BILL_NO)))
```

### ⚠ ทำไมต้องแยกเป็นคนละ query ไม่ใช่ต่อท้ายก้อนเดียวกัน

**syntax error เป็น compile-time ของทั้ง batch** — ถ้ารวมไว้ก้อนเดียว แล้วส่วนที่อ้าง
linked server มีปัญหา (syntax / สิทธิ์ / MSDTC / ลิงก์ขาด) SQL Server จะ**ไม่รันอะไรเลย
ทั้งก้อน** ฝั่ง local จึงไม่ได้ข้อมูลไปด้วย ทั้งที่ SQL ฝั่งนี้ถูกต้อง

อีกเรื่องคือ เขียน linked server ภายใน `BEGIN TRANSACTION` จะกลายเป็น
**distributed transaction** ต้องมี MSDTC เปิดและ config ไว้ทั้ง 2 เครื่อง ถ้าไม่มีจะ error
`OLE DB provider ... was unable to begin a distributed transaction` แล้ว rollback ฝั่ง local ทิ้งด้วย

แยกออกมาแล้ว: local `COMMIT` เสร็จก่อน → sync ล้มก็ล้มเฉพาะตัวมันเอง
ข้อมูลฝั่ง local ยังครบ frontend ยังพิมพ์ได้ตามปกติ แค่เตือนให้ตาม sync ทีหลัง

### Response
```json
{ "status": "success",
  "data": [{ "PALLET_NO": "FA2608010001", "GROUP_PICK": "G-SKU000",
             "TRANSPORT_CODE": "Lex", "INSERTED": 12, "QTY_BOX": 25,
             "REMOTE_ERROR": "" }],
  "query": "...", "query_remote": "..." }
```
`INSERTED` = จำนวนแถวที่ insert ลง local จริงรอบนี้ (`@@ROWCOUNT`) — ถ้าได้ `0`
แปลว่า tracking ทุกตัวมี `BILL_NO` อยู่ใน `TSDC_CONFIRM_OUTBOUND` แล้ว (โดน `NOT EXISTS` กรองออก)
`QTY_BOX` = ยอดสะสมทั้งพาเลท — **1 shipment = 1 กล่อง** จึงนับ `SHIPMENT_ID` แบบไม่ซ้ำ
จาก `TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU where PALLET_NO = @PALLET_NO`
(นับจาก `TSDC_CONFIRM_OUTBOUND` ไม่ได้ เพราะที่นั่นเก็บ `BILL_NO` = `TRACKING` ไม่ใช่ shipment)

ส่วนจำนวน shipment ที่พิมพ์**รอบนี้** frontend นับเองจาก `ROWS`

`REMOTE_ERROR` ว่าง = sync ไปเครื่อง Conveyor สำเร็จ ถ้าไม่ว่าง frontend จะยัง
พิมพ์ตามปกติแต่เด้ง Swal เตือนว่า "ส่งข้อมูลไปเครื่อง Conveyor ไม่สำเร็จ" พร้อมข้อความ error

ถ้าเส้นนี้ล้มทั้งเส้น **ไม่ทำให้การพิมพ์ล้ม** — frontend จะข้ามใบปะหน้าแล้วพิมพ์ PDF ต่อตามปกติ

---

## 3. `GET /api/downloadfile_NetworkPath` (มีอยู่แล้ว — ไม่ต้องแก้)

ใช้ตัวเดิมที่ `printLabel()` ใน `audit-check-tracking` ใช้อยู่

```
GET /api/downloadfile_NetworkPath?networkKey=23&path=<encodeURIComponent(path)>
-> responseType: blob (application/pdf)
```

กติกา `networkKey` ที่ frontend ใช้ (ยกมาจากโค้ดเดิม):
- path ขึ้นต้นด้วย `TSDC_PACKING` → `26`
- นอกนั้น (รวม `Dev\PrintLabel\...`) → `23`

frontend แปลง `\` เป็น `/` ก่อนส่งเสมอ

---

## 4. กรณีพิเศษ — `TRANSPORT_CODE = 'Cancel'`

กลุ่มนี้ **ไม่ใช้ `FILE_PACKING`** แต่พิมพ์ "ใบ Cancel" จากข้อมูล order
1 ใบ ต่อ 1 `SHIPMENT_ID` (นับแบบไม่ซ้ำ) — layout ยกมาจาก `audit-check-tracking`

เทียบชื่อแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ (`Cancel`, `CANCEL`, `cancel` เข้าเงื่อนไขหมด)

### ใช้ endpoint เดิม 2 เส้น (มีอยู่แล้ว ไม่ต้องแก้)

**`POST /api/CheckOrder_Cancel`** — ดึงข้อมูลสำหรับพิมพ์
```json
{
  "shipment_id": "1108123071536012", "SHIPMENT_ID": "1108123071536012",
  "CONTAINER_ID": "CT250731001", "GROUP_PICK": "G-SKU002"
}
```
API ค้นด้วย **`CONTAINER_ID`** จึงต้องส่งไปด้วยเสมอ (ค่ามาจากฟิลด์ `CONTAINER_ID`
ของแถวใน `Get_TrackingGroupSku` แถวเดียวกับที่ให้ `TABLE_CHECK`)

ใช้ฟิลด์จาก `data[0]`: `SHIPPING_NAME`, `TCHANNEL`, `SELLER_NO`, `COMPANY`, `ORDER_DATE`

**`POST /api/pickcheck_print_ordercancel`** — บันทึก log การพิมพ์
```json
{
  "shipment_id": "...", "SHIPMENT_ID": "...", "CONTAINER_ID": "...",
  "SHIPPING_NAME": "...", "TCHANNEL": "...", "SELLER_NO": "...",
  "COMPANY": "...", "ORDER_DATE": "...",
  "Zone": "Zone F1A", "TABLE_CHECK": "<TABLE_CHECK ของแถวนั้น>", "USER_NAME": "",
  "GROUP_PICK": "G-SKU002"
}
```

`TABLE_CHECK` **ไม่ได้มาจาก user ที่ login** แต่มาจากฟิลด์ `TABLE_CHECK` ของแถวใน
`Get_TrackingGroupSku` (จับคู่ด้วย `SHIPMENT_ID`) เพราะหน้านี้เป็นการ**พิมพ์ซ้ำ**
ใบเดิม จึงต้องคงหมายเลขโต๊ะที่เช็คจริงไว้ ไม่ใช่โต๊ะของคนที่กดพิมพ์ซ้ำ

shipment ที่ไม่มี `TABLE_CHECK` ในข้อมูลจะถูกข้ามและไปรวมอยู่ในรายการ "พิมพ์ไม่สำเร็จ"

`USER_NAME` (เดิมชื่อ `USER_CHECK`) ส่งเป็นค่าว่าง `""` เสมอ — การพิมพ์ซ้ำจากรายงาน
ไม่ผูกกับ user ที่กดพิมพ์

### ⚠ ข้อจำกัดที่รู้อยู่ — `CheckOrder_Cancel` รับทีละใบ

เมนูนี้อาจมี order cancel มากกว่า 1 รายการ แต่ `CheckOrder_Cancel` รับ
`CONTAINER_ID`/`SHIPMENT_ID` ได้ครั้งละค่าเดียว ฝั่ง frontend จึงต้อง**ยิงทีละใบวนลูป**
(N คำขอ ต่อ N ใบ) — ทำงานได้ถูกต้อง แต่ไม่ประหยัด

ถ้าจำนวน cancel ต่อ group เริ่มเยอะ (เกิน ~20 ใบ) แนะนำให้ backend เพิ่มเส้น bulk:

```
POST /api/CheckOrder_Cancel_Bulk
  { "SHIPMENT_ID": ["...", "...", "..."] }
  -> { "status": "success", "data": [ { SHIPMENT_ID, SHIPPING_NAME, TCHANNEL,
                                        SELLER_NO, COMPANY, ORDER_DATE }, ... ] }
```
แล้วเปลี่ยน `fetchCancelSheet()` ให้เรียกเส้นเดียว — โครงส่วนอื่นไม่ต้องแก้

---

## Flow ของหน้าจอ

```
กรอก Group Pick -> Get_TrackingGroupSku
  -> group ตาม TRANSPORT_CODE เป็นการ์ด (แสดงจำนวน / รอพิมพ์ / ไม่มีไฟล์)
     การ์ดรู้ชนิดตัวเองจาก STATUS_PRINT ของแถวในกลุ่ม

  -> STATUS_PRINT = 1 (Lex/Flash/...) -> modal ระบุขนาดกล่อง
       -> check_master_box (ตรวจว่ามีจริง + ACTIVE = 'Y')
       -> ต่อ 1 คู่ SHIPMENT_ID+TRACKING: tracking_running_groupsku (ทีละใบ)
       -> downloadfile_NetworkPath ทุก FILE_PACKING (ขนาน)
       -> pdf-lib merge เป็นเล่มเดียว
       -> insertTracking_confirmOutbound_groupsku (เฉพาะใบที่โหลดไฟล์ได้) -> ได้ PALLET_NO
       -> window.print()  ใบปะหน้าพาเลท (dialog ที่ 1)
       -> iframe.print()  PDF ที่ merge แล้ว   (dialog ที่ 2)
       -> Update_PrintStatus_TrackingGroupSku -> refresh

  -> STATUS_PRINT = 2 (DocP) -> modal ระบุขนาดกล่อง (ตัวเดียวกับ STATUS_PRINT = 1)
       -> check_master_box (ตรวจว่ามีจริง + ACTIVE = 'Y')
       -> ต่อ 1 shipment: tracking_running_groupsku (ส่ง BOX_SIZE + ขนาด)
       -> render ใบ tracking running ทุกใบ (barcode = REF_INDEX)
       -> window.print()  (print dialog เด้งครั้งเดียว)
       -> Update_PrintStatus_TrackingGroupSku -> refresh

  -> STATUS_PRINT = 3 (Cancel) -> modal เลือก Zone (เลือกครั้งเดียว ใช้กับทุกใบใน batch)
       -> ต่อ 1 shipment: CheckOrder_Cancel -> pickcheck_print_ordercancel
       -> render ใบ Cancel ทุกใบ (page-break-after ต่อใบ)
       -> window.print()  (print dialog เด้งครั้งเดียว)
       -> Update_PrintStatus_TrackingGroupSku -> refresh
```

**running ทำก่อนพิมพ์เสมอ** — ถ้า `tracking_running_groupsku` ล้ม ใบนั้นจะไม่ถูกส่งเข้า
เครื่องพิมพ์และไม่ถูก mark ว่าพิมพ์แล้ว กันกรณีกระดาษออกแต่ `TRACKING_DOC_P` ไม่มีเลข

รายการที่ล้ม (ไฟล์โหลดไม่ได้ / PDF เสีย / ไม่พบข้อมูล cancel / log ไม่สำเร็จ)
จะถูกข้ามและรายงานท้ายงาน ไม่ทำให้ทั้ง batch ล้ม
และจะไม่ถูกส่งเข้า `Update_PrintStatus_TrackingGroupSku` ด้วย
