// แสดงรายชื่อกล้อง/ไมค์ที่ต่ออยู่กับเครื่อง เอาชื่อไปใส่ videoDevice / audioDevice ใน config.json
const { spawn } = require('child_process');
const { loadConfig } = require('./config');

const config = loadConfig();
const args = ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'];

const proc = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
let output = '';

proc.stderr.on('data', (chunk) => { output += chunk.toString(); });

proc.on('error', (err) => {
  console.error(`เรียก ffmpeg ไม่ได้: ${err.message}`);
  console.error(`ffmpegPath ปัจจุบัน = ${config.ffmpegPath}`);
  process.exit(1);
});

proc.on('close', () => {
  // ffmpeg พ่นรายชื่ออุปกรณ์ออกทาง stderr เสมอ และจบด้วย exit code != 0 เป็นปกติ
  const lines = output.split('\n').filter((line) => line.includes('"'));

  if (!lines.length) {
    console.log('ไม่พบอุปกรณ์ dshow บนเครื่องนี้');
    console.log(output);
    return;
  }

  console.log('อุปกรณ์ที่เจอ (เอาชื่อในเครื่องหมายคำพูดไปใส่ config.json):\n');
  lines.forEach((line) => console.log('  ' + line.replace(/^\[[^\]]*\]\s*/, '').trim()));
});
