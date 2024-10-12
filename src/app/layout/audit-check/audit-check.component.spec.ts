import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditCheckComponent } from './audit-check.component';

describe('AuditCheckComponent', () => {
  let component: AuditCheckComponent;
  let fixture: ComponentFixture<AuditCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuditCheckComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
