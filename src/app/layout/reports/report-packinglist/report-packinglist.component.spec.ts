import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportPackingListComponent } from './report-packinglist.component';

describe('ReportPackingListComponent', () => {
  let component: ReportPackingListComponent;
  let fixture: ComponentFixture<ReportPackingListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportPackingListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportPackingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
