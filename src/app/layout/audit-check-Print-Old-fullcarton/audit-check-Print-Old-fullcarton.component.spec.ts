import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditCheckPrintOldFullComponent } from './audit-check-Print-Old-fullcarton.component';

describe('AuditCheckComponent', () => {
  let component: AuditCheckPrintOldFullComponent;
  let fixture: ComponentFixture<AuditCheckPrintOldFullComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuditCheckPrintOldFullComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditCheckPrintOldFullComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
