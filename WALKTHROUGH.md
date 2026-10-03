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
