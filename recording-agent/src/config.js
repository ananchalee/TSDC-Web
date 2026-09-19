const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULTS = {
  port: 5050,
  deskName: '',            // ว่าง = ใช้ชื่อเครื่อง (hostname) เป็นชื่อโต๊ะเช็ค
  outputRoot: 'D:/VideoRecord',
  segmentSeconds: 300,     // ตัดไฟล์ทุก 5 นาที

  ffmpegPath: 'ffmpeg',
  videoDevice: '',         // ชื่อกล้องจาก `npm run devices` — ต้องตั้งค่าก่อนใช้งาน
  audioDevice: '',         // ว่าง = ไม่บันทึกเสียง
  videoSize: '1280x720',   // ว่าง = ใช้ค่า default ของกล้อง
  framerate: 15,
  inputFormat: '',         // 'mjpeg' ถ้ากล้องรองรับ จะได้ fps สูงขึ้นและ CPU ต่ำลง
  rtbufsize: '256M',       // กัน frame หลุดตอนเครื่องทำงานหนัก
  crf: 28,
  preset: 'veryfast',
};

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

let lastStamp = null;      // สภาพไฟล์ครั้งล่าสุดที่อ่านสำเร็จ ใช้ดูว่ามีคนแก้ไฟล์หรือยัง
let lastReadOk = true;     // อ่าน/พาร์สรอบล่าสุดผ่านไหม — reload ใช้ตัดสินว่าจะเอาค่าไปใช้ดีไหม

// ใช้ mtime คู่กับขนาดไฟล์ เพราะแก้ค่าสั้นๆ อย่างชื่อกล้องบางทีขนาดเท่าเดิม
// และบาง filesystem ให้ความละเอียด mtime หยาบ เอามารวมกันจึงพลาดยากกว่าใช้อย่างเดียว
function fileStamp() {
  try {
    const st = fs.statSync(CONFIG_PATH);
    return `${st.mtimeMs}:${st.size}`;
  } catch (err) {
    return null;   // ไฟล์หาย = ถือว่าไม่มีอะไรเปลี่ยน ใช้ค่าที่ถืออยู่ต่อไป
  }
}

function loadConfig() {
  const configPath = CONFIG_PATH;
  let fileConfig = {};

  lastReadOk = true;
  if (fs.existsSync(configPath)) {
    try {
      // ตัด BOM ทิ้งก่อนเสมอ — JSON.parse ไม่ยอมรับ แล้วพังทั้งไฟล์ด้วยข้อความที่อ่านไม่รู้เรื่อง
      // ("Unexpected token ...") ไฟล์นี้เป็นไฟล์ที่ช่างเปิดแก้ด้วยมือ บางโปรแกรม
      // (Notepad รุ่นเก่า, PowerShell Set-Content -Encoding utf8) เติม BOM ให้เองโดยไม่บอก
      let raw = fs.readFileSync(configPath, 'utf8');
      if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
      }
      fileConfig = JSON.parse(raw);
    } catch (err) {
      lastReadOk = false;
      console.error('[config] อ่าน config.json ไม่ได้ ใช้ค่า default แทน:', err.message);
    }
  }
  lastStamp = fileStamp();

  const config = { ...DEFAULTS, ...fileConfig };

  if (!config.deskName) {
    config.deskName = os.hostname();
  }
  config.outputRoot = path.resolve(config.outputRoot);

  // ffmpegPath แบบ relative ("./ffmpeg.exe") ต้องอิงโฟลเดอร์ agent ไม่ใช่ current directory
  // เพราะตอน auto-start จาก Task Scheduler ตัว cwd จะเป็น C:\Windows\System32 แล้วหาไฟล์ไม่เจอ
  // ส่วนคำสั่งเปล่าๆ อย่าง "ffmpeg" ต้องปล่อยไว้ให้หาจาก PATH ตามเดิม
  if (/[\\/]/.test(config.ffmpegPath)) {
    config.ffmpegPath = path.resolve(__dirname, '..', config.ffmpegPath);
  }

  return config;
}

// โหลด config.json ใหม่ทับอ็อบเจกต์เดิม เมื่อไฟล์ถูกแก้ระหว่างที่ agent ทำงานอยู่
// คืน true เมื่อโหลดใหม่จริง
//
// มีไว้เพื่อขั้นตอนติดตั้ง: ช่างเปิดหน้าเว็บเห็นป้ายส้ม แก้ชื่อกล้องใน config.json แล้วเซฟ
// ป้ายต้องเขียวเองภายในไม่กี่วินาที ถ้าไม่มีตัวนี้ต้องไปรัน restart-agent.bat ทุกครั้ง
// ซึ่งเป็นขั้นตอนที่คนลืมบ่อยที่สุด แล้วสรุปว่า "แก้ชื่อกล้องแล้วแต่ยังไม่หาย"
//
// ต้องเขียนทับ "อ็อบเจกต์เดิม" ห้ามสร้างตัวใหม่ เพราะ Recorder เก็บ reference ตัวนี้ไว้
// ตั้งแต่ตอนถูกสร้าง ถ้าสลับตัวใหม่ recorder จะยังใช้ค่าเก่าอยู่
function reloadConfigInto(config) {
  const stamp = fileStamp();
  if (stamp === null || stamp === lastStamp) {
    return false;
  }

  const port = config.port;   // ย้าย port ต้อง restart จริงๆ server bind ไปแล้วตั้งแต่ตอนเปิด
  const fresh = loadConfig();

  if (!lastReadOk) {
    // JSON พังอยู่ — เจอบ่อยตอนคนกำลังพิมพ์แก้แล้วเซฟค้างไว้ครึ่งทาง
    // ห้ามเอาค่า default ไปทับของเดิม ไม่งั้นชื่อกล้องที่ตั้งไว้หายทันทีเพราะเซฟผิดครั้งเดียว
    return false;
  }

  Object.keys(fresh).forEach((key) => {
    config[key] = fresh[key];
  });
  config.port = port;
  return true;
}

module.exports = { loadConfig, reloadConfigInto };
