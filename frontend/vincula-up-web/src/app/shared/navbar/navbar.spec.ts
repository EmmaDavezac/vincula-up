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
						currentUser: () => (role ? { name: 'Test user', role } : null),
						hasRole: (expected: UserRole) => role === expected,
						isProfessionalActive: () => professionalActive,
						loginWithKeycloak: () => of(true),
						registerWithKeycloak: () => {},
						logout: () => {},
						loadOwnPhoto: () => {},
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

	function renderInteractive() {
		const fixture = TestBed.createComponent(NavbarComponent);
		fixture.detectChanges();
		return { fixture, element: fixture.nativeElement as HTMLElement };
	}

	function routerLinks(element: HTMLElement) {
		return Array.from(element.querySelectorAll('a[routerLink]')).map((a) =>
			a.getAttribute('routerLink'),
		);
	}

	it('should render the navbar with brand', () => {
		const element = render();
		expect(element.querySelector('.brand')?.textContent).toContain('Vincula-UP');
	});

	it('should render the site header of the prototype', () => {
		const element = render();
		expect(element.querySelector('header.vu-header')).toBeTruthy();
		expect(element.querySelector('.vu-brand-mark')?.textContent).toContain('V');
	});

	it('should show only public routerLinks for unauthenticated visitors', () => {
		role = null;
		const element = render();
		const links = new Set(routerLinks(element));
		expect(links.has('/')).toBe(true);
		expect(links.has('/como-funciona')).toBe(false);
		expect(links.has('/admin')).toBe(false);
		expect(links.has('/directorio')).toBe(false);
		expect(links.has('/solicitudes')).toBe(false);
		expect(links.has('/solicitar')).toBe(false);
		expect(links.has('/activar-perfil')).toBe(false);
		expect(links.has('/mi-cuenta')).toBe(false);
	});

	it('should show admin routerLinks only for ADMIN', () => {
		role = 'ADMIN';
		const element = render();
		expect(routerLinks(element)).toContain('/admin');
		expect(routerLinks(element)).not.toContain('/directorio');
	});

	it('should hide admin routerLinks for non-admin roles', () => {
		role = 'CLIENTE';
		const element = render();
		expect(routerLinks(element)).not.toContain('/admin');
		expect(routerLinks(element)).not.toContain('/directorio');
	});

	it('should show the session name with the role inside the user menu', () => {
		role = 'CLIENTE';
		const element = render();
		const trigger = element.querySelector('button.user-menu__trigger');
		expect(trigger).toBeTruthy();
		expect(trigger?.textContent).toContain('Test user');
		expect(trigger?.textContent).toContain('Cliente');
	});

	it('opens the user menu with the profile link and the logout action', () => {
		role = 'CLIENTE';
		const { fixture, element } = renderInteractive();
		(element.querySelector('button.user-menu__trigger') as HTMLButtonElement).click();
		fixture.detectChanges();
		expect(element.querySelector("a[routerLink='/mi-cuenta']")?.textContent).toContain(
			'Actualizar perfil',
		);
		expect(
			Array.from(element.querySelectorAll('.user-menu__item')).map((i) => i.textContent?.trim()),
		).toContain('Cerrar sesión');
	});

	it('should show login and sign-up actions for visitors', () => {
		role = null;
		const element = render();
		const actions = Array.from(element.querySelectorAll('.auth-action')).map((b) =>
			b.textContent?.trim(),
		);
		expect(actions).toContain('Crear cuenta');
		expect(actions).toContain('Ingresar');
	});
});
