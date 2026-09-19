const WebSocket = require('ws');
const { loadConfig, reloadConfigInto } = require('./config');
const { Recorder } = require('./recorder');
const { probeCamera } = require('./camera');

// ถี่แค่ไหนที่จะส่องว่ากล้องยังเสียบอยู่ไหม
// 5 วิ เพื่อให้ป้ายตอบสนองเร็วพอที่ช่างจะเสียบสายแล้วเห็นผลทันทีตอนติดตั้ง
// ค่านี้สั้นกว่า PROBE_TIMEOUT_MS ใน camera.js (8 วิ) ซึ่งไม่เป็นไร เพราะ cameraChecking
// กันไม่ให้รอบใหม่เริ่มทับรอบเก่า — ถ้า ffmpeg อืด จังหวะจริงจะกลายเป็น "จบรอบก่อน + 5 วิ" เอง
const CAMERA_POLL_MS = 5000;

const config = loadConfig();
const recorder = new Recorder(config);
const wss = new WebSocket.Server({ port: config.port, host: '127.0.0.1' });

// สถานะกล้องล่าสุด ส่งให้หน้าเว็บทันทีที่ต่อเข้ามา และ broadcast ซ้ำเมื่อค่าเปลี่ยน
// ready = null คือยังตรวจไม่เสร็จรอบแรก (หน้าเว็บจะยังไม่เปลี่ยนสีป้ายจนกว่าจะรู้ผลจริง)
let camera = { status: 'camera', ready: null, message: 'กำลังตรวจสอบกล้อง...' };
let cameraChecking = false;

function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function setCamera(ready, message) {
  if (camera.ready === ready && camera.message === message) {
    return;   // ไม่มีอะไรเปลี่ยน ไม่ต้องยิงซ้ำทุก 5 วิ (และไม่ต้องเขียน log ซ้ำด้วย)
  }
  camera = { status: 'camera', ready: ready, message: message };
  console.log(`[camera] ${ready ? 'พร้อม' : 'ไม่พร้อม'} — ${message}`);
  broadcast(camera);
}

async function refreshCamera() {
  if (cameraChecking) {
    return;   // รอบก่อนยังไม่จบ (ffmpeg อืด) ข้ามไปก่อน อย่าให้ซ้อนกัน
  }

  // ระหว่างอัดอยู่ไม่ต้องไปส่อง: ffmpeg ที่กำลังอัดคือหลักฐานว่ากล้องใช้ได้อยู่แล้ว
  // และไม่ควรเรียก ffmpeg ตัวที่สองไปยุ่งกับกล้องที่ถูกจับไว้
  if (recorder.isRecording) {
    setCamera(true, `กำลังบันทึกด้วยกล้อง "${config.videoDevice}"`);
    return;
  }

  // แก้ config.json แล้วมีผลเลย ไม่ต้อง restart — ตอนติดตั้งช่างจะเห็นป้ายส้ม แก้ชื่อกล้อง
  // เซฟ แล้วป้ายเขียวเองในรอบถัดไป เช็คตรงนี้เพราะเป็นจังหวะเดียวที่รู้แน่ว่าไม่ได้กำลังอัดอยู่
  if (reloadConfigInto(config)) {
    console.log(`[config] โหลด config.json ใหม่ — กล้อง: "${config.videoDevice || '(ยังไม่ได้ตั้งค่า)'}"`);
  }

  cameraChecking = true;
  try {
    const result = await probeCamera(config);
    setCamera(result.ready, result.message);
  } finally {
    cameraChecking = false;
  }
}

recorder.on('status', (payload) => {
  broadcast(payload);

  // อัดจบหรืออัดพัง = สถานะกล้องอาจเปลี่ยนไปแล้ว (เช่นสายหลุดกลางทาง) ตรวจใหม่ทันทีไม่ต้องรอครบรอบ
  if (payload.status === 'stopped' || payload.status === 'error') {
    setImmediate(refreshCamera);
  }
});

wss.on('connection', (socket) => {
  console.log('[server] browser connected');

  // ส่งสถานะปัจจุบันให้ทันที เผื่อหน้าเว็บเพิ่งรีเฟรชระหว่างที่ยังอัดอยู่
  socket.send(JSON.stringify(recorder.getStatus()));
  socket.send(JSON.stringify(camera));

  socket.on('message', (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch (err) {
      console.error('[server] ข้อความไม่ใช่ JSON:', raw.toString());
      return;
    }

    const { command, orderCode, tableCheck } = payload;
    console.log(`[server] command=${command} orderCode=${orderCode} tableCheck=${tableCheck || '-'}`);

    if (command === 'start') {
      recorder.start(orderCode, tableCheck);
    } else if (command === 'stop') {
      recorder.stop();
    } else if (command === 'rename') {
      // หน้าเว็บรู้ FNVideo_id จาก DB แล้ว สั่งเติมเลขนั้นไว้หน้าชื่อไฟล์
      recorder.renameFiles(payload.files);
    } else if (command === 'status') {
      socket.send(JSON.stringify(recorder.getStatus()));
      socket.send(JSON.stringify(camera));
    } else {
      console.error('[server] ไม่รู้จักคำสั่ง:', command);
    }
  });

  socket.on('close', () => {
    // หน้าเว็บปิด/รีเฟรช ไม่หยุดอัด เพราะ stop สั่งจากตอนพิมพ์เอกสารเสร็จเท่านั้น
    console.log('[server] browser disconnected');
  });
});

wss.on('listening', () => {
  console.log('=== TSDC Recording Agent ===');
  console.log(`  ws://127.0.0.1:${config.port}`);
  console.log(`  โต๊ะเช็ค     : ${config.deskName}`);
  console.log(`  เก็บไฟล์ที่  : ${config.outputRoot}`);
  console.log(`  ตัดไฟล์ทุก   : ${config.segmentSeconds} วินาที`);
  console.log(`  ffmpeg      : ${config.ffmpegPath}`);
  console.log(`  กล้อง       : ${config.videoDevice || '(ยังไม่ได้ตั้งค่า)'}`);

  refreshCamera();
  setInterval(refreshCamera, CAMERA_POLL_MS);
});

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] port ${config.port} ถูกใช้อยู่แล้ว — agent อาจเปิดซ้ำ`);
  } else {
    console.error('[server] error:', err.message);
  }
  process.exit(1);
});

// ปิด agent ระหว่างอัดอยู่ ต้องให้ ffmpeg ปิดไฟล์ให้เรียบร้อยก่อน
function shutdown() {
  console.log('\n[server] กำลังปิด agent...');
  if (recorder.isRecording) {
    recorder.once('status', () => process.exit(0));
    recorder.stop();
    setTimeout(() => process.exit(0), 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
