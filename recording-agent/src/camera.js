// ตรวจว่ากล้องที่ตั้งไว้ใน config.json ยังเสียบอยู่จริงไหม
//
// เดิมไฟสถานะฝั่งหน้าเว็บเขียวทันทีที่ต่อ WebSocket กับ agent ได้ ซึ่งบอกได้แค่ว่า "โปรแกรมทำงานอยู่"
// ไม่ได้แปลว่าอัดได้ พนักงานจึงมารู้ตอนกดเช็คแล้ว ffmpeg เปิดกล้องไม่ได้ (สายหลุด / ชื่อกล้องเปลี่ยน)
// ไฟล์นี้ทำให้ agent รู้สถานะกล้องล่วงหน้า แล้วส่งขึ้นไปให้ป้ายแสดงผลได้ตรงความจริง
const { spawn } = require('child_process');

const PROBE_TIMEOUT_MS = 8000;

// ffmpeg พ่นรายชื่ออุปกรณ์ dshow ออกทาง stderr และจบด้วย exit code != 0 เป็นเรื่องปกติ
// จึงห้ามใช้ exit code ตัดสินว่าสำเร็จหรือไม่ ให้ดูว่าพาร์สรายชื่อออกมาได้ไหมแทน
function listDevices(ffmpegPath) {
  return new Promise((resolve) => {
    const args = ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'];
    let proc;

    try {
      proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (err) {
      resolve({ error: `เรียก ffmpeg ไม่ได้: ${err.message}` });
      return;
    }

    let output = '';
    let done = false;

    const finish = (result) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      resolve(result);
    };

    // ถ้า ffmpeg ค้าง (เจอได้ตอน driver กล้องมีปัญหา) ต้องไม่ให้ค้างยาวจนคิวตรวจรอบถัดไปซ้อนกัน
    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch (err) {
        /* จบไปเองแล้ว */
      }
      finish({ error: 'ตรวจรายชื่ออุปกรณ์นานผิดปกติ (ffmpeg ไม่ตอบสนอง)' });
    }, PROBE_TIMEOUT_MS);

    proc.stderr.on('data', (chunk) => { output += chunk.toString(); });

    proc.on('error', (err) => {
      finish({ error: `เรียก ffmpeg ไม่ได้: ${err.message} (ตรวจ ffmpegPath ใน config.json)` });
    });

    proc.on('close', () => finish(parseDevices(output)));
  });
}

// รูปแบบบรรทัดที่ต้องการ:
//   [dshow @ ...] "USB 2.0 Camera" (video)
//   [dshow @ ...]   Alternative name "@device_pnp_\?\usb#vid_0806..."
// ชื่อแบบ Alternative name ก็ใช้เป็น videoDevice ได้ และแม่นกว่าเพราะผูกกับ VID/PID ของกล้องตัวนั้นจริงๆ
function parseDevices(output) {
  const video = [];
  const audio = [];
  const alt = { video: [], audio: [] };
  let current = null;

  for (const line of output.split('\n')) {
    const device = line.match(/"([^"]+)"\s*\((video|audio)\)/);
    if (device) {
      current = device[2];
      (current === 'video' ? video : audio).push(device[1]);
      continue;
    }

    const alternative = line.match(/Alternative name\s+"([^"]+)"/);
    if (alternative && current) {
      alt[current].push(alternative[1]);
    }
  }

  if (!video.length && !audio.length) {
    return { error: 'ไม่พบอุปกรณ์ dshow บนเครื่องนี้' };
  }
  return { video, audio, alt };
}

function has(list, altList, name) {
  return list.indexOf(name) !== -1 || altList.indexOf(name) !== -1;
}

// ถามกล้องตัวที่เลือกว่ารองรับรูปแบบภาพอะไรบ้าง
//
// จำเป็นเพราะ "กล้องมีอยู่ในเครื่อง" ไม่ได้แปลว่า "อัดด้วยค่าที่ตั้งไว้ได้"
// config ชุดนี้ตั้ง inputFormat=mjpeg มาให้กล้อง USB ที่โต๊ะเช็คซึ่งรองรับ
// แต่กล้องในตัวโน้ตบุ๊คหลายรุ่นมีแต่ yuyv422 พอกดเช็คจริง ffmpeg จะตอบ
// "Could not set video options" แล้วตามด้วย I/O error ซึ่งอ่านไม่ออกว่าติดอะไร
// ตรวจตรงนี้ทำให้ป้ายเป็นสีส้มพร้อมบอกวิธีแก้ ตั้งแต่ก่อนพนักงานจะกดเช็ค
function listOptions(ffmpegPath, device) {
  return new Promise((resolve) => {
    const args = ['-hide_banner', '-f', 'dshow', '-list_options', 'true', '-i', `video=${device}`];
    let proc;

    try {
      proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (err) {
      resolve(null);   // ตรวจไม่ได้ก็อย่าไปขวางการใช้งาน ปล่อยผ่านเหมือนเดิม
      return;
    }

    let output = '';
    let done = false;
    const finish = (result) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch (err) {
        /* จบไปเองแล้ว */
      }
      finish(null);
    }, PROBE_TIMEOUT_MS);

    proc.stderr.on('data', (chunk) => { output += chunk.toString(); });
    proc.on('error', () => finish(null));
    proc.on('close', () => {
      // บรรทัดที่ต้องการ:
      //   pixel_format=yuyv422  min s=1280x720 fps=10 max s=1280x720 fps=30
      //   vcodec=mjpeg  min s=1280x720 fps=30 max s=1280x720 fps=30
      const formats = [];
      const sizes = [];
      for (const line of output.split('\n')) {
        const format = line.match(/(?:pixel_format|vcodec)=(\S+)/);
        if (!format) {
          continue;
        }
        if (formats.indexOf(format[1]) === -1) {
          formats.push(format[1]);
        }
        for (const size of line.match(/s=(\d+x\d+)/g) || []) {
          const value = size.slice(2);
          if (sizes.indexOf(value) === -1) {
            sizes.push(value);
          }
        }
      }
      finish(formats.length ? { formats, sizes } : null);
    });
  });
}

// ผลของ listOptions ผูกกับตัวกล้อง ไม่ได้เปลี่ยนไปมา จึงจำไว้ ไม่ต้องถาม ffmpeg ซ้ำทุก 5 วินาที
// คีย์รวมค่า config ที่ใช้ตรวจไว้ด้วย พอมีคนแก้ config.json ค่าที่จำไว้จะถูกทิ้งเอง
let optionsCache = { key: null, value: null };

async function checkVideoOptions(config) {
  if (!config.inputFormat && !config.videoSize) {
    return null;   // ไม่ได้บังคับอะไรไว้ ffmpeg เลือกเองได้ ไม่ต้องตรวจ
  }

  const key = `${config.videoDevice}|${config.inputFormat}|${config.videoSize}`;
  if (optionsCache.key !== key) {
    optionsCache = { key: key, value: await listOptions(config.ffmpegPath, config.videoDevice) };
  }

  const options = optionsCache.value;
  if (!options) {
    return null;   // ถามไม่สำเร็จ อย่าเดาว่าใช้ไม่ได้
  }

  if (config.inputFormat && options.formats.indexOf(config.inputFormat) === -1) {
    return `กล้อง "${config.videoDevice}" ไม่รองรับ inputFormat "${config.inputFormat}" — ` +
      `ที่รองรับ: ${options.formats.join(', ')} ` +
      `(กล้องในตัวโน้ตบุ๊คมักไม่มี mjpeg ให้แก้ inputFormat ใน config.json เป็นค่าว่าง "")`;
  }

  if (config.videoSize && options.sizes.length && options.sizes.indexOf(config.videoSize) === -1) {
    return `กล้อง "${config.videoDevice}" ไม่รองรับความละเอียด ${config.videoSize} — ` +
      `ที่รองรับ: ${options.sizes.join(', ')} (แก้ videoSize ใน config.json)`;
  }

  return null;
}

// คืนสถานะกล้องแบบสรุปให้ server.js ส่งต่อขึ้นหน้าเว็บ
// { ready: boolean, message: string }  — message ใช้โชว์ตอนเอาเมาส์ชี้ป้าย จึงต้องบอกวิธีแก้ในตัว
async function probeCamera(config) {
  if (!config.videoDevice) {
    return { ready: false, message: 'ยังไม่ได้ตั้งค่ากล้อง (videoDevice) ใน config.json — ดูชื่อกล้องด้วย check-devices.bat' };
  }

  const found = await listDevices(config.ffmpegPath);
  if (found.error) {
    return { ready: false, message: found.error };
  }

  if (!has(found.video, found.alt.video, config.videoDevice)) {
    const names = found.video.length ? found.video.map((n) => `"${n}"`).join(', ') : 'ไม่พบกล้องเลย';
    return {
      ready: false,
      message: `ไม่พบกล้อง "${config.videoDevice}" — กล้องที่เสียบอยู่ตอนนี้: ${names}`,
    };
  }

  // ไมค์ตั้งไว้แต่หาไม่เจอก็อัดไม่ได้เหมือนกัน เพราะ dshow เปิด video กับ audio พร้อมกันใน -i เดียว
  if (config.audioDevice && !has(found.audio, found.alt.audio, config.audioDevice)) {
    return {
      ready: false,
      message: `ไม่พบไมโครโฟน "${config.audioDevice}" ที่ตั้งไว้ใน config.json`,
    };
  }

  // กล้องมีอยู่จริงแล้ว เหลือดูว่าค่าที่ตั้งไว้ใช้กับกล้องตัวนี้ได้ไหม
  const optionProblem = await checkVideoOptions(config);
  if (optionProblem) {
    return { ready: false, message: optionProblem };
  }

  return { ready: true, message: `กล้อง "${config.videoDevice}" พร้อมใช้งาน` };
}

module.exports = { probeCamera };
