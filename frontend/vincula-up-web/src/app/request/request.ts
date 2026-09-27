import { AfterViewInit, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService, GpsPosition } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';
import { RequestService } from '../core/services/request.service';
import { Professional } from '../core/models/professional';
import { emptyServiceRequest } from '../core/models/service-request';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuIcon } from '../shared/icon/icon';

/**
 * Flujo de pasos del prototipo: ubicación → especialidad → día y horario →
 * elección del profesional (el envío cierra el flujo, sin formulario extra).
 */
type Step = 'location' | 'specialty' | 'schedule' | 'professionals';


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

interface TempMapLocation {
  lat: number;
  lng: number;
  displayName: string;
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
	imports: [CommonModule, FormsModule, RouterLink, DecimalPipe, VuAvatar, VuIcon],
	selector: 'app-request',
	styleUrl: './request.css',
	templateUrl: './request.html',
})
export class Request implements OnInit, AfterViewInit {
  private readonly directoryService = inject(DirectoryService);
  private readonly requestService = inject(RequestService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  // ── Pasos ──────────────────────────────────────────────
  readonly step = signal<Step>('location');
  readonly steps: Array<{ key: Step; label: string; title: string }> = [
    { key: 'location', label: 'Ubicación', title: '¿Dónde necesitás el servicio?' },
    { key: 'specialty', label: 'Categoría', title: '¿Qué necesitás resolver?' },
    { key: 'schedule', label: 'Día y horario', title: '¿Cuándo te viene bien?' },
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
  readonly detectingGps = signal(false);
  readonly locatorError = signal('');
  readonly pendingLocation = signal<PlaceSuggestion | null>(null);
  readonly locationEditValue = signal('');

  readonly geolocationAvailable = signal<boolean | 'unknown'>('unknown');
  readonly geolocationPermission = signal<PermissionState | 'unknown'>('unknown');

  private suggestionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly address = signal('');
  readonly gpsPosition = signal<GpsPosition | null>(null);
  readonly gpsLoading = signal(false);
  readonly gpsError = signal('');

  // ── Profesionales ──────────────────────────────────────
  readonly allProfessionals = signal<ProfWithDistance[]>([]);
  readonly loadingProfessionals = signal(true);
  readonly professionalsError = signal('');

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

  /**
   * Especialidades que se ofrecen en el paso 2: el catálogo completo, para que
   * se vean todas aunque todavía no haya técnicos para alguna.
   */
  readonly specialties = computed(() => {
    const catalogo = this.catalogoEspecialidades();
    if (catalogo.length) {
      return catalogo;
    }
    // Sin catálogo disponible se arma con lo que traen los profesionales.
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of this.allProfessionals()) {
      for (const s of this.especialidadesDe(p)) {
        if (!seen.has(s)) {
          seen.add(s);
          result.push(s);
        }
      }
    }
    return result;
  });

  readonly selectedSpecialty = signal<string | null>(null);

  /** Especialidades que cuentan con al menos un técnico activo. */
  private readonly especialidadesConTecnicos = computed(() => {
    const conTecnicos = new Set<string>();
    for (const p of this.allProfessionals()) {
      for (const n of this.especialidadesDe(p)) {
        conTecnicos.add(n);
      }
    }
    return conTecnicos;
  });

  /**
   * Si la especialidad todavía no tiene técnicos lo aclara en el paso 2, para no
   * elegirla a ciegas y frenar en el paso 4 sin opciones.
   */
  tieneTecnicos(specialty: string): boolean {
    return this.especialidadesConTecnicos().has(specialty);
  }

  /**
   * Profesionales de la especialidad elegida, ordenados según el selector del
   * prototipo: por proximidad o por reputación.
   */
  readonly sortBy = signal<'proximidad' | 'reputacion'>('proximidad');

  readonly filteredProfessionals = computed(() => {
    const spec = this.selectedSpecialty();
    if (!spec) return [];
    const byDistance = this.sortBy() === 'proximidad';
    return [...this.allProfessionals()]
      .filter((p) => this.especialidadesDe(p).some((n) => n === spec))
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
  readonly errorMessage = signal('');

  /** Días del prototipo (etiqueta corta y día de la semana real). */
  readonly dayOptions: ReadonlyArray<{ id: string; label: string; weekday: number }> = [
    { id: 'LUN', label: 'Lun', weekday: 1 },
    { id: 'MAR', label: 'Mar', weekday: 2 },
    { id: 'MIÉ', label: 'Mié', weekday: 3 },
    { id: 'JUE', label: 'Jue', weekday: 4 },
    { id: 'VIE', label: 'Vie', weekday: 5 },
    { id: 'SÁB', label: 'Sáb', weekday: 6 },
    { id: 'DOM', label: 'Dom', weekday: 0 },
  ];

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
    this.selectedDay.set(id);
    this.date.set(this.proximaFecha(this.dayOptions.find((day) => day.id === id)?.weekday ?? 1));
  }

  elegirHorario(id: string): void {
    const franja = this.slotOptions.find((slot) => slot.id === id);
    this.selectedSlot.set(id);
    this.time.set(franja?.start ?? '');
    this.timeEnd.set(franja?.end ?? '');
  }

  /** Próxima fecha (YYYY-MM-DD) del día de la semana elegido, contando desde hoy. */
  private proximaFecha(weekday: number): string {
    const today = new Date();
    const diff = (weekday - today.getDay() + 7) % 7;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    const month = `${target.getMonth() + 1}`.padStart(2, '0');
    const day = `${target.getDate()}`.padStart(2, '0');
    return `${target.getFullYear()}-${month}-${day}`;
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
    if (q.length > 0) {
      this.locatorError.set('');
    }
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
    }, 500);
  }

  private async searchLocationSuggestions(query: string): Promise<void> {
    this.locationSearching.set(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=6&accept-language=es`,
      );
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
    this.locatorError.set('');
  }

  startEditLocation(): void {
    const loc = this.location();
    this.locationEditValue.set(loc.displayName);
    this.location.set({ ...loc, editing: true, detecting: false });
    setTimeout(() => {
      const input = document.getElementById('loc-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 50);
  }

  confirmEditLocation(): void {
    const value = this.locationEditValue().trim();
    if (!value) {
      this.locatorError.set('Escribí una dirección válida.');
      return;
    }
    this.gpsLoading.set(true);
    this.gpsError.set('');
    this.locatorError.set('');
    this.api.getGpsPosition(value).pipe(
      catchError((error) => {
        this.gpsError.set(this.api.describeError(error, 'No pudimos verificar esa dirección. Probá con el mapa.'));
        this.gpsLoading.set(false);
        return of(null);
      })
    ).subscribe((pos) => {
      this.gpsLoading.set(false);
      if (!pos) return;
      this.gpsPosition.set(pos);
      if (pos.resolved === false) {
        this.gpsError.set(pos.error || 'No se pudo verificar la dirección. Probá con el mapa interactivo.');
        return;
      }
      const lat = (pos.latitude ?? pos.latitud) ?? null;
      const lng = (pos.longitude ?? pos.longitud) ?? null;
      const displayName = pos.address || value;
      if (lat == null || lng == null) {
        this.gpsError.set(pos.error || 'No se obtuvieron coordenadas. Probá con el mapa interactivo.');
        return;
      }
      this.location.set({ lat, lng, displayName, editing: false, detecting: false });
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

  cancelEditLocation(): void {
    const loc = this.location();
    this.location.set({ ...loc, editing: false });
  }

  retryDetectLocation(): void {
    if (!('geolocation' in navigator)) {
      this.locatorError.set('Tu navegador no permite acceder a la ubicación del dispositivo.');
      return;
    }
    this.location.set({ ...this.location(), detecting: true, editing: false });
    this.locatorError.set('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await this.reverseGeocode(latitude, longitude);
        this.location.set({ lat: latitude, lng: longitude, displayName: name, detecting: false, editing: false });
        this.address.set(name);
        this.locationQuery.set(name);
        this.pendingLocation.set({ lat: latitude, lng: longitude, displayName: name });
        this.form.update((f) =>
          emptyServiceRequest({
            ...f,
            address: name,
            latitude,
            longitude,
          })
        );
        this.updateDistances(latitude, longitude);
        this.locatorError.set('');
      },
      () => {
        this.location.set({ ...this.location(), detecting: false });
        this.locatorError.set('No pudimos detectar tu ubicación. Escribí la dirección manualmente o usá el mapa.');
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true },
    );
  }

  canConfirmLocation(): boolean {
    const pending = this.pendingLocation();
    if (pending) return true;
    const loc = this.location();
    return loc.lat != null && loc.lng != null && loc.displayName.length > 0;
  }

  confirmLocationFromQuery(): void {
    const q = this.locationQuery().trim();
    if (q.length < 4) {
      this.locatorError.set('Escribí al menos 4 caracteres para buscar la dirección.');
      return;
    }
    this.locatorError.set('');
    this.gpsLoading.set(true);
    this.api.getGpsPosition(q).pipe(
      catchError((error) => {
        this.locatorError.set(this.api.describeError(error, 'No pudimos verificar esa dirección. Probá con otras palabras o usá el mapa.'));
        this.gpsLoading.set(false);
        return of(null);
      })
    ).subscribe((pos) => {
      this.gpsLoading.set(false);
      if (!pos) return;
      this.gpsPosition.set(pos);
      this.locationSuggestionOpen.set(false);
      if (pos.resolved === false) {
        this.locatorError.set(pos.error || 'No se pudieron obtener coordenadas. Probá con el mapa interactivo.');
        return;
      }
      const lat = (pos.latitude ?? pos.latitud) ?? null;
      const lng = (pos.longitude ?? pos.longitud) ?? null;
      const displayName = pos.address || q;
      if (lat == null || lng == null) {
        this.locatorError.set(pos.error || 'No se obtuvieron coordenadas para esa dirección. Probá con el mapa interactivo.');
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

  goToLocationStep(): void {
    const current = this.location();
    this.pendingLocation.set(
      current.lat != null && current.lng != null && current.displayName
        ? { lat: current.lat, lng: current.lng, displayName: current.displayName }
        : null);
    if (current.displayName) {
      this.locationQuery.set(current.displayName);
      this.address.set(current.displayName);
    }
    this.step.set('location');
    // Vuelve al paso 1: el mapa se refresca para mostrar el punto actual.
    this.onCambioDePaso();
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

  /** Centro por defecto: Concepción del Uruguay, hasta que seija un punto. */
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
    this.gpsError.set('');
    this.locatorError.set('');
  }

  /** El mapa del paso 1 acompaña a la pantalla mientras se está en él. */
  onCambioDePaso(): void {
    if (this.step() === 'location') {
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
        if (!this.location().lat || !this.location().lng) {
          faltan.push('la dirección donde necesitás el servicio');
        }
        return faltan;
      }
      case 'specialty': {
        const faltan: string[] = [];
        if (!this.selectedSpecialty()) {
          faltan.push('la especialidad');
        }
        if (!this.resumenValido()) {
          faltan.push(`el resumen del problema (mínimo ${this.MIN_SUMMARY_LENGTH} caracteres)`);
        }
        return faltan;
      }
      case 'schedule': {
        const faltan: string[] = [];
        if (!this.selectedDay()) {
          faltan.push('el día');
        }
        if (!this.selectedSlot()) {
          faltan.push('el horario');
        }
        return faltan;
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
        return Boolean(this.address().trim());
      case 'specialty':
        // La categoría sola no alcanza: hay que describir el problema.
        return Boolean(this.selectedSpecialty()) && this.resumenValido();
      case 'schedule':
        return Boolean(this.selectedDay() && this.selectedSlot());
      case 'professionals':
        return Boolean(this.selectedProfessional());
      default:
        return false;
    }
  }

  selectSpecialty(specialty: string): void {
    this.selectedSpecialty.set(specialty);
    // Puede cambiar la lista de profesionales: se limpia la elección anterior.
    this.selectedProfessional.set(null);
  }

  /** Vuelve al paso 2 para elegir otra especialidad. */
  goToSpecialtyStep(): void {
    this.step.set('specialty');
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
      this.step.set(next.key);
    }
  }

  goBack(): void {
    const index = this.pasoActual - 1;
    const previous = this.steps[index - 1];
    if (previous) {
      this.step.set(previous.key);
    }
  }

  // ── Envío del formulario ───────────────────────────────

  submit(): void {
    const prof = this.selectedProfessional();
    if (!prof) return;
    this.errorMessage.set('');

    if (!this.date()) {
      this.errorMessage.set('Elegí una fecha para la visita.');
      return;
    }
    if (!this.time()) {
      this.errorMessage.set('Elegí un horario aproximado.');
      return;
    }
    if (!this.address().trim()) {
      this.errorMessage.set('Escribí una dirección antes de enviar la solicitud.');
      return;
    }

    const loc = this.location();
    if (loc.lat == null || loc.lng == null) {
      this.gpsLoading.set(true);
      this.gpsError.set('');
      this.errorMessage.set('');
      this.api.getGpsPosition(this.address()).pipe(
        catchError((error) => {
          this.gpsLoading.set(false);
          this.gpsError.set(this.api.describeError(error, 'No se pudo verificar automáticamente la dirección. Verificala manualmente con el botón correspondiente.'));
          this.errorMessage.set('No se pudieron obtener coordenadas para esta dirección. Tocá "Verificar coordenadas" o ajustala en el mapa.');
          return of(null);
        })
      ).subscribe((pos) => {
        this.gpsLoading.set(false);
        if (!pos) return;
        this.gpsPosition.set(pos);
        if (pos.resolved === false) {
          this.gpsError.set(pos.error || 'No se pudo verificar la dirección.');
          this.errorMessage.set(pos.error || 'No se pudieron obtener coordenadas. Verificá la dirección o ajustala en el mapa.');
          return;
        }
        const lat = (pos.latitude ?? pos.latitud) ?? null;
        const lng = (pos.longitude ?? pos.longitud) ?? null;
        if (lat == null || lng == null) {
          this.errorMessage.set(pos.error || 'No se obtuvieron coordenadas válidas.');
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
    const direct = prof.especialidades?.[0]?.id;
    if (direct && this.isValidUuid(direct)) return direct;

    const specName = (prof.specialty ?? '').trim().toLowerCase();
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
      this.errorMessage.set('Contanos brevemente el problema para que el profesional pueda venir preparado.');
      this.step.set('specialty');
      return;
    }

    const clienteId = this.auth.currentUser()?.id;
    if (!clienteId || !this.isValidUuid(clienteId)) {
      this.errorMessage.set('Necesitás iniciar sesión antes de enviar la solicitud.');
      return;
    }

    const profesionalId = prof.usuarioId ?? prof.id;
    if (!this.isValidUuid(profesionalId)) {
      this.errorMessage.set('El profesional seleccionado no tiene un identificador válido. Volvé a elegir un profesional.');
      return;
    }

    const especialidadId = this.resolveEspecialidadId(prof);
    if (!especialidadId) {
      this.errorMessage.set('No se pudo determinar la especialidad del profesional. Elegí otra categoría o profesional.');
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

    this.api.createRequest(payload).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo enviar la solicitud.'));
        return of(null);
      })
    ).subscribe((created) => {
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

  /**
   * Verifica la dirección por texto contra el endpoint GPS del backend
   * (estilo MercadoLibre): el server geocodifica la calle y devuelve las
   * coordenadas + dirección canónica que se usan para la solicitud.
   */
  lookupGps(): void {
    const query = this.address().trim();
    if (!query) {
      this.gpsError.set('Escribí una dirección para verificarla.');
      return;
    }
    this.gpsLoading.set(true);
    this.gpsError.set('');
    this.api.getGpsPosition(query).pipe(
      catchError((error) => {
        this.gpsError.set(this.api.describeError(error, 'No pudimos verificar esa dirección. Probá con el mapa.'));
        this.gpsLoading.set(false);
        return of(null);
      })
    ).subscribe((pos) => {
      this.gpsLoading.set(false);
      if (!pos) return;
      this.gpsPosition.set(pos);
      if (pos.resolved === false) {
        this.gpsError.set(pos.error || 'No se pudo verificar la dirección. Probá con el mapa interactivo.');
        return;
      }
      const lat = (pos.latitude ?? pos.latitud) ?? null;
      const lng = (pos.longitude ?? pos.longitud) ?? null;
      const displayName = pos.address || query;
      if (lat == null || lng == null) {
        this.gpsError.set(pos.error || 'No se obtuvieron coordenadas. Probá con el mapa interactivo.');
        return;
      }
      this.address.set(displayName);
      this.location.set({ lat, lng, displayName, detecting: false, editing: false });
      this.form.update((f) =>
        emptyServiceRequest({
          ...f,
          address: displayName,
          latitude: lat,
          longitude: lng,
        })
      );
      this.updateDistances(lat, lng);
      this.gpsError.set('');
    });
  }

  /** Devuelve un emoji representativo para cada tipo de especialidad */
  specialtyIcon(specialty: string): string {
    const s = specialty.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('electric')) return '⚡';
    if (s.includes('plomer') || s.includes('sanitari')) return '🔧';
    if (s.includes('gas')) return '🔥';
    if (s.includes('refrig') || s.includes('aire') || s.includes('frio')) return '❄️';
    if (s.includes('electrod') || s.includes('reparaci')) return '🛠️';
    if (s.includes('pintur')) return '🎨';
    if (s.includes('carpint') || s.includes('madera')) return '🪚';
    if (s.includes('albanil') || s.includes('construc') || s.includes('mampost')) return '🏗️';
    if (s.includes('jardin') || s.includes('paisaj')) return '🌿';
    if (s.includes('segur') || s.includes('alarm') || s.includes('camara')) return '🔒';
    if (s.includes('cerraj')) return '🗝️';
    return '🔨';
  }

  // ── Privados ───────────────────────────────────────────

  private loadAllProfessionals(): void {
    this.directoryService.loadProfessionals().pipe(
      catchError(() => {
        this.professionalsError.set('No se pudieron cargar los profesionales. Intentá nuevamente más tarde.');
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
  }

  /** Geocodificación inversa usando Nominatim (OpenStreetMap, gratuito) */
  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      );
      const data = (await res.json()) as { display_name?: string };
      return data.display_name || 'Tu ubicación';
    } catch {
      return 'Tu ubicación';
    }
  }
}