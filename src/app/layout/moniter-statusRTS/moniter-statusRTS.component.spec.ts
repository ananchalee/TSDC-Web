import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoniterStatusRTSComponent } from './moniter-statusRTS.component';

describe('MoniterStatusRTSComponent', () => {
  let component: MoniterStatusRTSComponent;
  let fixture: ComponentFixture<MoniterStatusRTSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MoniterStatusRTSComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MoniterStatusRTSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
