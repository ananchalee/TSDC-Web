const WebSocket = require('ws');
const { loadConfig } = require('./config');
const { Recorder } = require('./recorder');

const config = loadConfig();
const recorder = new Recorder(config);
const wss = new WebSocket.Server({ port: config.port, host: '127.0.0.1' });

function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

recorder.on('status', broadcast);

wss.on('connection', (socket) => {
  console.log('[server] browser connected');

  // ส่งสถานะปัจจุบันให้ทันที เผื่อหน้าเว็บเพิ่งรีเฟรชระหว่างที่ยังอัดอยู่
  socket.send(JSON.stringify(recorder.getStatus()));

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
    } else if (command === 'status') {
      socket.send(JSON.stringify(recorder.getStatus()));
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
