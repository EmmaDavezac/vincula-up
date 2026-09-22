import { fotoUtil } from './photo';

describe('fotoUtil', () => {
  it('keeps a usable data URL', () => {
    expect(fotoUtil('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });

  it('keeps a relative or absolute URL', () => {
    expect(fotoUtil('/avatars/profesional-demo.svg')).toBe('/avatars/profesional-demo.svg');
    expect(fotoUtil('https://ejemplo.test/foto.jpg')).toBe('https://ejemplo.test/foto.jpg');
  });

  it('discards empty, blank and missing photos so the initials are shown', () => {
    expect(fotoUtil('')).toBeNull();
    expect(fotoUtil('   ')).toBeNull();
    expect(fotoUtil(null)).toBeNull();
    expect(fotoUtil(undefined)).toBeNull();
  });
});
