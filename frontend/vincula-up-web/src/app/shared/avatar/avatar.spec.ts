import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VuAvatar } from './avatar';

describe('VuAvatar', () => {
  let fixture: ComponentFixture<VuAvatar>;

  function render(nombre: string, foto: string | null | undefined, size = 'md') {
    fixture = TestBed.createComponent(VuAvatar);
    fixture.componentRef.setInput('nombre', nombre);
    fixture.componentRef.setInput('foto', foto);
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VuAvatar] }).compileComponents();
  });

  it('muestra la foto cuando existe, con el estilo base del prototipo', () => {
    const element = render('Ana Díaz', 'data:image/png;base64,AAA');
    const host = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAA');
    expect(host.classList.contains('vu-avatar')).toBe(true);
    expect(host.classList.contains('vu-avatar--md')).toBe(true);
  });

  it('acepta cualquier URL de foto, no sólo data URLs', () => {
    const element = render('Ana Díaz', '/uploads/ana.jpg');
    expect(element.querySelector('img')?.getAttribute('src')).toBe('/uploads/ana.jpg');
  });

  it('cae a iniciales cuando no hay foto', () => {
    for (const foto of [null, undefined, '', '   ']) {
      const element = render('Lucía Benítez', foto);
      expect(element.querySelector('img')).toBeNull();
      expect(element.textContent).toContain('LB');
    }
  });

  it('usa el mismo estilo y tamaño en todas las variantes', () => {
    for (const size of ['xs', 'sm', 'md', 'lg', 'xl']) {
      const element = render('Jorge Sosa', null, size);
      const host = element as HTMLElement;
      expect(host.classList.contains('vu-avatar')).toBe(true);
      expect(host.classList.contains(`vu-avatar--${size}`)).toBe(true);
      expect(host.textContent).toContain('JS');
    }
  });

  it('vuelve a las iniciales si la imagen no carga', () => {
    const element = render('Ana Díaz', 'https://example.com/rota.jpg');
    expect(element.querySelector('img')).not.toBeNull();

    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('AD');
  });

  it('reintenta la foto cuando la persona sube otra', () => {
    const element = render('Ana Díaz', 'data:image/png;base64,ROTA');
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('img')).toBeNull();

    fixture.componentRef.setInput('foto', 'data:image/png;base64,NUEVA');
    fixture.detectChanges();

    expect(element.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,NUEVA');
  });
});
