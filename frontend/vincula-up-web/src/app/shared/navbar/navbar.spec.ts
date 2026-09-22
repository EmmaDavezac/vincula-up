import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NavbarComponent } from './navbar';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user-profile';
import { routes } from '../../app.routes';

describe('NavbarComponent', () => {
  let role: UserRole | null;
  const professionalActive = true;

  beforeEach(async () => {
    role = null;
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => role ? { name: "Test user", role } : null,
            hasRole: (expected: UserRole) => role === expected,
            isProfessionalActive: () => professionalActive,
            loginWithKeycloak: () => of(true),
            registerWithKeycloak: () => {},
            logout: () => {},
          },
        },
      ],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function routerLinks(element: HTMLElement) {
    return Array.from(element.querySelectorAll("a[routerLink]"))
      .map((a) => a.getAttribute("routerLink"));
  }

  it('should render the navbar with brand', () => {
    const element = render();
    expect(element.querySelector(".brand")?.textContent).toContain("Vincula-UP");
  });

  it('should render a mat-toolbar', () => {
    const element = render();
    expect(element.querySelector("mat-toolbar")).toBeTruthy();
  });

  it('should show only public routerLinks for unauthenticated visitors', () => {
    role = null;
    const element = render();
    const links = new Set(routerLinks(element));
    expect(links.has("/")).toBe(true);
    expect(links.has("/como-funciona")).toBe(false);
    expect(links.has("/admin")).toBe(false);
    expect(links.has("/directorio")).toBe(false);
    expect(links.has("/solicitudes")).toBe(false);
    expect(links.has("/solicitar")).toBe(false);
    expect(links.has("/activar-perfil")).toBe(false);
    expect(links.has("/mi-cuenta")).toBe(false);
  });

  it('should show admin routerLinks only for ADMIN', () => {
    role = "ADMIN";
    const element = render();
    expect(routerLinks(element)).toContain("/admin");
    expect(routerLinks(element)).not.toContain("/directorio");
  });

  it('should hide admin routerLinks for non-admin roles', () => {
    role = "CLIENTE";
    const element = render();
    expect(routerLinks(element)).not.toContain("/admin");
    expect(routerLinks(element)).not.toContain("/directorio");
  });

  it('should show session name routerLink for logged users', () => {
    role = "CLIENTE";
    const element = render();
    const sessionLink = element.querySelector("a.session-name[routerLink=\"/mi-cuenta\"]");
    expect(sessionLink).toBeTruthy();
    expect(sessionLink?.textContent).toContain("Test user");
  });

  it('should show login and sign-up buttons for visitors', () => {
    role = null;
    const element = render();
    const buttons = Array.from(element.querySelectorAll("button[mat-button]")).map((b) => b.textContent?.trim());
    expect(buttons).toContain("Crear cuenta");
    expect(buttons).toContain("Ingresar");
  });
});
