# Historial de Walkthroughs (WALKTHROUGH.md)

---

## Estructura Recomendada para cada Entrada

```markdown
### [AAAA-MM-DD] - <Nombre/Resumen de la Tarea>
- **Objetivo:** Breve descripción de lo solicitado.
- **Cambios realizados:**
  - Archivos creados / modificados.
  - Ajustes de código / arquitectura / configuración.
- **Verificación:** Pasos o comandos ejecutados para probar la solución.
```

---

## Historial

### [2026-11-04] - ux: corregir listados admin en mobile y evitar recorte de contenido
- **Objetivo:** Mejorar la legibilidad de los listados del panel administrativo en pantallas pequeñas, permitiendo que cada fila se adapte al ancho disponible y que el contenido no quede cortado.
- **Cambios realizados:**
  - Se quitaron los `overflow` forzados en los items de Material del panel admin para que las filas puedan expandirse al contenido.
  - Se reforzó la responsividad móvil de clientes y profesionales hasta una sola columna en pantallas muy pequeñas y se preservó el orden visual de nombre, estado y acciones.
  - Se ajustó el wrapping de texto y los mínimos de ancho para emails, especialidades, legajos y nombres, evitando cortes o columnas comprimidas.
- **Verificación:** `cd /home/emma/Desktop/vincula-up/frontend/vincula-up-web && npm run build` ejecutado tras el ajuste.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - ux: ajustar listados responsive y métricas a 4 columnas en desktop
- **Objetivo:** Corregir la visibilidad de los listados en móvil y dejar las tarjetas del dashboard con 4 columnas en desktop sin perder legibilidad en tablet y mobile.
- **Cambios realizados:**
  - Se reforzaron las filas de clientes y profesionales para que en móvil se apilen con ancho completo, el botón principal quede visible y el texto no se recorte ni se oculte por `nowrap`.
  - Se ajustó la grilla global del panel administrativo para que las métricas pasen a 2 columnas en móvil, 3 en tablet y 4 en desktop.
  - Se limitaron los `overflow` y se habilitó `overflow-wrap` en las listas para conservar nombres, emails y especialidades sin cortes verticales.
- **Verificación:** `cd /home/emma/Desktop/vincula-up/frontend/vincula-up-web && npm run build` exitoso.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - ux: reestructurar modales de consulta y aceptación de términos
- **Objetivo:** Dejar los diálogos de consulta y de aceptación de términos con estructura Angular Material consistente, ancho controlado y botones alineados a la jerarquía visual primaria/secundaria del producto.
- **Cambios realizados:**
  - Se reestructuraron los títulos y acciones de los modales de consulta y términos usando `mat-dialog-title`, `mat-dialog-content` y `mat-dialog-actions` para respetar el patrón de Material y evitar superficies desordenadas.
  - Se reforzó el estilo global de diálogos con superficie contenedora, altura máxima limitada, scroll interno y botones con radio y altura uniformes.
  - Se ajustó el botón de “Consultar” en clientes y profesionales para que conserve la identidad primaria de la marca y no quede visualmente “apagado” frente a los botones secundarios.
  - El modal de aceptación de términos queda como footer con acción principal única, con cuerpo scrollable y checkbox claro con mejor legibilidad.
- **Verificación:** `cd /home/emma/Desktop/vincula-up/frontend/vincula-up-web && npm run build` exitoso.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-02] - ux: tarjeta administrativa con grid compacto y botones Material
- **Objetivo:** Corregir el apretamiento y la mala jerarquía visual de los listados de clientes y profesionales, dejando dos columnas en móvil y cuatro en desktop con botones Material claros y consistentes.
- **Cambios realizados:**
  - Se transformó la grilla administrativa en tarjetas compactas y legibles, con espaciado más generoso y proporciones adecuadas para móvil y escritorio.
  - Los botones de acción en clientes y profesionales usan `mat-flat-button` y `mat-stroked-button` con la jerarquía visual primaria/secundaria del diseño del producto.
  - Se ajustó el contenedor global de `mat-list` para que los listados no queden comprimidos ni superpuestos, manteniendo la paleta y las variables visuales del proyecto.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-02] - ux: compresión del wizard de solicitudes y toggle dentro del menú
- **Objetivo:** Mantener el formulario de nueva solicitud visible sin scroll en móvil y mover el control de tema al menú de usuario con estilo tipo switch.
- **Cambios realizados:**
  - Se fusionaron los pasos de categoría + detalle del problema y día + horario para reducir la altura total del wizard y evitar columnas redundantes.
  - El stepper queda en una sola fila compacta en tamaños pequeños y el texto del paso se redujo para no saturar el viewport.
  - El menú de usuario ahora incluye un switch de tema con etiqueta “tema oscuro” a la izquierda y el interruptor a la derecha.
  - Ajustes visuales del formulario: categorías, textarea, day-grid y acciones aparecen más compactos en pantallas pequeñas, sin perder validaciones ni lógica de navegación.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-02] - feat: notificaciones web PWA para solicitudes
- **Objetivo:** Informar en la web a clientes y profesionales sobre cambios de estado, con notificaciones del navegador cuando la app está en segundo plano.
- **Cambios realizados:**
  - Servicio Angular consulta las solicitudes cada 30 segundos, detecta cambios de estado, sincroniza la lista abierta y persiste avisos/no leídos por cuenta.
  - La navbar incorpora bandeja accesible con permiso, contador, historial y acceso a solicitudes.
  - Se añadió manifest PWA y service worker para avisos del sistema y navegación al tocarlos.
  - Los avisos del sistema requieren permiso y página activa; Web Push con la app cerrada queda fuera de esta fase porque falta guardar suscripciones y un emisor VAPID.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso; manifest servido con `application/manifest+json`, `sw.js` con `application/javascript` y sintaxis JS válida. En el navegador integrado el permiso está denegado y no se confirmó un worker activo, por lo que no se pudo probar la notificación de sistema de extremo a extremo.
- **Especificación:** Actualizada §8.7.

### [2026-11-01] - feat: avisar por email los cambios de solicitudes
- **Objetivo:** Notificar por correo las solicitudes nuevas y los cambios de estado, reutilizando el SMTP existente; no se agregan avisos dentro de la aplicación.
- **Cambios realizados:**
  - El BFF envía aviso al profesional al crear una solicitud y a la contraparte al aceptar, rechazar, completar o cancelar.
  - Los envíos se realizan después de la respuesta exitosa de `ms-solicitudes`; fallos SMTP o falta de destinatario son best-effort y no revierten la transición.
  - Se reutilizan `KEYCLOAK_SMTP_*`, el nombre institucional, Reply-To y el enlace a `/solicitudes`.
- **Verificación:** `cd backend/bff-web && ./mvnw clean test` exitoso; el proyecto no contiene fuentes de pruebas automatizadas (`No tests to run`).
- **Especificación:** Actualizada §14.5 con los eventos de correo y su comportamiento best-effort.

### [2026-11-01] - fix: alinear botones de ingreso y crear cuenta
- **Objetivo:** Igualar tamaño y alineación de los botones del login.
- **Cambios realizados:**
  - «Ingresar» y «Crear cuenta» usan 100% del ancho disponible, 48 px de alto y margen cero.
  - Eliminado el margen negativo heredado de PatternFly que desplazaba «Ingresar» 8 px respecto de los campos.
- **Verificación:** En navegador, ambos botones midieron 432 × 48 px y comenzaron en la misma coordenada horizontal; página completa en viewport 1366 × 650.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: restaurar pregunta antes de iniciar sesión
- **Objetivo:** Mostrar «¿Ya tenés cuenta?» encima del enlace «Iniciar sesión» en el alta.
- **Cambios realizados:**
  - Se añadió la pregunta como texto independiente y se conservó el enlace debajo.
  - Se compactaron las separaciones del formulario y el padding inferior para mantener el registro dentro de la ventana.
- **Verificación:** En navegador, registro en 1366 × 650 y 390 × 844; sin overflow horizontal, enlace debajo de la pregunta y botones de igual ancho.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: igualar ancho de botones y compactar aviso requerido
- **Objetivo:** Dar al botón «Crear cuenta» el mismo ancho que «Ingresar», unificar estilos del formulario de registro y reducir el espacio del aviso de campos requeridos.
- **Cambios realizados:**
  - «Crear cuenta» usa ancho completo; el enlace «¿Ya tenés cuenta? Iniciar sesión» usa el mismo ancho con estilo secundario outline.
  - El aviso «* Campos requeridos» queda compacto con 8 px de margen inferior.
- **Verificación:** En navegador, login y registro con botones de 432 px en escritorio; registro con botones de 334 px en móvil y contenido dentro de 1366 × 650 y 390 × 844.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: apilar enlaces entre login y registro
- **Objetivo:** Colocar «Crear cuenta» debajo de «¿Todavía no tenés cuenta?» y usar la misma jerarquía al volver desde el registro.
- **Cambios realizados:**
  - El bloque de registro del login ahora es una columna: texto primero y enlace debajo.
  - El formulario de registro mantiene el botón «Crear cuenta» y muestra debajo el enlace «¿Ya tenés cuenta? Iniciar sesión».
- **Verificación:** En móvil, el enlace del login queda debajo del texto; en escritorio, el registro termina en 614 px dentro de un viewport de 650 px.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: compactar registro y limpiar footer de Keycloak
- **Objetivo:** Reducir el espacio alrededor de la recuperación de contraseña, optimizar el registro y simplificar la identidad del pie de login.
- **Cambios realizados:**
  - El margen entre «¿Olvidaste tu contraseña?» e «Ingresar» quedó en 30 px.
  - El registro usa dos columnas para nombre/apellido en escritorio, una columna en móvil, menos separación y un enlace de regreso compacto; se mantienen campos y requisitos de contraseña.
  - El logo del header enlaza a la aplicación; el tagline identifica a la Universidad Popular de Concepción del Uruguay.
  - El footer conserva solo contacto, sin marca duplicada ni enlace «Ir a Vincula-UP».
- **Verificación:** En navegador, registro dentro de 1366 × 650 y 390 × 844; sin overflow horizontal. Login con margen de 30 px al botón y enlaces/footer comprobados.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: ubicar toggle dentro del formulario y dejar margen de ventana
- **Objetivo:** Poner el cambio de tema dentro del panel, reducir la altura visible y eliminar scroll causado por el espacio reservado de la página.
- **Cambios realizados:**
  - El icono de tema se movió a la esquina superior derecha del encabezado del formulario, sin etiqueta visible.
  - El texto de registro y su botón quedan en una fila en escritorio; el pie también se compacta y puede envolver en móvil.
  - Se quitó padding exterior que generaba scroll aunque el contenido ya entraba en la ventana.
- **Verificación:** En navegador: login 1366 × 650 con altura de documento 650 px y footer visible; registro móvil 390 px sin desbordamiento horizontal.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: quitar separadores y compactar login de escritorio
- **Objetivo:** Eliminar las dos líneas y el hueco entre ingresar y crear cuenta, reducir el espacio del tema y mostrar el login completo en escritorio.
- **Cambios realizados:**
  - Retirados el borde, margen y padding redundantes del bloque `kc-info` y del contenedor de registro.
  - El control de tema queda como botón icon-only accesible de 36 × 36 px.
  - Ajustados márgenes del header, del formulario y del pie para que la página mida 768 px en un viewport de 1366 × 768.
- **Verificación:** Comprobación visual del login y registro en viewport móvil y escritorio; escritorio sin scroll vertical en 1366 × 768.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: compactar la pantalla de autenticación
- **Objetivo:** Reducir el espacio superior y la altura del login, y quitar los bordes laterales redundantes alrededor del formulario.
- **Cambios realizados:**
  - Se redujo el padding superior de la página y la cabecera de marca, y se anuló el margen superior de 64 px heredado de PatternFly.
  - Se compactaron el encabezado, los grupos de campos, las acciones y el registro en el pie.
  - Se retiró el borde exterior de la tarjeta; cada input conserva su borde y foco.
- **Verificación:** Comprobación visual del login y registro en viewport móvil y escritorio; el registro no presenta desbordamiento horizontal.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - feat: compartir modo oscuro con login Keycloak
- **Objetivo:** Permitir cambiar tema en iniciar sesión, registro y recuperación, conservando la preferencia del sitio.
- **Cambios realizados:**
  - El layout común de Keycloak incluye un control accesible claro/oscuro que persiste en la clave `vincula-up-tema`.
  - Angular y Keycloak comparten la preferencia mediante una cookie de mismo host; se conserva `localStorage` como respaldo local y `prefers-color-scheme` como valor inicial.
  - Se confirmó que recuperación de contraseña ya estaba habilitada en el realm y bootstrap (`resetPasswordAllowed=true`); el enlace y formulario usan el flujo seguro nativo de Keycloak y requieren SMTP configurado.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`; en navegador se alternó el tema en Keycloak y se verificó el enlace/formulario de recuperación sin enviar correo.
- **Especificación:** Actualizadas §§8.6 y Anexo C.

### [2026-11-01] - ux: separar footers y unificar diálogos Material
- **Objetivo:** Dar identidad de navegación a usuarios y admins, aumentar la separación entre búsqueda y resultados y centralizar diálogos con bloqueo del fondo.
- **Cambios realizados:**
  - El panel `/admin` usa un footer propio con enlaces administrativos; las demás rutas conservan el footer informativo del sitio.
  - Se fijó un margen visible entre buscador y resultados, también durante la carga.
  - Confirmaciones, detalles de clientes/profesionales, aceptación de términos, chat, cambios de estado y selector de mapa usan `MatDialog`; las acciones de sus diálogos usan botones Material.
  - MatDialog bloquea el scroll del documento y los diálogos declaran modalidad accesible; los confirmadores impiden cierre accidental mientras procesan.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso; sin overlays de diálogo HTML personalizados activos.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-01] - ux: ordenar campos y acciones de listados administrativos
- **Objetivo:** Separar la búsqueda de los resultados, facilitar la lectura de columnas y alinear las acciones de profesionales, categorías y clientes.
- **Cambios realizados:**
  - Se añadió un margen compacto entre buscador y listado, y categorías ahora incluye búsqueda local por nombre.
  - Cada listado presenta encabezados de campo en escritorio y etiquetas asociadas a los valores en móvil.
  - Se fijaron anchos mínimos para los datos de profesionales y las acciones quedan alineadas a la derecha.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso; sin diagnósticos en las plantillas revisadas.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: cambiar tarjetas administrativas por listados Material
- **Objetivo:** Presentar profesionales, categorías y clientes en listados continuos, conservando la paleta y los bordes redondeados.
- **Cambios realizados:**
  - Se reemplazaron las tarjetas individuales por `mat-list` y `mat-list-item` dentro de una superficie delineada y redondeada.
  - Las filas usan separadores, colores de los tokens del tema y una distribución adaptable; los esqueletos de carga también usan formato de fila.
  - Los estados vacíos conservan un contenedor redondeado sin apariencia de tarjeta Material.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso; sin referencias a `mat-card` en las tres vistas.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: unificar secciones administrativas con Angular Material
- **Objetivo:** Homogeneizar la presentación de profesionales, categorías y clientes.
- **Cambios realizados:**
  - Los listados y estados vacíos usan tarjetas `mat-card` outlined.
  - Se comparte el estilo de encabezados, contadores, filtros, grillas y estados vacíos mediante tokens de diseño.
  - Clientes y categorías muestran esqueletos de carga con forma de tarjeta.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso; sin diagnósticos en las plantillas ni clases revisadas.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: unificar control de tema en la navbar
- **Objetivo:** Mantener el mismo control de tema visible en la barra tanto con sesión iniciada como sin ella.
- **Cambios realizados:**
  - El botón iconográfico de tema ahora se muestra siempre en la navbar, también junto al menú de usuario autenticado.
  - Se retiró el interruptor de tema duplicado del desplegable de usuario y su dependencia de Angular Material.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build` exitoso.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: alinear activación profesional con el wizard de solicitudes
- **Objetivo:** Hacer que Activar perfil use una navegación por pasos consistente con Crear solicitud.
- **Cambios realizados:**
  - El stepper permite volver a pasos ya completados y anuncia el paso actual.
  - Las acciones Atrás/Continuar quedan al pie con jerarquía y espaciado comunes.
  - Se muestra un spinner Material mientras se valida la zona y se evita avanzar durante la validación.
  - Se mantienen las validaciones propias de foto, ubicación, radio y disponibilidad.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: cambiar selector de tema de visitantes por icono
- **Objetivo:** Reemplazar el slide de tema en la navbar para visitantes por un icono de sol/luna.
- **Cambios realizados:**
  - El control sin sesión es un botón accesible con tooltip y aria-label que alterna luna/sol según el tema.
  - El slide de usuarios autenticados continúa dentro del menú desplegable.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - fix: hacer visible la pelotita del switch de tema
- **Objetivo:** Renombrar el control a “Modo oscuro” y corregir el mando que no se distinguía con el tema claro.
- **Cambios realizados:**
  - Actualizada la etiqueta en la barra y el menú de usuario.
  - Elevado el relleno del mando de MDC sobre la pista y aplicado el token de contorno del tema.
- **Verificación:** Build Angular exitoso y comprobación visual en modo claro y oscuro en la página local.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-11-01] - ux: ordenar calendario y confirmación de solicitud
- **Objetivo:** Priorizar continuar sobre salir, identificar acciones del menú de usuario y mostrar fechas reales desde hoy.
- **Cambios realizados:**
  - El modal de salida enfoca y destaca “Seguir completando”; “Salir” queda como acción secundaria destructiva.
  - Añadidos chevron e iconos al dropdown; se quitó Perfil profesional de Mi cuenta y Cambiar contraseña usa el primario de marca.
  - El switch oculta el check, usa las dimensiones nativas y aplica contorno por tokens en ambos temas.
  - El calendario presenta hoy y los seis días siguientes con día de semana y número de mes; Cancelar solicitud queda junto a Atrás.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`; comprobación visual en el navegador local.
- **Especificación:** §9.1 describe el flujo de seis pasos.

### [2026-11-01] - ux: ordenar salida, calendario y menú de cuenta
- **Objetivo:** Hacer más clara la acción segura al salir, facilitar el menú y mostrar una semana móvil desde hoy.
- **Cambios realizados:**
  - “Seguir completando” pasa a ser la acción primaria; “Salir” queda secundaria y destructiva.
  - El dropdown de cuenta muestra chevron e iconos para tema, cuenta y cierre de sesión.
  - El switch vuelve a dimensiones Material consistentes y recupera pista cápsula y mando circular.
  - El selector presenta hoy y los seis días siguientes con el número del mes; “Cancelar solicitud” se mueve junto a Atrás.
  - Se quitó Perfil profesional de Mi cuenta y Cambiar contraseña usa el primario de marca.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Actualizada §9.1.
- **Especificación:** Flujo de solicitud ya documentado en §9.1.

### [2026-11-01] - ux: unificar botones redondeados y mejorar toggle de tema
- **Objetivo:** Aplicar forma rectangular redondeada a los botones de todo el sitio y hacer más equilibrado el slide de tema.
- **Cambios realizados:**
  - Radio global forzado de 8px para botones, enlaces-botón y toggles Material, incluso frente a reglas locales.
  - Interruptor de tema con pista más compacta, mando redondeado y etiqueta alineada.
  - Actualizadas la guía visual y la especificación; avatares/chips conservan sus excepciones de forma.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Actualizadas §§17.3–17.4.

### [2026-10-31] - ux: simplificar categoría y reforzar botones oscuros
- **Objetivo:** Quitar redundancias del paso 2 y diferenciar con claridad botones primarios/secundarios en tema oscuro.
- **Cambios realizados:**
  - Eliminado el rótulo duplicado de categoría y el helper que repetía el ejemplo del placeholder.
  - En tema oscuro, los botones outline usan superficie clara/tinta oscura; quiet mantiene transparencia con borde más legible.
  - Actualizadas la guía visual y la especificación para que la regla sea global.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Actualizada §17.4.

### [2026-10-31] - fix: enriquecer perfiles históricos y uniformar pasos de solicitud
- **Objetivo:** Recuperar nombre y foto para profesionales con identidad de Keycloak histórica, y cerrar los ajustes visuales del wizard.
- **Cambios realizados:**
  - El BFF busca la cuenta por UUID interno y usa un fallback de solo lectura por Keycloak ID para padrones viejos; el avatar recibe el UUID interno correcto.
  - El perfil demo usa su ilustración local existente cuando no tiene foto subida; las cuentas reales sin foto conservan iniciales.
  - Quitado el botón “Mi ubicación”, se añadió margen inferior común a los seis pasos y se ocultó el check visual del ordenamiento.
- **Verificación:** Compilación del BFF, `npm --prefix frontend/vincula-up-web run build` y reconstrucción de `bff-web`/`nginx`.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-10-31] - ux: ordenar acciones y simplificar datos de Mi cuenta
- **Objetivo:** Alinear las acciones de todas las secciones de Mi cuenta y retirar aclaraciones obsoletas de email y contraseña.
- **Cambios realizados:**
  - Los botones de las tarjetas, incluidos Guardar cambios y Cancelar en Contacto, quedan alineados a la derecha.
  - Se quitó el tag “No editable” y los textos que afirmaban que email o contraseña no podían gestionarse desde Vincula-UP.
  - El campo de teléfono ocupa toda la fila del formulario de Contacto.
  - Se confirmó que Crear solicitud usa un único stepper con seis pasos reales.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-10-31] - fix: reparar geolocalización y recrear mapa al volver
- **Objetivo:** Resolver el fallo de ubicación en PC, restaurar la interactividad del mapa al volver al paso y hacer que el stepper represente el recorrido real.
- **Cambios realizados:**
  - La geolocalización usa primero precisión de red/GPS de bajo consumo y reintenta con margen extendido si el navegador no obtiene posición; los errores distinguen permiso, timeout y falta de señal.
  - Leaflet se destruye al abandonar Ubicación y se reinicializa sobre el contenedor nuevo al regresar.
  - El wizard ahora tiene seis pasos independientes: ubicación, categoría, problema, día, horario y profesional.
  - Se actualizó la especificación del flujo.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Actualizada §9.1.

### [2026-10-31] - fix: ubicación, carga de mapas, fotos y selección de orden
- **Objetivo:** Hacer visible y más robusta la geolocalización, recuperar reintentos de fotos y completar los controles verticales del wizard.
- **Cambios realizados:**
  - El botón de ubicación muestra progreso, bloquea dobles clics e informa permisos, timeout y requisito HTTPS; se muestran spinners al consultar direcciones/mapas.
  - Categoría y día/horario muestran substeppers verticales de dos etapas.
  - La ordenación usa `MatButtonToggleGroup`; se quitó “Volver al listado” y queda “Cancelar” con confirmación.
  - Las descargas de fotos fallidas liberan el bloqueo de caché y las imágenes que no renderizan invalidan el blob; el mapeo acepta claves de foto legadas.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-10-31] - ux: revisar creación de solicitud y catálogo de categorías
- **Objetivo:** Corregir jerarquía de acciones en categorías, modales sobre el mapa y completar el flujo visual de crear solicitud.
- **Cambios realizados:**
  - En categorías, “Renombrar” es la acción primaria y se retiró la etiqueta redundante “Activa”.
  - El modal de confirmación queda por encima de Leaflet; abandonar `/solicitar` pide confirmación y evita perder datos.
  - El selector excluye categorías sin profesionales activos, el wizard muestra stepper, incluye placeholder de horario y estados accesibles.
  - Se usan spinners de Angular Material al consultar categorías/profesionales y al enviar.
  - Se cuadraron los controles del wizard según la guía visual.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Actualizada §9.1.

### [2026-10-31] - ux: mover el control de tema al menú de usuario
- **Objetivo:** Ubicar el interruptor de tema en el desplegable de usuario y nombrar el acceso al perfil como cuenta.
- **Cambios realizados:**
  - Con sesión, el interruptor claro/oscuro aparece dentro del desplegable; sin sesión permanece en la barra.
  - El enlace `/mi-cuenta` ahora se muestra como “Mi cuenta”.
  - El panel usa controles nativos accesibles para convivencia con el slide toggle.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en rutas ni contratos.

### [2026-10-31] - fix: esperar verificación de términos y mostrar cargas de autenticación
- **Objetivo:** Evitar que los términos aparezcan antes de confirmar su aceptación y suavizar las redirecciones de autenticación; quitar iconos de acciones textuales.
- **Cambios realizados:**
  - El modal legal solo se monta tras la respuesta del backend. Durante la verificación se muestra una pantalla de carga y, si falla, ofrece reintentar.
  - Se muestra una pantalla de carga durante la redirección de login y antes de cerrar sesión hacia Keycloak.
  - Se quitaron iconos de los botones y acciones textuales; se conservaron controles icon-only e iconos informativos fuera de botones.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en contratos ni en el requisito de aceptación.

### [2026-10-31] - feat: instalar Angular Material y añadir toggle de tema
- **Objetivo:** Incorporar Angular Material y reemplazar el selector de tema de la barra por un interruptor deslizante.
- **Cambios realizados:**
  - Añadido `@angular/material` al frontend.
  - La navbar usa `MatSlideToggleModule`; el interruptor refleja el tema efectivo y guarda la selección clara/oscura mediante `TemaService`.
  - Los colores del control usan los tokens de Vincula-UP.
- **Verificación:** `npm --prefix frontend/vincula-up-web run build`.
- **Especificación:** Sin cambios en contratos ni reglas del tema.

### [2026-10-03] - Actualización de AGENTS.md, WALKTHROUGH.md y reglas del proyecto
- **Objetivo:** Mejorar las directivas para los agentes de IA estableciendo la obligación de registrar walkthroughs, mantener siempre actualizado `ESPECIFICACION.md`, verificar builds antes de finalizar y seguir convenciones estrictas de arquitectura y secretos.
- **Cambios realizados:**
  - Se actualizó [AGENTS.md](file:///home/emma/Desktop/vincula-up/AGENTS.md) añadiendo:
    - **Verificación Automática:** Obligación de ejecutar `./mvnw clean compile` o `npm run build` antes de dar por completada una tarea.
    - **Convenciones de Arquitectura:** Reglas para Backend (Java/Spring Boot) y Frontend (Angular 22 con Standalone Components y Signals).
    - **Manejo Estricto de Secretos:** Protección del `.env` y sincronización con `.env.example`.
    - Obligación de actualizar [WALKTHROUGH.md](file:///home/emma/Desktop/vincula-up/WALKTHROUGH.md) y [ESPECIFICACION.md](file:///home/emma/Desktop/vincula-up/ESPECIFICACION.md).
  - Se creó y estructuró el historial centralizado en [WALKTHROUGH.md](file:///home/emma/Desktop/vincula-up/WALKTHROUGH.md).
- **Verificación:** Documentos revisados y validados.

### [2026-10-03] - Corrección de visibilidad para botón "Reenviar invitación" a profesionales
- **Objetivo:** Permitir que los administradores puedan ver y accionar el botón "Reenviar invitación" para profesionales en estado `CARGADO` (preregistro/alta previa).
- **Cambios realizados:**
  - Modificado [admin-professionals.ts](file:///home/emma/Desktop/vincula-up/frontend/vincula-up-web/src/app/admin/admin-professionals/admin-professionals.ts) para corregir el método `puedeReenviarse`, asegurando que no descarte perfiles en estado `CARGADO` que ya cuentan con usuario/email asignado en el sistema.
- **Verificación:** Compilación limpia del frontend Angular mediante `npm run build`.

### [2026-10-03] - Activación de verificación de email y remoción de referencias a Keycloak en frontend
- **Objetivo:** 
  1. Activar la verificación obligatoria de correo electrónico en la configuración del realm de Keycloak.
  2. Eliminar referencias textuales a "Keycloak" en mensajes de error o pantallas de acceso restringido en el frontend.
  3. Realizar una limpieza profunda de las bases de datos (PostgreSQL / Keycloak) dejando únicamente las cuentas de prueba iniciales.
- **Cambios realizados:**
  - En [vincula-up-realm.json](file:///home/emma/Desktop/vincula-up/keycloak/import/vincula-up-realm.json#L24): Se cambió `"verifyEmail": false` a `true`.
  - En [app.routes.ts](file:///home/emma/Desktop/vincula-up/frontend/vincula-up-web/src/app/app.routes.ts#L68-L75): Se removió la mención a Keycloak en el mensaje de la ruta `/no-autorizado`.
  - En [auth.service.ts](file:///home/emma/Desktop/vincula-up/frontend/vincula-up-web/src/app/core/services/auth.service.ts#L281): Se reemplazaron las menciones de Keycloak en las notificaciones de error por mensajes genéricos orientados al usuario.
  - Se eliminaron todos los registros de usuarios y profesionales creados durante pruebas de las tablas `usuarios`, `profesionales`, `profesional_especialidad`, `disponibilidades`, `solicitudes`, `mensajes`, `calificaciones` y `user_entity` en PostgreSQL.
- **Verificación:** Compilación limpia del frontend mediante `npm run build` y validación directa en la base de datos PostgreSQL.

### [2026-10-03] - Homogeneización de la sección de ubicación en activación de perfil
- **Objetivo:** Adaptar el paso 2 de activación de perfil (`/activar-perfil`) para que comparta el mismo diseño, controles e interactividad que el paso de ubicación al crear solicitudes (`/solicitar`).
- **Cambios realizados:**
  - En [activation.html](file:///home/emma/Desktop/vincula-up/frontend/vincula-up-web/src/app/activation/activation.html#L135-L212): Se estructuró la búsqueda con el input de lupa alineado con el botón compacto de "Mi ubicación", se unificaron las sugerencias y se agregó la leyenda de arrastre de marcador.
  - En [activation.ts](file:///home/emma/Desktop/vincula-up/frontend/vincula-up-web/src/app/activation/activation.ts#L117-L146): Se habilitó la interactividad completa del mapa Leaflet (arrastrar el marcador `dragend` y hacer clic en el mapa para posicionarlo directamente).
  - En [activation.css](file:///home/emma/Desktop/vincula-up/frontend/vincula-up-web/src/app/activation/activation.css#L160-L220): Se importaron y alinearon los estilos CSS `.location-field`, `.location-gps`, `.step-map` y `.privacy-note`.
- **Verificación:** Compilación exitosa del frontend Angular mediante `npm run build`.

### [2026-10-30] - feat: guía visual, botones cuadrados y barra inferior móvil sólida
- **Objetivo:** Establecer la guía visual de Vincula-UP y aplicar sus reglas: botones planos y cuadrados, diferenciación clara entre primario y secundario, modal de cerrar sesión cuadrado y barra inferior de móvil con fondo sólido (no transparente).
- **Cambios realizados:**
  - `GUÍA-VISUAL.md` (nuevo): paleta de colores completa, reglas de botones cuadrados sin píldoras, y barra inferior móvil sólido.
  - `AGENTS.md`: añadida sección de guía visual obligatoria.
  - `frontend/vincula-up-web/src/styles.css`: `.vu-btn` con `border-radius: 0`; `.vu-btn--pill` anulado; `.vu-tabbar` con fondo sólido.
  - Eliminados los usos de `.vu-btn--pill` en múltiples componentes.
- **Verificación:** `npm run build` sin errores, sin `.vu-btn--pill` presente.
- **Especificación:** Actualizada según tokens y tema.

### [2026-10-30] - feat: mejoras en login y navbar
- **Objetivo:** Mejorar la experiencia de login y la barra de navegación.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/sign-in/sign-in.html`: enlace "Registrate" ahora llama a `registrarse()`.
  - `frontend/vincula-up-web/src/app/sign-in/sign-in.ts`: añadido método `registrarse()`.
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.ts`: añadido computed `enLogin`.
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.html`: ocultar acciones "Ingresar" y "Crear cuenta" cuando `enLogin()` es true.
- **Verificación:** `npm run build` exitoso.
- **Especificación:** No requiere cambios.

### [2026-10-30] - fix: restaurar tema de login de Keycloak y activar loginTheme
- **Objetivo:** Que las pantallas de acceso de Keycloak usen el tema `vincula-up`.
- **Causa:** El directorio `keycloak/themes/vincula-up/login/` existía en una rama anterior pero no estaba en `dev`.
- **Cambios realizados:**
  - Restaurado el tema de login en `keycloak/themes/vincula-up/login/`.
  - Actualizado script `keycloak-bootstrap.sh` para aplicar `loginTheme`.
- **Verificación:** `npm run build` compila limpiamente; aplicar script y reiniciar Keycloak para ver cambios.
- **Especificación:** Documentado en `ESPECIFICACION.md`.

### [2026-11-04] - fix: bootstrap automático del tema y modales con ancho controlado
- **Objetivo:**
  1. Asegurar que el tema `vincula-up` se vuelva a aplicar cada vez que `docker compose up` levanta Keycloak.
  2. Reducir el ancho de los modales para que no rompan la estructura interna.
- **Cambios realizados:**
  - `docker-compose.yml`: agregado el servicio `keycloak-init`, que espera a la salud de Keycloak y vuelve a setear `loginTheme=vincula-up` y `emailTheme=vincula-up` cada arranque.
  - `frontend/vincula-up-web/src/styles.css`: límite global de ancho para `.vu-details-dialog` y `.vu-confirm-dialog` para no sobrepasar la viewport.
  - `frontend/vincula-up-web/src/app/legal/terminos-modal.ts`: ancho de modal ajustado a `30rem` y `maxWidth` restringido.
  - `frontend/vincula-up-web/src/app/admin/admin-professionals/admin-professionals.css`: ancho del detalle de profesional reducido a `32rem`.
- **Verificación:**
  - `docker exec vinculaup-keycloak /opt/keycloak/bin/kcadm.sh get realms/vincula-up -F loginTheme,emailTheme` devolvió `vincula-up` para ambos valores.
  - `npm run build` en el frontend compiló correctamente sin errores de TypeScript ni CSS.
- **Especificación:** Actualizada en `ESPECIFICACION.md` para dejar constancia del arranque automatizado del tema y la política de anchos de modales.
