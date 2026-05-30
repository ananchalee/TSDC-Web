import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportPrintWaveOrderComponent } from './report-print-waveorder.component';

describe('ReportPrintWaveOrdeComponent', () => {
  let component: ReportPrintWaveOrderComponent;
  let fixture: ComponentFixture<ReportPrintWaveOrdeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportPrintWaveOrdeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportPrintWaveOrdeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
