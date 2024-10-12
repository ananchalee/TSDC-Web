import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditCheckFullcartonComponent } from './audit-check-fullcarton.component';

describe('AuditCheckFullcartonComponent', () => {
  let component: AuditCheckFullcartonComponent;
  let fixture: ComponentFixture<AuditCheckFullcartonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuditCheckFullcartonComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditCheckFullcartonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
