import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { VuIcon } from '../shared/icon/icon';
import { LegalDoc } from './legal-doc';

/**
 * Enlace al otro documento del sitio. La clave es la ruta propia del documento
 * que se está viendo: desde términos se lleva a las preguntas frecuentes y
 * viceversa. Si la ruta no está en el mapa no hay par y el botón no se muestra
 * (que es justo lo que espera el template cuando llamaría a su propia página).
 */
const OTROS_DOCS: Record<string, { ruta: string; etiqueta: string }> = {
	'/terminos': { ruta: '/preguntas-frecuentes', etiqueta: 'Ver preguntas frecuentes' },
	'/preguntas-frecuentes': { ruta: '/terminos', etiqueta: 'Ver términos y condiciones' },
};

/**
 * Página de documento largo: título, versión, índice lateral y secciones.
 *
 * <p>La usan los términos y las preguntas frecuentes. El contenido llega como
 * datos (`LegalDoc`), así que agregar o reescribir una sección no toca la
 * maquetación.
 *
 * <p>En desktop el índice queda fijo al costado; en móvil se muestra arriba como
 * una lista simple, porque una columna lateral angosta no ayuda.
 */
@Component({
	selector: 'app-legal-page',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, VuIcon],
	templateUrl: './legal-page.html',
	styleUrl: './legal-page.css',
})
export class LegalPage {
	readonly doc = input.required<LegalDoc>();

	/** Correo de contacto del proyecto. Va al pie de los dos documentos. */
	readonly contacto = 'vinculaup@gmail.com';

	/**
	 * Otro documento del sitio para enlazar al pie, o `null` si la ruta propia no
	 * tiene par (en ese caso el botón se oculta, porque enlazar a la página en la
	 * que ya estamos no lleva a ningún lado).
	 */
	readonly otroDoc = computed(() => OTROS_DOCS[this.doc().ruta] ?? null);

	/**
	 * Fragmento actual de la URL. Lo usa el template para abrir el acordeón de la
	 * pregunta apuntada: sin esto, llegar por enlace profundo hace scroll a la
	 * sección pero el `<details>` queda cerrado y parece que el enlace no sirvió.
	 */
	private readonly fragmento = toSignal(inject(ActivatedRoute).fragment, { initialValue: '' });

	/** Si la sección es la que dice el fragmento de la URL, está abierta. */
	abierto(seccionId: string): boolean {
		return this.fragmento() === seccionId;
	}
}