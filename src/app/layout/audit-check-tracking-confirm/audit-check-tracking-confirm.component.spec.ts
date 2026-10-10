import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditCheckTrackingConfirmComponent } from './audit-check-tracking-confirm.component';

describe('AuditCheckTrackingConfirmComponent', () => {
  let component: AuditCheckTrackingConfirmComponent;
  let fixture: ComponentFixture<AuditCheckTrackingConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuditCheckTrackingConfirmComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditCheckTrackingConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
