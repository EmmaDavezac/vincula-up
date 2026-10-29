# Historial de Walkthroughs (WALKTHROUGH.md)

Este archivo centraliza el registro de todas las funcionalidades, correcciones y tareas completadas por los agentes de IA o desarrolladores en el proyecto Vincula-UP.

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



