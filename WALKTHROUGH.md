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
