import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditCheckPrintOldComponent } from './audit-check-Print-Old.component';

describe('AuditCheckComponent', () => {
  let component: AuditCheckPrintOldComponent;
  let fixture: ComponentFixture<AuditCheckPrintOldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuditCheckPrintOldComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditCheckPrintOldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
