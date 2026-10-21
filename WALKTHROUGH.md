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
