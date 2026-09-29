import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService, MyReputation, UserAccount, UserAccountUpdate } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuConfirm } from '../shared/confirm/confirm';
import { VuIcon } from '../shared/icon/icon';

type CardKey = 'personal' | 'contact' | 'photo';

/**
 * Sección "Mi cuenta": el usuario ve su información y la actualiza por
 * tarjetas con edición inline (ver → Editar → Guardar/Cancelar), como en
 * Mercado Libre / PedidosYa / LinkedIn. El email no es editable: es la llave
 * que vincula Keycloak con el padrón y se gestiona en la cuenta de acceso.
 */
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, VuAvatar, VuConfirm, VuIcon],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  /** Input de archivo dentro del avatar clicable del hero. */
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');

  readonly account = signal<UserAccount | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  /** Qué tarjeta está en modo edición (solo una a la vez para no solapar guardados). */
  readonly editing = signal<CardKey | null>(null);
  readonly saving = signal(false);

  /** Guardado pendiente de confirmación (se arma con lo que se va a enviar). */
  readonly confirmacion = signal<{ titulo: string; mensaje: string; detalle: string; peligro?: boolean; request: UserAccountUpdate } | null>(null);

  readonly personalDraft = signal({ nombre: '', apellido: '' });
  readonly contactDraft = signal({ telefono: '' });
  readonly cardError = signal('');
  readonly cardNotice = signal('');

  // Foto de perfil: vista previa local hasta guardar.
  readonly photoPreview = signal('');
  readonly photoError = signal('');
  readonly photoLoading = signal(false);
  private photoReader: FileReader | null = null;
  /**
   * El archivo recién elegido. El `photoPreview` es la data URL local que se
   * muestra mientras se elige: no se envía, se sube el archivo y se guarda la URL.
   */
  private selectedPhotoFile: File | null = null;

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
        this.photoPreview.set(user.fotoUrl ?? '');
        this.syncSession(user);
        // La reputación sólo existe para el rol profesional.
        if (user.rolNegocio === 'PROFESIONAL') {
          this.cargarReputacion();
        }
      }
      this.loading.set(false);
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
    } else {
      this.photoPreview.set(user.fotoUrl ?? '');
    }
    this.editing.set(card);
  }

  cancelEdit(): void {
    if (this.saving()) return;
    const eraFoto = this.editing() === 'photo';
    this.abortPhotoRead();
    this.editing.set(null);
    this.cardError.set('');
    this.photoError.set('');
    this.photoLoading.set(false);
    // Al cancelar la foto, el avatar vuelve a mostrar la foto guardada
    // (no la vista previa descartada).
    if (eraFoto) this.photoPreview.set(this.account()?.fotoUrl ?? '');
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
    const preview = this.photoPreview().trim();
    const current = (this.account()?.fotoUrl ?? '').trim();
    if (!preview && !current) {
      this.photoError.set('Elegí una foto antes de guardar.');
      return;
    }
    if (preview === current) {
      this.photoError.set('La foto es la misma que ya tenés guardada.');
      return;
    }
    // Quitar la foto no sube nada: se manda vacío y el backend la borra.
    if (!preview) {
      this.pedirGuardado(
        'Quitar tu foto',
        '¿Querés quitar tu foto de perfil?',
        'Vuelven tus iniciales. Podés cargar una foto cuando quieras.',
        true,
        { fotoUrl: '' },
      );
      return;
    }
    // Hay un archivo nuevo: se sube primero y solo después se pide confirmar,
    // con la URL ya resuelta. Así el base64 nunca llega al perfil.
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
        { fotoUrl: subida.url },
      );
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
    this.confirmacion.set({ titulo, mensaje, detalle, peligro, request });
  }

  confirmarGuardado(): void {
    const pendiente = this.confirmacion();
    if (!pendiente) return;
    this.confirmacion.set(null);
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
      this.photoPreview.set(updated.fotoUrl ?? '');
      // Ya está guardada y subida: el archivo local ya no se necesita.
      this.selectedPhotoFile = null;
      this.syncSession(updated);
      this.editing.set(null);
      this.cardNotice.set('Tu información se actualizó correctamente.');
    });
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
    });
  }
}
