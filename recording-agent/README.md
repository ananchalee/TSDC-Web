# TSDC Recording Agent

Agent บันทึกวิดีโอจาก **กล้อง USB/webcam ที่ต่อกับ PC โต๊ะเช็ค** สั่งเริ่ม/หยุดจากหน้าเว็บ
`audit-check-tracking` ผ่าน WebSocket

ตามแบบใน `screen_recording_flow.drawio` — **เฟสนี้ทำเฉพาะ A–E (เก็บไฟล์ในเครื่อง)**
ยังไม่มีส่วนอัพโหลดขึ้น server (Sweep Service)

## Flow

```
Browser (Angular)                 Agent (PC โต๊ะเช็ค)
─────────────────                 ───────────────────
scan container → เริ่มงาน
  sendCommand('start', shipment)  →  spawn ffmpeg 1 ตัว เปิดกล้อง (dshow)
                                     ตัดไฟล์เองทุก 5 นาที ด้วย -f segment
                                  ←  {status:'recording', startedAtLocal}
สแกนสินค้า / ปิดกล่อง                (กล้องอัดอยู่เบื้องหลัง)
พิมพ์เอกสารเสร็จ
  sendCommand('stop', shipment)   →  ส่ง 'q' ให้ ffmpeg ปิดไฟล์ล่าสุดให้สมบูรณ์ + ปล่อยกล้อง
                                  ←  {status:'stopped', files:[...]}
```

## ติดตั้ง

1. ต่อกล้อง USB เข้ากับเครื่อง แล้วเช็คใน Windows ว่า Device Manager มองเห็น
2. ติดตั้ง **ffmpeg** — โหลด essentials build จาก https://www.gyan.dev/ffmpeg/builds/
   แตกไฟล์แล้วเอา path ของ `ffmpeg.exe` ไปใส่ `ffmpegPath` ใน `config.json` (หรือเพิ่มลง PATH)
3. ติดตั้งและหาชื่อกล้อง:

```
cd recording-agent
npm install
npm run devices        ← แสดงชื่อกล้อง/ไมค์ที่ต่ออยู่
```

4. ก็อปชื่อกล้องที่ได้ไปใส่ `videoDevice` ใน `config.json` เช่น

```json
"videoDevice": "HD USB Camera"
```

5. รัน agent (ต้องรันค้างไว้ตลอดเวลาที่ใช้งานโต๊ะเช็ค):

```
npm start
```

## config.json

> ⚠️ **ห้ามใส่คอมเมนต์ `//` ในไฟล์นี้** — JSON ไม่รองรับ ถ้าใส่ไฟล์จะ parse ไม่ผ่าน
> แล้ว agent จะ **ถอยไปใช้ค่า default ทั้งหมดแบบเงียบๆ** (`videoDevice` กลายเป็นว่าง กด start แล้วขึ้น error หากล้องไม่เจอ)
> อธิบายค่าต่างๆ ไว้ในตารางข้างล่างนี้แทน

| key | ค่า default | ความหมาย |
|---|---|---|
| `port` | `5050` | port ของ WebSocket (ต้องตรงกับ `AGENT_WS_URL` ใน `video-recording.service.ts`) |
| `deskName` | `""` | ชื่อโต๊ะเช็คที่ใช้ขึ้นต้นชื่อไฟล์ — เว้นว่าง = ใช้ชื่อเครื่อง |
| `outputRoot` | `D:/VideoRecord` | โฟลเดอร์หลักที่เก็บวิดีโอ |
| `segmentSeconds` | `300` | ตัดไฟล์ทุกกี่วินาที |
| `ffmpegPath` | `ffmpeg` | path เต็มของ `ffmpeg.exe` ถ้าไม่ได้อยู่ใน PATH |
| **`videoDevice`** | `""` | **ชื่อกล้องจาก `npm run devices` — ต้องตั้งค่าก่อนใช้งาน** |
| `audioDevice` | `""` | ชื่อไมค์ — เว้นว่าง = ไม่บันทึกเสียง |
| `videoSize` | `1280x720` | ความละเอียด — ต้องเป็นค่าที่กล้องรองรับ (`npm run devices` ดูได้) |
| `framerate` | `15` | เฟรมต่อวินาที — ยิ่งต่ำภาพยิ่งกระตุกแต่ไฟล์เล็กลง **ไม่มีผลกับความเร็วในการเล่น** (agent ใช้ `-use_wallclock_as_timestamps` บังคับให้ความยาววิดีโอตรงกับเวลาจริงเสมอ) |
| `inputFormat` | `""` | ใส่ `mjpeg` ถ้ากล้องรองรับ — **กล้องที่ใช้อยู่จำเป็นต้องใส่** เพราะ `yuyv422` ที่ 720p ทำได้แค่ 10fps |
| `rtbufsize` | `256M` | บัฟเฟอร์กันเฟรมหลุดตอนเครื่องทำงานหนัก |
| `crf` | `28` | คุณภาพ (ยิ่งมากไฟล์ยิ่งเล็ก/ยิ่งเบลอ) |
| `preset` | `veryfast` | ความหนักของ CPU ในการเข้ารหัส |

## ผลลัพธ์

```
D:/VideoRecord/
  └── SHIPMENT123/
        ├── CHECK01_SHIPMENT123_000.mp4
        ├── CHECK01_SHIPMENT123_001.mp4
        └── CHECK01_SHIPMENT123_002.mp4
```

## Protocol

**เว็บ → agent**

```json
{ "command": "start" | "stop" | "status", "orderCode": "SHIPMENT123" }
```

**agent → เว็บ** (broadcast ทุก client และส่งสถานะปัจจุบันให้ทันทีที่ต่อเข้ามา)

```json
{ "status": "idle" }
{ "status": "recording", "orderCode": "...", "startedAtLocal": "...", "folder": "..." }
{ "status": "stopped",   "orderCode": "...", "folder": "...", "files": ["..."] }
{ "status": "error",     "message": "..." }
```

## หมายเหตุ

- agent ผูกกับ `127.0.0.1` เท่านั้น เครื่องอื่นในเน็ตเวิร์กเรียกไม่ได้
- กล้องจะถูกเปิดเฉพาะตอนอัด (ไฟกล้องติดตอน start ดับตอน stop) โปรแกรมอื่นเปิดกล้องค้างไว้
  พร้อมกันไม่ได้ — dshow ให้ใช้ได้ทีละโปรแกรม
- ปิดหน้าเว็บ/รีเฟรช **ไม่หยุดการอัด** — หยุดเมื่อได้คำสั่ง `stop` เท่านั้น
  เปิดหน้าเว็บใหม่จะได้สถานะ `recording` กลับมาทันทีที่ต่อ WebSocket
- ปิด agent ด้วย Ctrl+C จะสั่ง ffmpeg ปิดไฟล์ให้เรียบร้อยก่อนจบ
- ยังไม่มีการลบไฟล์เก่าอัตโนมัติ — ต้องดูพื้นที่ดิสก์เอง จนกว่าจะทำ Sweep Service
