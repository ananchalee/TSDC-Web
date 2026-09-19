import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoniterTrackingOrderInternalComponent } from './moniter-TrackingOrderInternal.component';

describe('MoniterTrackingOrderInternalComponent', () => {
  let component: MoniterTrackingOrderInternalComponent;
  let fixture: ComponentFixture<MoniterTrackingOrderInternalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MoniterTrackingOrderInternalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MoniterTrackingOrderInternalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
