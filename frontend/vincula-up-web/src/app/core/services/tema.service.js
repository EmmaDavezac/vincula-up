import { __decorate } from "tslib";
import { Injectable, computed, signal } from '@angular/core';
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
let TemaService = class TemaService {
    preferido = signal(this.leerPreferencia());
    /** Tema real que se aplica, con `sistema` ya resuelto. */
    efectivo = signal(this.resolver(this.preferido()));
    /** `true` cuando la pantalla está en oscuro. Lo consume el toggle. */
    oscuro = computed(() => this.efectivo() === 'oscuro');
    /** Marca que pone en `<html>`; el CSS reacciona a esto. */
    atributo = computed(() => this.efectivo());
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
            }
            else if (typeof consulta.addListener === 'function') {
                consulta.addListener(alCambiar);
            }
        }
    }
    /** Establece el tema explícitamente y guarda la elección. */
    establecer(preferencia) {
        this.preferido.set(preferencia);
        this.efectivo.set(this.resolver(preferencia));
        this.persistir(preferencia);
        this.aplicar();
    }
    alternar() {
        const nuevo = this.oscuro() ? 'claro' : 'oscuro';
        this.preferido.set(nuevo);
        this.efectivo.set(nuevo);
        this.persistir(nuevo);
        this.aplicar();
    }
    /** Vuelve a seguir al ajuste del sistema. */
    seguirAlSistema() {
        this.preferido.set('sistema');
        this.efectivo.set(this.resolver('sistema'));
        this.persistir('sistema');
        this.aplicar();
    }
    /** Etiqueta para el tooltip y el `aria-label` del toggle. */
    etiqueta() {
        return this.oscuro() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    }
    aplicar() {
        if (typeof document === 'undefined') {
            return;
        }
        document.documentElement.setAttribute('data-tema', this.efectivo());
    }
    resolver(preferido) {
        if (preferido !== 'sistema') {
            return preferido;
        }
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return 'claro';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
    }
    leerPreferencia() {
        if (typeof document !== 'undefined') {
            const cookie = document.cookie
                .split('; ')
                .find((item) => item.startsWith(`${CLAVE}=`))
                ?.slice(CLAVE.length + 1);
            if (cookie === 'claro' || cookie === 'oscuro' || cookie === 'sistema') {
                return cookie;
            }
        }
        try {
            const valor = typeof localStorage === 'undefined' ? null : localStorage.getItem(CLAVE);
            return valor === 'claro' || valor === 'oscuro' || valor === 'sistema' ? valor : 'sistema';
        }
        catch {
            return 'sistema';
        }
    }
    persistir(valor) {
        try {
            localStorage.setItem(CLAVE, valor);
        }
        catch {
            /* almacenamiento no disponible: el tema dura lo que la sesión abierta */
        }
        if (typeof document !== 'undefined') {
            const secure = document.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `${CLAVE}=${valor}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
        }
    }
};
TemaService = __decorate([
    Injectable({ providedIn: 'root' })
], TemaService);
export { TemaService };
