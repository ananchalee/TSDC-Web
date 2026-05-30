import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportPrintOrderCancelComponent } from './report-print-ordercancel.component';

describe('ReportPrintOrderCancelComponent', () => {
  let component: ReportPrintOrderCancelComponent;
  let fixture: ComponentFixture<ReportPrintOrderCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportPrintOrderCancelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportPrintOrderCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
