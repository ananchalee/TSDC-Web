import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  private offset = 0;
  private datetimeSubject = new BehaviorSubject<string>('');
  datetime$ = this.datetimeSubject.asObservable();

  constructor(private dataService: DataService) {
    this.initServerTime();
  }

  private initServerTime() {
    this.dataService.getServerDate().subscribe(resp => {
      const serverDate = resp?.date ? new Date(resp.date) : new Date();
      const clientDate = new Date();

      this.offset = serverDate.getTime() - clientDate.getTime();

      interval(1000).subscribe(() => {
        const now = new Date(Date.now() + this.offset);
        this.datetimeSubject.next(this.format(now));
      });
    });
  }

  private format(d: Date): string {
    const date = d.toISOString().slice(0, 10);
    const h = this.pad(d.getHours());
    const m = this.pad(d.getMinutes());
    const s = this.pad(d.getSeconds());
    return `${date} ${h}:${m}:${s}`;
  }

  private pad(i: number) {
    return i < 10 ? '0' + i : i;
  }

  /** ใช้กรณีต้องการค่า ณ ตอนนั้น */
  getNow(): string {
    return this.datetimeSubject.value;
  }
}
