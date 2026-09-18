import { Component, computed, inject, OnInit, signal } from '@angular/core';
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

type Step = 'location' | 'specialty' | 'professionals' | 'form';

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
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe],
  selector: 'app-request',
  styleUrl: './request.css',
  templateUrl: './request.html',
})
export class Request implements OnInit {
  private readonly directoryService = inject(DirectoryService);
  private readonly requestService = inject(RequestService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  // ── Pasos ──────────────────────────────────────────────
  readonly step = signal<Step>('location');
  readonly steps: Array<{ key: Step; label: string }> = [
    { key: 'location', label: 'Ubicación' },
    { key: 'specialty', label: 'Categoría' },
    { key: 'professionals', label: 'Profesional' },
    { key: 'form', label: 'Confirmación' },
  ];

  // ── Ubicación (paso 1: rápida para ordenar por cercanía) ────────────
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

  readonly presetLocations: Array<{ label: string; hint: string; lat: number; lng: number; displayName: string }> = [
    {
      label: 'Centro, Concepción del Uruguay',
      hint: 'Plaza 25 de Mayo',
      lat: -32.4833,
      lng: -58.2318,
      displayName: 'Plaza 25 de Mayo, Concepción del Uruguay, Entre Ríos, Argentina',
    },
    {
      label: 'Universidad (FCAD-UNER)',
      hint: 'FCAD – UNER, Costanera',
      lat: -32.479,
      lng: -58.2332,
      displayName: 'Facultad de Ciencias de la Administración, Costanera, Concepción del Uruguay, Entre Ríos, Argentina',
    },
    {
      label: 'Hospital Samic',
      hint: 'Urquiza 484',
      lat: -32.4866,
      lng: -58.238,
      displayName: 'Hospital SAMIC, Urquiza 484, Concepción del Uruguay, Entre Ríos, Argentina',
    },
    {
      label: 'Terminal de Ómnibus',
      hint: 'J.M. de Rosas y Rivadavia',
      lat: -32.4748,
      lng: -58.2288,
      displayName: 'Terminal de Ómnibus de Concepción del Uruguay, Rivadavia, Concepción del Uruguay, Entre Ríos, Argentina',
    },
    {
      label: 'Barrio Jardín',
      hint: 'Zona norte, cerca del lago',
      lat: -32.473,
      lng: -58.2432,
      displayName: 'Barrio Jardín, Concepción del Uruguay, Entre Ríos, Argentina',
    },
    {
      label: 'Parada 8 / Acceso Sur',
      hint: 'Ruta 14, Acceso a la ciudad',
      lat: -32.4995,
      lng: -58.2258,
      displayName: 'Parada 8 - Acceso Sur, Concepción del Uruguay, Entre Ríos, Argentina',
    },
  ];

  private suggestionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly showMapModal = signal(false);
  readonly mapSearchQuery = signal('');
  readonly mapSearching = signal(false);
  readonly tempMapLocation = signal<TempMapLocation | null>(null);

  readonly address = signal('');
  readonly gpsPosition = signal<GpsPosition | null>(null);
  readonly gpsLoading = signal(false);
  readonly gpsError = signal('');

  // ── Profesionales ──────────────────────────────────────
  readonly allProfessionals = signal<ProfWithDistance[]>([]);
  readonly loadingProfessionals = signal(true);
  readonly professionalsError = signal('');
  readonly failedPhotos = signal<Set<string>>(new Set());

  markPhotoFailed(id: string): void {
    this.failedPhotos.update((ids) => new Set([...ids, id]));
  }

  /** Especialidades únicas derivadas de los profesionales cargados */
  readonly specialties = computed(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of this.allProfessionals()) {
      const specs = p.especialidades?.map((e) => e.nombre) ?? [p.specialty];
      for (const s of specs) {
        if (s && !seen.has(s)) {
          seen.add(s);
          result.push(s);
        }
      }
    }
    return result;
  });

  readonly selectedSpecialty = signal<string | null>(null);

  /** Profesionales filtrados por especialidad, ordenados por rating DESC y distancia ASC */
  readonly filteredProfessionals = computed(() => {
    const spec = this.selectedSpecialty();
    if (!spec) return [];
    return [...this.allProfessionals()]
      .filter((p) => {
        const names = p.especialidades?.map((e) => e.nombre) ?? [p.specialty];
        return names.some((n) => n === spec);
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      });
  });

  readonly selectedProfessional = signal<ProfWithDistance | null>(null);
  readonly form = signal<ReturnType<typeof emptyServiceRequest>>(emptyServiceRequest());

  // ── Formulario ─────────────────────────────────────────
  readonly date = signal('');
  readonly time = signal('');
  readonly submitted = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    this.loadAllProfessionals();
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

  selectPresetLocation(preset: { label: string; hint: string; lat: number; lng: number; displayName: string }): void {
    this.locationQuery.set(preset.displayName);
    this.locationSuggestions.set([]);
    this.locationSuggestionOpen.set(false);
    this.locatorError.set('');
    this.location.set({ lat: preset.lat, lng: preset.lng, displayName: preset.displayName, detecting: false, editing: false });
    this.address.set(preset.displayName);
    this.pendingLocation.set({ lat: preset.lat, lng: preset.lng, displayName: preset.displayName });
    this.form.update((f) =>
      emptyServiceRequest({
        ...f,
        address: preset.displayName,
        latitude: preset.lat,
        longitude: preset.lng,
      })
    );
    this.updateDistances(preset.lat, preset.lng);
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
      this.locationSuggestions.set(
        (Array.isArray(data) ? data : []).map((item) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
        })),
      );
    } catch {
      this.locationSuggestions.set([]);
    } finally {
      this.locationSearching.set(false);
    }
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
      if (this.step() === 'location') {
        this.step.set('specialty');
      }
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
      this.step.set('specialty');
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
      this.step.set('specialty');
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
      this.step.set('specialty');
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
    const existing = this.pendingLocation();
    if (existing) {
      setTimeout(() => this.initInteractiveMap(), 120);
    }
  }

  // ── Modal de mapa interactivo ──────────────────────────

  openMapPicker(): void {
    const loc = this.location();
    const addr = this.address();
    const base = loc.lat != null && loc.lng != null
      ? { lat: loc.lat, lng: loc.lng, displayName: loc.displayName || addr }
      : { lat: null as number | null, lng: null as number | null, displayName: addr };
    this.showMapModal.set(true);
    this.mapSearchQuery.set(base.displayName || '');
    this.tempMapLocation.set(
      base.lat != null && base.lng != null
        ? { lat: base.lat, lng: base.lng, displayName: base.displayName || '' }
        : { lat: -32.4844, lng: -58.2328, displayName: '' }
    );
    setTimeout(() => this.initInteractiveMap(), 120);
  }

  closeMapPicker(): void {
    this.showMapModal.set(false);
    this.destroyInteractiveMap();
  }

  private interactiveMapInstance: any = null;
  private interactiveMapMarker: any = null;

  private initInteractiveMap(): void {
    const L = (window as any).L;
    if (!L) return;
    const container = document.getElementById('interactive-map');
    if (!container) return;
    const loc = this.tempMapLocation();
    if (!loc) return;

    if (this.interactiveMapInstance && !document.body.contains(this.interactiveMapInstance.getContainer())) {
      this.interactiveMapInstance.remove();
      this.interactiveMapInstance = null;
      this.interactiveMapMarker = null;
    }

    if (!this.interactiveMapInstance) {
      this.interactiveMapInstance = L.map('interactive-map').setView([loc.lat, loc.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.interactiveMapInstance);

      this.interactiveMapMarker = L.marker([loc.lat, loc.lng], { draggable: true }).addTo(this.interactiveMapInstance);

      this.interactiveMapMarker.on('dragend', (event: any) => {
        const position = event.target.getLatLng();
        this.tempMapLocation.set({ lat: position.lat, lng: position.lng, displayName: '' });
      });

      this.interactiveMapInstance.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        this.interactiveMapMarker?.setLatLng([clickLat, clickLng]);
        this.tempMapLocation.set({ lat: clickLat, lng: clickLng, displayName: '' });
      });

      setTimeout(() => {
        this.interactiveMapInstance?.invalidateSize();
      }, 200);
    } else {
      this.interactiveMapInstance.setView([loc.lat, loc.lng], 15);
      this.interactiveMapMarker?.setLatLng([loc.lat, loc.lng]);
    }
  }

  async searchAddressInMap(): Promise<void> {
    const query = this.mapSearchQuery().trim();
    if (!query || this.mapSearching()) return;
    this.mapSearching.set(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&accept-language=es`,
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (Array.isArray(data) && data.length > 0) {
        this.tempMapLocation.set({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        });
        this.mapSearchQuery.set(data[0].display_name);
        setTimeout(() => this.initInteractiveMap(), 50);
      }
    } catch {
      // ignore
    } finally {
      this.mapSearching.set(false);
    }
  }

  async useBrowserGpsInMap(): Promise<void> {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await this.reverseGeocode(latitude, longitude);
        this.tempMapLocation.set({ lat: latitude, lng: longitude, displayName: name });
        this.mapSearchQuery.set(name);
        setTimeout(() => this.initInteractiveMap(), 50);
      },
      () => { /* ignore */ },
      { timeout: 8000, maximumAge: 60000 },
    );
  }

  async confirmMapLocation(): Promise<void> {
    const temp = this.tempMapLocation();
    if (!temp) return;
    let displayName = temp.displayName || '';
    if (!displayName.trim()) {
      displayName = await this.reverseGeocode(temp.lat, temp.lng);
      this.tempMapLocation.set({ ...temp, displayName });
    }
    this.location.set({ lat: temp.lat, lng: temp.lng, displayName, detecting: false, editing: false });
    this.address.set(displayName);
    this.locationQuery.set(displayName);
    this.pendingLocation.set({ lat: temp.lat, lng: temp.lng, displayName });
    this.form.update((f) =>
      emptyServiceRequest({
        ...f,
        address: displayName,
        latitude: temp.lat,
        longitude: temp.lng,
      })
    );
    this.updateDistances(temp.lat, temp.lng);
    this.gpsError.set('');
    this.locatorError.set('');
    this.closeMapPicker();
    if (this.step() === 'location') {
      this.step.set('specialty');
    }
  }

  private destroyInteractiveMap(): void {
    if (this.interactiveMapInstance) {
      this.interactiveMapInstance.remove();
      this.interactiveMapInstance = null;
      this.interactiveMapMarker = null;
    }
  }

  // ── Navegación entre pasos ─────────────────────────────

  selectSpecialty(specialty: string): void {
    this.selectedSpecialty.set(specialty);
    this.step.set('professionals');
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
    this.step.set('form');
  }

  goBack(): void {
    if (this.step() === 'professionals') {
      this.step.set('specialty');
    } else if (this.step() === 'form') {
      this.step.set('professionals');
    } else if (this.step() === 'specialty') {
      this.goToLocationStep();
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