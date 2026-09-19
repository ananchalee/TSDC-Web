import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditCheckTrackingComponent } from './audit-check-tracking.component';

describe('AuditCheckTrackingComponent', () => {
  let component: AuditCheckTrackingComponent;
  let fixture: ComponentFixture<AuditCheckTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuditCheckTrackingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditCheckTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
