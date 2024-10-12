import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportSorterComponent } from './report-sorter.component';

describe('ReportSorterComponent', () => {
  let component: ReportSorterComponent;
  let fixture: ComponentFixture<ReportSorterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportSorterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportSorterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
