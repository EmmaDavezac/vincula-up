import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { catchError, of, switchMap, throwError } from 'rxjs';
import { ApiService, AvailabilitySlot, MyReputation, UserAccount, UserAccountUpdate } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { FotoService } from '../core/services/foto.service';
import { environment } from '../../environments/environment';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuConfirm } from '../shared/confirm/confirm';

type CardKey = 'personal' | 'contact' | 'photo' | 'availability';

type PendingSave =
  | {
      kind: 'account';
      titulo: string;
      mensaje: string;
      detalle: string;
      peligro?: boolean;
      request: UserAccountUpdate;
    }
  | {
      kind: 'availability';
      titulo: string;
      mensaje: string;
      detalle: string;
      slots: AvailabilitySlot[];
    };

/**
 * Sección "Mi cuenta": el usuario ve su información y la actualiza por
 * tarjetas con edición inline (ver → Editar → Guardar/Cancelar), como en
 * Mercado Libre / PedidosYa / LinkedIn. El email no es editable: es la llave
 * que vincula Keycloak con el padrón y se gestiona en la cuenta de acceso.
 */
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, VuAvatar, VuConfirm, DecimalPipe],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  /** Pide y cachea la foto guardada (la que sube la persona desde esta pantalla). */
  private readonly fotos = inject(FotoService);

  /** Input de archivo dentro del avatar clicable del hero. */
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

  readonly account = signal<UserAccount | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  /** Qué tarjeta está en modo edición (solo una a la vez para no solapar guardados). */
  readonly editing = signal<CardKey | null>(null);
  readonly saving = signal(false);

  /** Guardado pendiente de confirmación (se arma con lo que se va a enviar). */
  readonly confirmacion = signal<PendingSave | null>(null);

  readonly personalDraft = signal({ nombre: '', apellido: '' });
  readonly contactDraft = signal({ telefono: '' });
  readonly cardError = signal('');
  readonly cardNotice = signal('');
  readonly professionalId = signal<string | null>(null);
  readonly availability = signal<AvailabilitySlot[]>([]);
  readonly availabilityDraft = signal<AvailabilitySlot[]>([]);
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal('');
  readonly weekDays: ReadonlyArray<{ id: string; name: string }> = [
    { id: 'LUNES', name: 'Lunes' },
    { id: 'MARTES', name: 'Martes' },
    { id: 'MIERCOLES', name: 'Miércoles' },
    { id: 'JUEVES', name: 'Jueves' },
    { id: 'VIERNES', name: 'Viernes' },
    { id: 'SABADO', name: 'Sábado' },
    { id: 'DOMINGO', name: 'Domingo' },
  ];

  // Foto de perfil: vista previa local hasta guardar.
  readonly photoPreview = signal('');
  readonly photoError = signal('');
  readonly photoLoading = signal(false);
  private photoReader: FileReader | null = null;
  /**
   * El archivo recién elegido. El `photoPreview` es la data URL local que se
   * muestra mientras se elige: no se envía, se sube el archivo y se guarda la
   * clave que devuelve el backend.
   */
  private selectedPhotoFile: File | null = null;

  /**
   * Si la cuenta tiene foto guardada. La foto guardada no es una URL: la pide el
   * `vu-avatar` por id al backend, que controla la visibilidad. Mientras se elige
   * una nueva manda la vista previa local.
   */
  readonly tieneFoto = computed(() => {
    const usuario = this.account();
    if (!usuario) return false;
    return usuario.tieneFoto ?? Boolean(usuario.fotoUrl && usuario.fotoUrl.trim().length > 0);
  });

  readonly initials = computed(() => {
    const user = this.account();
    const parts = [user?.nombre, user?.apellido].filter((p) => p && p.trim().length > 0);
    if (parts.length === 0) return 'VU';
    return parts.map((p) => p!.trim()[0]!.toUpperCase()).join('').slice(0, 2);
  });

  readonly fullName = computed(() => {
    const user = this.account();
    if (!user) return '';
    return `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Mi cuenta';
  });

  readonly memberSince = computed(() => {
    const raw = this.account()?.fechaAlta;
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  /**
   * Reputación del profesional. Sólo tiene sentido para ese rol: los clientes
   * califican, no reciben calificaciones.
   */
  readonly reputacion = signal<MyReputation | null>(null);
  readonly reputacionError = signal('');

  readonly esProfesional = computed(() => this.account()?.rolNegocio === 'PROFESIONAL');

  /** Estrellas de la tarjeta, según el promedio real. */
  estrellas(promedio: number): string {
    const llenas = Math.max(0, Math.min(5, Math.round(promedio || 0)));
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  private cargarReputacion(): void {
    this.reputacionError.set('');
    this.api.getMyReputation().pipe(
      catchError((error) => {
        this.reputacionError.set(this.api.describeError(error, 'No se pudo cargar tu reputación.'));
        return of(null);
      }),
    ).subscribe((data) => {
      if (data) {
        this.reputacion.set(data);
      }
    });
  }

  /** Fecha de la reseña en formato largo (ej: "12 de marzo de 2026"). */
  fechaResena(fecha: string | undefined): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  esConfirmacionPeligrosa(pendiente: PendingSave): boolean {
    return pendiente.kind === 'account' && pendiente.peligro === true;
  }

  readonly roleLabel = computed(() => {
    const role = this.account()?.rolNegocio;
    if (role === 'PROFESIONAL') return 'Profesional';
    if (role === 'ADMIN') return 'Administración';
    return 'Cliente';
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.api.getMyAccount().pipe(
      catchError((error) => {
        this.loadError.set(this.api.describeError(error, 'No se pudo cargar tu información.'));
        this.loading.set(false);
        return of(null);
      }),
    ).subscribe((user) => {
      if (user) {
        this.account.set(user);
        // Sin foto seleccionada hay que mostrar la guardada: la deja resolver el
        // avatar por su id, no la vista previa local (que es solo data URL).
        this.photoPreview.set('');
        this.syncSession(user);
        // La reputación sólo existe para el rol profesional.
        if (user.rolNegocio === 'PROFESIONAL') {
          this.cargarReputacion();
          this.cargarDisponibilidad(user);
        }
      }
      this.loading.set(false);
    });
  }

  cargarDisponibilidad(user: UserAccount): void {
    this.availabilityLoading.set(true);
    this.availabilityError.set('');
    this.api.getMyProfessionalProfile(user.id, user.keycloakId).pipe(
      switchMap((profile) => {
        if (!profile?.id) {
          return throwError(() => new Error('No se encontró el perfil profesional asociado a esta cuenta.'));
        }
        this.professionalId.set(profile.id);
        return this.api.getAvailability(profile.id);
      }),
      catchError((error) => {
        this.availabilityError.set(this.api.describeError(error, 'No se pudo cargar tu disponibilidad.'));
        return of(null);
      }),
    ).subscribe((slots) => {
      this.availabilityLoading.set(false);
      if (slots) {
        this.availability.set(this.normalizarDisponibilidad(slots));
      }
    });
  }

  startEdit(card: CardKey): void {
    const user = this.account();
    if (!user || this.saving()) return;
    this.cardError.set('');
    this.cardNotice.set('');
    this.photoError.set('');
    if (card === 'personal') {
      this.personalDraft.set({ nombre: user.nombre ?? '', apellido: user.apellido ?? '' });
    } else if (card === 'contact') {
      this.contactDraft.set({ telefono: user.telefono ?? '' });
    } else if (card === 'availability') {
      this.availabilityDraft.set(this.normalizarDisponibilidad(this.availability()));
    }
    // La tarjeta de foto no precarga nada: la foto guardada la resuelve el avatar
    // por su id, y la vista previa local arranca vacía hasta elegir un archivo.
    this.editing.set(card);
  }

  cancelEdit(): void {
    if (this.saving()) return;
    this.abortPhotoRead();
    this.editing.set(null);
    this.cardError.set('');
    this.photoError.set('');
    this.photoLoading.set(false);
    // Al cancelar, el avatar vuelve a mostrar la foto guardada (la del backend),
    // no la vista previa descartada.
    this.photoPreview.set('');
  }

  savePersonal(): void {
    const user = this.account();
    const draft = this.personalDraft();
    const nombre = draft.nombre.trim();
    const apellido = draft.apellido.trim();
    // Guardado parcial por campo: solo se envía lo que cambió. Permite
    // corregir el nombre sin tocar el apellido (y viceversa).
    const request: UserAccountUpdate = {};
    if (nombre && nombre !== (user?.nombre ?? '').trim()) request.nombre = nombre;
    if (apellido && apellido !== (user?.apellido ?? '').trim()) request.apellido = apellido;
    if (Object.keys(request).length === 0) {
      this.cardError.set('No hay cambios para guardar: modificá tu nombre o tu apellido.');
      return;
    }
    this.pedirGuardado(
      'Actualizar tus datos',
      `¿Guardás los cambios de ${nombre} ${apellido}?`,
      'Tu nombre es el que ven los profesionales cuando les llega una solicitud.',
      false,
      request,
    );
  }

  saveContact(): void {
    const user = this.account();
    const telefono = this.contactDraft().telefono.trim();
    if (!telefono) {
      this.cardError.set('Completá tu teléfono para continuar.');
      return;
    }
    if (telefono === (user?.telefono ?? '').trim()) {
      this.cardError.set('No hay cambios para guardar: el teléfono es el mismo.');
      return;
    }
    // Solo se envía el teléfono: nombre/apellido/foto quedan intactos.
    this.pedirGuardado(
      'Actualizar tu teléfono',
      `¿Guardás el teléfono ${telefono}?`,
      'Es el número que ven los profesionales cuando coordinan una visita.',
      false,
      { telefono },
    );
  }

  savePhoto(): void {
    this.photoError.set('');
    // La vista previa local solo existe cuando se eligió un archivo sin guardar.
    const hayArchivoNuevo = this.selectedPhotoFile !== null;

    if (!hayArchivoNuevo) {
      // Sin archivo elegido, guardar solo puede significar "quitar la foto".
      if (!this.tieneFoto()) {
        this.photoError.set('Elegí una foto antes de guardar.');
        return;
      }
      this.pedirGuardado(
        'Quitar tu foto',
        '¿Querés quitar tu foto de perfil?',
        'Vuelven tus iniciales. Podés cargar una foto cuando quieras.',
        true,
        { fotoUrl: '' },
      );
      return;
    }

    // Hay un archivo nuevo: se sube primero y solo después se pide confirmar, con
    // la clave ya resuelta. Así el base64 nunca llega al perfil.
    const archivo = this.selectedPhotoFile;
    if (!archivo) {
      this.photoError.set('No se pudo leer la imagen. Elegí el archivo nuevamente.');
      return;
    }
    this.saving.set(true);
    this.api.uploadPhoto(archivo).pipe(
      catchError((error) => {
        this.photoError.set(this.api.describeError(error, 'No se pudo subir la foto.'));
        this.saving.set(false);
        return of(null);
      }),
    ).subscribe((subida) => {
      this.saving.set(false);
      if (!subida) return;
      this.pedirGuardado(
        'Actualizar tu foto',
        '¿Querés guardar esta foto?',
        'Es la foto que te ven los profesionales y el resto de la comunidad.',
        false,
        { fotoUrl: subida.key },
      );
    });
  }

  nombreDia(dia: string): string {
    return this.weekDays.find((item) => item.id === dia.toUpperCase())?.name ?? dia;
  }

  agregarFranja(): void {
    this.availabilityDraft.update((slots) => [
      ...slots,
      { diaSemana: 'LUNES', horaInicio: '09:00', horaFin: '18:00' },
    ]);
  }

  actualizarFranja(index: number, field: keyof AvailabilitySlot, value: string): void {
    this.availabilityDraft.update((slots) =>
      slots.map((slot, currentIndex) =>
        currentIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  }

  quitarFranja(index: number): void {
    this.availabilityDraft.update((slots) => slots.filter((_, currentIndex) => currentIndex !== index));
  }

  saveAvailability(): void {
    const slots = this.normalizarDisponibilidad(this.availabilityDraft());
    if (!this.professionalId()) {
      this.cardError.set('No se encontró el perfil profesional para guardar los horarios.');
      return;
    }
    const invalidRange = slots.find(
      (slot) => !/^\d{2}:\d{2}$/.test(slot.horaInicio)
        || !/^\d{2}:\d{2}$/.test(slot.horaFin)
        || slot.horaInicio >= slot.horaFin,
    );
    if (invalidRange) {
      this.cardError.set('En cada franja, la hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (JSON.stringify(slots) === JSON.stringify(this.normalizarDisponibilidad(this.availability()))) {
      this.cardError.set('No hay cambios para guardar en tu disponibilidad.');
      return;
    }

    this.cardError.set('');
    const dias = new Set(slots.map((slot) => slot.diaSemana)).size;
    this.confirmacion.set({
      kind: 'availability',
      titulo: 'Actualizar disponibilidad',
      mensaje: slots.length
        ? `¿Guardás ${slots.length} ${slots.length === 1 ? 'franja' : 'franjas'} de disponibilidad?`
        : '¿Querés quitar todas tus franjas de disponibilidad?',
      detalle: slots.length
        ? `La nueva disponibilidad cubrirá ${dias} ${dias === 1 ? 'día' : 'días'} de la semana y se usará en nuevas solicitudes.`
        : 'Tu perfil seguirá activo, pero no aparecerás como disponible para nuevas solicitudes hasta agregar otra franja.',
      slots,
    });
  }

  /**
   * Ningún cambio se guarda sin que la persona lo confirme: se muestra qué se
   * va a enviar y recién ahí se llama a la API.
   */
  private pedirGuardado(
    titulo: string,
    mensaje: string,
    detalle: string,
    peligro: boolean,
    request: UserAccountUpdate,
  ): void {
    this.confirmacion.set({ kind: 'account', titulo, mensaje, detalle, peligro, request });
  }

  confirmarGuardado(): void {
    const pendiente = this.confirmacion();
    if (!pendiente) return;
    this.confirmacion.set(null);
    if (pendiente.kind === 'availability') {
      this.persistAvailability(pendiente.slots);
      return;
    }
    this.persist(pendiente.request);
  }

  cancelarGuardado(): void {
    this.confirmacion.set(null);
  }

  private persist(request: UserAccountUpdate): void {
    this.saving.set(true);
    this.cardError.set('');
    this.cardNotice.set('');
    this.api.updateMyAccount(request).pipe(
      catchError((error) => {
        this.cardError.set(this.api.describeError(error, 'No se pudo guardar tu información.'));
        this.saving.set(false);
        return of(null);
      }),
    ).subscribe((updated) => {
      this.saving.set(false);
      if (!updated) return;
      this.account.set(updated);
      // La foto cambió: se descarta la vista previa local y se le pide al
      // FotoService la nueva, para que el avatar la muestre sin recargar.
      this.photoPreview.set('');
      this.selectedPhotoFile = null;
      const guardada = Boolean(updated.fotoUrl && updated.fotoUrl.trim().length > 0);
      this.fotos.invalidar(updated.id);
      if (guardada) {
        this.fotos.cargar(updated.id);
      }
      this.syncSession(updated);
      this.editing.set(null);
      this.cardNotice.set('Tu información se actualizó correctamente.');
    });
  }

  private persistAvailability(slots: AvailabilitySlot[]): void {
    const professionalId = this.professionalId();
    if (!professionalId) {
      this.cardError.set('No se encontró el perfil profesional para guardar los horarios.');
      return;
    }
    this.saving.set(true);
    this.cardError.set('');
    this.cardNotice.set('');
    const payload = slots.map((slot) => ({
      ...slot,
      horaInicio: `${slot.horaInicio}:00`,
      horaFin: `${slot.horaFin}:00`,
    }));
    this.api.setAvailability(professionalId, payload).pipe(
      catchError((error) => {
        this.cardError.set(this.api.describeError(error, 'No se pudo guardar tu disponibilidad.'));
        this.saving.set(false);
        return of(null);
      }),
    ).subscribe((saved) => {
      this.saving.set(false);
      if (!saved) return;
      this.availability.set(this.normalizarDisponibilidad(slots));
      this.editing.set(null);
      this.cardNotice.set('Tu disponibilidad se actualizó correctamente.');
    });
  }

  private normalizarDisponibilidad(slots: AvailabilitySlot[]): AvailabilitySlot[] {
    const ordenDias = new Map(this.weekDays.map((day, index) => [day.id, index]));
    return slots
      .map((slot) => ({
        diaSemana: slot.diaSemana.toUpperCase(),
        horaInicio: slot.horaInicio.slice(0, 5),
        horaFin: slot.horaFin.slice(0, 5),
      }))
      .sort((a, b) =>
        (ordenDias.get(a.diaSemana) ?? Number.MAX_SAFE_INTEGER)
          - (ordenDias.get(b.diaSemana) ?? Number.MAX_SAFE_INTEGER)
          || a.horaInicio.localeCompare(b.horaInicio)
          || a.horaFin.localeCompare(b.horaFin),
      );
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    this.photoError.set('');
    // Seleccionar una foto activa el modo edición de la tarjeta de foto, así
    // aparecen las acciones Guardar/Quitar/Cancelar junto al avatar.
    if (this.editing() !== 'photo') this.editing.set('photo');
    if (!file) return;
    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      this.photoError.set('La foto debe ser JPG o PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.photoError.set('La foto no puede superar los 2 MB.');
      return;
    }
    this.abortPhotoRead();
    this.photoLoading.set(true);
    this.selectedPhotoFile = file;
    const reader = new FileReader();
    this.photoReader = reader;
    reader.onload = () => {
      this.photoPreview.set(String(reader.result ?? ''));
      this.photoLoading.set(false);
      this.photoReader = null;
    };
    reader.onerror = () => {
      this.photoError.set('No se pudo leer la foto. Probá con otra imagen.');
      this.photoLoading.set(false);
      this.photoReader = null;
    };
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.abortPhotoRead();
    this.photoPreview.set('');
    this.photoError.set('');
  }

  /**
   * Abre el selector de archivos del avatar: el input vive dentro del label
   * clicable del hero, así el botón "Cambiar foto" y el input quedan en el
   * mismo lugar en vez de en extremos opuestos de la página.
   */
  openPhotoPicker(): void {
    const input = this.photoInput()?.nativeElement;
    if (!input) return;
    input.click();
  }

  openPasswordChange(): void {
    const base = typeof window !== 'undefined' && window.location.hostname === 'vincula-up.local'
      ? window.location.origin
      : environment.keycloakUrl;
    window.open(`${base}/realms/${environment.keycloakRealm}/account`, '_blank', 'noopener');
  }

  private abortPhotoRead(): void {
    if (this.photoReader) {
      try { this.photoReader.abort(); } catch { /* noop */ }
      this.photoReader = null;
    }
  }

  /** Refresca la sesión local para que el header muestre los datos nuevos sin re-login. */
  private syncSession(user: UserAccount): void {
    this.auth.refreshProfile({
      id: user.id,
      name: `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Usuario Vincula-UP',
      tieneFoto: this.tieneFoto(),
    });
  }
}
