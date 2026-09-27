import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VuTabbar } from './tabbar';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user-profile';

/**
* La barra inferior es la navegación de móvil para todo el sitio, así que las
* secciones dependen del rol: el administrador recorre su panel y el resto las
* pantallas que les corresponden.
*/
describe('VuTabbar', () => {
	let role: UserRole | null;
	let professionalActive: boolean;

	beforeEach(async () => {
		role = null;
		professionalActive = false;
		await TestBed.configureTestingModule({
			imports: [VuTabbar],
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: {
						hasRole: (expected: UserRole) => role === expected,
						isProfessionalActive: () => professionalActive,
					},
				},
			],
		}).compileComponents();
	});

	function render() {
		const fixture = TestBed.createComponent(VuTabbar);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	function items(element: HTMLElement): Array<string | null> {
		return Array.from(element.querySelectorAll('.vu-tabbar__item')).map((item) =>
			item.textContent?.trim(),
		);
	}

	function paths(element: HTMLElement): Array<string | null> {
		return Array.from(element.querySelectorAll('.vu-tabbar__item')).map((item) =>
			item.getAttribute('href'),
		);
	}

	it('ofrece informacion y acceso a quien no tiene sesion', () => {
		const element = render();
		expect(items(element)).toEqual(['Inicio', 'Cómo funciona', 'Ingresar']);
		expect(paths(element)).toEqual(['/', '/como-funciona', '/ingresar']);
	});

	it('lleva al cliente a sus solicitudes, a pedir un tecnico y a su cuenta', async () => {
		role = 'CLIENTE';
		const element = await render();
		expect(paths(element)).toEqual(['/', '/solicitudes', '/solicitar', '/mi-cuenta']);
	});

	it('prioriza activar el perfil mientras el profesional no esta activo', async () => {
		role = 'PROFESIONAL';
		professionalActive = false;
		const element = await render();
		expect(paths(element)).toEqual(['/', '/solicitudes', '/activar-perfil', '/mi-cuenta']);
	});

	it('deja de ofrecer activar el perfil cuando el profesional ya esta activo', async () => {
		role = 'PROFESIONAL';
		professionalActive = true;
		const element = await render();
		expect(paths(element)).toEqual(['/', '/solicitudes', '/mi-cuenta']);
	});

	it('le da al administrador sus cuatro secciones del panel', async () => {
		role = 'ADMIN';
		const element = await render();
		expect(paths(element)).toEqual([
			'/admin',
			'/admin/profesionales',
			'/admin/categorias',
			'/admin/clientes',
		]);
	});
});
