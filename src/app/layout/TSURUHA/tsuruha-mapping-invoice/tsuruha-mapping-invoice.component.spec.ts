import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TsuruhaMapInvoiceComponent } from './tsuruha-mapping-invoice.component';

describe('TsuruhaMapInvoiceComponent', () => {
  let component: TsuruhaMapInvoiceComponent;
  let fixture: ComponentFixture<TsuruhaMapInvoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TsuruhaMapInvoiceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TsuruhaMapInvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
