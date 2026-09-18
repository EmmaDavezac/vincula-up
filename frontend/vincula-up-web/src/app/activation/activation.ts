import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

interface ValidatedLocation {
  lat: number;
  lng: number;
  displayName: string;
}

@Component({
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe],
  selector: 'app-activation',
  styleUrl: './activation.css',
  templateUrl: './activation.html',
})
export class Activation {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly step = signal(1);

  // ── Paso 1: Foto y previsualización ──
  readonly photoName = signal('');
  readonly photoPreview = signal('');
  readonly photoLoading = signal(false);
  readonly photoError = signal('');
  readonly hasPhoto = computed(() => this.photoPreview().trim().length > 0);
  private photoReader: FileReader | null = null;
  private activatedProfileId: string | null = null;

  // ── Paso 2: Zona y Cobertura (con validación de ciudad / GPS / Mapa) ──
  readonly zoneQuery = signal('Concepción del Uruguay, Entre Ríos');
  readonly validatedLocation = signal<ValidatedLocation | null>({
    lat: -32.4833,
    lng: -58.2318,
    displayName: 'Concepción del Uruguay, Entre Ríos, Argentina',
  });
  readonly validatingLocation = signal(false);
  readonly locationError = signal('');
  readonly locationSuggestions = signal<ValidatedLocation[]>([]);
  readonly locationSuggestionOpen = signal(false);
  readonly locationSearching = signal(false);
  readonly radius = signal(15);
  private suggestionTimer: any = null;

  // Mapa modal (Leaflet)
  readonly showMapModal = signal(false);
  readonly mapSearchQuery = signal('');
  readonly mapSearching = signal(false);
  readonly tempMapLocation = signal<ValidatedLocation | null>(null);
  private interactiveMapInstance: any = null;
  private interactiveMapMarker: any = null;

  readonly presetLocations: Array<{ label: string; hint: string; lat: number; lng: number; displayName: string }> = [
    {
      label: 'Concepción del Uruguay',
      hint: 'Centro / Plaza 25 de Mayo',
      lat: -32.4833,
      lng: -58.2318,
      displayName: 'Concepción del Uruguay, Entre Ríos, Argentina',
    },
    {
      label: 'Colón',
      hint: 'Costanera y Centro',
      lat: -32.2235,
      lng: -58.1432,
      displayName: 'Colón, Entre Ríos, Argentina',
    },
    {
      label: 'Gualeguaychú',
      hint: 'Centro / Corsódromo',
      lat: -33.0116,
      lng: -58.5172,
      displayName: 'Gualeguaychú, Entre Ríos, Argentina',
    },
    {
      label: 'Paraná',
      hint: 'Paraná Capital',
      lat: -31.7333,
      lng: -60.5333,
      displayName: 'Paraná, Entre Ríos, Argentina',
    },
    {
      label: 'Buenos Aires (CABA)',
      hint: 'Capital Federal',
      lat: -34.6037,
      lng: -58.3816,
      displayName: 'Ciudad Autónoma de Buenos Aires, Argentina',
    },
  ];

  // ── Paso 3: Disponibilidad horaria múltiple (tipo alarma de teléfono) ──
  readonly weekDays = [
    { id: 'LUNES', short: 'L', name: 'Lunes' },
    { id: 'MARTES', short: 'M', name: 'Martes' },
    { id: 'MIERCOLES', short: 'M', name: 'Miércoles' },
    { id: 'JUEVES', short: 'J', name: 'Jueves' },
    { id: 'VIERNES', short: 'V', name: 'Viernes' },
    { id: 'SABADO', short: 'S', name: 'Sábado' },
    { id: 'DOMINGO', short: 'D', name: 'Domingo' },
  ];
  readonly selectedDays = signal<string[]>(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']);
  readonly start = signal('09:00');
  readonly end = signal('18:00');

  readonly selectedDaysLabel = computed(() => {
    const sel = this.selectedDays();
    if (sel.length === 0) return 'Sin días seleccionados';
    if (sel.length === 7) return 'Todos los días (Lunes a Domingo)';
    const weekdays = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    if (sel.length === 5 && weekdays.every((d) => sel.includes(d))) return 'Lunes a Viernes';
    const weekends = ['SABADO', 'DOMINGO'];
    if (sel.length === 2 && weekends.every((d) => sel.includes(d))) return 'Fines de semana (Sáb y Dom)';
    return sel.map((d) => this.weekDays.find((w) => w.id === d)?.name).filter(Boolean).join(', ');
  });

  // Estado general
  readonly completed = signal(false);
  readonly errorMessage = signal('');
  readonly submitting = signal(false);

  // ── Métodos de Foto ──
  selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    input.value = '';
    this.photoError.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.photoError.set('Elegí una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 512 * 1024) {
      this.photoError.set('La imagen supera 512 KiB. Elegí una foto más liviana.');
      return;
    }
    this.photoReader?.abort();
    const reader = new FileReader();
    this.photoReader = reader;
    this.photoLoading.set(true);
    reader.onload = () => {
      if (this.photoReader !== reader) return;
      this.photoPreview.set(typeof reader.result === 'string' ? reader.result : '');
      this.photoName.set(file.name);
      this.photoLoading.set(false);
    };
    reader.onerror = () => {
      this.photoLoading.set(false);
      this.photoError.set('No se pudo leer la imagen. Elegí el archivo nuevamente.');
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoReader?.abort();
    this.photoReader = null;
    this.photoLoading.set(false);
    this.photoError.set('');
    this.photoName.set('');
    this.photoPreview.set('');
  }

  // ── Métodos de Ubicación / Ciudad ──
  onZoneQueryChange(value: string): void {
    this.zoneQuery.set(value);
    this.locationError.set('');
    const currentLoc = this.validatedLocation();
    if (currentLoc && currentLoc.displayName !== value) {
      this.validatedLocation.set(null);
    }
    const q = value.trim();
    if (q.length < 3) {
      this.locationSuggestions.set([]);
      this.locationSuggestionOpen.set(false);
      return;
    }
    if (this.suggestionTimer) clearTimeout(this.suggestionTimer);
    this.suggestionTimer = setTimeout(() => {
      void this.searchSuggestions(q);
    }, 400);
  }

  private async searchSuggestions(query: string): Promise<void> {
    this.locationSearching.set(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&accept-language=es`,
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      const list = (Array.isArray(data) ? data : []).map((item) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
      }));
      this.locationSuggestions.set(list);
      this.locationSuggestionOpen.set(list.length > 0);
    } catch {
      this.locationSuggestions.set([]);
    } finally {
      this.locationSearching.set(false);
    }
  }

  hideSuggestionsLater(): void {
    setTimeout(() => this.locationSuggestionOpen.set(false), 200);
  }

  selectSuggestion(item: ValidatedLocation): void {
    this.validatedLocation.set(item);
    this.zoneQuery.set(item.displayName);
    this.locationSuggestions.set([]);
    this.locationSuggestionOpen.set(false);
    this.locationError.set('');
  }

  selectPreset(preset: { label: string; lat: number; lng: number; displayName: string }): void {
    const loc: ValidatedLocation = { lat: preset.lat, lng: preset.lng, displayName: preset.displayName };
    this.validatedLocation.set(loc);
    this.zoneQuery.set(preset.displayName);
    this.locationSuggestions.set([]);
    this.locationSuggestionOpen.set(false);
    this.locationError.set('');
  }

  validateCurrentZone(onValid?: () => void): void {
    const q = this.zoneQuery().trim();
    if (!q) {
      this.locationError.set('Ingresá una localidad, ciudad o barrio para tu zona de cobertura.');
      return;
    }

    this.validatingLocation.set(true);
    this.locationError.set('');
    this.api.getGpsPosition(q).pipe(
      catchError((err) => {
        this.locationError.set(this.api.describeError(err, 'No se pudo conectar al servicio GPS. Verificá tu conexión o usá el mapa interactivo.'));
        this.validatingLocation.set(false);
        return of(null);
      }),
    ).subscribe((gps) => {
      this.validatingLocation.set(false);
      if (!gps) return;
      if (gps.resolved === false || (gps.latitude == null && gps.latitud == null)) {
        this.locationError.set(gps.error || 'No se encontró la ciudad o dirección especificada. Probá agregar provincia/país o marcala en el mapa.');
        this.validatedLocation.set(null);
        return;
      }

      const lat = (gps.latitude ?? gps.latitud)!;
      const lng = (gps.longitude ?? gps.longitud)!;
      const displayName = gps.address || q;
      const loc: ValidatedLocation = { lat, lng, displayName };
      this.validatedLocation.set(loc);
      this.zoneQuery.set(displayName);
      this.locationError.set('');
      if (onValid) onValid();
    });
  }

  detectDeviceGps(): void {
    if (!('geolocation' in navigator)) {
      this.locationError.set('Tu navegador no cuenta con servicio de geolocalización GPS.');
      return;
    }

    this.validatingLocation.set(true);
    this.locationError.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.api.getGpsPosition(`${lat}, ${lng}`).pipe(
          catchError(() => of(null)),
        ).subscribe((res) => {
          this.validatingLocation.set(false);
          const name = res?.address || `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          const loc: ValidatedLocation = { lat, lng, displayName: name };
          this.validatedLocation.set(loc);
          this.zoneQuery.set(name);
          this.locationError.set('');
        });
      },
      () => {
        this.validatingLocation.set(false);
        this.locationError.set('No se pudo obtener la ubicación GPS del dispositivo. Ingresala manualmente o usá el mapa.');
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  // ── Mapa Modal (Leaflet) ──
  openMapPicker(): void {
    const loc = this.validatedLocation();
    this.showMapModal.set(true);
    this.mapSearchQuery.set(loc?.displayName || this.zoneQuery() || '');
    this.tempMapLocation.set(
      loc ?? { lat: -32.4833, lng: -58.2318, displayName: 'Concepción del Uruguay' },
    );
    setTimeout(() => this.initInteractiveMap(), 150);
  }

  closeMapPicker(): void {
    this.showMapModal.set(false);
    this.destroyInteractiveMap();
  }

  private initInteractiveMap(): void {
    const L = (window as any).L;
    if (!L) return;
    const container = document.getElementById('activation-map');
    if (!container) return;
    const loc = this.tempMapLocation();
    if (!loc) return;

    if (this.interactiveMapInstance && !document.body.contains(this.interactiveMapInstance.getContainer())) {
      this.interactiveMapInstance.remove();
      this.interactiveMapInstance = null;
      this.interactiveMapMarker = null;
    }

    if (!this.interactiveMapInstance) {
      this.interactiveMapInstance = L.map('activation-map').setView([loc.lat, loc.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.interactiveMapInstance);

      this.interactiveMapMarker = L.marker([loc.lat, loc.lng], { draggable: true }).addTo(this.interactiveMapInstance);

      this.interactiveMapMarker.on('dragend', (e: any) => {
        const p = e.target.getLatLng();
        this.tempMapLocation.set({ lat: p.lat, lng: p.lng, displayName: '' });
      });

      this.interactiveMapInstance.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        this.interactiveMapMarker?.setLatLng([lat, lng]);
        this.tempMapLocation.set({ lat, lng, displayName: '' });
      });

      setTimeout(() => this.interactiveMapInstance?.invalidateSize(), 200);
    } else {
      this.interactiveMapInstance.setView([loc.lat, loc.lng], 14);
      this.interactiveMapMarker?.setLatLng([loc.lat, loc.lng]);
    }
  }

  private destroyInteractiveMap(): void {
    if (this.interactiveMapInstance) {
      this.interactiveMapInstance.remove();
      this.interactiveMapInstance = null;
      this.interactiveMapMarker = null;
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
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        this.tempMapLocation.set({ lat, lng, displayName: first.display_name });
        if (this.interactiveMapInstance) {
          this.interactiveMapInstance.setView([lat, lng], 15);
          this.interactiveMapMarker?.setLatLng([lat, lng]);
        }
      }
    } catch {
      // ignore
    } finally {
      this.mapSearching.set(false);
    }
  }

  confirmMapLocation(): void {
    const loc = this.tempMapLocation();
    if (!loc) return;
    const name = loc.displayName || `Ubicación seleccionada (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`;
    const finalLoc: ValidatedLocation = { lat: loc.lat, lng: loc.lng, displayName: name };
    this.validatedLocation.set(finalLoc);
    this.zoneQuery.set(name);
    this.locationError.set('');
    this.closeMapPicker();
  }

  // ── Métodos de Disponibilidad (Alarma) ──
  toggleDay(dayId: string): void {
    const cur = this.selectedDays();
    if (cur.includes(dayId)) {
      this.selectedDays.set(cur.filter((d) => d !== dayId));
    } else {
      this.selectedDays.set([...cur, dayId]);
    }
  }

  isDaySelected(dayId: string): boolean {
    return this.selectedDays().includes(dayId);
  }

  selectWeekdays(): void {
    this.selectedDays.set(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']);
  }

  selectAllDays(): void {
    this.selectedDays.set(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']);
  }

  selectWeekend(): void {
    this.selectedDays.set(['SABADO', 'DOMINGO']);
  }

  // ── Navegación entre pasos ──
  previous(): void {
    this.step.update((cur) => Math.max(1, cur - 1));
  }

  next(): void {
    if (this.submitting() || this.photoLoading()) return;
    this.errorMessage.set('');
    if (!this.hasPhoto()) {
      this.photoError.set('Subí una foto de perfil para continuar.');
      this.step.set(1);
      return;
    }

    // Paso 1: Foto
    if (this.step() === 1) {
      this.step.set(2);
      return;
    }

    // Paso 2: Validación de Ubicación / Ciudad
    if (this.step() === 2) {
      const loc = this.validatedLocation();
      if (!loc) {
        this.validateCurrentZone(() => {
          this.step.set(3);
        });
        return;
      }
      this.step.set(3);
      return;
    }

    // Paso 3: Disponibilidad y Envío
    if (this.step() === 3) {
      if (this.selectedDays().length === 0) {
        this.errorMessage.set('Seleccioná al menos un día en el que estés disponible para atender solicitudes.');
        return;
      }

      if (!this.start() || !this.end() || this.start() >= this.end()) {
        this.errorMessage.set('La hora de fin debe ser posterior a la hora de inicio.');
        return;
      }
      this.submitActivation();
    }
  }

  private submitActivation(): void {
    const usuarioId = this.auth.currentUser()?.id;
    if (!usuarioId) {
      this.errorMessage.set('Necesitás iniciar sesión como profesional para activar tu perfil.');
      return;
    }

    const loc = this.validatedLocation() ?? {
      lat: -32.4833,
      lng: -58.2318,
      displayName: 'Concepción del Uruguay',
    };

    const keycloakId = this.auth.getKeycloakId();
    const photo = this.photoPreview();

    this.submitting.set(true);
    const payload = {
      usuarioId,
      keycloakId: keycloakId ?? undefined,
      fotoUrl: photo,
      zonaCoberturaLat: loc.lat,
      zonaCoberturaLng: loc.lng,
      radioKm: Number(this.radius()),
    };

    if (this.activatedProfileId) {
      this.saveAvailability(this.activatedProfileId);
      return;
    }
    this.api.activateProfessional(payload).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo activar tu perfil profesional.'));
        this.submitting.set(false);
        return of(null);
      }),
    ).subscribe((result) => {
      if (!result) {
        this.submitting.set(false);
        return;
      }

      if (!result.id) {
        this.submitting.set(false);
        this.errorMessage.set('El servidor no devolvió el identificador del perfil.');
        return;
      }
      this.activatedProfileId = result.id;
      this.auth.setProfessionalActive(true);
      this.saveAvailability(result.id);
    });
  }

  private saveAvailability(profId: string): void {
    const formatTime = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const availability = this.selectedDays().map((day) => ({
      diaSemana: day,
      horaInicio: formatTime(this.start()),
      horaFin: formatTime(this.end()),
    }));
    this.api.setAvailability(profId, availability).subscribe({
      next: () => {
        this.completed.set(true);
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('El perfil se activó, pero no se guardaron los horarios. Volvé a intentar para guardar los días seleccionados.');
      },
    });
  }
}
