import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoniterInterfaceErrorManHComponent } from './moniter-InterfaceErrorManH.component';

describe('MoniterInterfaceErrorManHComponent', () => {
  let component: MoniterInterfaceErrorManHComponent;
  let fixture: ComponentFixture<MoniterInterfaceErrorManHComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MoniterInterfaceErrorManHComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MoniterInterfaceErrorManHComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
