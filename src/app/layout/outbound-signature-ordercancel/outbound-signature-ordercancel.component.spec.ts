import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutboundSignatureOrderCancelComponent } from './outbound-signature-ordercancel.component';

describe('OutboundSignatureOrderCancelComponent', () => {
  let component: OutboundSignatureOrderCancelComponent;
  let fixture: ComponentFixture<OutboundSignatureOrderCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutboundSignatureOrderCancelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OutboundSignatureOrderCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
