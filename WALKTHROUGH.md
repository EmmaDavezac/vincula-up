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
