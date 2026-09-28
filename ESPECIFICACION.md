# Especificación Técnica — Vincula-UP

> **Documento único de referencia del proyecto.** Reemplaza a la documentación
> dispersa que existía antes (`mvp-gaps.md`, `README-auth-real.md`,
> `LOCAL-DEVELOPMENT.md` y `docs/ESPECIFICACION_PROTOTIPO_VISUAL_FIGMA.md`).
> Si algo no está aquí, no está documentado.
>
> El [`README.md`](README.md) tiene el resumen operativo: qué es, cómo se
> deploya, credenciales y funcionalidades. Este archivo tiene el detalle completo.

**Proyecto:** Vincula-UP — Red Técnica con Respaldo Universitario (Universidad Popular de Concepción del Uruguay)
**Alcance:** MVP (Minimum Viable Product)
**Última actualización:** 2026-09-28

---

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Roles del MVP](#2-roles-del-mvp)
3. [Arquitectura](#3-arquitectura)
4. [Stack y versiones](#4-stack-y-versiones)
5. [Estructura del repositorio](#5-estructura-del-repositorio)
6. [API del BFF: los 40 endpoints](#6-api-del-bff-los-40-endpoints)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Autenticación y autorización](#8-autenticación-y-autorización)
9. [Los tres flujos completos](#9-los-tres-flujos-completos)
10. [Geolocalización](#10-geolocalización)
11. [Variables de entorno](#11-variables-de-entorno)
12. [Datos de arranque](#12-datos-de-arranque)
13. [Infraestructura: pgAdmin, TLS, Nginx](#13-infraestructura-pgadmin-tls-nginx)
14. [Scripts operativos](#14-scripts-operativos)
15. [Estado real del MVP](#15-estado-real-del-mvp)
16. [Deuda técnica conocida](#16-deuda-técnica-conocida)
17. [Diseño visual](#17-diseño-visual)

---

## 1. Contexto y objetivos

Vincula-UP conecta a la comunidad con profesionales de oficios técnicos validados
(electricidad, plomería, gas, refrigeración, etc.), con respaldo institucional de
la Universidad Popular. Permite resolver servicios técnicos de proximidad mediante
un flujo transparente de solicitud, coordinación y calificación.

El producto se organiza alrededor de un único flujo de negocio —**pedir un turno y
que alguien lo cumpla**— con tres actores que participan de forma distinta en el
mismo ciclo de vida de la solicitud.

### Objetivo del MVP

Demostrar que el circuito completo funciona de punta a punta con datos reales y
autenticación real: el cliente pide un turno, el profesional lo acepta o rechaza
con motivo, ambos coordinan por chat, el trabajo se completa y el cliente califica.
Sin usuarios simulados ni autenticación falsa.

---

## 2. Roles del MVP

| Rol | Qué hace | Pantalla principal |
|---|---|---|
| **Cliente / Vecino** | Busca oficios, define su ubicación geográfica, solicita turno, chatea para coordinar y califica el servicio finalizado | `/solicitar` → `/solicitudes` |
| **Profesional Técnico** | Completa su activación (foto, radio de cobertura, horarios semanales), gestiona solicitudes (acepta/rechaza con motivo), coordina por chat | `/activar-perfil` → `/solicitudes` |
| **Administrador Institucional** | Da de alta profesionales al padrón con legajo y especialidades, monitorea el estado (Cargado, Activo, Suspendido), suspende y reactiva cuentas | `/admin` |

Los roles son **roles de negocio**, no roles de Keycloak. Viven en
`ms-usuarios` (`Usuario.rolNegocio`) y se replican como roles de realm en
Keycloak. La correspondencia no es 1:1 en una sola dirección: un profesional
invitado por el administrador se auto-registra en Keycloak y nace ahí con rol
`CLIENTE`; el BFF lo promueve a `PROFESIONAL` en su primer login
(ver [§8.4](#84-promoción-de-rol-del-profesional-invitado)).

### Estados de una cuenta

| Estado | Significado |
|---|---|
| `CARGADO` | Preregistrado por el administrador; todavía no completó la activación |
| `ACTIVO` | Habilitado para operar |
| `SUSPENDIDO` | Sancionado por incumplimiento de normas; no puede operar |
| `INACTIVO` | Cliente baneado (aplica a `ms-usuarios`) |

Una cuenta `SUSPENDIDO` no puede ejecutar **ninguna** operación autenticada: el
BFF lo corta en `requireActive()` antes de llegar a cualquier endpoint de negocio
(`ApiController.java:70-74`).


---

## 3. Arquitectura

```
                    https://vincula-up.local          http://localhost
                              │                            │
                    ┌─────────▼────────────────────────────▼─────────┐
                    │                   Nginx 1.27                    │
                    │  TLS · reverse proxy · SPA fallback · buffers │
                    └──┬──────────────┬───────────────┬─────────────┘
                       │ /            │ /api/         │ /realms/
                       │              │               │ /login-actions/
                       │              │               │ /resources/
                       │              │               │ /js/
              ┌────────▼───────┐ ┌────▼────────┐ ┌───▼─────────────┐
              │ Angular 22 SPA │ │  BFF :9001  │ │  Keycloak :8080 │
              │   estático     │ │  Spring     │ │  OIDC + PKCE    │
              └────────────────┘ └────┬────────┘ └─────────────────┘
                                       │  JWT/JWKS
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
 ┌──────▼────────┐            ┌────────▼────────┐            ┌────────▼────────┐
 │ ms-usuarios   │            │ ms-profesionales│            │ ms-solicitudes  │
 │    :8081      │            │     :8082       │            │     :8083       │
 └──────┬────────┘            └────────┬────────┘            └────────┬────────┘
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                              ┌────────▼────────┐
                              │  PostgreSQL 16  │
                              │   :5432        │
                              └─────────────────┘
```

### El BFF y por qué existe

El frontend Angular **nunca** habla directo con los microservicios. Todo pasa por
el BFF (`backend/bff-web`), que cumple cuatro funciones:

1. **Agregación.** El listado de profesionales devuelve solo `usuarioId` (el
   nombre y apellido viven en `ms-usuarios`). El BFF los pega en cada tarjeta
   con `enriquecerConUsuarios()` (`ApiController.java:160`), en una sola pasada
   indexada por UUID para no hacer una llamada por tarjeta.
2. **Autorización.** Valida el JWT contra el JWKS de Keycloak y aplica el RBAC.
   Los microservicios no exponen autenticación propia y por eso no se publican
   fuera de `127.0.0.1`.
3. **Identidad.** La identidad del actor se toma **siempre del token**, nunca
   del body de la petición. `actorIdentityBody()` (`ApiController.java:133-143`)
   inyecta el `subject` de Keycloak y sobrescribe cualquier id que venga del
   cliente. Esto evita que un usuario actúe en nombre de otro.
4. **Tolerancia a fallos.** Si `ms-usuarios` no responde, el listado se entrega
   igual sin datos personales en vez de tumbar la consulta. Si `ms-solicitudes`
   no responde, se entrega sin estrellas. La reputación es un dato adicional,
   nunca una condición para ver el padrón.

### Puertos

| Servicio | Puerto | Expuesto en el host |
|---|---:|---|
| `nginx` | 80 / 443 | Sí (todas las interfaces) |
| `keycloak` | 8080 | Sí |
| `postgres` | 5432 | Sí |
| `pgadmin` | 5050 | Sí |
| `bff-web` | 9001 | Sí |
| `ms-usuarios` | 8081 | Solo `127.0.0.1` |
| `ms-profesionales` | 8082 | Solo `127.0.0.1` |
| `ms-solicitudes` | 8083 | Solo `127.0.0.1` |

Los tres microservicios de dominio se publican únicamente en `127.0.0.1` a
propósito: no implementan autenticación propia, así que no deben quedar
alcanzables desde la red. Toda entrada del exterior pasa por nginx → BFF.

### Puertos entre servicios (red interna de Docker)

```
bff-web        → ms-usuarios:8081, ms-profesionales:8082, ms-solicitudes:8083
ms-solicitudes → ms-profesionales:8082   (valida disponibilidad al crear)
```

---

## 4. Stack y versiones

### Backend

| Componente | Versión |
|---|---|
| Java | 21 (Temurin) |
| Spring Boot | 4.1.1 |
| Spring Security | 4.1.1 (OAuth2 Resource Server) |
| Jackson | 4.x — se importa como `tools.jackson.*` (paquete nuevo) |
| JPA / Hibernate | 7.4.5.Final |
| Base de datos | PostgreSQL 16 (producción) · H2 en memoria (tests y dev local) |

Cada microservicio es un proyecto Maven independiente con su propio `mvnw`
(wrapper). **No hay reactor raíz**: se compilan por separado.

### Frontend

| Componente | Versión |
|---|---|
| Angular | 22.1.x |
| Angular Material / CDK | 22.1.7 |
| TypeScript | ~6.0.2 |
| Zone.js | ~0.16.0 |
| Vitest | ^4.0.8 |
| Gestor de paquetes | npm 11.19.0 |

Angular 22 usa el builder `@angular/build:application` y **signals** en lugar de
RxJS para el estado de los componentes. El testing corre sobre
`@angular/build:unit-test` (Vitest + jsdom).

### Infraestructura

| Componente | Versión |
|---|---|
| Keycloak | 26.3.3 (modo `start-dev`) |
| PostgreSQL | 16 |
| Nginx | 1.27-alpine |
| pgAdmin | 8.12 |
| Node (build del front) | 22-alpine (multi-stage en `nginx/Dockerfile`) |

---

## 5. Estructura del repositorio

```
.
├── README.md                      Resumen operativo (deploy, credenciales, uso)
├── ESPECIFICACION.md              Este documento
├── docker-compose.yml             Orquestación de los 8 servicios
├── .env                           Variables reales (NO versionado)
├── .env.example                   Plantilla de variables (versionado)
│
├── backend/
│   ├── bff-web/                   :9001  Gateway, RBAC, agregación
│   ├── ms-usuarios/               :8081  Identidades y roles de negocio
│   ├── ms-profesionales/          :8082  Padrón, especialidades, disponibilidad
│   └── ms-solicitudes/            :8083  Ciclo de vida, chat, calificaciones
│
├── frontend/vincula-up-web/       SPA Angular
│   └── src/app/
│       ├── core/                  Services, guards, models, utils
│       ├── shared/                Navbar, tabbar, footer, avatar, icon, confirm
│       ├── home/ directory/ request/ my-requests/    Flujo del cliente
│       ├── activation/ account/                        Flujo del profesional
│       └── admin/                  Shell + 4 pantallas de administración
│
├── keycloak/import/               Realm `vincula-up` (JSON de importación)
├── nginx/                         Config + certificados TLS
└── scripts/                       Bootstrap, smoke test, CA, start local
```

> **Nota sobre el prototipo.** La maqueta original de diseño se construyó en
> [v0](https://v0.app) (Next.js) y sigue desplegada en
> **https://v0-vincula-up.vercel.app/**. El código fuente de ese prototipo se
> eliminó del repositorio al consolidarse la documentación; la aplicación real
> es la SPA Angular de `frontend/vincula-up-web`.

---

## 6. API del BFF: los 40 endpoints

Todos cuelgan de `/api`. El BFF expone 40 operaciones agrupadas en siete
familias. La columna **Rol** refleja la regla real de `SecurityConfig.java`;
`—` significa público.

### 6.1 Profesionales

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/profesionales` | — | Listado público del padrón. Acepta `estado` y `todos` |
| GET | `/api/profesionales/{id}` | Autenticado | Ficha de un profesional |
| GET | `/api/profesionales/mi-perfil` | PROFESIONAL | Perfil propio |
| POST | `/api/profesionales` | ADMIN | Alta de profesional |
| POST | `/api/profesionales/alta` | ADMIN | Alta en un paso: usuario invitado + perfil pendiente |
| PUT | `/api/profesionales/{id}` | ADMIN | Edición del padrón |
| PATCH | `/api/profesionales/{id}/suspender` | ADMIN | Baja lógica |
| PATCH | `/api/profesionales/{id}/reactivar` | ADMIN | Levanta la suspensión |
| PUT | `/api/profesionales/{id}/disponibilidad` | PROFESIONAL | Horarios semanales |
| GET | `/api/profesionales/{id}/disponibilidad` | Autenticado | Lee horarios |
| GET | `/api/mi-reputacion` | PROFESIONAL | Reputación del propio profesional |

### 6.2 Solicitudes

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/solicitudes` | CLIENTE | Crea la solicitud (valida disponibilidad y GPS) |
| GET | `/api/solicitudes/mias` | Autenticado | Solicitudes del actor (cliente o profesional) |
| GET | `/api/solicitudes/panel` | ADMIN | Indicadores de demanda y embudo |
| PATCH | `/api/solicitudes/{id}/aceptar` | PROFESIONAL | Acepta el turno |
| PATCH | `/api/solicitudes/{id}/rechazar` | PROFESIONAL | Rechaza con motivo |
| PATCH | `/api/solicitudes/{id}/completar` | CLIENTE o PROFESIONAL | Marca el trabajo como terminado |
| PATCH | `/api/solicitudes/{id}/cancelar` | CLIENTE o PROFESIONAL | Cancela el turno |

### 6.3 Mensajes y calificaciones

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/solicitudes/{id}/mensajes` | Autenticado | Historial del chat |
| POST | `/api/solicitudes/{id}/mensajes` | Autenticado | Envía un mensaje |
| GET | `/api/calificaciones` | — | Reputación pública (promedio y cantidad) |
| POST | `/api/solicitudes/{id}/calificacion` | CLIENTE | Califica con estrellas |
| GET | `/api/solicitudes/{id}/calificacion` | Autenticado | Lee la calificación |

### 6.4 Usuarios

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | ADMIN | Listado de clientes |
| GET | `/api/usuarios/yo` | Autenticado | Perfil propio |
| GET | `/api/usuarios/{id}` | Autenticado | Ficha de la contraparte para coordinar |
| GET | `/api/usuarios/por-keycloak` | Autenticado | Vincula o recupera por `sub` del token |
| GET | `/api/usuarios/por-email` | ADMIN | Busca por email (204 si no existe) |
| POST | `/api/usuarios` | ADMIN | Crea usuario |
| PATCH | `/api/usuarios/{id}` | ADMIN | Edita usuario |
| PATCH | `/api/usuarios/yo` | Autenticado | Actualiza el perfil propio |
| PATCH | `/api/usuarios/{id}/suspender` | ADMIN | Suspende la cuenta |
| PATCH | `/api/usuarios/{id}/reactivar` | ADMIN | Reactiva la cuenta |
| DELETE | `/api/usuarios/{id}` | ADMIN | Baja lógica |

### 6.5 Especialidades

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/especialidades` | — | Catálogo público |
| POST | `/api/especialidades` | ADMIN | Crea especialidad |
| PUT | `/api/especialidades/{id}` | ADMIN | Renombra |
| DELETE | `/api/especialidades/{id}` | ADMIN | Elimina |

### 6.6 Activación y vinculación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/profesionales/activar` | PROFESIONAL | Activa perfil (foto, zona GPS, horarios) |
| POST | `/api/profesionales/vincular` | PROFESIONAL | Vincula la identidad con el perfil |

### 6.7 Utilidades

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/gps` | — | Geocodificación de una dirección |
| GET | `/actuator/health` | — | Health check (sin prefijo `/api`) |

---


## 7. Modelo de datos

Cinco entidades de negocio repartidas en tres microservicios. Los identificadores
son `UUID` en todas partes.

### 7.1 `ms-usuarios` — Usuario

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `keycloakId` | UUID | `sub` del token. **Admite nulos**: las invitaciones de profesionales todavía no tienen cuenta en Keycloak |
| `nombre` | String | `given_name` del token |
| `apellido` | String | `family_name` del token |
| `email` | String | Único, es la identidad de acceso |
| `telefono` | String | Opcional |
| `fotoUrl` | String, `text` | Data URL en base64 (hasta ~2,7 MB) |
| `rolNegocio` | Enum | `CLIENTE` · `PROFESIONAL` · `ADMIN` |
| `estado` | Enum | `ACTIVO` · `SUSPENDIDO` |
| `fechaAlta` | OffsetDateTime | |

### 7.2 `ms-profesionales` — Profesional

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `usuarioId` | UUID | Referencia al `Usuario.id` (no hay FK: microservicio independiente) |
| `legajo` | String | Identificador del padrón, p. ej. `P-2001`. Único |
| `fotoUrl` | String, `text` | Data URL base64 |
| `zonaCoberturaLat` | Double | Centro de la zona de cobertura |
| `zonaCoberturaLng` | Double | |
| `radioKm` | Double | Radio en kilómetros |
| `estado` | Enum | `CARGADO` · `ACTIVO` · `SUSPENDIDO` |
| `fechaCarga` | OffsetDateTime | Alta en el padrón |
| `fechaActivacion` | OffsetDateTime | Completó los 3 pasos de activación |
| `especialidades` | `Set<Especialidad>` | Relación N:N |

### 7.3 `ms-profesionales` — Especialidad y Disponibilidad

**Especialidad:** `id` (UUID, PK), `nombre` (String).

**Disponibilidad:** `id` (UUID, PK), `profesionalId` (UUID), `diaSemana` (enum
`LUNES`…`DOMINGO`), `horaInicio` (`LocalTime`), `horaFin` (`LocalTime`).

### 7.4 `ms-solicitudes` — Solicitud

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `clienteId` | UUID | Quién pide el turno |
| `profesionalId` | UUID | Quién lo atiende |
| `especialidadId` | UUID | Categoría elegida |
| `direccionServicio` | String | **Se comparte con el profesional solo al aceptar** |
| `descripcion` | String | Mínimo 20 caracteres, obligatorio |
| `latitud` / `longitud` | Double | Punto del servicio (geocodificado) |
| `fechaHoraPropuesta` | LocalDateTime | Turno pedido |
| `fechaHoraFinPropuesta` | LocalDateTime | Fin estimado |
| `estado` | Enum | `PENDIENTE` · `ACEPTADA` · `RECHAZADA` · `COMPLETADA` · `CANCELADA` · `VENCIDA` |
| `motivoCancelacion` | String | Solo en `CANCELADA` |
| `canceladaPor` | UUID | Quién canceló |
| `fechaCreacion` / `fechaCambioEstado` | LocalDateTime | Auditoría del ciclo |

**Transiciones válidas** (validadas en `SolicitudService`):

```
PENDIENTE ──aceptar──▶ ACEPTADA ──completar──▶ COMPLETADA
    │                     │
    ├──rechazar──▶ RECHAZADA
    └──cancelar──▶ CANCELADA ◀──cancelar── (desde ACEPTADA)
```

### 7.5 `ms-solicitudes` — Mensaje y Calificacion

**Mensaje:** `id` (UUID, PK), `solicitudId` (UUID), `emisorId` (UUID), `texto`
(String), `fechaEnvio` (LocalDateTime).

**Calificacion:** `id` (UUID, PK), `solicitudId` (UUID, **única** — una
calificación por solicitud), `puntaje` (Integer, 1-5), `comentario` (String),
`fechaCalificacion` (LocalDateTime).

### 7.6 Nota sobre los datos duplicados

`Usuario.fotoUrl` y `Profesional.fotoUrl` existen ambos. `ms-usuarios` guarda la
foto general de la persona y `ms-profesionales` la que se muestra en el padrón.
No hay FK entre microservicios: la consistencia se resuelve en el BFF, que al
enriquecer el listado busca el usuario y lo omite si no responde.


## 8. Autenticación y autorización

### 8.1 Flujo de login (OIDC Authorization Code + PKCE)

```
1. Usuario entra a /ingresar
2. El guard redirectToKeycloak llama a AuthService.loginWithKeycloak()
3. Se genera state + nonce aleatorios y se guardan en sessionStorage
4. Se genera el code_verifier PKCE y su code_challenge (S256) con Web Crypto
5. Redirección a Keycloak con response_type=code
6. Keycloak autentica y vuelve a /?code=...&state=...
7. handleCodeCallback() valida state, canjea el code por tokens
8. Se guarda el access_token y el perfil en localStorage
9. La app llama a /api/usuarios/por-keycloak con el sub del token
10. El BFF vincula o recupera el usuario de negocio
```

La URL de **registro** de Keycloak se usa por separado
(`openRegister()`, `auth.service.ts:107`): los clientes se auto-gestionan y los
profesionales se registran con el email que cargó el administrador.

**Protecciones aplicadas:** `state` y `nonce` aleatorios de 16 bytes
(`crypto.getRandomValues`), PKCE S256 obligatorio (el realm lo exige vía
`pkce.code.challenge.method: S256`), y validación de `state` en el callback.

### 8.2 Validación del token en el BFF

`SecurityConfig` monta un **OAuth2 Resource Server** stateless
(`SessionCreationPolicy.STATELESS`). El `JwtDecoder` (`SecurityConfig.java:157`)
valida:

1. **Firma** contra el JWKS de Keycloak (`KEYCLOAK_JWK_SET_URI`), con rotación
   de claves automática.
2. **Emisor**: un validador custom acepta solo tokens cuyo `iss` contenga
   `/realms/vincula-up` (`SecurityConfig.java:160-166`). Rechaza cualquier
   token de otro realm, aunque tenga firma válida.

Los roles se leen de tres claims a la vez (`roles`, `realm_access.roles` y
`role`) y se mapean a `ROLE_*` para Spring Security. Se cubren así las variantes
de emisión de token entre versiones de Keycloak.

### 8.3 RBAC: 27 reglas

`SecurityConfig.securityFilterChain()` declara las reglas en orden de
especificidad. Resumen:

| Ámbito | Reglas |
|---|---|
| Público | `GET /api/profesionales`, `GET /api/calificaciones`, `GET /api/especialidades`, `GET /api/gps`, `GET /actuator/health`, `OPTIONS /**` |
| ADMIN | Listar/crear/editar/borrar usuarios, alta y edición de profesionales, suspender/reactivar, CRUD de especialidades, `GET /api/solicitudes/panel`, `GET /api/usuarios/por-email` |
| PROFESIONAL | `POST /api/profesionales/activar`, `mi-perfil`, `vincular`, `PUT .../disponibilidad`, `GET /api/mi-reputacion`, aceptar y rechazar solicitudes |
| CLIENTE | `POST /api/solicitudes`, `POST /api/solicitudes/{id}/calificacion` |
| Cualquiera de los dos | `PATCH .../completar`, `PATCH .../cancelar` |
| Solo autenticado | `/api/solicitudes/mias`, mensajes, leer calificación, ver disponibilidad ajena, ficha de la contraparte |

**No hay borrado físico del padrón**: la baja es lógica (suspender), para
conservar el historial de solicitudes.

Además del RBAC por ruta, el BFF corta a las cuentas `SUSPENDIDO` en
`requireActive()` antes de ejecutar cualquier operación de negocio, y resuelve la
identidad del actor desde el token (ver [§3](#el-bff-y-por-qué-existe)).

### 8.4 Promoción de rol del profesional invitado

Este es el punto más delicado del modelo de roles, y merece su propio
apartado. La secuencia real es:

1. El **admin** da de alta un profesional con `POST /api/profesionales/alta`.
2. El BFF crea en `ms-usuarios` un usuario con `rolNegocio = PROFESIONAL` y
   `keycloakId = **nulo**` (es una invitación: la cuenta de Keycloak aún no existe).
3. El profesional se **auto-registra** en Keycloak con ese email. Keycloak le
   asigna el rol por defecto `CLIENTE`, porque el realm no puede saber que el
   BFF lo dio de alta como profesional.
4. En su primer login, el BFF detecta la discrepancia: `rolNegocio` dice
   `PROFESIONAL` pero el token dice `CLIENTE`.
5. `sincronizarRolProfesional()` (`ApiController.java:59-67`) llama a
   `keycloakAdmin.promoverAProfesional()`, que usa el **client de servicio**
   `vincula-up-admin` (`manage-users`, `view-users`, `query-users`, `view-realm`)
   para promover el rol en Keycloak.
6. El siguiente token ya trae `PROFESIONAL` y el profesional puede activar su perfil.

**Restricción de seguridad:** la promoción solo ocurre de `CLIENTE` a
`PROFESIONAL`. **Nunca otorga `ADMIN`**: el rol administrativo no se propaga
desde el padrón. Un profesional dado de alta no puede convertirse en admin por
este camino.

### 8.5 Configuración del realm

`keycloak/import/vincula-up-realm.json`:

| Propiedad | Valor |
|---|---|
| `realm` | `vincula-up` |
| `registrationAllowed` | `true` (auto-registro de clientes) |
| `resetPasswordAllowed` | `true` (requiere SMTP configurado) |
| `verifyEmail` | `false` |
| `sslRequired` | `none` (el TLS lo termina nginx) |
| Roles de realm | `CLIENTE`, `PROFESIONAL`, `ADMIN` |

**Clientes:**

| Client | Tipo | Uso |
|---|---|---|
| `vincula-up-public` | Público | App Angular. PKCE S256 obligatorio, redirect URIs para `localhost`, `:4200` y `vincula-up.local`, `directAccessGrantsEnabled` (lo usa el smoke test) |
| `vincula-up-admin` | Confidencial | Service account del BFF para promover roles. Sin `standardFlowEnabled` ni `directAccessGrantsEnabled` |

> **El realm se importa solo la primera vez.** Como Keycloak persiste en
> Postgres, los cambios posteriores al JSON no se aplican solos: hay que correr
> `scripts/keycloak-bootstrap.sh` (ver [§14](#14-scripts-operativos)).

---

## 9. Los tres flujos completos

### 9.1 Cliente: pedir un turno

Ruta `/solicitar`, en **4 pasos** (wizard de 1101 líneas en `request.ts`):

| Paso | Qué hace | Validación |
|---|---|---|
| 1. **Ubicación** | Escribe la dirección o la marca en el mapa. Se geocodifica a coordenadas | Obligatorio. La dirección exacta se difiere hasta que el profesional acepta |
| 2. **Categoría** | Elige la especialidad | Obligatorio |
| 3. **Día y horario** | Elige día de la semana y franja, contra la disponibilidad real del profesional | Obligatorio. Se filtran horarios ya pasados |
| 4. **Profesional** | Elige entre los profesionales de esa especialidad, ordenados por cercanía | Obligatorio |

Al enviar: se valida en `ms-solicitudes` que el profesional esté `ACTIVO` y que
haya cobertura para las coordenadas del servicio. La solicitud nace `PENDIENTE`.

**Chat y calificación.** En `/solicitudes` el cliente ve el estado, escribe
mensajes dentro de cada solicitud, cancela mientras siga `PENDIENTE` y, cuando el
trabajo está `COMPLETADA`, califica con estrellas y comentario (una sola vez).

### 9.2 Profesional: activar perfil y gestionar solicitudes

**Activación en 3 pasos** (ruta `/activar-perfil`):

1. **Foto de perfil** — se lee la imagen y se muestra la previsualización
   (funciona también al volver desde la selección de ubicación).
2. **Zona GPS** — marca el centro y el radio de cobertura en km.
3. **Horarios semanales** — define franjas por día de la semana.

Al completar, el perfil pasa de `CARGADO` a `ACTIVO` y queda visible en el
padrón. Un profesional sin activar es redirigido a esta pantalla por el guard
`requireRequestsAccess`.

**Gestión de solicitudes** (misma pantalla `/solicitudes`, con el contenido
filtrado por rol):

- **Aceptar** — la dirección exacta del servicio se le revela en ese momento.
- **Rechazar** — pide un motivo obligatorio.
- **Completar** — marca el trabajo como terminado (lo puede hacer cualquiera de
  las dos partes).
- **Cancelar** — con motivo, registrando quién canceló (`RolCancelacion`).

### 9.3 Administrador: padrón, categorías y clientes

Shell propio (`/admin`) con 4 pantallas:

| Pantalla | Qué hace |
|---|---|
| **Resumen** | Indicadores de demanda y embudo, sobre datos reales de `GET /api/solicitudes/panel` |
| **Profesionales** | Padrón completo, alta de preregistros, edición, suspensión y reactivación |
| **Categorías** | CRUD de especialidades |
| **Clientes** | Listado y gestión del acceso de clientes (suspender/reactivar) |

El alta de un profesional usa `POST /api/profesionales/alta`, que en un solo
paso crea el usuario invitado y su perfil pendiente (ver
[§8.4](#84-promoción-de-rol-del-profesional-invitado)).

**Sobre la pantalla `/directorio`.** Existe y compila, pero su ruta exige rol
`ADMIN` (`app.routes.ts:21`) y **no forma parte del flujo del cliente**: quien
busca y elige profesional lo hace en el paso 4 de `/solicitar`, que consume el
mismo endpoint público `GET /api/profesionales`. Es una decisión consciente, no
un bug: la pantalla quedó obsoleta respecto del diseño final, donde el cliente
nunca ve un padrón suelto sino un flujo guiado. La ruta `/api/profesionales`
sigue siendo pública, que es lo que garantiza que el cliente pueda buscar.

---



## 10. Geolocalización

`GET /api/gps?direccion=...` es público y delega en
**Nominatim (OpenStreetMap)**. La implementación vive en
`ApiController.obtenerUbicacionGps()` (`ApiController.java:669`).

**Respuesta** (siempre 200, con campos duplicados por compatibilidad):

| Campo | Descripción |
|---|---|
| `resolved` | `true` si se resolvió a coordenadas |
| `latitude` / `longitude` | Coordenadas (null si no se resolvió) |
| `latitud` / `longitud` | Alias del mismo valor |
| `address` | Dirección normalizada que devuelve Nominatim |
| `source` | `nominatim-osm` · `nominatim-empty` · `empty-query` · `fallback` |
| `error` | Mensaje legible, solo si no se resolvió |

**Degradación:** ante timeout (8 s), error de red o respuesta vacía, el endpoint
devuelve `resolved: false` con un mensaje y **no lanza excepción**. El cliente
sigue pudiendo enviar la solicitud y el profesional la ve sin coordenadas.

Consideraciones operativas:

- Se manda `User-Agent` y `Referer` propios: la política de uso de Nominatim exige
  identificarse y limita las consultas sin identificación.
- Es una dependencia externa sin caché: cada búsqueda es una llamada a la red
  pública. En una demo con pocos usuarios no es problema; con tráfico real
  habría que cachear por dirección y respetar el rate limit (1 req/s).

---

## 11. Variables de entorno

Se leen del archivo `.env` en la raíz (ignorado por git). Copiar
`.env.example` → `.env` para empezar.

### Base de datos

| Variable | Default | Descripción |
|---|---|---|
| `POSTGRES_DB` | `vinculaup` | Nombre de la base |
| `POSTGRES_USER` | `postgres` | Usuario de Postgres |
| `POSTGRES_PASSWORD` | `postgres` | Contraseña de Postgres |
| `DATABASE_URL` | `jdbc:postgresql://postgres:5432/vinculaup` | JDBC. Sin definir, cada servicio usa H2 en memoria |
| `DATABASE_USERNAME` | `postgres` | Usuario de la app |
| `DATABASE_PASSWORD` | `postgres` | Contraseña de la app |
| `JPA_DDL_AUTO` | `update` | Esquema: `update` crea y actualiza tablas automáticamente |

### Keycloak

| Variable | Default | Descripción |
|---|---|---|
| `KEYCLOAK_ISSUER_URI` | `http://keycloak:8080/realms/vincula-up` | Emisor que valida el BFF |
| `KEYCLOAK_JWK_SET_URI` | `.../protocol/openid-connect/certs` | JWKS para validar firmas |
| `KEYCLOAK_HOSTNAME` | `vincula-up.local` | Host público de Keycloak |
| `KEYCLOAK_ADMIN` | `admin` | Usuario admin de Keycloak |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Contraseña del admin |
| `KEYCLOAK_REALM` | `vincula-up` | Nombre del realm |
| `KEYCLOAK_ADMIN_BASE_URL` | `http://keycloak:8080` | Base para el service account |
| `KEYCLOAK_ADMIN_CLIENT_ID` | `vincula-up-admin` | Client de servicio |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | `vincula-up-admin-secret` | Secret del client de servicio |

### SMTP (recuperación de contraseña)

| Variable | Default | Descripción |
|---|---|---|
| `KEYCLOAK_SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP |
| `KEYCLOAK_SMTP_PORT` | `587` | Puerto |
| `KEYCLOAK_SMTP_STARTTLS` | `true` | STARTTLS |
| `KEYCLOAK_SMTP_AUTH` | `true` | Autenticación SMTP |
| `KEYCLOAK_SMTP_USER` | — | Usuario (con Gmail: una dirección) |
| `KEYCLOAK_SMTP_PASSWORD` | — | **Contraseña de aplicación**, no la de la cuenta |
| `KEYCLOAK_SMTP_FROM` | — | Remitente |
| `KEYCLOAK_SMTP_FROM_DISPLAY_NAME` | `Vincula-UP` | Nombre visible del remitente |

> **Cómo llega el SMTP a Keycloak.** El realm importado usa
> `${env.KEYCLOAK_SMTP_*:}` (sintaxis de Keycloak), que se resuelve contra el
> **entorno del contenedor**, no contra el `.env` del host. Por eso
> `docker-compose.yml` declara `KC_SMTP_*` mapeados desde `KEYCLOAK_SMTP_*`.
> Si se edita el `.env` hay que recrear el contenedor:
> `docker compose up -d --force-recreate keycloak`. El
> `keycloak-bootstrap.sh` también aplica el SMTP por `kcadm`, y carga el `.env`
> automáticamente.

### pgAdmin


## 12. Datos de arranque

Ninguna base es persistente entre `docker compose down -v` y un arranque limpio:
Postgres se crea con el esquema por `ddl-auto=update` y los inicializadores
sembran lo indispensable.

### 12.1 Keycloak (import del realm)

Tres usuarios de prueba, todos con contraseña `password`:

| Email | Rol de realm | Para probar |
|---|---|---|
| `cliente@vincula-up.local` | `CLIENTE` | Pedir turno, chatear, calificar |
| `profesional@vincula-up.local` | `PROFESIONAL` | Activar perfil, aceptar/rechazar |
| `admin@vincula-up.local` | `ADMIN` | Panel de administración |

Más una service account `service-account-vincula-up-admin` para el client de
servicio del BFF.

### 12.2 `ms-profesionales`

Siembra **6 especialidades** y **1 profesional de demo**:

- Especialidades: Electricidad domiciliaria · Plomería y gas · Refrigeración y aire · Reparación de electrodomésticos · Pintura y albañilería · Cerrajería integral.
- Profesional: legajo `P-2001`, activado, con foto de `randomuser.me` y centro en
  Concepción del Uruguay (-32.4844, -58.2328) con radio de 20 km.
- Disponibilidad: lunes a sábado, de 8:00 a 20:00.

La siembra es **idempotente y best-effort**: si el padrón ya existe no se
tocan los datos, y si falla, el servicio arranca igual
(`ProfesionalDataInitializer.java:45-51`). Ese cuidado existe para evitar que un
fallo de seed mande el contenedor a un bucle de reinicios con 502 en toda la app.

### 12.3 `ms-usuarios`

**No siembra usuarios.** Los gestiona exclusivamente Keycloak: en el primer
login, `GET /api/usuarios/por-keycloak` crea el registro de negocio a partir de
los claims del token.

### 12.4 Migraciones best-effort al arrancar

Tres scripts `ALTER TABLE` defensivos, todos toleran el fallo:


## 13. Infraestructura: pgAdmin, TLS, Nginx

### 13.1 pgAdmin

Servicio activo en el stack, publicado en `http://localhost:5050`.

| Campo | Valor |
|---|---|
| Email | `admin@vincula-up.local` (o `PGADMIN_DEFAULT_EMAIL`) |
| Contraseña | `admin` (o `PGADMIN_DEFAULT_PASSWORD`) |
| Servidor de BD | host `postgres`, puerto `5432`, base `vinculaup` |
| Usuario / contraseña BD | `postgres` / `postgres` |

Se conecta al host `postgres` de la red de Docker, no a `localhost`: desde
dentro del contenedor, `localhost` es el propio pgAdmin. El volumen
`pgadmin_data` conserva los servidores guardados entre reinicios.

### 13.2 TLS

El repositorio incluye una CA y un certificado de servidor en `nginx/certs/`.
Los navegadores modernos exigen **dos certificados separados**, y hay que
importar la **CA** en el navegador, nunca el certificado de servidor.

Para regenerarlos hace falta una CA y un servidor firmado por ella:

```bash
cd nginx/certs

# 1. CA (esta se importa en el navegador)
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 825 \
  -out ca.crt -subj "/CN=VinculaUP-CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# 2. Clave y CSR del servidor
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=vincula-up.local"

# 3. Firmar el certificado del servidor con la CA
cat > /tmp/server-ext.cnf << 'EOF'
[ext]
subjectAltName=DNS:vincula-up.local,IP:127.0.0.1
basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
EOF

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 825 -sha256 \
  -extfile /tmp/server-ext.cnf -extensions ext
```

**Importar la CA:**

- **Script automático:** `bash scripts/import-ca-firefox.sh` (instala en el
  store del sistema y en la base NSS de Firefox).
- **Firefox:** Configuración → Privacidad y Seguridad → Ver Certificados →
  Autoridades → Importar → `nginx/certs/ca.crt` → marcar *Confiar en esta CA*.
- **Chrome/Chromium en Linux:**
  `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "VinculaUP-CA" -i nginx/certs/ca.crt`

Además hace falta resolver el dominio local:

```bash
echo "127.0.0.1 vincula-up.local" | sudo tee -a /etc/hosts
```

### 13.3 Nginx

Reverse proxy único con TLS, SPA fallback y balanceo hacia Keycloak y el BFF.

| `location` | Destino | Notas |
|---|---|---|
| `/` | SPA estática | `try_files ... /index.html` para el router de Angular |
| `/api/` | `bff-web:9001` | Variable + `resolver` de Docker |
| `/realms/`, `/login-actions/`, `/resources/`, `/js/` | `keycloak:8080` | Necesarios para que la UI de login de Keycloak funcione tras el proxy |

Ajustes que existen por motivos concretos:

- **`client_max_body_size 4m`** — sin esto nginx rechaza con `413` las fotos de
  perfil en base64 (~2,7 MB), que superan el default de 1 MB.
- **`proxy_buffer_size 128k`, `proxy_buffers 4 256k`, `proxy_busy_buffers_size 256k`** —
  los headers de Keycloak (JWT y cookies) no entran en los buffers por defecto.
- **`resolver 127.0.0.11 valid=10s`** — el DNS interno de Docker. Sin esto nginx
  fija la IP de `bff-web` al arrancar y queda devolviendo 502 si ese contenedor
  se recrea con otra IP.
- **Redirección 80 → 443** y cabeceras `X-Forwarded-*` para que Keycloak sepa
  que está detrás de un proxy TLS (`KC_PROXY: edge`).

El frontend se compila en **multi-stage** dentro de `nginx/Dockerfile`: Node 22
alpine compila Angular y solo el resultado se copia a la imagen final.

---

| Servicio | Sentencia | Motivo |

## 14. Scripts operativos

Todos en `scripts/`.

### 14.1 `keycloak-bootstrap.sh`

Aplica la configuración del realm sobre una **instalación ya existente**, de
forma idempotente, vía `kcadm.sh` por `docker exec`. Sin borrar usuarios ni datos.

Es necesario porque `start-dev --import-realm` importa el realm **solo la
primera vez**: como Keycloak persiste en Postgres, los cambios posteriores al
JSON (auto-registro, rol por defecto, client de servicio, SMTP) no se aplican
solos.

```bash
./scripts/keycloak-bootstrap.sh
```

Qué aplica: auto-registro de clientes · rol `CLIENTE` por defecto · client de
servicio `vincula-up-admin` con sus permisos (`manage-users`, `view-users`,
`query-users`, `view-realm`) · configuración SMTP.

Carga el `.env` de la raíz automáticamente (`set -a` + `source`), y funciona sin
él usando defaults. Requiere el servicio `keycloak` levantado.

### 14.2 `smoke-test.sh`

Verificación end-to-end contra el stack levantado. Recorre el circuito completo
con los tres usuarios de prueba: pide tokens, valida los endpoints públicos
(`/api/profesionales`, `/api/gps`), comprueba el RBAC (un cliente no debe poder
leer `/api/usuarios`), y ejerce el ciclo de una solicitud: aceptar → mensaje →
completar → calificar.

```bash
./scripts/smoke-test.sh
```

### 14.3 `import-ca-firefox.sh`

Instala la CA de `nginx/certs/ca.crt` en el store del sistema y en la base NSS
de Firefox:

```bash
bash scripts/import-ca-firefox.sh
```

### 14.4 `start-local.ps1`

Desarrollo **sin Docker** en Windows: abre una ventana de PowerShell por
microservicio con `mvnw.cmd spring-boot:run` y un perfil JVM liviano
(`-Xmx512m -XX:+UseSerialGC -XX:ActiveProcessorCount=2`) para no fallar por
memoria. Los servicios usan **H2 en memoria**: los datos se pierden al reiniciar.
El frontend se levanta aparte con `npm start` en otra terminal.

---

## 15. Estado real del MVP

Estado verificado ejecutando la suite de tests el 2026-09-28.

### 15.1 Verificación

| Componente | Resultado |
|---|---|
| `ms-usuarios` | 11 tests, 0 fallos |
| `ms-profesionales` | 5 tests, 0 fallos |
| `ms-solicitudes` | 25 tests, 0 fallos |
| `bff-web` | 25 tests, 0 fallos |
| **Backend** | **66 tests, 0 fallos** |
| **Frontend** | **162 tests pasan, 5 skipped** (20 archivos) |
| Build de producción Angular | OK, 384 kB |

### 15.2 Qué está completo

- Ciclo de vida completo de la solicitud, con validación de transiciones.
- Autenticación real contra Keycloak (OIDC + PKCE), sin atajos de desarrollo.
- RBAC de 27 reglas, aplicado en el BFF y validado con tests.
- Los tres roles recorren su flujo completo contra backend real.
- Geolocalización real (Nominatim) con degradación controlada.
- Datos semilla para que la demo arranque sin carga manual.

### 15.3 Lo que no está

| Brecha | Detalle |
|---|---|
| **Sin CI** | No hay `.github/`. Nada corre los tests automáticamente |
| **Sin tests de integración reales** | Los tests del BFF usan `@MockitoBean` sobre H2: no se ejercita la cadena completa con Postgres y Keycloak reales. El `smoke-test.sh` cubre ese hueco, pero es manual |
| **Cobertura backend asimétrica** | `ms-profesionales` tiene 5 tests frente a 5 clases de servicio; `SolicitudService` tiene 15. Faltan casos de borde |

---

## 16. Deuda técnica conocida

Pendientes identificados durante la consolidación documental. No bloquean la
demo, pero conviene tenerlos fichados.

### 16.1 Prioridad alta

| # | Deuda | Impacto |
|---|---|---|
| 1 | **Sin CI** | Nada garantiza que el código compile. Un cambio roto se descubre en la máquina de quien lo hizo |
| 2 | **Fotos en base64** | ~2,7 MB por foto en la fila. Postgres y nginx lo manejan hoy, pero no escala y no hay migración a almacenamiento de objetos |
| 3 | **`ddl-auto=update` como esquema** | Sin migraciones versionadas no hay forma de reproducir una base ni de revertir un cambio de modelo |
| 4 | **Secret del client de servicio en defaults** | `vincula-up-admin-secret` está en `.env.example`. Sin rotación es un secreto público del repositorio |

### 16.2 Prioridad media

| # | Deuda | Impacto |
|---|---|---|
| 5 | **Sin caché en geocodificación** | Cada búsqueda de dirección es una llamada a Nominatim. Rate limit de 1 req/s |
| 6 | **H2 por defecto en desarrollo** | Sin `DATABASE_URL`, los datos se pierden al reiniciar y el comportamiento difiere de producción |
| 7 | **Tests de integración incompletos** | El BFF se prueba con mocks. Un cambio en el contrato entre microservicios no lo detecta la suite |
| 8 | **CORS con lista de orígenes fija** | `SecurityConfig.java:106-109` enumera los orígenes. Agregar un dominio es tocar código |
| 9 | **`webOrigins: ["*"]`** en el realm | Permitido en demo; en producción conviene restringirlo |

### 16.3 Higiene del repositorio

Resuelto el 2026-09-28:

- ~~`node_modules/` versionado~~ → desindexado (1025 archivos, el 77% del repo).
  El índice pasó de 1326 a 289 archivos.
- ~~Logs de crash de la JVM (`hs_err_pid*.log`, `replay_pid*.log`)~~ → fuera del índice y agregados a `.gitignore`.
- ~~`out.html`~~ → fuera del índice y agregado a `.gitignore`.
- ~~Documentación duplicada y contradictoria~~ → consolidada en este archivo y en `README.md`.
- ~~Prototipo Next.js de v0~~ → eliminado del repositorio; sigue desplegado en https://v0-vincula-up.vercel.app/.

Pendiente:

- Eliminar los `.gitignore` boilerplate de los subproyectos Spring Boot
  (`backend/*/.gitignore`) si no aportan nada sobre este.

---

## 17. Diseño visual

La maqueta de diseño original está en **https://v0-vincula-up.vercel.app/**.
Esta sección conserva los tokens de diseño con los que se implementó la SPA.

### 17.1 Paleta

| Token | HEX | Rol |
|---|---|---|
| `--paper` | `#F6F3EC` | Fondo global, tono papel pergamino |
| `--surface-card` | `#FFFDF8` / `#FFFFFF` | Tarjetas, paneles y modales |
| `--ink` | `#1E2926` | Títulos, texto fuerte, botón primario |
| `--muted` | `#67716C` | Subtítulos, metadatos, placeholders |
| `--line` | `#D8D8CE` | Bordes y divisores |
| `--coral` | `#E35F43` | Acento, alertas, acciones destructivas |
| `--emerald` | `#448064` | Éxito, badge "Activo", botón completar |
| `--amber` | `#A56C19` | Pendiente, avisos de espera |
| `--navy` | `#1E4B7A` | Burbuja de mensaje propio, botón abrir chat |
| `--surface-highlight` | `#F3F5F1` | Tags, chips, burbuja de mensaje entrante |

### 17.2 Tipografía

| Nivel | Familia | Peso | Desktop | Mobile |
|---|---|---|---|---|
| Eyebrow / Badge | Trebuchet MS / Inter | 800 | 12px | 11px |
| H1 Hero | Georgia | 400 | 48–64px | 34px |
| H2 Sección | Georgia | 400 | 26–32px | 22px |
| H3 / H4 | Trebuchet MS / Inter | 700 | 16–18px | 15px |
| Cuerpo | Trebuchet MS / Inter | 400 | 15–16px | 14px |
| Meta / Labels | Trebuchet MS / Inter | 500–600 | 12–13px | 12px |

### 17.3 Radios y sombras

- Botones e inputs: `8px`–`10px`
- Tarjetas y paneles: `16px`
- Chips y badges: `999px` (píldora)
- Sombras orgánicas: `0 2px 8px rgba(30, 41, 38, 0.04)`
- Modales: `0 16px 40px rgba(30, 41, 38, 0.14)`

### 17.4 Criterio

La interfaz debe transmitir **calidez, seriedad universitaria y claridad técnica
editorial**. No debe parecer una app corporativa genérica azul, ni una red social
saturada. Por eso la paleta parte de un papel cálido y reserva el croma para lo
que exige atención: estados y errores.

Los valores viven en `src/styles.css` como custom properties, de modo que la
implementación Angular y la maqueta comparten el mismo vocabulario visual.

---

*Fin de la especificación. Para el resumen operativo ver [`README.md`](README.md).*

| **Sin E2E de frontend** | Los 162 tests prueban componentes con stubs, no contra el BFF andando |
| **Nominatim sin caché** | Dependencia externa sin cachear ni rate limiting ([§10](#10-geolocalización)) |
| **Fotos en base 64** | Se guardan como data URL en la columna de texto. Funciona para el MVP, no escala: ~2,7 MB por foto en fila |
| **`JPA_DDL_AUTO=update`** | El esquema se deduce del modelo en cada arranque. Aceptable en demo; en producción hace falta Flyway o Liquibase |
| **Keycloak en `start-dev`** | Sin optimizaciones de arranque ni Clustering. Suficiente para demo, no para producción |
| **Sin tests de la pantalla `/directorio`** | Quedó obsoleta (ver §9.3) |

|---|---|---|
| `ms-usuarios` | `ALTER COLUMN keycloak_id DROP NOT NULL` | Habilita invitaciones de profesionales (columna creada `NOT NULL` en bases viejas) |
| `ms-usuarios` | `ALTER COLUMN foto_url TYPE text` | Las fotos en base64 (~2,7 MB) no caben en `varchar(255)` |
| `ms-profesionales` | `ALTER COLUMN foto_url TYPE text` | Ídem para el padrón |

---

| Variable | Default | Descripción |
|---|---|---|
| `PGADMIN_DEFAULT_EMAIL` | `admin@vincula-up.local` | Email de ingreso |
| `PGADMIN_DEFAULT_PASSWORD` | `admin` | Contraseña de ingreso |

### Variables internas (no se tocan normalmente)

`PORT` por servicio, y `USUARIOS_URL` · `PROFESIONALES_URL` · `SOLICITUDES_URL`
en el BFF, que apuntan a los nombres de servicio en la red de Docker.

---

---

