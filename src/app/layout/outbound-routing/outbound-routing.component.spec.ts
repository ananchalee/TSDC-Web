import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutboundRoutingComponent } from './outbound-routing.component';

describe('OutboundRoutingComponent', () => {
  let component: OutboundRoutingComponent;
  let fixture: ComponentFixture<OutboundRoutingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutboundRoutingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OutboundRoutingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
