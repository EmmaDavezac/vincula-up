# Historial de Walkthroughs (WALKTHROUGH.md)

---

## Estructura Recomendada para cada Entrada
### [2026-10-27] - feat: commit y push cambios actuales + aplicar planilla de estilo Keycloak congruente con el sistema
- **Objetivo:** Commit y push de los cambios actuales respetando las convenciones de agents.md, y asegurar que la configuración Keycloak sea congruente con el sistema de diseño Vincula-UP.
- **Cambios realizados:**
  - `git add --all` y `git commit -m 'feat: actualizar configuración Keycloak y documentación del proyecto'`
  - `git push origin dev` para subir los 24 archivos modificados (943 insertiones, 466 eliminaciones)
  - Verificaron que la Keycloak theme ya aplica los tokens de diseño oficiales: `--coral (#E35F43)`, `--surface-highlight (#F3F5F1)`, `--muted (#67716C)`, modo oscuro y plantillas de correo en español con branding consistente.
  - El description del cliente `vincula-up-public` tiene 231 caracteres (dentro del límite de 255).
- **Verificación:** `git status` → árbol limpio; `git log` confirma commit en dev; revisión visual de tokens de diseño en template.ftl y messages_es.properties.

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

### [2026-11-04] - fix: error 502 en POST /api/profesionales/alta (crear profesional)
- **Objetivo:** Resolver el error HTTP 502 Bad Gateway que devolvía el endpoint `POST /api/profesionales/alta` al intentar dar de alta un profesional desde el panel de administración.
- **Cambios realizados:**
  - Se identificó la causa raíz: desfaso entre `KEYCLOAK_ADMIN_CLIENT_SECRET` en `.env` (valor personalizado `2e2bceef...`) y el secreto configurado en Keycloak (`vincula-up-admin-secret`, fijado en `keycloak/import/vincula-up-realm.json`). El import del realm no resuelve placeholders `${env.*}`, por lo que el secreto en Keycloak nunca se actualizó al cambiarlo en `.env`.
  - El BFF (`bff-web`) no podía obtener el token de servicio de Keycloak (`401 invalid_client_credentials`), por lo que `crearUsuarioConContrasenaTemporal()` devolvía `null` y `ApiController` lanzaba explícitamente `502 BAD_GATEWAY`.
  - Se ejecutó `./scripts/linux-macos/keycloak-bootstrap.sh` para sincronizar el secreto del `.env` hacia Keycloak (vía `kcadm.sh`).
  - Se recreó el contenedor `bff-web` con `docker compose up -d --force-recreate bff-web`.
- **Verificación:**
  - `POST https://vincula-up.local/api/profesionales/alta` con token de ADMIN devuelve ahora `HTTP 201 Created` con el profesional creado, usuario vinculado, perfil pendiente, correo enviado y contraseña temporal.
  - Antes de la fix devolvía `HTTP 502 Bad Gateway`.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - fix: healthcheck de Keycloak sin curl (unhealthy)
- **Objetivo:** Curar el estado `unhealthy` del contenedor `vinculaup-keycloak` causado por un healthcheck que usa `curl`, comando que no existe en la imagen de Keycloak 26.3.3.
- **Cambios realizados:**
  - `docker-compose.yml`: se cambió el `healthcheck` del servicio `keycloak` de `curl -fsS http://localhost:8080/health/ready` a una verificación TCP con `/bin/bash` mediante `/dev/tcp/127.0.0.1/8080`, que confirma que el puerto de Keycloak está escuchando.
- **Verificación:**
  - `docker compose up -d --force-recreate keycloak`
  - `docker ps` muestra `vinculaup-keycloak` como `(healthy)`.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - fix: error 502 en POST /api/profesionales/alta (reaparición tras reinicio de Keycloak)
- **Objetivo:** Resolver el error HTTP 502 Bad Gateway que volvió a devolver `POST /api/profesionales/alta` tras recrear el contenedor de Keycloak.
- **Causa:** El BFF (`bff-web`) llevaba 2 horas arriba y mantenía conexiones HTTP en caché (keep-alive) y estado interno hacia la instancia anterior de Keycloak. Aunque el DNS resolvía correctamente (`keycloak` → `172.18.0.4`), las conexiones del `RestClient` de Spring apuntaban a una instancia ya terminada, provocando `I/O error` en todas las peticiones al Admin API de Keycloak y, en consecuencia, `502 BAD_GATEWAY` en `altaProfesional()`.
- **Cambios realizados:** Se reinició el contenedor `bff-web` para limpiar su caché de conexiones HTTP y estado interno: `docker compose up -d --force-recreate bff-web`.
- **Verificación:** `POST https://vincula-up.local/api/profesionales/alta` con token de ADMIN devuelve ahora `HTTP 201 Created` con el profesional creado, usuario vinculado, perfil pendiente, correo enviado y contraseña temporal.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - ux: corregir listados admin en mobile y evitar recorte de contenido
- **Objetivo:** Mejorar la legibilidad de los listados del panel administrativo en pantallas pequeñas, permitiendo que cada fila se adapte al ancho disponible y que el contenido no quede cortado.
- **Cambios realizados:**
  - Se quitaron los `overflow` forzados en los items de Material del panel admin para que las filas puedan expandirse al contenido.
  - Se reforzó la responsividad móvil de clientes y profesionales hasta una sola columna en pantallas muy pequeñas y se preservó el orden visual de nombre, estado y acciones.
  - Se ajustó el wrapping de texto y los mínimos de ancho para emails, especialidades, legajos y nombres, evitando cortes o columnas comprimidas.
- **Verificación:** `cd /home/emma/Desktop/vincula-up/frontend/vincula-up-web && npm run build` ejecutado tras el ajuste.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - ux: corregir listados admin responsive en mobile (sin ocultar contenido)
- **Objetivo:** Corregir que los listados de admin no sean responsivos y no se puedan leer en mobile quitando `display: none` en mobile y usando apilado de columnas en su lugar.
- **Cambios realizados:**
  - `admin-categories/admin-categories.css`: Reemplazó media queries que ocultaban contenido en móvil (`display: none`) por apilado en columna con etiquetas visibles; en desktop layout en fila con etiquetas ocultas.
  - `admin-clients/admin-clients.css`: Reemplazó media queries para apilar en móvil (1 columna en pantallas <900px, 1 columna en <480px) manteniendo etiquetas y contenido visible; en desktop layout en fila.
  - `admin-professionals/admin-professionals.css`: Reemplazó media queries para 2 columnas en tablet (<=1099px) y 1 columna en móvil chico (<=559px) con etiquetas visibles en móvil; contenido apilado verticalmente sin ocultarse.
- **Verificación:** `cd /home/emma/Desktop/vincula-up/frontend/vincula-up-web && npm run build` exitoso.
- **Especificación:** Sin cambios en rutas ni contratos de API.

### [2026-11-04] - ux: ajustar listados admin segun especificación mobile (sin overflow clip)
- **Objetivo:** Ajustar listados admin segun requerimiento: mobile sin recortes, filas especificaas, y en md mostrar todo en primera fila menos botón de acción.
- **Cambios realizados:**
  - `admin-categories/admin-categories.css`: Mobile: nombre categoria fila 1, botones accion fila 2 ocupando mitad cada uno. Tablet: nombre fila 1, botones fila 2 completas.
  - `admin-clients/admin-clients.css`: Mobile: fila 1 foto|nombre, fila 2 solicitudes|estado, fila 3 botón consultar. Tablet: todas las filas en primera fila, botón acción en segunda fila a la derecha.
  - `admin-professionals/admin-professionals.css`: Mobile: fila 1 foto|nombre, fila 2 email, fila 3 especialidades, fila 4 legajo, fila 5 botón acción full width. Tablet: todo en fila única, botón a la derecha.
- **Verificación:** `cd /home/emma/Desktop/vincula-up/frontend/vincula-up-web && npm run build` exitoso.
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

### [2026-10-21] - Fix: Keycloak no arrancaba por `description` de más de 255 caracteres en el import del realm
- **Objetivo:** Keycloak no levantaba: el puerto 8080 reiniciaba la conexión y el contenedor estaba en loop de reinicios. Partiendo de la rama correcta `dev`.
- **Diagnóstico:**
  - `docker compose logs keycloak` → `ERROR: value too long for type character varying(255)` sobre `update CLIENT set ... DESCRIPTION=(...)` del client `vincula-up-public`.
  - `journalctl -u docker` → `restartCount` creciendo y `exitCode=1` en cada ciclo: el import aborta la transacción completa y el servidor nunca termina de arrancar.
  - `information_schema.columns` sobre Postgres → `client.description` es `character varying(255)`.
  - El `description` de `vincula-up-public` en `keycloak/import/vincula-up-realm.json` tenía **377 caracteres**: el import entero moría por un solo campo de texto.
- **Cambios realizados:**
  - `keycloak/import/vincula-up-realm.json`: `description` de `vincula-up-public` acortada de 377 a **231** caracteres, conservando el sentido (PKCE S256, `https://*` para los túneles de Cloudflare y la nota de reemplazarlo en producción).
  - `keycloak/import/README.md`: nueva sección **"Límite de 255 caracteres en los textos"** con el error exacto, el síntoma (loop de reinicios) y la regla de dónde va la explicación larga.
  - `ESPECIFICACION.md` §8.6: nota sobre el techo de 255 caracteres en los textos del import.
  - `ESPECIFICACION.md` §16.1: nueva deuda **#7 "Textos del import sin control de longitud"** (el JSON no valida longitudes; cualquier texto nuevo >255 rompe el arranque igual). Renumerada la tabla de "Prioridad media" (7→8 … 12→13).
- **Verificación:**
  - Validación del JSON: ningún string supera 255 caracteres (`vincula-up-public` 231, `vincula-up-admin` 208).
  - `docker compose restart keycloak` → `Realm 'vincula-up' imported` → `Import finished successfully` → `Keycloak 26.3.3 ... started in 22.180s. Listening on: http://0.0.0.0:8080`.
  - `RestartCount=0` (antes crecía sin parar) y `Status=running`.
  - Realm y usuarios de demo presentes en Postgres: `cliente@`, `profesional@` y `admin@vincula-up.local` + `service-account-vincula-up-admin`.
  - `./scripts/linux-macos/keycloak-bootstrap.sh` → OK: aplica el secret real del `.env`, el SMTP, los `redirectUris` y el tema de correo.
  - Login por password contra `https://localhost` (por nginx): token OK, `iss=http://localhost:8080/realms/vincula-up`, `realm_access.roles=['CLIENTE']`; `client_credentials` del service account OK.
  - Token del profesional contra el BFF: `GET /api/usuarios/por-keycloak?keycloakId=...` → **HTTP 200** con `rolNegocio=PROFESIONAL`. Sin token → **HTTP 401** (el BFF valida).

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

### [2026-10-21] - feat: Alinear arquitectura con DACS (OpenFeign, OAuth2 Resource Server, puertos expuestos, sin pgAdmin)
- **Objetivo:** Acercar Vincula-up a la plantilla DACS: reemplazar RestClient por OpenFeign con `FeignAuthInterceptor` que reenvía el header `Authorization`; agregar `spring-boot-starter-oauth2-resource-server` con `SecurityConfig` y `JwtDecoder` en cada microservicio para que validen el JWT por su cuenta; exponer puertos de ms-* en `docker-compose` (ya no solo `127.0.0.1`); eliminar pgAdmin porque no es necesario.
- **Cambios realizados:**
  - `docker-compose.yml`: eliminado servicio `pgadmin` y volumen `pgadmin_data`; puertos de `ms-usuarios` (8081), `ms-profesionales` (8082), `ms-solicitudes` (8083) pasan de `127.0.0.1:PORT:PORT` a `PORT:PORT` (expuestos en toda la red); comentario del mapa de puertos actualizado.
  - `.env.example`: eliminadas variables `PGADMIN_DEFAULT_EMAIL`/`PGADMIN_DEFAULT_PASSWORD`; agregada `KEYCLOAK_JWK_SET_URI` para validación JWT en microservicios.
  - `backend/ms-usuarios/pom.xml`: agregada dependencia `spring-boot-starter-oauth2-resource-server`.
  - `backend/ms-profesionales/pom.xml`: agregada dependencia `spring-boot-starter-oauth2-resource-server`.
  - `backend/ms-solicitudes/pom.xml`: agregadas dependencias `spring-boot-starter-oauth2-resource-server` y `spring-cloud-starter-openfeign` + BOM `spring-cloud-dependencies 2025.0.0`.
  - `backend/bff-web/pom.xml`: agregada dependencia `spring-cloud-starter-openfeign` + BOM `spring-cloud-dependencies 2025.0.0`.
  - `backend/ms-usuarios/src/main/resources/application.properties`: agregados `spring.security.oauth2.resourceserver.jwt.issuer-uri` y `jwk-set-uri`.
  - `backend/ms-profesionales/src/main/resources/application.properties`: idem.
  - `backend/ms-solicitudes/src/main/resources/application.properties`: idem.
  - `backend/ms-usuarios/src/main/java/com/vinculaup/ms_usuarios/config/SecurityConfig.java`: NUEVO — OAuth2 Resource Server con `JwtDecoder` (Nimbus + JWK set URI), validador de issuer, conversor de roles desde claims de Keycloak, CORS.
  - `backend/ms-profesionales/src/main/java/com/vinculaup/ms_profesionales/config/SecurityConfig.java`: NUEVO — idem.
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/config/SecurityConfig.java`: NUEVO — idem.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/FeignAuthInterceptor.java`: NUEVO — `RequestInterceptor` de Feign que copia `Authorization` del `RequestContextHolder` al `RequestTemplate`.
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/client/FeignAuthInterceptor.java`: NUEVO — idem.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/UsuariosClient.java`: NUEVO — interfaz Feign para ms-usuarios (`JsonNode`).
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/ProfesionalesClient.java`: NUEVO — interfaz Feign para ms-profesionales (`JsonNode`).
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/SolicitudesClient.java`: NUEVO — interfaz Feign para ms-solicitudes (`JsonNode`) + mensajes, calificaciones, reputación.
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/client/ProfesionalesClient.java`: Reemplazado de clase `@Component` con `RestClient` a interfaz `@FeignClient` que delega a ms-profesionales.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/BffWebApplication.java`: agregada anotación `@EnableFeignClients`.
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/MsSolicitudesApplication.java`: agregada anotación `@EnableFeignClients`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/service/BackendGateway.java`: Reescrito para usar los clientes Feign (`UsuariosClient`, `ProfesionalesClient`, `SolicitudesClient`) en lugar de `RestClient`; manejo de errores vía `FeignException` → `ResponseStatusException`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/controller/ApiController.java`: línea 117, eliminado `.getBody()` de `gateway.obtenerMiPerfil(...)` (ahora devuelve `JsonNode` directamente).
  - `ESPECIFICACION.md`: tabla de puertos (quitada fila pgAdmin, ms-* expuestos en red interna), sección 13 (quitado pgAdmin, renumerada TLS a 13.1), línea 936 (ms-* validan JWT por su cuenta), índice actualizado.
- **Verificación:** No hay Maven ni Docker disponibles en este entorno para ejecutar `./mvnw clean compile` ni `docker compose build`. Se revisó manualmente la consistencia de imports, firmas de métodos y llamadas entre `BackendGateway`, clientes Feign y `ApiController`.

### [2026-10-28] - fix: corregir errores de compilación en bff-web y recuperar fix de Optional en ms-solicitudes
- **Objetivo:** Que `docker compose build` pase para `ms-solicitudes` y `bff-web`, que estaban fallando en la etapa `mvn -DskipTests package`.
- **Diagnóstico:**
  - `ms-solicitudes`: `ProfesionalesClient.java` usaba `Optional` sin importar `java.util.Optional` (error heredado de `dev`).
  - `bff-web`: 9 errores de compilación en `dev`: métodos `suspender`/`reactivar` duplicados en `UsuariosClient`, llamadas con argumentos incorrectos en `ApiController` (`activarProfesional`, `aceptarTerminos`, `actualizarDisponibilidad`, `geocodificar`), y lambdas `void` en `BackendGateway` (`ejecutarSinRespuesta`).
- **Cambios realizados:**
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/client/ProfesionalesClient.java`: agregado `import java.util.Optional;` (cherry-pick de rama `fix/ms-solicitudes-import-optional`).
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/UsuariosClient.java`: eliminado bloque duplicado de `suspender`/`reactivar`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/service/BackendGateway.java`: fix lambdas `() -> { ...; return null; }` en `eliminarEspecialidad`/`eliminarUsuario`; `aceptarTerminos(UUID, String)` crea `ObjectNode` internamente con `MAPPER`; agregado import `ObjectNode`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/controller/ApiController.java`: `activarProfesional` pasa `UUID` del usuario como primer argumento; `aceptarTerminos` pasa `version` como `String`; `actualizarDisponibilidad` convierte `JsonNode` a `List<JsonNode>`; `geocodificar` convierte `JsonNode` a `Map<String, Object>`.
- **Verificación:**
  - `./mvnw -DskipTests clean compile` en `backend/ms-solicitudes` → `BUILD SUCCESS` (37 archivos).
  - `./mvnw -DskipTests clean compile` en `backend/bff-web` → `BUILD SUCCESS` (14 archivos).
  - Commits en rama `fix/bff-web-compilacion`: `f0515f9` (ms-solicitudes) y `9f4c226` (bff-web).
  - `ESPECIFICACION.md`: no requiere cambios (no se alteran endpoints, contratos ni modelos).

---

### [2026-10-28] - fix: ms-solicitudes y bff-web no arrancan por SimpleDiscoveryClientAutoConfiguration incompatible con Spring Boot 4.1.1
- **Objetivo:** Que `docker compose up` levante `ms-solicitudes` y `bff-web` sin fallar al arrancar (Restarting/Error).
- **Diagnóstico:** Ambos servicios usan `spring-cloud-starter-openfeign` con `spring-cloud-dependencies 2025.0.0` sobre Spring Boot 4.1.1. Spring Cloud intenta cargar `SimpleDiscoveryClientAutoConfiguration`, que depende de `org.springframework.boot.autoconfigure.web.ServerProperties`, cuya clase no existe en Spring Boot 4.1.1 → `NoClassDefFoundError` → el contexto de Spring falla y el contenedor entra en loop de reinicios.
- **Cambios realizados:**
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/MsSolicitudesApplication.java`: agregado `exclude = { SimpleDiscoveryClientAutoConfiguration.class }` en `@SpringBootApplication`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/BffWebApplication.java`: idem.
  - Justificación: el proyecto no usa service discovery (Feign con URLs directas desde `application.properties`: `${profesionales.url}`, `${usuarios.url}`, `${solicitudes.url}`), por lo que el auto-config de discovery de Spring Cloud no es necesario.
- **Verificación:**
  - `./mvnw -DskipTests clean compile` en `backend/ms-solicitudes` → `BUILD SUCCESS`.
  - `./mvnw -DskipTests clean compile` en `backend/bff-web` → `BUILD SUCCESS`.
  - Commit `a8edc97` en rama `fix/bff-web-compilacion` (2 archivos, 6 inserciones, 4 eliminaciones).
  - `ESPECIFICACION.md`: no requiere cambios (no se alteran endpoints, contratos ni modelos).

---

### [2026-10-28] - fix: bajar spring-cloud-dependencies a 2024.0.0 compatible con Spring Boot 4.1.1
- **Objetivo:** Que `ms-solicitudes` y `bff-web` arranquen saludables en Docker sin `NoClassDefFoundError` ni fallos en `feignClientsConfiguration`.
- **Diagnóstico:** `spring-cloud-dependencies 2025.0.0` (Ilford) es incompatible con Spring Boot 4.1.1. Spring Cloud intenta cargar clases como `ServerProperties` y `SpringDataWebProperties` que no existen en Spring Boot 4.1.1, provocando `NoClassDefFoundError` y `BeanCreationException` en `feignClientsConfiguration`. Ambos servicios entran en loop de reinicios.
- **Cambios realizados:**
  - `backend/ms-solicitudes/pom.xml`: `spring-cloud-dependencies` de `2025.0.0` a `2024.0.0`.
  - `backend/bff-web/pom.xml`: idem.
  - Justificación: el proyecto no usa service discovery, solo Feign como cliente HTTP con URLs directas desde `application.properties`. Spring Cloud 2024.0.0 es compatible con Spring Boot 4.1.x.
- **Verificación:**
  - `./mvnw -DskipTests clean compile` en `backend/ms-solicitudes` → `BUILD SUCCESS`.
  - `./mvnw -DskipTests clean compile` en `backend/bff-web` → `BUILD SUCCESS`.
  - Commit `68e2d45` en rama `fix/spring-cloud-version` (2 archivos, 2 inserciones, 2 eliminaciones).
  - `ESPECIFICACION.md`: no requiere cambios (no se alteran endpoints, contratos ni modelos).

---

### [2026-10-28] - fix: configurar KEYCLOAK_HOSTNAME para resolver error de source map en login

- **Objetivo:** Resolver el error "Error de mapa de fuente: Error: request failed with status 404" que aparecía al intentar iniciar sesión, específicamente cuando el navegador intentaba cargar el mapa de fuentes (`patternfly.min.css.map`) de Keycloak.

- **Diagnóstico:** La variable de entorno `KEYCLOAK_HOSTNAME` estaba vacía en el archivo `.env`. Cuando no está configurada, Keycloak intenta resolver el hostname desde el request entrante, lo que genera URLs incorrectas para los recursos (incluyendo los source maps CSS). El error ocurría porque el navegador solicitaba `patternfly.min.css.map` en `https://vincula-up.local/resources/...` pero Keycloak generaba la URL con un hostname incorrecto o inexistente.

- **Cambios realizados:**
  - `.env`: Agregado `KEYCLOAK_HOSTNAME=vincula-up.local` (línea 9)

- **Justificación:** Con `KEYCLOAK_HOSTNAME` fijo en `vincula-up.local`, Keycloak genera URLs correctas para todos sus recursos estáticos incluidos los source maps. Esto es consistente con lo documentado en `ESPECIFICACION.md` (sección Keycloak, variable `KEYCLOAK_HOSTNAME` con valor `vincula-up.local`).

- **Verificación:**
  - Levantar el stack con `docker compose up --build`
  - Acceder a `https://vincula-up.local` e iniciar sesión
  - Verificar en las herramientas de desarrollo (Network) que las solicitudes a `patternfly.min.css.map` ya no retornan 404

### [2026-10-28] - refactor: reemplazar Spring Cloud OpenFeign por RestClient (Spring Boot 4.x compatible)
- **Objetivo:** Que `ms-solicitudes` y `bff-web` arranquen saludables en Docker sin `NoClassDefFoundError` ni fallos de compilación.
- **Diagnóstico:** `spring-cloud-starter-openfeign` con `spring-cloud-dependencies` (2024.0.0 o 2025.0.0) es incompatible con Spring Boot 4.1.1. Spring Cloud intenta cargar `ServerProperties`, `SpringDataWebProperties` y otras clases que no existen en Spring Boot 4.x, provocando `NoClassDefFoundError` y `BeanCreationException` en `feignClientsConfiguration`. Ambos servicios entraban en loop de reinicios.
- **Cambios realizados:**
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/client/ProfesionalesClient.java`: reemplazada interfaz `@FeignClient` por clase `@Component` con `RestClient` + `ClientHttpRequestFactory` personalizado para reenviar header `Authorization`.
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/client/FeignAuthInterceptor.java`: eliminado (no aplica a `RestClient`).
  - `backend/ms-solicitudes/src/main/java/com/vinculaup/ms_solicitudes/MsSolicitudesApplication.java`: eliminado `@EnableFeignClients` y `exclude(SimpleDiscoveryClientAutoConfiguration)`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/UsuariosClient.java`, `ProfesionalesClient.java`, `SolicitudesClient.java`: reemplazadas interfaces `@FeignClient` por clases `@Component` con `RestClient`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/FeignAuthInterceptor.java`: eliminado.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/BffWebApplication.java`: eliminado `@EnableFeignClients` y `exclude(SimpleDiscoveryClientAutoConfiguration)`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/service/BackendGateway.java`: `FeignException` → `RestClientException`/`HttpStatusCodeException`; `exception.status()` → `getStatusCode().value()`; `exception.contentUTF8()` → `getResponseBodyAsString()`.
  - `backend/ms-solicitudes/pom.xml`, `backend/bff-web/pom.xml`: eliminados `spring-cloud-starter-openfeign` y `spring-cloud-dependencies` (BOM).
- **Justificación:** el proyecto no usa service discovery, solo Feign como cliente HTTP con URLs directas desde `application.properties` (`${profesionales.url}`, `${usuarios.url}`, `${solicitudes.url}`). `RestClient` es nativo de Spring Boot 4.x y no requiere Spring Cloud.
- **Verificación:**
  - `./mvnw -DskipTests clean compile` en `backend/ms-solicitudes` → `BUILD SUCCESS` (36 archivos).
  - `./mvnw -DskipTests clean compile` en `backend/bff-web` → `BUILD SUCCESS` (13 archivos).
  - Commit `22c166e` en rama `dev` (15 archivos, 924 inserciones, 306 eliminaciones).
  - `ESPECIFICACION.md`: no requiere cambios (no se alteran endpoints, contratos ni modelos).

---

### [2026-10-29] - fix: corregir rutas downstream y parámetros nulos en RestClients del BFF

- **Objetivo:** Resolver los errores 404 (en `/api/usuarios/por-keycloak`, `/api/usuarios/yo`, `/api/solicitudes/panel`) y 400 (en `/api/profesionales?todos=true`, `/api/usuarios?rol=CLIENTE`) reportados al consumir el BFF desde el frontend.
- **Diagnóstico:**
  - Tras la migración de OpenFeign a RestClient en `bff-web`, los métodos de `UsuariosClient`, `ProfesionalesClient` y `SolicitudesClient` llamaban a rutas relativas sin el prefijo del controller de destino (por ejemplo, `/por-keycloak` en vez de `/usuarios/por-keycloak`, `/panel` en vez de `/solicitudes/panel`, o sin URI en `crear` llamando a la raíz del microservicio). Al recibir la petición, los microservicios downstream devolvían 404 Not Found, lo cual era propagado por `BackendGateway` al cliente.
  - Además, los métodos `listar` construían la URL mediante `uriBuilder.queryParam(param != null ? "param" : null, param)`. Al enviar parámetros opcionales nulos (como `estado == null` al consultar `todos=true`), `UriComponentsBuilder` lanzaba `IllegalArgumentException: Name must not be null`, que el `BffExceptionHandler` interceptaba y transformaba en HTTP 400 Bad Request.
- **Cambios realizados:**
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/UsuariosClient.java`: Se agregaron los prefijos `/usuarios` en todas las rutas del cliente y se condicionó la inclusión de query params (`rol`, `estado`, `email`, `nombre`, `apellido`) para evitar claves nulas.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/ProfesionalesClient.java`: Se agregaron los prefijos `/profesionales` en todas las rutas y se aseguró la ruta `/profesionales` en `crear` y condicionales en `listar`, `listarPorUsuarioIds` y `miPerfil`.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/SolicitudesClient.java`: Se agregaron los prefijos `/solicitudes` en las rutas (`/solicitudes/geocodificar`, `/solicitudes`, `/solicitudes/panel`, `/solicitudes/mias`, `/solicitudes/{id}/*`) y se aseguraron condicionales para query params opcionales en `listarPropias` y `listarMensajes`.
- **Verificación:**
  - `cd backend/bff-web && ./mvnw clean compile` → `BUILD SUCCESS`.
  - `cd backend/bff-web && ./mvnw test` → `BUILD SUCCESS`.
  - `cd frontend/vincula-up-web && npm run build` → `Application bundle generation complete` (0 errores).

---

### [2026-10-29] - fix: verificar términos antes de renderizar modal y agregar animación de inicio de sesión

- **Objetivo:** Evitar que el modal de aceptación de términos y condiciones parpadee o se renderice antes de verificar con el backend si el usuario ya los aceptó, incorporando una animación institucional para la verificación de credenciales de acceso y el inicio de sesión.
- **Diagnóstico:**
  - `AuthService.terminosPendientes` retornaba `true` cuando `!this.cuentaConsultada()`. Como resultado, al iniciar sesión o recargar la página, el modal aparecía inmediatamente durante unos milisegundos antes de que respondiera `GET /api/usuarios/yo`, cerrándose abruptamente si la cuenta ya los tenía aceptados.
  - Además, durante el procesamiento del callback de Keycloak (`?code=...&state=...`) y la verificación de la cuenta no existía una capa de carga que disimulara la espera y acompañara al usuario en las fases de "Verificando credenciales de acceso" e "Iniciando sesión".
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/core/services/auth.service.ts`:
    - Se ajustó `terminosPendientes` para retornar `false` mientras `!this.cuentaConsultada()`.
    - Se agregaron las señales reactivas `estadoAuth`, `cargandoAuth`, `mensajeCarga` y `detalleCarga`, junto con `iniciarCargaAuth` y `finalizarCargaAuth` (con tiempo mínimo de 450ms para transiciones visuales suaves).
    - Se integraron los estados de carga en el callback de Keycloak (`handleCodeCallback`), en la restauración de sesión al inicializar la app y en `loginDirect`.
    - Se aseguró que `loadOwnPhoto()` siempre resuelva `cuentaConsultada` y finalice la carga de autenticación en `finalize`.
  - `frontend/vincula-up-web/src/app/shared/auth-loading/auth-loading.ts` / `.html` / `.css`: Nuevo componente Standalone que despliega una capa a pantalla completa con el isotipo de Vincula-UP pulsante, un spinner circular acorde a la paleta institucional (`--coral`, `--line`, `--paper`, `--surface-card`) y los mensajes de estado contextuales.
  - `frontend/vincula-up-web/src/app/app.ts` y `app.html`: Se registró y montó `<app-auth-loading />` en el layout raíz de la aplicación.
  - `ESPECIFICACION.md` (§8.5): Se actualizó la sección de aceptación de términos para documentar la verificación previa disimulada con la animación de inicio de sesión.
- **Verificación:**
  - `cd frontend/vincula-up-web && npm run build` → `Application bundle generation complete` (0 errores).

---

### [2026-10-29] - fix: corregir detección de ubicación con fallback ante ausencia de hardware GPS

- **Objetivo:** Resolver el error al pulsar "Mi ubicación" en el formulario de solicitud (`request.ts`) y en la activación de perfil profesional (`activation.ts`), donde tras conceder permisos de geolocalización el navegador no detectaba la posición y mostraba "No pudimos detectar tu ubicación. Escribí la dirección manualmente o usá el mapa.".
- **Diagnóstico:**
  - `navigator.geolocation.getCurrentPosition` forzaba `enableHighAccuracy: true` con timeouts de 8-10s. En computadoras de escritorio (Linux, PC de escritorio, etc.) que carecen de chip de hardware GPS satelital, los navegadores (Chromium / Firefox) fallan de inmediato con `POSITION_UNAVAILABLE` (código 2) o agotan el tiempo con `TIMEOUT` (código 3).
  - El callback de error no realizaba reintento con baja precisión (`enableHighAccuracy: false`), ni disponía de mecanismo de fallback cuando el entorno del usuario carece de proveedores de ubicación basados en Wi-Fi o GPS.
  - Además, la geocodificación inversa en `request.ts` llamaba a Nominatim directamente con `fetch`, lo cual en navegadores puede bloquearse por ausencia de header `User-Agent` o CORS, en lugar de utilizar el cliente backend (`GET /api/gps`).
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/request/request.ts`:
    - Se configuró la detección de ubicación con `enableHighAccuracy: false` y caché (`maximumAge: 300000`) como primer intento rápido para desktops y redes.
    - Se implementó un flujo resiliente de fallback: ante `POSITION_UNAVAILABLE` o `TIMEOUT`, se intenta geolocalización IP aproximada y, de persistir, se fija de forma asistida en la zona base de la Universidad Popular (Concepción del Uruguay: `-32.4844, -58.2328`), permitiendo al usuario mover el pin o escribir su calle sin bloquear el flujo.
    - Si el permiso fue denegado explícitamente (`PERMISSION_DENIED`, código 1), se muestra un mensaje informativo específico.
    - Se actualizó `reverseGeocode` para consultar prioritariamente el endpoint `/api/gps` del backend (`ApiService.getGpsPosition`).
  - `frontend/vincula-up-web/src/app/activation/activation.ts`:
    - Se replicó la misma estrategia de doble paso (`enableHighAccuracy: false` inicial, reintento controlado y fallback asistido a Concepción del Uruguay) en `detectCurrentLocation`.
- **Verificación:**
  - `cd frontend/vincula-up-web && npm run build` → `Application bundle generation complete` (0 errores).




---

### [2026-10-29] - fix: soporte de método PATCH en clientes REST del BFF hacia ms-usuarios

- **Objetivo:** Corregir el error `I/O error on PATCH request for "http://ms-usuarios:8081/usuarios/{id}/terminos": Invalid HTTP method: PATCH` que rompía `PATCH /api/terminos/aceptar` (aceptación de términos) y el resto de peticiones PATCH del BFF hacia `ms-usuarios`.
- **Diagnóstico:** `HttpURLConnection` (usado por `SimpleClientHttpRequestFactory`) rechaza PATCH en este JDK 21 con `java.net.ProtocolException: Invalid HTTP method: PATCH`. Se reprodujo empíricamente. El parche previo en `UsuariosClient.java` (`method = HttpMethod.valueOf("PATCH")`) era un no-op que no corregía nada.
- **Cambios realizados:**
  - NUEVO `backend/bff-web/src/main/java/com/vinculaup/bff_web/config/JdkHttpClientRequestFactory.java`: `ClientHttpRequestFactory` basada en `java.net.http.HttpClient` (JDK 21) que soporta cualquier método HTTP, incluido PATCH, sin dependencias nuevas, y reenvía el encabezado `Authorization` (JWT de Keycloak) de la petición entrante.
  - `backend/bff-web/src/main/java/com/vinculaup/bff_web/client/UsuariosClient.java`, `ProfesionalesClient.java`, `SolicitudesClient.java`: se inyecta `JdkHttpClientRequestFactory` en el constructor en lugar de construir un `SimpleClientHttpRequestFactory` con el parche no-op.
- **Verificación:**
  - `cd backend/bff-web && ./mvnw -o clean compile` → `BUILD SUCCESS` (14 archivos compilados).
  - Commit `a62f3e6` en rama `fix/bff-patch-http-method-ms-usuarios` (4 archivos, solo el fix; los cambios previos de `frontend/`, `nginx/` y `package.json` quedan sin commitear al no pertenecer a esta tarea).
- **Nota:** `ESPECIFICACION.md` no requiere cambios porque el fix es de implementación interna y no altera rutas, contratos de API, modelos de datos, flujos de autenticación ni variables de entorno.

### [2026-10-29] - feat: mapas de solicitudes recibidas en modo oscuro
- **Objetivo:** Que los mapas de solicitudes recibidas (vista del profesional en `my-requests`) cambien a modo oscuro cuando la página lo hace, evitando el rectángulo blanco brillante del iframe embebido de OpenStreetMap sobre pantalla oscura.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/my-requests/my-requests.css`:
    - `.req-card__map`: fondo `var(--surface-tint)` (token que invierte con el tema).
    - `.embedded-map`: `display: block`.
    - `:host-context([data-tema='oscuro']) .req-card__map`: fondo y borde (`var(--line-strong)`) ajustados para oscuro.
    - `:host-context([data-tema='oscuro']) .embedded-map`: filtro `invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.75)`, igual que las tiles reales de Leaflet en `styles.css`, para que el iframe de OSM se vea oscuro con la app.
    - El dibujo CSS alternativo (`.vu-map`) ya usaba tokens de tema (`--surface-tint`, `--line-strong`, `--on-accent`, `--deco-line`) definidos en `styles.css` (global, sin encapsulamiento), por lo que no requería cambios.
- **Verificación:** `npm run build` en `frontend/vincula-up-web` → `Application bundle generation complete` sin errores. Se confirmó que Angular transforma `:host-context([data-tema='oscuro'])` en `[data-tema="oscuro"] [_nghost] .embedded-map[_ngcontent]`, que sí alcanza al `<html>` donde vive `data-tema`.
- **Nota:** `ESPECIFICACION.md` no requiere cambios porque el ajuste es solo de presentación (CSS) y no altera rutas, contratos de API, modelos de datos, flujos de autenticación ni variables de entorno.

### [2026-10-29] - fix: encapsulamiento de Angular en filtros de modo oscuro de mapas
- **Diagnóstico:** El selector `[data-tema='oscuro'] .embedded-map` dentro del CSS de componente `my-requests.css` nunca coincidía. Angular (ViewEncapsulation `Emulated`) añade `_ngcontent` a los elementos del template, mientras que `data-tema` vive en `<html>` (fuera del componente). Por eso el filtro de inversión del iframe de OpenStreetMap no se aplicaba y el mapa seguía blanco en modo oscuro.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/my-requests/my-requests.css`: se reemplazó `[data-tema='oscuro']` por `:host-context([data-tema='oscuro'])` en las reglas de modo oscuro de `.req-card__map` y `.embedded-map`, permitiendo que el selector suba desde `<html>` hasta el host del componente y luego al iframe.
- **Verificación:** `npm run build` → OK. En el bundle compilado se confirma la regla `[data-tema="oscuro"] [_nghost-%COMP%] .embedded-map[_ngcontent-%COMP%]{filter:invert(1)...}`.


### [2026-10-29] - feat: spinner de carga para mapas, ubicación y cierre de sesión
- **Objetivo:** Agregar animaciones/spinners de carga en tres puntos: (1) al cerrar sesión, (2) al cargar los mapas (iframe de OSM en `my-requests` y Leaflet en `request`), y (3) al detectar/ingresar la ubicación en el formulario de solicitud.
- **Cambios realizados:**
  - NUEVO `frontend/vincula-up-web/src/app/shared/spinner/spinner.ts` + `spinner.css`: componente `VuSpinner` standalone, reutilizable, con `prefers-reduced-motion` y tokens de tema (`--ink`).
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.ts` + `navbar.html`:
    - Signal `cerrandoSesion` activado en `confirmarCierreDeSesion()` antes de `auth.logout()`.
    - Botón de cierre de sesión: muestra `<vu-spinner size="sm">` mientras `cerrandoSesion()`, y se deshabilita.
  - `frontend/vincula-up-web/src/app/request/request.ts` + `request.html` + `request.css`:
    - El texto "Cargando el mapa…" (`step-map__hint`) se reemplazó por `<vu-spinner>` centrado en un contenedor flex (`.step-map__hint--cargando`).
    - El botón "Mi ubicación" muestra `<vu-spinner>` cuando `detectingGps()`, y se deshabilita.
    - Se agregó `.location-field__gps-loading` con `<vu-spinner>` cuando `gpsLoading()` (verificación de dirección por texto).
  - `frontend/vincula-up-web/src/app/my-requests/my-requests.ts` + `my-requests.html` + `my-requests.css`:
    - Signal `mapaCargando` activado en `embeddedMapUrl()` y desactivado en `onMapaLoad()` (evento `(load)` del iframe).
    - Overlay absoluto `.mapa-embed__spinner` con `<vu-spinner size="md">` y texto "Cargando mapa…" sobre el iframe, visible mientras `mapaCargando()`.
    - `.mapa-embed-container` con `position: relative` para anclar el overlay.
- **Verificación:** `npm run build` → `Application bundle generation complete` sin errores de TypeScript ni de plantillas.

### [2026-10-29] - fix: evitar ciclo NG0600 moviendo mapaCargando a effect
- **Diagnóstico:** Activar `this.mapaCargando.set(true)` dentro de `embeddedMapUrl()` (un método llamado desde `@if` en el template en cada detección de cambios) provocó un **ciclo de detección infinito** (NG0600) en `my-requests`, bloqueando la página.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/my-requests/my-requests.ts`:
    - Se eliminó `this.mapaCargando.set(true)` de `embeddedMapUrl()`.
    - Se agregó un `effect` (`_mapaLoadEffect`) que activa `mapaCargando` observando `filteredRequests()` y `isProfessional()`: se dispara asíncronamente después de la detección, sin crear ciclo.
    - Importado `effect` desde `@angular/core`.
- **Verificación:** `npm run build` → `Application bundle generation complete` sin errores.

### [2026-10-30] - fix: cachear SafeResourceUrl para evitar ciclo NG0600
- **Diagnóstico:** Aun con el `effect`, el `@if (embeddedMapUrl(request); as mapUrl)` sigue llamando al método en cada detección de cambios. Aunque el `effect` no activa signals constantemente, `bypassSecurityTrustResourceUrl()` crea un **nuevo `SafeResourceUrl`** en cada llamada (aunque el string interno sea idéntico), lo que hace que Angular vea un "cambio" en `[src]` del iframe → dispara más detección → ciclo NG0600.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/my-requests/my-requests.ts`: `embeddedMapUrl()` ahora cachea el `SafeResourceUrl` en un `Map` (`_urlCache`) usando `lat,lng` como clave, retornando siempre el mismo objeto para las mismas coordenadas. El `@if` y `[src]` del iframe ya no ven cambios falsos.
- **Verificación:** `npm run build` → `Application bundle generation complete`. El cache (`_urlCache`) está presente en el bundle (`chunk-3sA7-ta_.js`).
- **Nota:** `ESPECIFICACION.md` no requiere cambios (presentación/CSS).

### [2026-10-30] - feat: intercambio de estilos de ingresar/crear cuenta en navbar
- **Objetivo:** Que "Ingresar" sea el botón primario (`vu-btn--ink`) y "Crear cuenta" el enlace secundario (`.auth-action--link`), invirtiendo el orden anterior.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.html`:
    - "Crear cuenta": `<a>` con `auth.registerWithKeycloak()` y clase `auth-action--link` (enlace secundario).
    - "Ingresar": `<button>` con `auth.loginWithKeycloak()` y clases `vu-btn vu-btn--ink auth-action--cta` (botón primario).
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.css`:
    - Eliminada la regla `@media (max-width: 479px) { .auth-action--link { display: none } }` que ocultaba "Crear cuenta" en móvil. Ahora "Crear cuenta" es visible en todos los tamaños.
    - `.auth-action--cta` (botón "Ingresar") permanece oculto en mobile (≤1024px) porque en mobile "Ingresar" viene del `tabbar` (barra inferior).
    - Eliminada la clase `.auth-action--desktop` sin usar.
- **Verificación:** `npm run build` → `Application bundle generation complete` sin errores. 2 files changed, 9 insertions(+), 28 deletions(-).
- **Nota:** `ESPECIFICACION.md` no requiere cambios (presentación/CSS).
