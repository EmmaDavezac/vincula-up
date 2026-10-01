import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Resuelve la imagen de una foto de perfil a partir del id del usuario.
 *
 * <p><b>Por qué hace falta.</b> Las fotos de perfil no son públicas: el backend las
 * entrega en {@code GET /api/usuarios/{id}/foto}, que exige sesión y decide por rol
 * quién ve la foto de quién. Como ese endpoint necesita el header
 * {@code Authorization} y un {@code <img src>} no lo manda, la imagen se pide con
 * {@code HttpClient} y se muestra con una URL blob.
 *
 * <p><b>Por qué no depende de AuthService.</b> Recibe el token por
 * {@link establecerToken}, que le llama el propio AuthService: así la dependencia
 * va en un solo sentido y no se forma un ciclo entre los dos servicios.
 *
 * <p>Cachea los blobs por usuario para no volver a descargarlos en cada render
 * (un avatar puede aparecer en varias pantallas de la misma vista).
 */
@Injectable({ providedIn: 'root' })
export class FotoService {
  private readonly http = inject(HttpClient);
  /** URL blob ya resuelta, por id de usuario. */
  private readonly urls = signal<Readonly<Record<string, string>>>({});
  /** Ids ya pedidos: evita repetir la llamada en cada render o cambio de pantalla. */
  private readonly pedidos = new Set<string>();
  private token: string | null = null;

  /** Lo llama AuthService cuando cambia la sesión. */
  establecerToken(token: string | null): void {
    this.token = token;
  }

  /** URL lista para el `<img>`, o `null` si todavía no llegó o no hay foto. */
  urlDe(usuarioId: string | null | undefined): string | null {
    return usuarioId ? this.urls()[usuarioId] ?? null : null;
  }

  /**
   * Pide la foto si no se pidió antes. Es idempotente: si ya está en cache, no
   * vuelve a pegarle al backend.
   */
  cargar(usuarioId: string | null | undefined): void {
    if (!usuarioId || this.pedidos.has(usuarioId) || !this.token) {
      return;
    }
    this.pedidos.add(usuarioId);
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.token}` });
    this.http
      .get(`${environment.apiUrl}/usuarios/${usuarioId}/foto`, { headers, responseType: 'blob' })
      .pipe(catchError(() => of(null)))
      .subscribe((blob) => {
        // Un 404 (no tiene foto) o un 403 (no la puede ver) llegan como null:
        // en ambos casos el avatar muestra iniciales, que es lo esperado.
        if (!blob || blob.size === 0) {
          return;
        }
        this.urls.update((mapa) => ({ ...mapa, [usuarioId]: URL.createObjectURL(blob) }));
      });
  }

  /** Descarta lo cacheado de una persona: se llama cuando cambia su foto. */
  invalidar(usuarioId: string | null | undefined): void {
    if (!usuarioId) {
      return;
    }
    const anterior = this.urls()[usuarioId];
    if (anterior) {
      URL.revokeObjectURL(anterior);
    }
    this.urls.update((mapa) => {
      const copia = { ...mapa };
      delete copia[usuarioId];
      return copia;
    });
    this.pedidos.delete(usuarioId);
  }

  /** Libera todos los blobs. Lo llama el logout: si no, las URLs quedan colgadas. */
  limpiar(): void {
    for (const url of Object.values(this.urls())) {
      URL.revokeObjectURL(url);
    }
    this.urls.set({});
    this.pedidos.clear();
    this.token = null;
  }
}