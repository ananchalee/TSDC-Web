# API Spec — Confirm Qty Group SKU

หน้าจอ: `/confirm-qty-groupsku`
Component: `src/app/layout/confirm-qty-groupsku/`
Backend source: `D:\TSDC PROJECT\TSDC-Api.21\API\tsdc-project\server\api.js`

ยืนยันจำนวนชิ้นตอน **เบิกของ** — คนละขั้นกับการพิมพ์ tracking (`/report-printTrackingGroupSku`)
แต่ใช้ตาราง `TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU` ตัวเดียวกัน

---

## ลำดับการทำงานบนหน้าจอ

```
1. เข้าหน้า           -> LOAD_USERTABLECHECK -> ได้ PIN เดิมของ login นี้ -> โชว์ รหัส/ชื่อ/นามสกุล
2. สแกน Group Pick     -> Get_TrackingGroupSku -> โชว์รหัสสินค้า + จำนวนรวม
                          ยืนยันไปแล้ว -> โชว์ "ยืนยันแล้ว โดยใคร/เมื่อไหร่" + ปิดช่องสแกนสินค้า
3. สแกน barcode สินค้า  -> ตรงกับ ITEM_ID_BARCODE ในกลุ่ม -> โฟกัสปุ่มยืนยัน
                          ไม่ตรง -> เตือน "Item ไม่ถูกต้อง" + เสียง error แล้วให้สแกนใหม่
4. กดยืนยัน            -> Confirm_QtyGroupSku -> เขียน USER_CONFIRM + CONFIRM_DATE
```

### PIN มาจากไหน

ไม่ต้องพิมพ์ — ดึงจาก **PIN เดิมที่ login นี้เคยเช็คอินไว้** ด้วย `POST /api/LOAD_USERTABLECHECK`
(เส้นเดียวกับที่ `audit-check-tracking` ใช้) คีย์คือ `TABLE_CHECK` = `WORKER_ID`
ของ user ที่ login อยู่ API คืนแถวล่าสุดของโต๊ะนั้น

หน้าจอโชว์ **รหัส (PIN_CODE) + ชื่อ (WORKER_NAME) + นามสกุล (WORKER_SURNAME)**
เหมือนหน้า audit check

- หา PIN เดิมไม่เจอ (เครื่องใหม่ / ยังไม่เคยเช็คอิน) → ถอยไปให้กรอก PIN เอง
  แล้วเทียบกับ `get_userpincode`
- ปุ่ม **"เปลี่ยนคน"** ล้างแล้วให้กรอก PIN เองเสมอ ไม่ดึง PIN เดิมกลับมาทับ

### กติกาอื่น

- **สแกนสินค้าครั้งเดียวพอ** ทั้งกลุ่มเป็นสินค้าตัวเดียวกัน
- **ปุ่มยืนยัน disabled จนกว่าจะสแกนสินค้าผ่าน** บังคับลำดับจริง ไม่ใช่แค่บอกให้ทำ
- PIN ค้างไว้ข้ามกลุ่มได้ กด "กลุ่มถัดไป" แล้วสแกนกลุ่มใหม่ต่อได้เลย
- **⚠ ไม่มี `ITEM_ID_BARCODE` = ยืนยันไม่ได้** — ช่องสแกนแสดงเสมอ ไม่มีการซ่อนหรือข้าม
  กลุ่มที่ข้อมูลไม่มี barcode จะสแกนไม่ผ่าน ปุ่มยืนยันเลย disabled ค้างไว้ พร้อมป้ายเตือน
  ว่าต้องไปเติมข้อมูลก่อน — ยืนยันจำนวนโดยไม่ได้ตรวจของ คือความเสี่ยงที่สินค้าจะตกหล่น
  (กติกาเดียวกับหน้า Print Tracking Group SKU)

## คอลัมน์ที่ใช้

อ่านจาก `Get_TrackingGroupSku` เส้นเดิม (ดู `api-print-tracking-groupsku.md`) —
ใช้ `ITEM_ID`, `ITEM_ID_BARCODE`, `QTY`, `USER_CONFIRM`, `CONFIRM_DATE`

`USER_CONFIRM` / `CONFIRM_DATE` เพิ่มใหม่ในตาราง
(สคริปต์ `ALTER TABLE` อยู่ที่ `docs/sql/alter-group-sku-confirm-columns.sql`)

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| `USER_CONFIRM` | `varchar(20)` | PIN CODE ของคนที่กดยืนยัน (เก็บ pincode ตรงๆ เหมือน `USER_CHECK` ของ audit check) |
| `CONFIRM_DATE` | `datetime` | วันเวลาที่ยืนยัน — ใช้ `GETDATE()` ของ DB ไม่ใช่นาฬิกาเครื่อง client |

`CONFIRM_DATE IS NULL` = ยังไม่ยืนยัน และเป็นตัวกันยืนยันซ้ำไปในตัว

## จำนวนที่โชว์บนหน้าจอ

| ตัวเลข | คิดยังไง |
|---|---|
| จำนวนที่ต้องเบิกทั้งหมด | `SUM(QTY)` ของ **ทุกแถว** ในกลุ่ม — ไม่สนว่าพิมพ์ tracking ไปแล้วหรือยัง เพราะเป็นการนับของตอนเบิก คนละเรื่องกับการพิมพ์ |
| จำนวน order | `SHIPMENT_ID` ไม่ซ้ำ |

**ไม่สน `SUB_GROUP_PICK`** — นับตาม `GROUP_PICK` ทั้งก้อน เพราะตอนเบิกของหยิบมาทีเดียวทั้งกลุ่ม
`SUB_GROUP_PICK` เป็นตัวแยกตอน **พิมพ์** เท่านั้น (ดู `api-print-tracking-groupsku.md`)

ด้วยเหตุนี้จึง **ไม่มีตัวเลข "ต่อ 1 order" ในหน้านี้** — sub group คือตัวที่บอกว่าออเดอร์ไหน
จำนวนไม่เท่ากัน พอหน้านี้ไม่แยก sub เลขต่อ order ก็ไม่มีความหมาย โชว์ไปมีแต่จะทำให้เข้าใจผิด

---

## `POST /api/Confirm_QtyGroupSku`

### Request
```json
{ "GROUP_PICK": "G-SKU002", "USER_CONFIRM": "1234" }
```

`USER_CONFIRM` = PIN CODE ของคนเบิก

### Response — ยืนยันสำเร็จ
```json
{
  "status": "success",
  "rows": 12,
  "data": [{ "USER_CONFIRM": "1234", "CONFIRM_DATE": "2026-08-29 10:15:03.120" }]
}
```

### Response — มีคนยืนยันไปแล้ว
```json
{
  "status": "confirmed",
  "message": "Group Pick นี้ถูกยืนยันไปแล้ว",
  "data": [{ "USER_CONFIRM": "5678", "CONFIRM_DATE": "2026-08-29 09:40:11.500" }]
}
```

หน้าเว็บเอา `data[0]` ไปโชว์ในกล่อง "ยืนยันแล้ว" ได้เลย ไม่ต้องยิงถามซ้ำ

### Response — ไม่พบกลุ่ม
```json
{ "status": "null", "message": "ไม่พบ Group Pick นี้", "data": [] }
```

### SQL ที่ API รัน

เขียนลง **ทุกแถวของ `GROUP_PICK` นั้น** เพราะตอนเบิกยังไม่ได้แยกขนส่ง คนเบิกนับของทั้งกลุ่มรวดเดียว

```sql
update TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
   set USER_CONFIRM     = @USER_CONFIRM
      ,CONFIRM_DATE     = GETDATE()
      ,STATUS_CLOSE_MAN = 'N'
 where LTRIM(RTRIM(GROUP_PICK)) = @GROUP_PICK
   and CONFIRM_DATE is null;          -- กันยืนยันซ้ำตรงนี้
```

`STATUS_CLOSE_MAN = 'N'` เขียนพร้อมกันในคำสั่งเดียวกับ `CONFIRM_DATE` โดยตั้งใจ —
ถ้าแยกเป็น 2 คำสั่งแล้วตัวที่สองพัง จะเหลือแถวที่ยืนยันแล้วแต่สถานะไม่ตรงกัน

> **⚠ ต้องมีคอลัมน์ `STATUS_CLOSE_MAN` ในตารางก่อนขึ้น API** ไม่งั้นเส้นนี้พังทั้งเส้นด้วย
> `Invalid column name` แล้วยืนยันจำนวนไม่ได้เลย — ตรวจด้วย
> `docs/sql/check-group-sku-status-close-man.sql`

**ทำไมกันซ้ำที่ `where` ไม่ select มาเช็คก่อนแล้วค่อย update** — ถ้าสองคนกดพร้อมกัน
ทั้งคู่จะผ่าน `select` แล้วเขียนทับกัน คนหลังกลายเป็นเจ้าของการยืนยันแทน
เงื่อนไขใน `where` ทำให้คนที่สองไม่โดนสักแถว (`@@ROWCOUNT = 0`) แล้ว API คืน `confirmed` ให้แทน

`@@ROWCOUNT = 0` แยก 2 กรณีด้วยการอ่านสถานะกลับมา: มีแถวที่ `CONFIRM_DATE` ไม่ว่าง
= ยืนยันไปแล้ว, ไม่มีเลย = หา `GROUP_PICK` นี้ไม่เจอ

---

## ลำดับ deploy

1. รัน `docs/sql/alter-group-sku-confirm-columns.sql`
2. deploy API (`Get_TrackingGroupSku` อ้าง 2 คอลัมน์ใหม่ ถ้ายังไม่มีจะพังทั้งหน้า)
3. deploy Angular

## แก้เคสยืนยันผิดกลุ่ม

หน้าเว็บยืนยันซ้ำไม่ได้โดยตั้งใจ ถ้าต้องแก้ให้ล้างสถานะที่ DB แล้วให้ยืนยันใหม่ —
คำสั่งอยู่ท้ายไฟล์ `docs/sql/alter-group-sku-confirm-columns.sql`
