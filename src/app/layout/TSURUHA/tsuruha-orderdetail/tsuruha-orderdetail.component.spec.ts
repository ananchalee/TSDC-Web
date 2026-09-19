import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TsuruhaOrderdetailComponent } from './tsuruha-orderdetail.component';

describe('TsuruhaOrderdetailComponent', () => {
  let component: TsuruhaOrderdetailComponent;
  let fixture: ComponentFixture<TsuruhaOrderdetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TsuruhaOrderdetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TsuruhaOrderdetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
