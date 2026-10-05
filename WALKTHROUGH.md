# Historial de Walkthroughs (WALKTHROUGH.md)

Este archivo centraliza el registro de todas las funcionalidades, correcciones y tareas completadas por los agentes de IA o desarrolladores en el proyecto Vincula-UP.

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

### [2026-10-04] - Personalización estética del login de Keycloak con la marca de Vincula-UP
- **Objetivo:** Que las pantallas de acceso de Keycloak (ingreso, registro, recuperación de contraseña, verificación de correo, cambio de clave y logout) se vean con la misma estética que la aplicación Angular: la paleta, la tipografía y los textos con voseo en lugar de los de fábrica.
- **Cambios realizados:**
  - Se creó el tipo `login` del tema `vincula-up` (el mismo nombre que el del correo, que ya existía), en `keycloak/themes/vincula-up/login/`:
    - `theme.properties`: `parent=keycloak.v2` (el tema de fábrica de Keycloak 26.3.3) e `import=common/keycloak`, con `styles=css/styles.css css/vincula-up.css` encadenados porque esa propiedad NO se acumula entre padre e hijo.
    - `template.ftl`: copia literal de `theme/keycloak.v2/login/template.ftl` de Keycloak 26.3.3 con solo tres cambios: el `<title>` ("Vincula-UP · Ingresá a tu cuenta"), el favicon en SVG y el `<header>` con la marca (el cuadro coral con la V, el nombre y el subtítulo "Red técnica con respaldo universitario").
    - `footer.ftl`: pie institucional con la cadena de la Universidad Popular, el contacto (`realm.attributes.vinculaUpContacto`) y el enlace a la app (`properties.vinculaUpAppUrl`).
    - `messages/messages_es.properties`: solo las claves cuya redacción cambia ("Ingresar", "¿Olvidaste tu contraseña?", "¿Todavía no tenés cuenta?", "Registrate", "Correo electrónico", avisos de error); el resto lo resuelve el bundle de `base` de Keycloak, así que una traducción nueva de Keycloak no queda congelada en una copia.
    - `resources/css/vincula-up.css`: los tokens de `src/styles.css` copiados con prefijo `--vu-` y el nombre del token de origen al lado, más los ajustes de fondo, tarjeta, campos, botones, alertas y pie, en claro y en `.pf-v5-theme-dark`.
    - `resources/img/favicon.svg`: la misma geometría que `frontend/vincula-up-web/public/favicon.svg`.
  - Activación: `"loginTheme": "vincula-up"` en `keycloak/import/vincula-up-realm.json`, y `kcadm update realms/$REALM -s loginTheme=vincula-up -s attributes.vinculaUpContacto=$KEYCLOAK_CONTACTO` en `scripts/linux-macos/keycloak-bootstrap.sh` y `scripts/windows/keycloak-bootstrap.ps1` (con la variable `$keycloakContacto` nueva en el `.ps1`). Se aplica por el bootstrap y no solo por el import porque el import del realm solo corre la primera vez que se crea.
  - Se corrigieron tres restos del CSS de fábrica que se veían en pantalla: el borde inferior de `.pf-v5-c-form__helper-text` (una raya gris atravesando el formulario), el anillo de foco que PatternFly dibuja con un pseudo-elemento `::after` y no con `box-shadow` (por eso el campo enfocado conservaba una línea azul al pie aunque el borde ya quedara coral) y el segundo borde del `<input>` interno del campo.
  - Se corrigió un HTTP 500 en todas las pantallas de acceso: la primera versión del pie usaba `${url.realmUri}`, que no existe en el contexto de las plantillas del login de Keycloak 26 (`InvalidReferenceException`). La URL pública viene de `theme.properties`.
  - Documentación en `ESPECIFICACION.md` (§8.6 y una subsección nueva junto a la del tema de correo) con el árbol de archivos, las decisiones de diseño, las trampas de PatternFly y el costo de mantener `template.ftl` al actualizar Keycloak.
- **Verificación:**
  - `docker compose restart keycloak` + `keycloak-bootstrap.sh`: el realm queda con `loginTheme=vincula-up` y `vinculaUpContacto=vinculaup@gmail.com`.
  - Login, recuperación de contraseña y registro renderizan con la marca, el pie y `css/vincula-up.css`; los recursos CSS y el favicon responden 200.
  - Login real end-to-end con `cliente@vincula-up.local` / `password`: HTTP 302 con código de autorización de vuelta a la app.
  - Capturas headless de Chromium de la pantalla en claro y en `prefers-color-scheme: dark`.
  - Chequeo estático del CSS: llaves balanceadas, ninguna variable `var(--vu-*)` sin definir y sin usar, y los 8 colores coinciden exactamente con los de `src/styles.css`.
  - `bash -n scripts/linux-macos/keycloak-bootstrap.sh` y JSON del realm válido.
  - **Nota:** no se ejecutó `npm run build` porque la tarea no toca el frontend Angular.
