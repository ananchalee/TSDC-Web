import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const AGENT_WS_URL = 'ws://localhost:5050';
const RECONNECT_DELAY_MS = 3000;

@Injectable({
  providedIn: 'root'
})
export class VideoRecordingService {

  private socket: WebSocket | undefined;
  private reconnectTimer: any = null;
  private manualClose = false;

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private recordingStatusSubject = new BehaviorSubject<any>({ status: 'idle' });

  // สถานะกล้องจาก agent — แยก subject กับ recordingStatus เพราะเป็นคนละเรื่องกัน
  // และไม่ควรให้ข้อความ camera ไปกลายเป็น "สถานะล่าสุด" ที่ BehaviorSubject รีเพลย์ให้คนที่ subscribe ทีหลัง
  // ready = null คือยังไม่รู้ (agent รุ่นเก่าที่ยังไม่ส่ง camera มาให้ ก็ค้างที่ null ตลอด)
  private cameraStatusSubject = new BehaviorSubject<any>({ ready: null, message: '' });

  constructor() {
    this.connect();
  }

  private connect(): void {
    this.manualClose = false;

    // ตัด handler ของ socket ตัวเก่าทิ้งก่อนเสมอ ไม่งั้น onclose ของตัวเก่าจะยิง scheduleReconnect ซ้อน
    // หรือกดสถานะเป็น false ทับ socket ตัวใหม่ที่เพิ่งต่อติด
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
    }

    this.socket = new WebSocket(AGENT_WS_URL);

    this.socket.onopen = () => {
      this.connectionStatusSubject.next(true);
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const status = JSON.parse(event.data);
        if (status && status.status === 'camera') {
          this.cameraStatusSubject.next({ ready: status.ready, message: status.message || '' });
          return;
        }
        this.recordingStatusSubject.next(status);

        // stopped / error เป็น "เหตุการณ์" ที่เกิดครั้งเดียว ไม่ใช่ "สถานะปัจจุบัน"
        // แต่ BehaviorSubject เก็บค่าล่าสุดไว้รีเพลย์ให้ทุกคนที่ subscribe ทีหลัง
        // พอออกจากหน้าเช็คแล้วกลับเข้ามาใหม่ component ถูกสร้างใหม่ทั้งตัว แล้ว subscribe
        // ก็ได้ stopped ตัวเก่ากลับมาทันที = เด้ง "บันทึกวิดีโอเรียบร้อย" ซ้ำ และยิง insert
        // ลง DB ซ้ำด้วยชื่อไฟล์เดิม ทั้งที่ไม่ได้อัดอะไรใหม่เลย
        //
        // ตัวกันซ้ำฝั่ง component (lastVideoStopKey) ช่วยไม่ได้ เพราะมันเป็นฟิลด์ของ
        // component ที่ถูกล้างไปพร้อมกับตัว component เอง
        //
        // เคลียร์ค่าที่ค้างเป็น idle ทันทีหลังส่งต่อ คนที่ subscribe ตอนนี้ได้รับ stopped
        // ไปแล้ว (ยิงไปก่อนหน้าบรรทัดนี้) ส่วนคนที่มาทีหลังจะได้ idle ซึ่งตรงความจริง
        if (status && (status.status === 'stopped' || status.status === 'error')) {
          this.recordingStatusSubject.next({ status: 'idle' });
        }
      } catch (err) {
        console.error('VideoRecordingService: invalid message from agent', event.data);
      }
    };

    this.socket.onclose = () => {
      this.connectionStatusSubject.next(false);
      this.cameraStatusSubject.next({ ready: null, message: '' });
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  // tableCheck ใช้ตั้งชื่อไฟล์ฝั่ง agent (โต๊ะเช็ค-ออเดอร์-วันที่-เวลา) ส่งเฉพาะตอน start
  sendCommand(command: 'start' | 'stop', orderCode: string, tableCheck?: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('VideoRecordingService: socket not open, cannot send command', command);
      return;
    }
    this.socket.send(JSON.stringify({ command, orderCode, tableCheck }));
  }

  // สั่ง agent เติม FNVideo_id ไว้หน้าชื่อไฟล์ หลัง API คืน id ของแถวนั้นมาแล้ว
  // files: [{ name: ชื่อปัจจุบัน, newName: ชื่อที่ต้องการ }]
  // agent จะตอบกลับด้วยสถานะ 'renamed' พร้อมชื่อเดิม เพื่อให้เอาไป update FTVideo_name ต่อ
  sendRename(files: Array<{ name: string, newName: string }>): void {
    if (!files || !files.length) {
      return;
    }
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('VideoRecordingService: socket not open, cannot rename video files');
      return;
    }
    this.socket.send(JSON.stringify({ command: 'rename', files }));
  }

  // service ตัวนี้เป็น singleton (providedIn: 'root') constructor จึงถูกเรียกครั้งเดียวตอนโหลดหน้าเว็บ
  // พอออกจากหน้าเช็ค ngOnDestroy สั่ง closeConnection() ทำให้ manualClose = true และ socket ตายถาวร
  // กลับเข้าหน้าอีกรอบจึงไม่มีใครต่อใหม่ ป้ายสถานะเลยไม่ขึ้นเขียว — ต้องปลุกให้ต่อใหม่ตอนเข้าหน้าทุกครั้ง
  ensureConnected(): void {
    const state = this.socket?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
      this.manualClose = false;
      return;
    }
    if (this.reconnectTimer) {
      return;   // มีคิว reconnect รออยู่แล้ว ปล่อยให้มันทำงานไป
    }
    this.connect();
  }

  getRecordingStatus(): Observable<any> {
    return this.recordingStatusSubject.asObservable();
  }

  getCameraStatus(): Observable<any> {
    return this.cameraStatusSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  closeConnection(): void {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
  }
}
