import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkedinLoginResponseComponent } from './linkedin-login-response.component';

describe('LinkedinLoginResponseComponent', () => {
  let component: LinkedinLoginResponseComponent;
  let fixture: ComponentFixture<LinkedinLoginResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkedinLoginResponseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinkedinLoginResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
