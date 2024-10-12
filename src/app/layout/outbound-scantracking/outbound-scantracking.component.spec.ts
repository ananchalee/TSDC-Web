import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutboundScantrackingComponent } from './outbound-scantracking.component';

describe('OutboundScantrackingComponent', () => {
  let component: OutboundScantrackingComponent;
  let fixture: ComponentFixture<OutboundScantrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutboundScantrackingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OutboundScantrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
