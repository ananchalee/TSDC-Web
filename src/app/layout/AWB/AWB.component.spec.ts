import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AWBComponent } from './AWB.component';

describe('AWBComponent', () => {
  let component: AWBComponent;
  let fixture: ComponentFixture<AWBComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AWBComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AWBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
