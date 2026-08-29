# API: `insert_video_hd`

บันทึกไฟล์วิดีโอลงตาราง `[TSDC_INTERNAL].[dbo].[TSDC_VIDEO_HD]`

- **โค้ด API:** `D:\TSDC PROJECT\TSDC-Api.21\API\tsdc-project\server\api.js` (ต่อท้ายไฟล์)
- **DB จริง:** `10.26.1.21` / `TSDC_INTERNAL` (ใน `connect.js` ตั้งเป็น alias `API_TSDC` ซึ่ง resolve ได้เฉพาะบนเครื่อง server)
- **Endpoint:** `POST http://10.26.1.21:1661/api/insert_video_hd`

## เรียก 3 จังหวะต่อการอัด 1 รอบ

เขียนแถวตั้งแต่ **เริ่มอัด** และปิดแถวทีละ segment ทันทีที่ไฟล์นั้นเขียนจบ ไม่ต้องรอทั้งออเดอร์
ตัวอัปโหลดจึงทำงานคู่ขนานไปกับการอัดได้ และถ้าเครื่องดับ จะเสียแค่ไฟล์ที่กำลังเขียนอยู่ตัวเดียว

| จังหวะ | ส่งอะไร | ผลที่ DB |
|---|---|---|
| **เริ่มอัด** | `-001.mp4` sta `2` ขนาด 0 `FDEnddate` ว่าง | INSERT |
| **ตัด segment ใหม่** | `-00N` sta `0` (ขนาด+เวลาจบจริง) **และ** `-00N+1` sta `2` | UPDATE + INSERT |
| **อัดจบ** | ทุก segment sta `0` | ตัวสุดท้าย UPDATE ที่เหลือ UPDATE ซ้ำ (ไม่มีผลเสีย) |
| *(ตัวอัปโหลด)* | — | UPDATE sta `1` ตอนอัปขึ้น server สำเร็จ |

ชื่อไฟล์ segment แรกรู้ได้ตั้งแต่ตอน start เพราะ pattern จบด้วย `-001.mp4` เสมอ (`-segment_start_number 1`) จึงใช้ `FTVideo_name` เป็นกุญแจ upsert ได้

agent รู้ว่า segment ปิดแล้วโดยส่องโฟลเดอร์ทุก 3 วินาที — **ffmpeg เปิดไฟล์ถัดไป = ไฟล์ก่อนหน้าปิดสมบูรณ์** ซึ่งเชื่อถือได้กว่าการรอให้ขนาดไฟล์นิ่ง (กล้องนิ่งๆ ก็ทำให้ขนาดไม่ขยับได้)
ผลข้างเคียง: `FDEnddate` อาจช้ากว่าจุดตัดจริงได้ถึง 3 วินาที ซึ่งไม่มีนัยสำคัญเทียบกับ segment ละ 5 นาที

### วงจรของ FNStaUpload

```
2 = กำลังเขียนไฟล์นี้   ->   0 = ไฟล์ปิดแล้ว รอ upload   ->   1 = upload ขึ้น server แล้ว
```

**แถวที่ค้างที่ `2`** แปลว่าไฟล์นั้นเขียนไม่จบ (เครื่องดับ / agent ตาย / ffmpeg พัง) — `FDEnddate` จะเป็น NULL ด้วย ควรมี job คอยกวาดแถวพวกนี้ ไม่งั้นตัวอัปโหลดที่จับเฉพาะ `0` จะมองไม่เห็นและไฟล์จะค้างอยู่ที่เครื่องโต๊ะเช็คตลอดไป

## ⚠️ ตารางนี้มีระบบอื่นใช้ร่วมอยู่

ระบบ **"Tsdc Camera Vision"** เขียนลงตารางนี้มาตั้งแต่ 2024 (618 แถว ณ 2026-08-15) ต้องรักษา convention ให้ตรงกัน

| เรื่อง | ของ Camera Vision เดิม | ของ recording-agent |
|---|---|---|
| `FCFile_size` | **หน่วย MB** เช่น `42.42` | MB เหมือนกัน (แปลงจากไบต์ก่อนส่ง) |
| `FTStaDesc` | `Insert success` / `Update success` / `Upload file success` | `Recording` ตอนอัด, `Insert success` ตอนจบ |
| `FNStaUpload` | ใช้แค่ `0` กับ `1` | เพิ่ม `2` = กำลังอัด (เลขนี้เดิมยังไม่มีใครใช้) |
| `FTUser_create` | ชื่อโปรแกรม เช่น `Tsdc Camera vision 66.0.0.1.1` | ชื่อโปรแกรม `TSDC Recording Agent 1.0` (ดูคนแพ็คจาก `FTPin_code`) |
| `FTVideo_name` | `{id}-{table}-{order}-Date(YYYY-MM-DD)-Time(HH-mm-ss).mp4` | `{tablecheck}-{order}-DDMMYYYY-HHmmss-{running}.mp4` — **ต่างกัน** |
| `FTPath_server` | `\\10.26.1.26\Dev\Video\YYYY\MM\DD\...` | ยังไม่ได้ทำตัวอัปโหลด ปล่อย NULL |

## Request

`VIDEO_LIST` **1 รายการ = 1 แถว**

สถานะและเวลาอยู่ **ในแต่ละรายการ** ไม่ใช่ระดับบนสุด เพราะคำขอเดียวอาจมีทั้งไฟล์ที่ปิดแล้ว (`0`) และไฟล์ที่เพิ่งเริ่ม (`2`)
ระดับบนสุดเก็บเฉพาะข้อมูลที่เหมือนกันทุกไฟล์ในการอัดรอบนั้น

ตัวอย่างจังหวะ **ตัด segment ใหม่**:

```json
{
  "VIDEO_LIST": [
    {
      "FTVideo_name": "P99-SO.202607-02135-15082026-111722-001.mp4",
      "FTPath": "D:\\VideoRecord\\SO.202607-02135\\P99-...-001.mp4",
      "FCFile_size": 0.75,
      "FNStaUpload": 0,
      "FTStaDesc": "Insert success",
      "FDStartdate": "2026-08-15 11:17:22",
      "FDEnddate": "2026-08-15 11:17:37"
    },
    {
      "FTVideo_name": "P99-SO.202607-02135-15082026-111722-002.mp4",
      "FTPath": "D:\\VideoRecord\\SO.202607-02135\\P99-...-002.mp4",
      "FCFile_size": 0,
      "FNStaUpload": 2,
      "FTStaDesc": "Recording",
      "FDStartdate": "2026-08-15 11:17:37",
      "FDEnddate": ""
    }
  ],
  "FTTable_id": "P99",
  "FTZone": "",
  "FTContainer_id": "CON123456",
  "FTOrder_number": "SO.202607-02135",
  "FTTracking_id": "TH123456789",
  "FTPin_code": "1234",
  "FTUser_create": "TSDC Recording Agent 1.0",
  "FTIp_address_local": "10.26.4.94"
}
```

`FDStartdate` / `FDEnddate` เป็น `YYYY-MM-DD HH:mm:ss` **ค.ศ.** — API แปลงด้วย `CONVERT(datetime, @x, 120)`
`FDEnddate` ว่าง = ไฟล์ยังเขียนไม่จบ API จะไม่แตะคอลัมน์นี้
เวลาทั้งสองเป็นของ **ไฟล์นั้น** ไม่ใช่ของทั้งออเดอร์ — `FDEnddate` ของ segment N จะเท่ากับ `FDStartdate` ของ segment N+1

> **ระวังปี พ.ศ.** ในตารางมีแถวที่ `FDCreatedate` เป็นปี **2569** หลุดเข้าไปแล้ว (ของระบบเดิม)
> ฝั่ง agent จึงแยก `sqlDateTime()` ออกจาก `nowLocal()` ที่ใช้ `th-TH` โดยเฉพาะ

## Response

```json
{
  "status": "success",
  "inserted": 4,
  "updated": 1,
  "message": "",
  "ids": [
    { "FTVideo_name": "P52-ICCZ14382-Date(2026-08-15)-Time(15-52-48).mp4", "FNVideo_id": 660 }
  ]
}
```

### `ids`

คืน `FNVideo_id` ของ **ทุกแถวใน `VIDEO_LIST`** ที่เพิ่ง insert หรือ update จับคู่ด้วย `FTVideo_name`
(ชื่อหลัง rename ถ้ารอบนั้นส่ง `FTVideo_name_old` มาด้วย)

ทำแล้วใน `TSDC-Api.21/API/tsdc-project/server/api.js` — แถวใหม่เอา id จาก `SCOPE_IDENTITY()`
ส่วนแถวที่มีอยู่แล้วอ่านกลับด้วย `FTVideo_name` (ชื่อใหม่ เพราะ UPDATE เขียนลงไปก่อนแล้ว)

**เอาไปทำอะไร:** ชื่อไฟล์ต้องขึ้นต้นด้วย `FNVideo_id` ตามรูปแบบ
`660-P52-ICCZ14382-Date(2026-08-15)-Time(15-52-48).mp4`
แต่ `FNVideo_id` เป็น IDENTITY ที่เกิดตอน insert ส่วนไฟล์ถูก ffmpeg สร้างก่อนหน้านั้นเสมอ
จึงใส่ตั้งแต่แรกไม่ได้ ลำดับจริงเป็นแบบนี้

```
1. ffmpeg สร้าง   P52-ICCZ14382-Date(...)-Time(...).mp4
2. หน้าเว็บ insert  -> API คืน ids: FNVideo_id = 660
3. หน้าเว็บสั่ง agent เปลี่ยนชื่อเป็น 660-P52-...
4. หน้าเว็บ insert ซ้ำ  FTVideo_name = "660-P52-..."
                       FTVideo_name_old = "P52-..."
   -> API หาแถวเดิมจาก name_old แล้ว update FTVideo_name กับ FTPath
```

ขั้นที่ 4 ใช้กลไก `FTVideo_name_old` ที่ API รองรับอยู่แล้ว (ของเดิมใช้ตอนตัด `-001` ออก)
ไม่ต้องทำอะไรเพิ่มนอกจากคืน `ids`

**เข้ากันได้กับของเดิม:** ถ้า API ยังไม่คืน `ids` มา หน้าเว็บจะข้ามขั้นเปลี่ยนชื่อไปเฉยๆ
ไฟล์คงชื่อ `P52-ICCZ14382-Date(...)-Time(...).mp4` และทุกอย่างทำงานต่อได้ตามปกติ
จึงขึ้น Angular กับ agent ก่อนได้ ไม่ต้องรอ API

> **ความยาว `FTVideo_name varchar(70)`** — วัดกับของจริงแล้ว (ทดสอบยิงเข้า API 22/08/2026)
>
> | ชื่อ | ยาว |
> |---|---|
> | `703-P52-ICCZ7707-Date(2026-08-15)-Time(15-52-48).mp4` | 52 |
> | `704-P52-1111869002407707-Date(2026-08-15)-Time(15-52-48)-001.mp4` | 64 |
>
> เคสยาวสุดที่เป็นไปได้จริง (ออเดอร์ 16 หลัก + `-001`) ยัง **ลงได้** แต่เหลือที่ว่างแค่ ~6 ตัว
> สูตรคือ `60 + จำนวนหลักของ FNVideo_id + 1` เมื่อ `deskName` ยาว 3 ตัวอย่าง `P52`
>
> จุดที่จะพังคือ **`deskName` ที่ยาวกว่านี้** — ตั้งชื่อโต๊ะเป็น `PACK-12` (7 ตัว) จะเกิน 70 ทันที
> ที่ id 6 หลัก ควรขยายเป็น `varchar(100)` ไว้ก่อนเริ่ม deploy หลายโต๊ะ
>
> ```sql
> ALTER TABLE [TSDC_VIDEO_HD] ALTER COLUMN [FTVideo_name] varchar(100);
> ```
>
> ถ้าชนจริง API จะตอบ `status: "error"` พร้อม `String or binary data would be truncated.`
> และแถวนั้นจะไม่ถูกเขียน (ไฟล์ยังอยู่ในเครื่องโต๊ะเช็ค ตามเก็บย้อนหลังได้)

- เริ่มอัด → `inserted:1, updated:0`
- ตัด segment → `inserted:1, updated:1`
- อัดจบ (สมมติ 3 segment) → `inserted:0, updated:3` เพราะทุกไฟล์มีแถวอยู่แล้ว

ถ้า insert พลาดบางแถวจะได้ `status: "error"` พร้อม `message` — ฝั่งหน้าเว็บ log ไว้เฉยๆ ไม่เด้ง error ใส่พนักงาน และไม่ขวาง flow การแพ็ค

## รายละเอียดตาราง

`FNVideo_id` เป็น IDENTITY (ไม่ต้องส่ง) ทุกคอลัมน์ที่เหลือเป็น NULL ได้
คอลัมน์ที่ยังไม่ได้ใช้: `FTUser_update`, `FTPath_server`, `FTCustomer_id`, `FTShop_id`

ความยาวที่ต้องระวัง: `FTVideo_name varchar(70)` (ปัจจุบันยาว ~43), `FTPath varchar(300)`, `FTTable_id/FTOrder_number/FTContainer_id varchar(70)`

## การเช็คออเดอร์เดิมซ้ำ

ชื่อไฟล์มี `HHmmss` ของเวลาที่เริ่มอัด ออเดอร์เดิมที่เอามาเช็คใหม่ในวันเดียวกันจึงได้ไฟล์คนละชุด ไม่ทับของเดิม
(ทดสอบแล้ว: อัดออเดอร์เดียวกันสองรอบห่างกัน 16 วินาที ได้ไฟล์คนละชื่อ ทั้งคู่อยู่ครบ)

นอกจากนี้ agent กรองไฟล์ที่ส่งกลับด้วยเวลาแก้ไขไฟล์ `stopped` จึงมีเฉพาะไฟล์ของรอบนั้น
