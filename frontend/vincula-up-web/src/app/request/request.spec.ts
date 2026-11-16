import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';
import { RequestService } from '../core/services/request.service';
import { ToastService } from '../core/services/toast.service';
import { Request as RequestComponent } from './request';

describe('Request problem summary validation', () => {
  let component: RequestComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DirectoryService, useValue: { loadProfessionals: () => of([]) } },
        { provide: RequestService, useValue: {} },
        { provide: ApiService, useValue: { getSpecialtiesMap: () => of({}) } },
        { provide: AuthService, useValue: {} },
        { provide: ToastService, useValue: { error: vi.fn() } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new RequestComponent());
    component.step.set('problem');
  });

  it('blocks summaries shorter than 20 trimmed characters', () => {
    component.problemSummary.set('1234567890123456789');

    expect(component.canContinue).toBe(false);
    expect(component.avisoPendiente).toContain('mínimo 20 caracteres');
  });

  it('allows a summary with exactly 20 trimmed characters', () => {
    component.problemSummary.set('12345678901234567890');

    expect(component.canContinue).toBe(true);
    expect(component.avisoPendiente).toBe('');
  });

  it('does not count surrounding whitespace toward the minimum', () => {
    component.problemSummary.set('  1234567890123456789  ');

    expect(component.canContinue).toBe(false);
    expect(component.resumenValido()).toBe(false);
  });

  it('only offers today and the next six days', () => {
    expect(component.dayOptions()).toHaveLength(7);
  });

  it('orders professionals by distance and then by reputation when requested', () => {
    component.selectedSpecialty.set('Electricidad');
    component.allProfessionals.set([
      {
        id: 'far-high-rating',
        name: 'Far professional',
        specialty: 'Electricidad',
        zone: 'Zona A',
        rating: 4.5,
        reviews: 2,
        availability: 'Disponible',
        initials: 'F',
        accent: 'sky',
        distanceKm: 4.1,
        especialidades: [{ id: 'electricidad', nombre: 'Electricidad' }],
        horarios: [],
      },
      {
        id: 'near-low-rating',
        name: 'Near professional',
        specialty: 'Electricidad',
        zone: 'Zona B',
        rating: 3.2,
        reviews: 9,
        availability: 'Disponible',
        initials: 'N',
        accent: 'mint',
        distanceKm: 0.1,
        especialidades: [{ id: 'electricidad', nombre: 'Electricidad' }],
        horarios: [],
      },
    ]);

    expect(component.filteredProfessionals().map((professional) => professional.id))
      .toEqual(['near-low-rating', 'far-high-rating']);

    component.sortBy.set('reputacion');

    expect(component.filteredProfessionals().map((professional) => professional.id))
      .toEqual(['far-high-rating', 'near-low-rating']);
  });
});
