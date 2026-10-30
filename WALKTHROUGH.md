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


### [2026-10-30] - feat: login y crear cuenta reutilizan navbar y footer de la landing
- **Objetivo:** Que la pantalla de acceso (/ingresar) reutilice el header y footer de la landing, y que el enlace "Registrate" dispare el registro de Keycloak sin duplicar las acciones de autenticación del navbar.
- **Cambios realizados:**
  - `frontend/vincula-up-web/src/app/sign-in/sign-in.html`: el enlace "Registrate" ahora llama a `registrarse()` en lugar de `routerLink="/ingresar"` (evitaba redirección circular a la misma pantalla de login).
  - `frontend/vincula-up-web/src/app/sign-in/sign-in.ts`: nuevo método `registrarse()` que invoca `auth.registerWithKeycloak()`.
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.ts`: computed `enLogin` que detecta si la ruta actual es `/ingresar`.
  - `frontend/vincula-up-web/src/app/shared/navbar/navbar.html`: se ocultan las acciones "Ingresar" y "Crear cuenta" del navbar cuando `enLogin()` es true, para no duplicar lo que ya muestra la vista de login.
- **Verificación:** `npm run build` compila limpiamente; `app.html` sigue inyectando `<app-navbar />` y `<app-footer />` alrededor de `<router-outlet />` para todas las rutas incluidas `/ingresar`.
- **Especificación:** `ESPECIFICACION.md` no requiere cambios (ajuste de presentación/CSS sin modificar rutas, contratos de API ni flujos de autenticación).


### [2026-10-30] - fix: restaurar tema de login de Keycloak y activar loginTheme
- **Objetivo:** Que las pantallas de acceso de Keycloak (login, registro, recuperación de contraseña) usen el tema `vincula-up` en lugar del tema por defecto (que causaba 404 de `patternfly.min.css` y estética de fábrica).
- **Causa:** El directorio `keycloak/themes/vincula-up/login/` existía en la rama `feat/autodeteccion-ubicacion-y-debounce-direccion` pero nunca se mergeó a `dev`, por eso `dev` carecía del tema de login y el realm usaba el de fábrica.
- **Cambios realizados:**
  - Restaurado `keycloak/themes/vincula-up/login/` desde el historial (plantillas `.ftl`, `resources/css/vincula-up.css`, `resources/img/favicon.svg`, `messages/messages_es.properties`, `theme.properties`).
  - `scripts/linux-macos/keycloak-bootstrap.sh`: agregado `kcadm update realms/$REALM -s "loginTheme=vincula-up"` (al igual que `emailTheme`, el import del realm solo corre la primera vez, así que se aplica por este script).
  - `docker-compose.yml` ya monta `./keycloak/themes/vincula-up → /opt/keycloak/themes/vincula-up:ro`, por lo que los archivos restaurados se ven en el contenedor sin tocar el compose.
- **Verificación:** `npm run build` compila limpiamente. Para aplicar el tema en un entorno ya levantado: `./scripts/linux-macos/keycloak-bootstrap.sh` + `docker compose restart keycloak`.
- **Especificación:** `ESPECIFICACION.md` §17/Anexo C ya documenta el tema de acceso; no requiere cambios.
