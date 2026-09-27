import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLayout } from './admin-layout';

/**
 * El panel ya no tiene shell propio: se navega con la barra superior del sitio
 * (escritorio) y con la barra inferior compartida (móvil). Estos tests fijan
 * justamente que el panel NO vuelva a traer header ni columna lateral propios.
 */
describe('AdminLayout', () => {
  let fixture: ComponentFixture<AdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter([{ path: 'admin', children: [] }])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
  });

  it('deja el contenido del panel como único hijo del shell', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.vu-admin-shell')).not.toBeNull();
    expect(compiled.querySelector('.vu-admin-main')).not.toBeNull();
  });

  it('no trae header propio ni navegación lateral: los usa la barra del sitio', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.vu-admin-header')).toBeNull();
    expect(compiled.querySelector('.vu-admin-aside')).toBeNull();
    expect(compiled.querySelector('.vu-admin-nav')).toBeNull();
    expect(compiled.querySelector('app-navbar')).toBeNull();
    expect(compiled.querySelector('vu-tabbar')).toBeNull();
  });
});
