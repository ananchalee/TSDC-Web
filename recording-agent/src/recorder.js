const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

const KILL_TIMEOUT_MS = 8000;   // ถ้าสั่ง q แล้ว ffmpeg ไม่ยอมจบใน 8 วิ ค่อย force kill

// ตัดอักขระที่ใช้เป็นชื่อไฟล์/โฟลเดอร์บน Windows ไม่ได้ออก
function sanitize(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

function nowLocal() {
  return new Date().toLocaleString('th-TH', { hour12: false });
}

class Recorder extends EventEmitter {

  constructor(config) {
    super();
    this.config = config;
    this.proc = null;
    this.orderCode = null;
    this.outputDir = null;
    this.startedAtLocal = null;
    this.stopping = false;
    this.killTimer = null;
    this.lastError = '';
  }

  get isRecording() {
    return this.proc !== null;
  }

  getStatus() {
    if (!this.isRecording) {
      return { status: 'idle' };
    }
    return {
      status: 'recording',
      orderCode: this.orderCode,
      startedAtLocal: this.startedAtLocal,
      folder: this.outputDir,
    };
  }

  buildArgs(outputPattern) {
    const c = this.config;
    const args = [
      '-hide_banner',
      '-loglevel', 'warning',
      '-f', 'dshow',
    ];

    // ออปชันของ input ต้องมาก่อน -i เสมอ
    if (c.rtbufsize) {
      args.push('-rtbufsize', String(c.rtbufsize));
    }
    if (c.framerate) {
      args.push('-framerate', String(c.framerate));
    }
    if (c.videoSize) {
      args.push('-video_size', String(c.videoSize));
    }
    if (c.inputFormat) {
      args.push('-vcodec', String(c.inputFormat));
    }

    // dshow รับกล้องกับไมค์รวมใน -i เดียว: video=ชื่อกล้อง:audio=ชื่อไมค์
    let input = `video=${c.videoDevice}`;
    if (c.audioDevice) {
      input += `:audio=${c.audioDevice}`;
    }
    args.push('-i', input);

    args.push(
      '-c:v', 'libx264',
      '-preset', c.preset,
      '-crf', String(c.crf),
      '-pix_fmt', 'yuv420p',
      '-g', String((c.framerate || 15) * 2),
    );

    if (c.audioDevice) {
      args.push('-c:a', 'aac', '-b:a', '96k');
    }

    args.push(
      '-f', 'segment',
      '-segment_time', String(c.segmentSeconds),
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      outputPattern,
    );

    return args;
  }

  start(orderCode) {
    if (this.isRecording) {
      // อัดอยู่แล้ว — ถ้าเป็นออเดอร์เดิมก็ปล่อยผ่าน ไม่ต้องเริ่มใหม่
      if (this.orderCode === sanitize(orderCode)) {
        this.emit('status', this.getStatus());
        return;
      }
      this.emit('status', {
        status: 'error',
        message: `กำลังบันทึกออเดอร์ ${this.orderCode} อยู่ ยังเริ่มออเดอร์ใหม่ไม่ได้`,
      });
      return;
    }

    const code = sanitize(orderCode);
    if (!code) {
      this.emit('status', { status: 'error', message: 'ไม่พบเลขออเดอร์ ไม่สามารถเริ่มบันทึกได้' });
      return;
    }

    if (!this.config.videoDevice) {
      this.emit('status', {
        status: 'error',
        message: 'ยังไม่ได้ตั้งค่ากล้อง (videoDevice) ใน config.json — ดูชื่อกล้องด้วย npm run devices',
      });
      return;
    }

    const desk = sanitize(this.config.deskName);
    const outputDir = path.join(this.config.outputRoot, code);

    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      this.emit('status', { status: 'error', message: `สร้างโฟลเดอร์ไม่ได้: ${err.message}` });
      return;
    }

    // โต๊ะเช็ค_เลขOrder_ลำดับไฟล์ เช่น CHECK01_SHIPMENT123_001.mp4
    const pattern = path.join(outputDir, `${desk}_${code}_%03d.mp4`);
    const args = this.buildArgs(pattern);

    console.log(`[recorder] start ${code} -> ${pattern}`);

    let proc;
    try {
      proc = spawn(this.config.ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    } catch (err) {
      this.emit('status', { status: 'error', message: `เรียก ffmpeg ไม่สำเร็จ: ${err.message}` });
      return;
    }

    this.proc = proc;
    this.orderCode = code;
    this.outputDir = outputDir;
    this.startedAtLocal = nowLocal();
    this.stopping = false;
    this.lastError = '';

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        console.error('[ffmpeg]', text);
        this.lastError = text.split('\n').pop().trim();  // เก็บบรรทัดล่าสุดไว้บอกสาเหตุตอนพัง
      }
    });

    proc.on('error', (err) => {
      // ส่วนใหญ่คือหา ffmpeg.exe ไม่เจอ
      console.error('[recorder] ffmpeg error:', err.message);
      this.reset();
      this.emit('status', {
        status: 'error',
        message: `ffmpeg ทำงานไม่ได้: ${err.message} (ตรวจสอบ ffmpegPath ใน config.json)`,
      });
    });

    proc.on('close', (exitCode) => {
      const wasStopping = this.stopping;
      const finishedOrder = this.orderCode;
      const finishedDir = this.outputDir;
      const lastError = this.lastError;
      this.reset();

      if (wasStopping || exitCode === 0 || exitCode === 255) {
        console.log(`[recorder] stopped ${finishedOrder} (exit ${exitCode})`);
        this.emit('status', {
          status: 'stopped',
          orderCode: finishedOrder,
          folder: finishedDir,
          files: listFiles(finishedDir),
        });
      } else {
        console.error(`[recorder] ffmpeg จบผิดปกติ (exit ${exitCode})`);
        this.emit('status', {
          status: 'error',
          orderCode: finishedOrder,
          message: lastError
            ? `บันทึกวิดีโอไม่สำเร็จ: ${lastError}`
            : `การบันทึกหยุดเองผิดปกติ (exit ${exitCode})`,
        });
      }
    });

    this.emit('status', this.getStatus());
  }

  stop() {
    if (!this.isRecording || this.stopping) {
      return;
    }

    this.stopping = true;
    console.log(`[recorder] stop ${this.orderCode}`);

    // ส่ง 'q' ให้ ffmpeg ปิดไฟล์ล่าสุดให้สมบูรณ์ก่อนจบ (kill ตรงๆ ไฟล์สุดท้ายจะเสีย)
    try {
      this.proc.stdin.write('q');
      this.proc.stdin.end();
    } catch (err) {
      console.error('[recorder] ส่งคำสั่ง q ไม่สำเร็จ:', err.message);
    }

    const proc = this.proc;
    this.killTimer = setTimeout(() => {
      if (proc && proc.exitCode === null) {
        console.error('[recorder] ffmpeg ไม่ตอบสนอง force kill');
        forceKill(proc.pid);
      }
    }, KILL_TIMEOUT_MS);
  }

  reset() {
    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }
    this.proc = null;
    this.orderCode = null;
    this.outputDir = null;
    this.startedAtLocal = null;
    this.stopping = false;
  }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.mp4'));
  } catch (err) {
    return [];
  }
}

function forceKill(pid) {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/t', '/f']);
  } else {
    try { process.kill(pid, 'SIGKILL'); } catch (err) { /* จบไปแล้ว */ }
  }
}

module.exports = { Recorder };
