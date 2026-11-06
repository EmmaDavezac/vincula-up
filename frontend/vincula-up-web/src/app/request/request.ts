import { AfterViewInit, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService, GpsPosition } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';
import { RequestService } from '../core/services/request.service';
import { Professional, ProfessionalAvailability } from '../core/models/professional';
import { emptyServiceRequest } from '../core/models/service-request';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuConfirm } from '../shared/confirm/confirm';
import { VuIcon } from '../shared/icon/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { VuSpinner } from '../shared/spinner/spinner';
import { ToastService } from '../core/services/toast.service';
/**
 * Flujo de pasos del prototipo: ubicación → especialidad → día y horario →
 * elección del profesional (el envío cierra el flujo, sin formulario extra).
 */
type Step = 'location' | 'specialty' | 'problem' | 'day' | 'time' | 'professionals';


interface PlaceSuggestion {
  lat: number;
  lng: number;
  displayName: string;
}

interface UserLocation {
  lat: number | null;
  lng: number | null;
  displayName: string;
  detecting: boolean;
  editing: boolean;
}



interface ProfWithDistance extends Professional {
  distanceKm: number | null;
}


function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Component({
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe, VuAvatar, VuConfirm, VuIcon, VuSpinner, MatProgressSpinnerModule, MatButtonToggleModule],
	selector: 'app-request',
	styleUrl: './request.css',
	templateUrl: './request.html',
})
export class Request implements OnInit, AfterViewInit {
  private readonly directoryService = inject(DirectoryService);
  private readonly requestService = inject(RequestService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly specialtySearch = signal('');

readonly filteredSpecialties = computed(() => {
  const q = this.normalizarEspecialidad(this.specialtySearch());
  const all = this.specialties();
  return q ? all.filter((s) => this.normalizarEspecialidad(s).includes(q)) : all;
});

  // ── Pasos ──────────────────────────────────────────────
  readonly step = signal<Step>('location');
  readonly steps: Array<{ key: Step; label: string; title: string }> = [
    { key: 'location', label: 'Ubicación', title: '¿Dónde necesitás el servicio?' },
    { key: 'specialty', label: 'Categoría', title: '¿Qué necesitás resolver?' },
    { key: 'problem', label: 'Problema', title: 'Contanos qué necesitás resolver' },
    { key: 'day', label: 'Día', title: '¿Qué día te viene bien?' },
    { key: 'time', label: 'Horario', title: 'Elegí una franja horaria' },
    { key: 'professionals', label: 'Profesional', title: 'Elegí un profesional' },
  ];

  /**
   * Resumen del problema: obligatorio. Es lo primero que lee el profesional para
   * saber a qué se va a dedicar, así que no se puede dejar vacío ni con un
   * caracter suelto.
   */
  readonly problemSummary = signal('');
  readonly MIN_SUMMARY_LENGTH = 10;

  /** El resumen ya tiene contenido suficiente para avanzar. */
  readonly resumenValido = computed(() => this.problemSummary().trim().length >= this.MIN_SUMMARY_LENGTH);

  // ── Ubicación (paso 1: mapa embebido + GPS + dirección) ────────
  readonly location = signal<UserLocation>({ lat: null, lng: null, displayName: '', detecting: false, editing: false });
  readonly locationQuery = signal('');
  readonly locationSuggestions = signal<PlaceSuggestion[]>([]);
  readonly locationSuggestionOpen = signal(false);
  readonly locationSearching = signal(false);
  readonly pendingLocation = signal<PlaceSuggestion | null>(null);

  readonly geolocationAvailable = signal<boolean | 'unknown'>('unknown');
  readonly geolocationPermission = signal<PermissionState | 'unknown'>('unknown');

  private suggestionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly address = signal('');
  readonly gpsPosition = signal<GpsPosition | null>(null);
  readonly gpsLoading = signal(false);
  readonly reverseGeocoding = signal(false);

  // ── Profesionales ──────────────────────────────────────
  readonly allProfessionals = signal<ProfWithDistance[]>([]);
  readonly loadingProfessionals = signal(true);
  readonly loadingSpecialties = signal(true);

  /**
   * Catálogo completo de especialidades. Sin esto la lista del paso 2 salía de
   * los profesionales cargados, así que faltaban todas las especialidades que
   * todavía no tiene ningún técnico asignado.
   */
  readonly catalogoEspecialidades = signal<string[]>([]);

  
  /** Especialidades de un profesional, con respaldo en su especialidad única. */
  private especialidadesDe(p: ProfWithDistance): string[] {
    const nombres = (p.especialidades ?? []).map((e) => e.nombre).filter((n): n is string => !!n && !!n.trim());
    if (nombres.length) {
      return nombres;
    }
    // Sin lista de especialidades se usa la única, si no es el texto genérico.
    const unica = p.specialty?.trim();
    return unica && unica !== 'Servicio técnico' ? [unica] : [];
  }

  /** Solo se ofrecen categorías que tienen al menos un profesional activo. */
  readonly specialties = computed(() => {
    const disponibles = new Map<string, string>();
    for (const professional of this.allProfessionals()) {
      for (const name of this.especialidadesDe(professional)) {
        disponibles.set(this.normalizarEspecialidad(name), name);
      }
    }
    const catalogo = this.catalogoEspecialidades();
    if (catalogo.length) {
      return catalogo.filter((name) => disponibles.has(this.normalizarEspecialidad(name)));
    }
    return [...disponibles.values()].sort((a, b) => a.localeCompare(b, 'es'));
  });

  readonly selectedSpecialty = signal<string | null>(null);

  private normalizarEspecialidad(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
  }

  /**
   * Profesionales de la especialidad elegida, ordenados según el selector del
   * prototipo: por proximidad o por reputación.
   */
  readonly sortBy = signal<'proximidad' | 'reputacion'>('proximidad');

  readonly filteredProfessionals = computed(() => {
    const spec = this.selectedSpecialty();
    if (!spec) return [];
    const especialidadSeleccionada = this.normalizarEspecialidad(spec);
    const byDistance = this.sortBy() === 'proximidad';
    return [...this.allProfessionals()]
      .filter((p) => this.especialidadesDe(p).some((name) => this.normalizarEspecialidad(name) === especialidadSeleccionada))
      .filter((p) => {
  const franja = this.slotOptions.find((s) => s.id === this.selectedSlot());
  return !this.selectedDay() || !franja || this.trabajaEn(p, this.selectedDay(), franja);
})
      .sort((a, b) => {
        if (byDistance) {
          const distance = (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
          if (distance !== 0) return distance;
          return b.rating - a.rating;
        }
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      });
  });

  readonly selectedProfessional = signal<ProfWithDistance | null>(null);
  readonly form = signal<ReturnType<typeof emptyServiceRequest>>(emptyServiceRequest());

  // ── Turno (día y franja horaria, igual que el prototipo) ───────────────
  readonly date = signal('');
  readonly time = signal('');
  readonly submitted = signal(false);
  readonly enviandoSolicitud = signal(false);
  readonly bloqueo = computed<string | null>(() => {
  if (this.enviandoSolicitud()) return 'Enviando tu solicitud…';
  if (this.location().detecting) return 'Obteniendo tu ubicación…';
  if (this.gpsLoading()) return 'Verificando la dirección…';
  if (this.reverseGeocoding()) return 'Buscando la dirección del punto…';
  return null;
});
  readonly confirmandoSalida = signal(false);
  private resolverGuardSalida: ((permitir: boolean) => void) | null = null;

private readonly destroyRef = inject(DestroyRef);
private readonly ahora = signal(new Date());
private readonly MIN_ANTICIPACION_MIN = 60;
readonly DIAS_VISIBLES = 14;

private aMinutos(hhmm: string): number {
  const [h, m] = (hhmm ?? '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

private idDeFecha(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}

private fechaDeId(id: string): Date {
  const [y, m, d] = id.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Devuelve 0=domingo ... 6=sábado, como Date.getDay(). */
private indiceDia(valor: number | string): number {
  if (typeof valor === 'number') return valor === 7 ? 0 : valor;
  const nombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const ingles = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const v = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const i = nombres.indexOf(v);
  return i >= 0 ? i : ingles.indexOf(v);
}

private horariosDe(p: ProfWithDistance): ProfessionalAvailability[] {
  return p.horarios ?? [];
}

private trabajaEn(p: ProfWithDistance, dayId: string, slot: { start: string; end: string }): boolean {
  const horarios = this.horariosDe(p);
  const dow = this.fechaDeId(dayId).getDay();
  const ini = this.aMinutos(slot.start);
  const fin = this.aMinutos(slot.end);
  return horarios.some((h) => {
    if (this.indiceDia(h.diaSemana) !== dow) return false;
    return ini >= this.aMinutos(h.horaInicio) && fin <= this.aMinutos(h.horaFin);
  });
}

private franjaVigente(dayId: string, slot: { start: string }): boolean {
  const ahora = this.ahora();
  const hoy = this.idDeFecha(ahora);
  if (dayId > hoy) return true;
  if (dayId < hoy) return false;
  return this.aMinutos(slot.start) >= ahora.getHours() * 60 + ahora.getMinutes() + this.MIN_ANTICIPACION_MIN;
}

private profesionalesDe(spec: string | null): ProfWithDistance[] {
  if (!spec) return this.allProfessionals();
  const objetivo = this.normalizarEspecialidad(spec);
  return this.allProfessionals().filter((p) =>
    this.especialidadesDe(p).some((n) => this.normalizarEspecialidad(n) === objetivo),
  );
}

private franjaDisponible(dayId: string, slot: { start: string; end: string }): boolean {
  if (!this.franjaVigente(dayId, slot)) return false;
  if (this.loadingProfessionals()) return true;
  const profs = this.profesionalesDe(this.selectedSpecialty());
  return profs.some((p) => this.trabajaEn(p, dayId, slot));
}

/** Dos semanas; los días sin ninguna franja disponible quedan deshabilitados. */
readonly dayOptions = computed(() => {
  this.ahora(); this.allProfessionals(); this.selectedSpecialty(); // dependencias
  const today = new Date();
  return Array.from({ length: this.DIAS_VISIBLES }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const id = this.idDeFecha(date);
    const weekday = date.toLocaleDateString('es-AR', { weekday: 'short' }).replace(/\.$/, '');
    return {
      id,
      label: offset === 0 ? 'Hoy' : `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`,
      monthDay: date.getDate(),
      disabled: !this.slotOptions.some((s) => this.franjaDisponible(id, s)),
    };
  });
});

/** Franjas del día elegido, con las no disponibles marcadas. */
readonly slotsDisponibles = computed(() => {
  this.ahora(); this.allProfessionals(); this.selectedSpecialty();
  const day = this.selectedDay();
  return this.slotOptions.map((s) => ({ ...s, disabled: !day || !this.franjaDisponible(day, s) }));
});

  /** Franjas horarias del prototipo: el turno siempre es un rango. */
  readonly slotOptions: ReadonlyArray<{ id: string; label: string; start: string; end: string }> = [
    { id: 'MANANA', label: '08:00 a 12:00 hs', start: '08:00', end: '12:00' },
    { id: 'MEDIODIA', label: '12:00 a 16:00 hs', start: '12:00', end: '16:00' },
    { id: 'TARDE', label: '16:00 a 20:00 hs', start: '16:00', end: '20:00' },
  ];

  readonly selectedDay = signal('');
  readonly selectedSlot = signal('');
  /** Fin de la franja elegida: junto con `time` forma el rango del turno. */
  readonly timeEnd = signal('');

elegirDia(id: string): void {
  if (this.selectedDay() === id) return;
  this.selectedDay.set(id);
  this.date.set(id);
  // Si la franja ya elegida no existe ese día, se limpia.
  const franja = this.slotOptions.find((s) => s.id === this.selectedSlot());
  if (franja && !this.franjaDisponible(id, franja)) {
    this.selectedSlot.set('');
    this.time.set('');
    this.timeEnd.set('');
  }
  this.selectedProfessional.set(null);
}

elegirHorario(id: string): void {
  const franja = this.slotOptions.find((slot) => slot.id === id);
  this.selectedSlot.set(id);
  this.time.set(franja?.start ?? '');
  this.timeEnd.set(franja?.end ?? '');
  this.selectedProfessional.set(null);
}

  /** Etiqueta de la franja elegida (para el resumen del turno). */
  get selectedSlotLabel(): string {
    return this.slotOptions.find((slot) => slot.id === this.selectedSlot())?.label ?? '';
  }

  /** Texto legible del turno elegido (ej. "jueves 2 de octubre"). */
  get turnoLegible(): string {
    if (!this.date()) {
      return '';
    }
    const [year, month, day] = this.date().split('-').map(Number);
    if (!year || !month || !day) {
      return this.date();
    }
    const value = new Date(year, month - 1, day);
    const texto = value.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  constructor() {
    const timer = setInterval(() => this.ahora.set(new Date()), 60_000);
this.destroyRef.onDestroy(() => clearInterval(timer));
    this.loadAllProfessionals();
    this.loadCatalogoEspecialidades();

    // El pin del mapa sigue siempre a la ubicación elegida, venga del GPS, de una
    // sugerencia o de hacer clic en el mapa. Si el punto cae fuera de la vista,
    // el mapa también se recentra para que el pin no quede invisible.
    effect(() => {
      const loc = this.location();
      if (loc.lat == null || loc.lng == null || !this.mapaListo()) {
        return;
      }
      this.marcador?.setLatLng([loc.lat, loc.lng]);
      const mapa = this.mapaInstancia;
      if (mapa && !mapa.getBounds().contains([loc.lat, loc.lng])) {
        mapa.setView([loc.lat, loc.lng], mapa.getZoom() ?? 15);
      }
    });
  }

  ngOnInit(): void {
    const available = typeof navigator !== 'undefined' && !!navigator.geolocation;
    this.geolocationAvailable.set(available);
    if (available && typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        void navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
          this.geolocationPermission.set(status.state);
          status.onchange = () => this.geolocationPermission.set(status.state);
        }).catch(() => this.geolocationPermission.set('unknown'));
      } catch {
        this.geolocationPermission.set('unknown');
      }
    } else if (!available) {
      this.geolocationPermission.set('denied');
    }
  }

  isStepDone(key: Step): boolean {
    return this.steps.findIndex((s) => s.key === key) < this.steps.findIndex((s) => s.key === this.step());
  }

  // ── Métodos del paso Ubicación ─────────────────────────

  onLocationQueryChange(value: string): void {
    this.locationQuery.set(value);
    const q = value.trim();
    
    if (q.length < 4) {
      this.locationSuggestions.set([]);
      this.locationSuggestionOpen.set(false);
      if (this.suggestionTimer) {
        clearTimeout(this.suggestionTimer);
        this.suggestionTimer = null;
      }
      // Sin texto a la vista, el pin vuelve al punto realmente confirmado.
      const loc = this.location();
      if (loc.lat != null && loc.lng != null) {
        this.previsualizarPunto(loc.lat, loc.lng);
      }
      return;
    }
    this.locationSuggestionOpen.set(true);
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
    }
    this.suggestionTimer = setTimeout(() => {
      void this.searchLocationSuggestions(q);
    }, 1000);
  }

  private async searchLocationSuggestions(query: string): Promise<void> {
    this.locationSearching.set(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=6&accept-language=es`,
      );
      if (!res.ok) {
        throw new Error(`Map search failed with status ${res.status}`);
      }
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      const sugerencias = (Array.isArray(data) ? data : []).map((item) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
      }));
      this.locationSuggestions.set(sugerencias);

      // El mapa acompaña lo que se está escribiendo: muestra el primer resultado
      // como previsualización. La dirección se confirma al elegir una sugerencia
      // o al presionar Enter, no mientras se tipea.
      const primera = sugerencias[0];
      if (primera) {
        this.previsualizarPunto(primera.lat, primera.lng);
      }
    } catch {
      this.locationSuggestions.set([]);
    } finally {
      this.locationSearching.set(false);
    }
  }

  /**
   * Mueve el pin a un punto candidato sin darlo por confirmado: sirve para
   * previsualizar lo que se está escribiendo y para volver al punto elegido
   * cuando se borra el texto.
   */
  private previsualizarPunto(lat: number, lng: number): void {
    if (!this.mapaListo() || this.step() !== 'location') {
      return;
    }
    this.marcador?.setLatLng([lat, lng]);
    this.mapaInstancia?.setView([lat, lng], this.mapaInstancia.getZoom() ?? 15);
  }

  hideSuggestionLater(): void {
    setTimeout(() => this.locationSuggestionOpen.set(false), 180);
  }

  selectSuggestion(suggestion: PlaceSuggestion): void {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
    this.locationQuery.set(suggestion.displayName);
    this.locationSuggestions.set([]);
    this.locationSuggestionOpen.set(false);
    this.pendingLocation.set(suggestion);
    const lat = suggestion.lat;
    const lng = suggestion.lng;
    const displayName = suggestion.displayName;
    this.location.set({ lat, lng, displayName, detecting: false, editing: false });
    this.address.set(displayName);
    this.form.update((f) =>
      emptyServiceRequest({
        ...f,
        address: displayName,
        latitude: lat,
        longitude: lng,
      })
    );
    this.updateDistances(lat, lng);
  }







  retryDetectLocation(): void {
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
      this.toast.error('El navegador solo permite compartir la ubicación en una conexión segura. Usá HTTPS o ingresá la dirección manualmente.');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.toast.error('Este navegador no ofrece geolocalización. Escribí una dirección para continuar.');
      return;
    }
    this.location.set({ ...this.location(), detecting: true, editing: false });
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const name = await this.reverseGeocode(latitude, longitude);
          this.aplicarUbicacionDetectada(latitude, longitude, name);
        },
        (error) => {
          if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                const name = await this.reverseGeocode(latitude, longitude);
                this.aplicarUbicacionDetectada(latitude, longitude, name);
              },
              (fallbackError) => {
                this.location.set({ ...this.location(), detecting: false });
                this.toast.error(this.mensajeErrorGeolocalizacion(fallbackError));
              },
              { timeout: 25000, maximumAge: 300000, enableHighAccuracy: false },
            );
            return;
          }
          this.location.set({ ...this.location(), detecting: false });
          this.toast.error(this.mensajeErrorGeolocalizacion(error));
        },
        { timeout: 12000, maximumAge: 300000, enableHighAccuracy: false },
      );
    } catch {
      this.location.set({ ...this.location(), detecting: false });
      this.toast.error('El navegador no pudo iniciar la geolocalización. Ingresá la dirección manualmente.');
    }
  }

  private aplicarUbicacionDetectada(latitude: number, longitude: number, name: string): void {
    this.location.set({ lat: latitude, lng: longitude, displayName: name, detecting: false, editing: false });
    this.address.set(name);
    this.locationQuery.set(name);
    this.pendingLocation.set({ lat: latitude, lng: longitude, displayName: name });
    this.form.update((current) => emptyServiceRequest({ ...current, address: name, latitude, longitude }));
    this.updateDistances(latitude, longitude);
  }

  private mensajeErrorGeolocalizacion(error: GeolocationPositionError): string {
    if (error.code === error.PERMISSION_DENIED) {
      return 'No tenemos permiso para usar tu ubicación. Habilitalo en el navegador o ingresá la dirección manualmente.';
    }
    if (error.code === error.TIMEOUT) {
      return 'La PC no respondió con una ubicación a tiempo. Revisá el permiso del navegador o ingresá la dirección manualmente.';
    }
    return 'La PC no pudo determinar una ubicación (GPS, Wi-Fi o red). Permití el acceso a la ubicación o ingresá la dirección manualmente.';
  }


  confirmLocationFromQuery(): void {
    const q = this.locationQuery().trim();
    if (q.length < 4) {
      this.toast.error('Escribí al menos 4 caracteres para buscar la dirección.');
      return;
    }
    this.gpsLoading.set(true);
    this.api.getGpsPosition(q).pipe(
      catchError((error) => {
        this.toast.error(this.api.describeError(error, 'No pudimos verificar esa dirección. Probá con otras palabras o usá el mapa.'));
        this.gpsLoading.set(false);
        return of(null);
      })
    ).subscribe((pos) => {
      this.gpsLoading.set(false);
      if (!pos) return;
      this.gpsPosition.set(pos);
      this.locationSuggestionOpen.set(false);
      if (pos.resolved === false) {
        this.toast.error(pos.error || 'No se pudieron obtener coordenadas. Probá con el mapa interactivo.');
        return;
      }
      const lat = (pos.latitude ?? pos.latitud) ?? null;
      const lng = (pos.longitude ?? pos.longitud) ?? null;
      const displayName = pos.address || q;
      if (lat == null || lng == null) {
        this.toast.error(pos.error || 'No se obtuvieron coordenadas para esa dirección. Probá con el mapa interactivo.');
        return;
      }
      this.location.set({ lat, lng, displayName, detecting: false, editing: false });
      this.address.set(displayName);
      this.locationQuery.set(displayName);
      this.pendingLocation.set({ lat, lng, displayName });
      this.form.update((f) =>
        emptyServiceRequest({
          ...f,
          address: displayName,
          latitude: lat,
          longitude: lng,
        })
      );
      this.updateDistances(lat, lng);
    });
  }

  confirmLocation(): void {
    const chosen = this.pendingLocation();
    if (chosen) {
      this.location.set({ lat: chosen.lat, lng: chosen.lng, displayName: chosen.displayName, detecting: false, editing: false });
      this.address.set(chosen.displayName);
      this.form.update((f) =>
        emptyServiceRequest({
          ...f,
          address: chosen.displayName,
          latitude: chosen.lat,
          longitude: chosen.lng,
        })
      );
      this.updateDistances(chosen.lat, chosen.lng);
      return;
    }
    const loc = this.location();
    if (loc.lat != null && loc.lng != null && loc.displayName.length > 0) {
      this.form.update((f) =>
        emptyServiceRequest({
          ...f,
          address: loc.displayName,
          latitude: loc.lat,
          longitude: loc.lng,
        })
      );
      this.updateDistances(loc.lat, loc.lng);
    }
  }



  /**
   * Mapa del paso 1. Va embebido en la pantalla (no en un modal ni en un servicio
   * externo): el cliente hace clic o arrastra el pin para ajustar el punto exacto,
   * que es lo mismo que hacía antes el botón "Ajustar el punto en el mapa".
   */
  readonly mapaListo = signal(false);
  private mapaInstancia: any = null;
  private marcador: any = null;
  private mapaIntentos = 0;

  // Centro por defecto: Concepción del Uruguay
  private readonly centroPorDefecto = { lat: -32.4844, lng: -58.2328 };

  async ngAfterViewInit(): Promise<void> {
    await this.inicializarMapa();
  }

  /** Crea (o refresca) el mapa embebido del paso 1. */
  async inicializarMapa(): Promise<void> {
    const L = (window as any).L;
    const container = document.getElementById('mapa-paso');
    if (!L || !container) {
      // El script de Leaflet puede tardar: reintentamos un par de veces.
      if (this.mapaIntentos++ < 20) {
        setTimeout(() => void this.inicializarMapa(), 150);
      }
      return;
    }

    const loc = this.location();
    const lat = loc.lat ?? this.centroPorDefecto.lat;
    const lng = loc.lng ?? this.centroPorDefecto.lng;

    if (this.mapaInstancia && this.mapaInstancia.getContainer() !== container) {
      this.destruirMapa();
    }

    if (!this.mapaInstancia) {
      this.mapaInstancia = L.map('mapa-paso', { scrollWheelZoom: false }).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.mapaInstancia);

      this.marcador = L.marker([lat, lng], { draggable: true }).addTo(this.mapaInstancia);
      this.marcador.on('dragend', (event: any) => {
        const posicion = event.target.getLatLng();
        void this.aplicarPunto(posicion.lat, posicion.lng);
      });
      this.mapaInstancia.on('click', (event: any) => {
        this.marcador?.setLatLng([event.latlng.lat, event.latlng.lng]);
        void this.aplicarPunto(event.latlng.lat, event.latlng.lng);
      });
      this.mapaListo.set(true);
    } else {
      this.mapaInstancia.setView([lat, lng], this.mapaInstancia.getZoom() ?? 15);
      this.marcador?.setLatLng([lat, lng]);
    }
    setTimeout(() => this.mapaInstancia?.invalidateSize(), 200);
  }

  /**
   * Aplica el punto elegido en el mapa: resuelve la dirección, actualiza el
   * formulario y recalcula la distancia a los profesionales.
   */
  async aplicarPunto(lat: number, lng: number, displayName = ''): Promise<void> {
    const nombre = displayName.trim() || (await this.reverseGeocode(lat, lng));
    this.location.set({ lat, lng, displayName: nombre, detecting: false, editing: false });
    this.address.set(nombre);
    this.locationQuery.set(nombre);
    this.pendingLocation.set({ lat, lng, displayName: nombre });
    this.form.update((f) =>
      emptyServiceRequest({ ...f, address: nombre, latitude: lat, longitude: lng }),
    );
    this.updateDistances(lat, lng);
  }

  /** El mapa del paso 1 acompaña a la pantalla mientras se está en él. */
  onCambioDePaso(): void {
    if (this.step() === 'location') {
      setTimeout(() => void this.inicializarMapa(), 80);
    }
  }

  private destruirMapa(): void {
    this.mapaInstancia?.remove();
    this.mapaInstancia = null;
    this.marcador = null;
    this.mapaListo.set(false);
    this.mapaIntentos = 0;
  }

  private cambiarPaso(next: Step): void {
      if (this.step() === next) return;
      this.toast.clear();
    if (this.step() === 'location') {
      this.destruirMapa();
    }
    this.ahora.set(new Date());
    this.step.set(next);
    if (next === 'location') {
      setTimeout(() => void this.inicializarMapa(), 80);
    }
  }


  // ── Navegación entre pasos ─────────────────────────────

  /** Número de paso (1 a 4) tal como lo muestra el prototipo. */
  get pasoActual(): number {
    return this.steps.findIndex((item) => item.key === this.step()) + 1;
  }

  get tituloPaso(): string {
    return this.steps.find((item) => item.key === this.step())?.title ?? '';
  }

  /**
   * Qué falta para poder avanzar en el paso actual. El botón de "Continuar"
   * queda deshabilitado cuando falta algo, así que este aviso es lo que explica
   * por qué: sin él no se sabe qué hay que completar.
   */
  readonly faltaEnElPaso = computed(() => {
    switch (this.step()) {
      case 'location': {
        const faltan: string[] = [];
        if (this.location().lat == null || this.location().lng == null) {
          faltan.push('la dirección donde necesitás el servicio');
        }
        return faltan;
      }
      case 'specialty': {
        return this.selectedSpecialty() ? [] : ['la categoría'];
      }
      case 'problem':
        return this.resumenValido() ? [] : [`el resumen del problema (mínimo ${this.MIN_SUMMARY_LENGTH} caracteres)`];
      case 'day':
        return this.selectedDay() ? [] : ['el día'];
      case 'time': {
	const franja = this.slotOptions.find((s) => s.id === this.selectedSlot());
	if (!franja) return ['el horario'];
	return this.franjaDisponible(this.selectedDay(), franja) ? [] : ['un horario disponible'];
}
      case 'professionals':
        return this.selectedProfessional() ? [] : ['el profesional que te atienda'];
      default:
        return [];
    }
  });

  /** Texto del aviso: "Falta elegir el día y el horario." */
  get avisoPendiente(): string {
    const faltan = this.faltaEnElPaso();
    if (faltan.length === 0) {
      return '';
    }
    const lista =
      faltan.length === 1
        ? faltan[0]
        : `${faltan.slice(0, -1).join(', ')} y ${faltan[faltan.length - 1]}`;
    return `Para continuar falta ${lista}.`;
  }

  /** Habilita "Continuar" según lo que el prototipo exige en cada paso. */
  get canContinue(): boolean {
    switch (this.step()) {
      case 'location':
        return Boolean(this.address().trim()) && this.location().lat != null && this.location().lng != null;
      case 'specialty':
        return Boolean(this.selectedSpecialty());
      case 'problem':
        return this.resumenValido();
      case 'day':
        return Boolean(this.selectedDay());
      case 'time': {
  const franja = this.slotOptions.find((s) => s.id === this.selectedSlot());
  return Boolean(franja) && this.franjaDisponible(this.selectedDay(), franja!);
}
      case 'professionals':
        return Boolean(this.selectedProfessional());
      default:
        return false;
    }
  }
/**
 * Al cambiar de especialidad puede que el día o la franja ya elegidos no
 * tengan profesionales disponibles: en ese caso se limpian para que el
 * usuario vuelva a elegir.
 */
private revalidarTurno(): void {
  const dia = this.selectedDay();
  if (!dia) return;

  // Si ese día ya no tiene ninguna franja disponible, se limpia todo el turno.
  if (!this.slotOptions.some((s) => this.franjaDisponible(dia, s))) {
    this.selectedDay.set('');
    this.date.set('');
    this.selectedSlot.set('');
    this.time.set('');
    this.timeEnd.set('');
    return;
  }

  // El día sigue sirviendo, pero la franja elegida puede no estar disponible.
  const franja = this.slotOptions.find((s) => s.id === this.selectedSlot());
  if (franja && !this.franjaDisponible(dia, franja)) {
    this.selectedSlot.set('');
    this.time.set('');
    this.timeEnd.set('');
  }
}

  selectSpecialty(specialty: string): void {
    this.selectedSpecialty.set(specialty);
    // Puede cambiar la lista de profesionales: se limpia la elección anterior.
    this.selectedProfessional.set(null);
    this.revalidarTurno();
  }

  /** Vuelve al paso 2 para elegir otra especialidad. */
  goToSpecialtyStep(): void {
    this.cambiarPaso('specialty');
  }
  goToDayStep(): void {
  this.cambiarPaso('day');
}

  selectProfessional(prof: ProfWithDistance): void {
    this.selectedProfessional.set(prof);
    this.form.set(
      emptyServiceRequest({
        professionalId: prof.id,
        professionalName: prof.name,
        specialty: prof.specialty,
        address: this.location().displayName.trim(),
        latitude: this.location().lat,
        longitude: this.location().lng,
      })
    );
  }

  continuar(): void {
    if (!this.canContinue) {
      return;
    }
    const index = this.pasoActual - 1;
    const next = this.steps[index + 1];
    if (next) {
      this.cambiarPaso(next.key);
    }
  }

  goBack(): void {
    const index = this.pasoActual - 1;
    const previous = this.steps[index - 1];
    if (previous) {
      this.cambiarPaso(previous.key);
    }
  }

  confirmarSalidaPendiente(): boolean | Promise<boolean> {
   if (this.submitted()) return true;
  if (this.enviandoSolicitud()) return false;
    this.confirmandoSalida.set(true);
    return new Promise((resolve) => {
      this.resolverGuardSalida = resolve;
    });
  }

  resolverConfirmacionSalida(permitir: boolean): void {
    this.confirmandoSalida.set(false);
    const resolver = this.resolverGuardSalida;
    this.resolverGuardSalida = null;
    resolver?.(permitir);
  }

  // ── Envío del formulario ───────────────────────────────

  submit(): void {
    const prof = this.selectedProfessional();
    if (!prof) return;

    if (!this.date()) {
      this.toast.error('Elegí una fecha para la visita.');
      this.cambiarPaso('day');
      return;
    }
    if (!this.time()) {
      this.toast.error('Elegí un horario aproximado.');
      this.cambiarPaso('time');
      return;
    }
    const franja = this.slotOptions.find((s) => s.id === this.selectedSlot());
if (!franja || !this.franjaDisponible(this.date(), franja) || !this.trabajaEn(prof, this.date(), franja)) {
	this.toast.error('Ese turno ya no está disponible. Elegí otro día u horario.');
	this.cambiarPaso('time');
	return;
}
    if (!this.address().trim()) {
      this.toast.error('Escribí una dirección antes de enviar la solicitud.');
      this.cambiarPaso('location');
      return;
    }

    const loc = this.location();
    if (loc.lat == null || loc.lng == null) {
      this.gpsLoading.set(true);
      this.api.getGpsPosition(this.address()).pipe(
        catchError((error) => {
  this.gpsLoading.set(false);
  this.toast.error(this.api.describeError(error, 'No se pudieron obtener coordenadas para esta dirección. Ajustala en el mapa o probá con otra dirección.'));
  return of(null);
})
      ).subscribe((pos) => {
        this.gpsLoading.set(false);
        if (!pos) return;
        this.gpsPosition.set(pos);
        if (pos.resolved === false) {
          this.toast.error(pos.error || 'No se pudieron obtener coordenadas. Verificá la dirección o ajustala en el mapa.');
          return;
        }
        const lat = (pos.latitude ?? pos.latitud) ?? null;
        const lng = (pos.longitude ?? pos.longitud) ?? null;
        if (lat == null || lng == null) {
          this.toast.error(pos.error || 'No se obtuvieron coordenadas válidas.');
          return;
        }
        const displayName = pos.address || this.address();
        this.location.set({ lat, lng, displayName, detecting: false, editing: false });
        this.address.set(displayName);
        this.form.update((f) =>
          emptyServiceRequest({
            ...f,
            address: displayName,
            latitude: lat,
            longitude: lng,
          })
        );
        this.updateDistances(lat, lng);
        this.doSubmit(lat, lng);
      });
      return;
    }

    this.doSubmit(loc.lat, loc.lng);
  }

  private isValidUuid(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(value);
  }

 private resolveEspecialidadId(prof: ProfWithDistance): string | null {
  const elegida = this.selectedSpecialty();
  if (elegida) {
    const objetivo = this.normalizarEspecialidad(elegida);
    const match = prof.especialidades?.find(
      (e) => this.normalizarEspecialidad(e.nombre) === objetivo,
    );
    if (match && this.isValidUuid(match.id)) return match.id;
  }

  const direct = prof.especialidades?.[0]?.id;
  if (direct && this.isValidUuid(direct)) return direct;

  const specName = (elegida ?? prof.specialty ?? '').trim().toLowerCase();
    const known: Record<string, string> = {
      'electricidad domiciliaria': '33333333-3333-3333-3333-333333333333',
      'plomería y gas': '66666666-6666-6666-6666-666666666666',
      'plomeria y gas': '66666666-6666-6666-6666-666666666666',
      'refrigeración y aire': '99999999-9999-9999-9999-999999999999',
      'refrigeracion': '99999999-9999-9999-9999-999999999999',
      'reparación de electrodomésticos': 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'reparacion de electrodomesticos': 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'pintura y albañilería': 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'cerrajería integral': 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    };
    return known[specName] ?? null;
  }

  private doSubmit(lat: number, lng: number): void {
    const prof = this.selectedProfessional();
    if (!prof) return;

    // Última barrera: aunque se llegara al envío sin resumen, no sale.
    if (!this.resumenValido()) {
      this.toast.error('Contanos brevemente el problema para que el profesional pueda venir preparado.');
      this.cambiarPaso('problem');
      return;
    }

    const clienteId = this.auth.currentUser()?.id;
    if (!clienteId || !this.isValidUuid(clienteId)) {
      this.toast.error('Necesitás iniciar sesión antes de enviar la solicitud.');
      return;
    }

    const profesionalId = prof.usuarioId ?? prof.id;
    if (!this.isValidUuid(profesionalId)) {
      this.toast.error('El profesional seleccionado no tiene un identificador válido. Volvé a elegir un profesional.');
      return;
    }

    const especialidadId = this.resolveEspecialidadId(prof);
    if (!especialidadId) {
      this.toast.error('No se pudo determinar la especialidad del profesional. Elegí otra categoría o profesional.');
      return;
    }

    const payload = {
      clienteId,
      profesionalId,
      especialidadId,
      direccionServicio: this.address(),
      latitud: lat,
      longitud: lng,
      fechaHoraPropuesta: `${this.date()}T${this.time()}:00`,
      fechaHoraFinPropuesta: this.timeEnd() ? `${this.date()}T${this.timeEnd()}:00` : null,
      descripcion: this.problemSummary().trim(),
    };

    this.enviandoSolicitud.set(true);
    this.api.createRequest(payload).pipe(
      catchError((error) => {
        this.enviandoSolicitud.set(false);
        this.toast.error(this.api.describeError(error, 'No se pudo enviar la solicitud.'));
        return of(null);
      })
    ).subscribe((created) => {
      this.enviandoSolicitud.set(false);
      if (!created) return;
      this.requestService.create({
        professionalId: prof.id,
        professionalName: prof.name,
        specialty: prof.specialty,
        date: this.date(),
        time: this.time(),
        address: this.address(),
        latitude: lat,
        longitude: lng,
      });
      this.submitted.set(true);
    });
  }





  // ── Privados ───────────────────────────────────────────

  private loadAllProfessionals(): void {
    this.directoryService.loadProfessionals().pipe(
      catchError(() => {
        this.toast.error('No se pudieron cargar los profesionales. Intentá nuevamente más tarde.');
        return of([]);
      }),
    ).subscribe((profs) => {
      const loc = this.location();
      this.allProfessionals.set(profs.map((p) => ({
        ...p,
                distanceKm:
          loc.lat != null && loc.lng != null && p.zonaCoberturaLat != null && p.zonaCoberturaLng != null
            ? haversineKm(loc.lat, loc.lng, p.zonaCoberturaLat, p.zonaCoberturaLng)
            : null,
      })));
      this.loadingProfessionals.set(false);
    });
  }

  /**
   * Carga el catálogo de especialidades para que el paso 2 muestre todas, no solo
   * las que ya tienen algún técnico asignado. Si el catálogo no está disponible
   * se sigue con las especialidades derivadas de los profesionales.
   */
  private loadCatalogoEspecialidades(): void {
    this.api.getSpecialtiesMap().pipe(
      catchError(() => of({} as Record<string, string>)),
    ).subscribe((mapa) => {
      const nombres = Object.values(mapa ?? {})
        .map((n) => (n ?? '').trim())
        .filter((n) => n.length > 0);
      this.catalogoEspecialidades.set([...new Set(nombres)].sort((a, b) => a.localeCompare(b, 'es')));
      this.loadingSpecialties.set(false);
    });
  }

  private updateDistances(lat: number, lng: number): void {
    this.allProfessionals.update((profs) =>
      profs.map((p) => ({
        ...p,
                distanceKm:
          p.zonaCoberturaLat != null && p.zonaCoberturaLng != null
            ? haversineKm(lat, lng, p.zonaCoberturaLat, p.zonaCoberturaLng)
            : null,
      })),
    );
  const sel = this.selectedProfessional();
  if (sel) {
    this.selectedProfessional.set(this.allProfessionals().find((p) => p.id === sel.id) ?? null);
  }
    
  }

  /** Geocodificación inversa usando Nominatim (OpenStreetMap, gratuito) */
  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    this.reverseGeocoding.set(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      );
      if (!res.ok) {
        throw new Error('No se pudo consultar el servicio de mapas.');
      }
      const data = (await res.json()) as { display_name?: string };
      return data.display_name || 'Tu ubicación';
    } catch {
      return 'Tu ubicación';
    } finally {
      this.reverseGeocoding.set(false);
    }
  }
}