/**
 * Formato de los documentos legales del sitio (términos, preguntas frecuentes).
 *
 * <p>El contenido vive como datos y no dentro del template: así las dos páginas
 * comparten estructura, estilo y navegación interna, y el texto se puede revisar
 * sin tocar la maquetación.
 */
export interface LegalSeccion {
  /** Ancla de la sección. Se usa para el índice y para los enlaces internos. */
  id: string;
  titulo: string;
  /** Párrafos de la sección, en orden. */
  parrafos?: string[];
  /** Vinetas, después de los párrafos. */
  lista?: string[];
  /**
   * Par pregunta/respuesta. Lo usa el FAQ, que se renderiza como acordeón con
   * `<details>` nativo (accesible y sin JavaScript).
   */
  faq?: LegalPregunta;
}

export interface LegalPregunta {
  pregunta: string;
  respuesta: string[];
}

export interface LegalDoc {
  /** Antetítulo chico sobre el título (como el "Vincula-UP" de las otras páginas). */
  eyebrow: string;
  titulo: string;
  /** Bajada: de qué trata el documento en dos líneas. */
  bajada: string;
  /**
   * Versión y fecha de vigencia. Se muestra arriba y es la que se compara contra
   * la aceptación guardada: si cambia, hay que volver a aceptar los términos.
   */
  version?: string;
  /**
   * Ruta de esta página (p. ej. `/terminos`). La usa `LegalPage` para armar el
   * enlace cruzado al otro documento del pie.
   */
  ruta: string;
  secciones: LegalSeccion[];
}