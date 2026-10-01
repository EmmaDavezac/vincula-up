import { Injectable, computed, signal } from '@angular/core';

/** Preferencia de tema. `sistema` sigue al ajuste del navegador. */
export type TemaPreferido = 'claro' | 'oscuro' | 'sistema';
/** Tema que se está mostrando ahora: `sistema` ya resuelto. */
export type TemaEfectivo = 'claro' | 'oscuro';

const CLAVE = 'vincula-up-tema';

/**
 * Tema claro/oscuro de la aplicación.
 *
 * <p>Tres estados: `claro`, `oscuro` y `sistema`. La primera visita usa `sistema`
 * (respeta el ajuste del dispositivo); desde ahí en adelante manda lo que eligió
 * la persona, que se guarda en `localStorage`.
 *
 * <p>Se aplica como atributo `data-tema` en `<html>`, que es lo que lee el bloque
 * `[data-tema='oscuro']` de `styles.css` para redefinir los tokens.
 *
 * <p>Hay un script equivalente en `index.html` que corre **antes** de que arranque
 * Angular: sin él, alguien en oscuro vería un destello blanco en cada recarga. El
 * `index.html` es la única fuente de verdad para el primer pintado; este servicio
 * entra después y tiene que coincidir.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly preferido = signal<TemaPreferido>(this.leerPreferencia());
  /** Tema real que se aplica, con `sistema` ya resuelto. */
  readonly efectivo = signal<TemaEfectivo>(this.resolver(this.preferido()));

  /** `true` cuando la pantalla está en oscuro. Lo consume el toggle. */
  readonly oscuro = computed(() => this.efectivo() === 'oscuro');

  /** Marca que pone en `<html>`; el CSS reacciona a esto. */
  readonly atributo = computed<TemaEfectivo>(() => this.efectivo());

  constructor() {
    this.aplicar();
    // Sigue al sistema mientras la preferencia sea `sistema`: el usuario puede
    // cambiar el ajuste del sistema con la app abierta.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const consulta = window.matchMedia('(prefers-color-scheme: dark)');
      const alCambiar = () => {
        if (this.preferido() === 'sistema') {
          this.efectivo.set(this.resolver('sistema'));
          this.aplicar();
        }
      };
      // addEventListener no existe en navegadores viejos: se degrada al método
      // deprecated, que sigue siendo lo único en esos casos.
      if (typeof consulta.addEventListener === 'function') {
        consulta.addEventListener('change', alCambiar);
      } else if (typeof consulta.addListener === 'function') {
        consulta.addListener(alCambiar);
      }
    }
  }

  /** Alterna entre claro y oscuro y guarda la elección. */
  alternar(): void {
    const nuevo: TemaPreferido = this.oscuro() ? 'claro' : 'oscuro';
    this.preferido.set(nuevo);
    this.efectivo.set(nuevo);
    this.persistir(nuevo);
    this.aplicar();
  }

  /** Vuelve a seguir al ajuste del sistema. */
  seguirAlSistema(): void {
    this.preferido.set('sistema');
    this.efectivo.set(this.resolver('sistema'));
    this.persistir('sistema');
    this.aplicar();
  }

  /** Etiqueta para el tooltip y el `aria-label` del toggle. */
  etiqueta(): string {
    return this.oscuro() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  }

  private aplicar(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-tema', this.efectivo());
  }

  private resolver(preferido: TemaPreferido): TemaEfectivo {
    if (preferido !== 'sistema') {
      return preferido;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return 'claro';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  private leerPreferencia(): TemaPreferido {
    if (typeof localStorage === 'undefined') {
      return 'sistema';
    }
    const valor = localStorage.getItem(CLAVE);
    return valor === 'claro' || valor === 'oscuro' || valor === 'sistema' ? valor : 'sistema';
  }

  private persistir(valor: TemaPreferido): void {
    try {
      localStorage.setItem(CLAVE, valor);
    } catch {
      /* almacenamiento no disponible: el tema dura lo que la sesión abierta */
    }
  }
}