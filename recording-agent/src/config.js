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

function loadConfig() {
  const configPath = path.join(__dirname, '..', 'config.json');
  let fileConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      console.error('[config] อ่าน config.json ไม่ได้ ใช้ค่า default แทน:', err.message);
    }
  }

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

module.exports = { loadConfig };
