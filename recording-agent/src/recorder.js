const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KILL_TIMEOUT_MS = 8000;   // ถ้าสั่ง q แล้ว ffmpeg ไม่ยอมจบใน 8 วิ ค่อย force kill
const SEGMENT_POLL_MS = 3000;   // ถี่แค่ไหนที่จะไปส่องว่า ffmpeg ขึ้นไฟล์ segment ใหม่หรือยัง

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

// สำหรับเขียนลง DB เท่านั้น — ห้ามใช้ nowLocal() เพราะ th-TH ให้ปี พ.ศ. (2569) ซึ่ง SQL Server อ่านไม่ได้
function sqlDateTime(date) {
  if (!date) {
    return null;
  }
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
    + ` ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

// วันเดือนปีสำหรับชื่อไฟล์ เช่น 15082026 (ใช้ ค.ศ. เพื่อให้เรียงตามเวลาได้ตรง)
function dateTag(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(date.getDate())}${p(date.getMonth() + 1)}${date.getFullYear()}`;
}

// เวลาสำหรับชื่อไฟล์ เช่น 093033 — กันไฟล์ทับกันตอนออเดอร์เดิมถูกเอามาเช็คซ้ำในวันเดียวกัน
function timeTag(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

// IP ของเครื่องโต๊ะเช็คเอง เอาไว้ชี้ว่าไฟล์อยู่เครื่องไหนก่อนถูกอัปโหลดขึ้น server
function localIpv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '';
}

// ไฟล์ทั้งหมดของ "รอบนี้" ในโฟลเดอร์ — prefix มี HHmmss ของเวลาเริ่มอัดอยู่ จึงไม่ชนกับรอบก่อน
function scanSegments(dir, prefix) {
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.toLowerCase().endsWith('.mp4'))
      .map((f) => {
        const m = f.match(/-(\d+)\.mp4$/i);
        const full = path.join(dir, f);
        let size = 0;
        let mtimeMs = 0;
        try {
          const st = fs.statSync(full);
          size = st.size;
          mtimeMs = st.mtimeMs;   // เขียนครั้งสุดท้าย = เวลาที่ ffmpeg ปิดไฟล์นี้
        } catch (err) { /* ไฟล์เพิ่งหาย */ }
        return { no: m ? parseInt(m[1], 10) : 0, name: f, path: full, sizeBytes: size, mtimeMs: mtimeMs };
      })
      .filter((f) => f.no > 0)
      .sort((a, b) => a.no - b.no);
  } catch (err) {
    return [];
  }
}

// รูปแบบเดียวที่ใช้ส่งให้หน้าเว็บทุกสถานะ — staUpload 2 = กำลังเขียน, 0 = ปิดไฟล์แล้วพร้อมอัปโหลด
function toFileRow(seg, staUpload) {
  return {
    name: seg.name,
    path: seg.path,
    // ชื่อเดิมก่อนถูกเปลี่ยน (กรณีอัดได้ไฟล์เดียวแล้วตัด -001 ออก)
    // ฝั่ง API ใช้ตัวนี้หาแถวเดิมที่เขียนไว้ตอนเริ่มอัด ไม่งั้นจะกลายเป็นสร้างแถวใหม่ทิ้งแถวเก่าค้าง
    nameOld: seg.nameOld || '',
    sizeBytes: seg.sizeBytes || 0,
    staUpload: staUpload,
    startedAt: sqlDateTime(seg.startedAt),
    endedAt: seg.endedAt ? sqlDateTime(seg.endedAt) : '',
  };
}

class Recorder extends EventEmitter {

  constructor(config) {
    super();
    this.config = config;
    this.proc = null;
    this.orderCode = null;
    this.outputDir = null;
    this.startedAtLocal = null;
    this.startedAt = null;
    this.segmentPrefix = null;   // ส่วนหน้าชื่อไฟล์ของรอบนี้ (ไม่รวม -%03d.mp4)
    this.segments = [];          // {no, name, path, startedAt, endedAt, sizeBytes} เรียงตาม no
    this.segmentTimer = null;
    this.ipLocal = '';
    this.stopping = false;
    this.killTimer = null;
    this.lastError = '';
  }

  get openSegment() {
    return this.segments.length ? this.segments[this.segments.length - 1] : null;
  }

  statusContext() {
    return {
      orderCode: this.orderCode,
      folder: this.outputDir,
      deskName: this.config.deskName,
      ipLocal: this.ipLocal,
    };
  }

  // ffmpeg เปิดไฟล์ถัดไป = ไฟล์ก่อนหน้าถูกปิดเรียบร้อยแล้ว ใช้เป็นสัญญาณว่า segment นั้นพร้อมอัปโหลด
  // (เชื่อถือได้กว่าการรอให้ขนาดไฟล์นิ่ง เพราะกล้องอาจนิ่งจนขนาดไม่ขยับได้เอง)
  checkSegments() {
    if (!this.isRecording || this.stopping) {
      return;
    }

    const found = scanSegments(this.outputDir, this.segmentPrefix);
    if (!found.length) {
      return;
    }

    const highest = found[found.length - 1].no;
    const open = this.openSegment;
    if (!open || highest <= open.no) {
      return;
    }

    const now = new Date();
    const files = [];
    let lastClosedAt = null;

    // ปิดทุก segment ที่ค้างอยู่ (ปกติมีตัวเดียว เว้นแต่ poll พลาดไปหลายรอบ)
    // ใช้ mtime ของไฟล์เป็นเวลาปิด ไม่ใช่เวลาที่ poll มาเจอ (ซึ่งช้ากว่าได้ถึง SEGMENT_POLL_MS)
    for (const seg of this.segments) {
      if (seg.endedAt || seg.no >= highest) {
        continue;
      }
      const disk = found.find((f) => f.no === seg.no);
      seg.endedAt = disk && disk.mtimeMs ? new Date(disk.mtimeMs) : now;
      if (disk) {
        seg.sizeBytes = disk.sizeBytes;
      }
      lastClosedAt = seg.endedAt;
      files.push(toFileRow(seg, 0));
      console.log(`[recorder] segment ปิดแล้ว ${seg.name} (${seg.sizeBytes} bytes)`);
    }

    // segment ใหม่เริ่มตรงจุดที่ตัวก่อนหน้าปิดพอดี ไม่ให้มีช่องว่างในไทม์ไลน์
    const diskNew = found.find((f) => f.no === highest);
    const newSeg = {
      no: highest,
      name: diskNew.name,
      path: diskNew.path,
      startedAt: lastClosedAt || now,
      endedAt: null,
      sizeBytes: 0,
    };
    this.segments.push(newSeg);
    files.push(toFileRow(newSeg, 2));

    this.emit('status', Object.assign({ status: 'segment', files: files }, this.statusContext()));
  }

  get isRecording() {
    return this.proc !== null;
  }

  getStatus() {
    if (!this.isRecording) {
      return { status: 'idle' };
    }
    // ส่ง segment ที่กำลังเขียนอยู่ (staUpload 2) เพื่อให้หน้าเว็บเขียนแถวตั้งต้นลง DB ได้ทันที
    // โครงเดียวกับสถานะ segment/stopped ฝั่ง Angular จึงใช้โค้ดชุดเดียวแปลงเป็น VIDEO_LIST
    const open = this.openSegment;
    return Object.assign({
      status: 'recording',
      startedAtLocal: this.startedAtLocal,
      files: open ? [toFileRow(open, 2)] : [],
    }, this.statusContext());
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

    // ประทับเวลาตามนาฬิกาจริง ไม่ใช่ตามจำนวนเฟรมหารด้วย framerate
    // กล้องบางตัวไม่สนใจ -framerate ที่สั่งไป แล้วส่งมา ~30fps ถ้าไม่มีบรรทัดนี้ ffmpeg จะยืดวิดีโอ
    // ให้ยาวเป็นสองเท่าและกลายเป็นสโลว์โมชัน ทำให้ FDStartdate/FDEnddate ไม่ตรงกับความยาวไฟล์
    args.push('-use_wallclock_as_timestamps', '1');
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
      '-segment_start_number', '1',   // running เริ่มที่ 001 ไม่ใช่ 000
      outputPattern,
    );

    return args;
  }

  start(orderCode, tableCheck) {
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

    // เลขโต๊ะเช็คส่งมาจากหน้าเว็บ (input.TABLE_CHECK) — ถ้าไม่ได้ส่งมาถอยไปใช้ deskName ใน config
    const table = sanitize(tableCheck || this.config.deskName);
    const outputDir = path.join(this.config.outputRoot, code);

    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      this.emit('status', { status: 'error', message: `สร้างโฟลเดอร์ไม่ได้: ${err.message}` });
      return;
    }

    // tablecheck-order-วันเดือนปี-เวลา-running เช่น T01-SHIPMENT123-15082026-093033-001.mp4
    // เวลาคือเวลาที่เริ่มอัดรอบนั้น ทำให้ออเดอร์เดิมที่เอามาเช็คซ้ำในวันเดียวกันได้ไฟล์คนละชุด ไม่ทับของเดิม
    const startedNow = new Date();
    const prefix = `${table}-${code}-${dateTag(startedNow)}-${timeTag(startedNow)}`;
    const pattern = path.join(outputDir, `${prefix}-%03d.mp4`);

    // segment_start_number = 1 ทำให้ไฟล์แรกชื่อ -001.mp4 เสมอ จึงรู้ชื่อได้ก่อนที่ ffmpeg จะสร้างจริง
    const firstFileName = `${prefix}-001.mp4`;
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
    this.startedAt = startedNow;
    this.segmentPrefix = prefix;
    this.segments = [{
      no: 1,
      name: firstFileName,
      path: path.join(outputDir, firstFileName),
      startedAt: startedNow,
      endedAt: null,
      sizeBytes: 0,
    }];
    this.ipLocal = localIpv4();
    this.stopping = false;
    this.lastError = '';

    this.segmentTimer = setInterval(() => this.checkSegments(), SEGMENT_POLL_MS);

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
      const startedAt = this.startedAt;
      const prefix = this.segmentPrefix;
      const ipLocal = this.ipLocal;
      const deskName = this.config.deskName;
      this.reset();

      if (wasStopping || exitCode === 0 || exitCode === 255) {
        console.log(`[recorder] stopped ${finishedOrder} (exit ${exitCode})`);

        // คำนวณเวลาของทุก segment ใหม่จากไฟล์บนดิสก์ ไม่ใช้เวลาที่ poll ไปเจอ
        //   จบ   = mtime ของไฟล์นั้นเอง (เวลาที่ ffmpeg เขียนครั้งสุดท้าย = ตอนปิดไฟล์)
        //   เริ่ม = mtime ของไฟล์ก่อนหน้า ส่วนไฟล์แรกคือเวลาที่เริ่มอัด
        // แม่นกว่าเวลา poll (คลาดได้ถึง 3 วิ) และครอบคลุม segment ที่เกิดหลัง poll รอบสุดท้ายด้วย
        // ค่าที่ได้จะไปทับของเดิมผ่าน UPDATE ทำให้แถวที่เขียนไว้ตอนตัด segment ถูกแก้ให้ตรงไปในตัว
        const disk = scanSegments(finishedDir, prefix);

        // อัดได้ไฟล์เดียว = ไม่เคยถูกตัด segment เลย เลขลำดับ -001 ไม่มีความหมาย ตัดออกให้ชื่อสั้นลง
        // ต้องทำหลัง ffmpeg ปิด process แล้วเท่านั้น และเก็บชื่อเดิมไว้ให้ API หาแถวเจอ
        if (disk.length === 1) {
          const only = disk[0];
          const newName = `${prefix}.mp4`;
          const newPath = path.join(finishedDir, newName);
          try {
            fs.renameSync(only.path, newPath);
            only.nameOld = only.name;
            only.name = newName;
            only.path = newPath;
            console.log(`[recorder] ไฟล์เดียว เปลี่ยนชื่อเป็น ${newName}`);
          } catch (err) {
            // เปลี่ยนชื่อไม่ได้ก็ใช้ชื่อเดิมต่อไป ดีกว่าปล่อยให้ DB ชี้ไปไฟล์ที่ไม่มีอยู่
            console.error('[recorder] เปลี่ยนชื่อไฟล์ไม่สำเร็จ ใช้ชื่อเดิม:', err.message);
          }
        }

        const files = disk.map((d, idx) => {
          const prev = idx > 0 ? disk[idx - 1] : null;
          return toFileRow({
            name: d.name,
            path: d.path,
            nameOld: d.nameOld,
            sizeBytes: d.sizeBytes,
            startedAt: prev ? new Date(prev.mtimeMs) : startedAt,
            endedAt: new Date(d.mtimeMs),
          }, 0);
        });

        this.emit('status', {
          status: 'stopped',
          orderCode: finishedOrder,
          folder: finishedDir,
          deskName: deskName,
          ipLocal: ipLocal,
          startedAt: sqlDateTime(startedAt),
          endedAt: sqlDateTime(new Date()),
          files: files,
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
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }
    this.proc = null;
    this.orderCode = null;
    this.outputDir = null;
    this.startedAtLocal = null;
    this.startedAt = null;
    this.segmentPrefix = null;
    this.segments = [];
    this.ipLocal = '';
    this.stopping = false;
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
