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

  constructor() {
    this.connect();
  }

  private connect(): void {
    this.manualClose = false;
    this.socket = new WebSocket(AGENT_WS_URL);

    this.socket.onopen = () => {
      this.connectionStatusSubject.next(true);
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const status = JSON.parse(event.data);
        this.recordingStatusSubject.next(status);
      } catch (err) {
        console.error('VideoRecordingService: invalid message from agent', event.data);
      }
    };

    this.socket.onclose = () => {
      this.connectionStatusSubject.next(false);
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

  // tableCheck ใช้ตั้งชื่อไฟล์ฝั่ง agent (tablecheck-order-วันเดือนปี-running) ส่งเฉพาะตอน start
  sendCommand(command: 'start' | 'stop', orderCode: string, tableCheck?: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('VideoRecordingService: socket not open, cannot send command', command);
      return;
    }
    this.socket.send(JSON.stringify({ command, orderCode, tableCheck }));
  }

  getRecordingStatus(): Observable<any> {
    return this.recordingStatusSubject.asObservable();
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
