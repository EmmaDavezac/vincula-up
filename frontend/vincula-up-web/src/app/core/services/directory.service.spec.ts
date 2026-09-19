import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ApiService } from './api.service';
import { DirectoryService } from './directory.service';
import { Professional } from '../models/professional';

// Fixture: forma real devuelta por el BFF, con datos enriquecidos de ms-usuarios.
const professionalFromApi = {
  id: 'prof-1',
  usuarioId: 'user-1',
  legajo: 'P-987',
  estado: 'ACTIVO',
  nombre: 'Luciano',
  apellido: 'González',
  fotoUrl: 'data:image/jpeg;base64,AAA',
  especialidades: [{ id: 'spec-1', nombre: 'Electricidad' }],
};

describe('DirectoryService', () => {
  let api: { getProfessionals: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getProfessionals: vi.fn().mockReturnValue(of([professionalFromApi])) };
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: api }],
    });
  });

  function service(): DirectoryService {
    return TestBed.inject(DirectoryService);
  }

  it('muestra el nombre y apellido reales del profesional', async () => {
    const result = (await firstValueFrom(service().loadProfessionals())) as Professional[];
    expect(result[0].name).toBe('Luciano González');
    expect(result[0].initials).toBe('LG');
    expect(result[0].fotoUrl).toBe(professionalFromApi.fotoUrl);
  });

  it('usa el legajo como nombre cuando no vienen datos personales', async () => {
    api.getProfessionals.mockReturnValue(of([{ ...professionalFromApi, nombre: null, apellido: null }]));
    const result = (await firstValueFrom(service().loadProfessionals())) as Professional[];
    expect(result[0].name).toBe('Profesional P-987');
    expect(result[0].initials).toBe('P1');
  });
});
