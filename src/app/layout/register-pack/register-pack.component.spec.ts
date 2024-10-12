import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterPackComponent } from './register-pack.component';

describe('RegisterPackComponent', () => {
  let component: RegisterPackComponent;
  let fixture: ComponentFixture<RegisterPackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegisterPackComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterPackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
