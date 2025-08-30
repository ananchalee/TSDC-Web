import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import Swal from 'sweetalert2';
import {BehaviorSubject } from 'rxjs'; 

@Injectable({
  providedIn: 'root'
})

export class VideoRecordingService {
  private ws!: WebSocket; // <--- แก้ไข: เพิ่มเครื่องหมาย !
  private wsUrl = 'ws://localhost:8081';
  private connectionSubject: Subject<boolean> = new Subject<boolean>();
  //private recordingStatusSubject: Subject<any> = new Subject<any>();
  private recordingStatusSubject = new BehaviorSubject<any>({ status: 'stopped' }); 
  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting.');
      return;
    }

    

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('Recorder WebSocket Connected from Angular Service.');
      this.connectionSubject.next(true);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received from recorder:', data);
      this.recordingStatusSubject.next(data);
    };

    this.ws.onclose = () => {
      console.log('Recorder WebSocket Disconnected from Angular Service.');
      this.connectionSubject.next(false);
      setTimeout(() => this.connectWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('Recorder WebSocket Error from Angular Service:', error);
      this.connectionSubject.next(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'การเชื่อมต่อการบันทึกมีปัญหา!',
        showConfirmButton: false,
        timer: 3000,
	timerProgressBar: true,
      });
    };
  }

  sendCommand(command: string, orderCode?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ command, orderCode }));
      console.log(`Sent command: ${command} for Order: ${orderCode || 'N/A'}`);
    } else {
      console.warn('WebSocket not open. Cannot send command.');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'ไม่สามารถส่งคำสั่งได้: การเชื่อมต่อยังไม่พร้อม',
        showConfirmButton: false,
        timer: 3000
      });
      this.connectWebSocket();
    }
  }

  public getRecordingStatus() {
    return this.recordingStatusSubject; // เปลี่ยนให้ return BehaviorSubject
}

  getConnectionStatus(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  closeConnection(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}