import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer';
import { routes } from '../../app.routes';

@Component({
  selector: "app-test-host",
  standalone: true,
  imports: [RouterOutlet, FooterComponent],
  template: "<app-footer /><router-outlet />",
})
export class TestHostComponent {}

describe('FooterComponent', () => {
  function render() {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should render the footprint with contacto link', () => {
    const element = render();
    expect(element.querySelector("app-footer")).toBeTruthy();
    expect(element.querySelector(".footer-link")?.getAttribute("href")).toBe("mailto:contacto@vinculaup.edu.ar");
  });

  it('should render the institutional columns of the footer', () => {
    const element = render();
    const text = element.textContent ?? "";
    expect(text).toContain("Vincula-UP · Universidad Popular de Concepción del Uruguay");
    expect(text).toContain("Ayuda");
    expect(text).toContain("Información");
    expect(text).toContain("Reportar un problema");
    expect(text).toContain(`© ${new Date().getFullYear()}`);
  });
});
