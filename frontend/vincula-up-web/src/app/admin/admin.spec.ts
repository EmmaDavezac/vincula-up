import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Admin } from './admin';
import { ApiService } from '../core/services/api.service';

describe('Admin', () => {
  let fixture: ComponentFixture<Admin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        provideHttpClient(),
        {
          provide: ApiService,
          useValue: {
            getProfessionals: () => of([]),
            getUsers: () => of([]),
            getSpecialties: () => of([]),
            createProfessional: () => of({}),
            suspendProfessional: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    fixture.detectChanges();
  });

  it('should render the professional creation form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alta individual de profesional');
  });
});
