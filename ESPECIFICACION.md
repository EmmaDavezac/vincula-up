# Especificación Técnica — Vincula-UP

> **Documento único de referencia del proyecto.** Si algo no está aquí, no está
> documentado.
>
> El [`README.md`](README.md) tiene el resumen: qué hace el sistema, el stack y el
> deploy local desde cero. El [`MANUAL.md`](MANUAL.md) tiene el uso y la operación:
> los servicios, el secreto del client de servicio, los certificados, el desarrollo
> y el tema. Este archivo tiene el detalle técnico completo.

**Proyecto:** Vincula-UP — Red Técnica con Respaldo Universitario (Universidad Popular de Concepción del Uruguay)
**Alcance:** MVP (Minimum Viable Product)

---

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Roles del MVP](#2-roles-del-mvp)
3. [Arquitectura](#3-arquitectura)
4. [Stack y versiones](#4-stack-y-versiones)
5. [Estructura del repositorio](#5-estructura-del-repositorio)
6. [API del BFF: los 45 endpoints](#6-api-del-bff-los-45-endpoints)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Autenticación y autorización](#8-autenticación-y-autorización)
9. [Los tres flujos completos](#9-los-tres-flujos-completos)
10. [Ubicaciones: geocodificación, cifrado y fotos](#10-ubicaciones-geocodificación-cifrado-y-fotos)
    - [10.1 Geocodificación](#101-geocodificación) · [10.2 Cifrado de ubicaciones](#102-cifrado-de-ubicaciones) · [10.3 Almacenamiento de fotos](#103-almacenamiento-de-fotos) · [10.4 Quién ve la foto de quién](#104-quién-ve-la-foto-de-quién) · [10.5 Privacidad de la dirección](#105-privacidad-de-la-dirección-del-cliente)
11. [Variables de entorno](#11-variables-de-entorno)
12. [Datos de arranque](#12-datos-de-arranque)
13. [Infraestructura: pgAdmin, TLS, Nginx](#13-infraestructura-pgadmin-tls-nginx)
14. [Scripts operativos](#14-scripts-operativos)
15. [Estado real del MVP](#15-estado-real-del-mvp)
16. [Deuda técnica conocida](#16-deuda-técnica-conocida)
17. [Diseño visual](#17-diseño-visual)

Anexos:

- [A. Términos y datos](#anexo-a-términos-y-datos)
- [B. Preguntas frecuentes](#anexo-b-preguntas-frecuentes)
- [C. Tema claro y oscuro](#anexo-c-tema-claro-y-oscuro)

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
Keycloak. La correspondencia no es 1:1 en una sola dirección, en los dos
sentidos:

- **Keycloak → `ms-usuarios`:** cuando alguien entra por primera vez y no hay
  fila en el padrón, el rol sale del token (`GET /usuarios/por-keycloak?rol=`).
  Es seguro porque el registro abierto del realm asigna
  `default-roles-vincula-up` → `CLIENTE`: un auto-registrado nunca nace
  `PROFESIONAL` ni `ADMIN` por esa vía.
- **`ms-usuarios` → Keycloak:** un profesional invitado por el administrador se
  auto-registra en Keycloak y nace ahí con rol `CLIENTE`; el BFF lo promueve a
  `PROFESIONAL` en su primer login (ver [§8.4](#84-promoción-de-rol-del-profesional-invitado)).

**Por qué el frontend y el backend tienen que mirar lo mismo.** El frontend
arma el perfil con el `rolNegocio` que devuelve `ms-usuarios`, no con el claim del
token, y es el que decide a qué sección entra cada quien (`inicioDeSesion`). Si
esas dos fuentes se desalinean, el backend autoriza cosas que la interfaz no
muestra: el administrador, por ejemplo, podía hacer `GET /api/usuarios` (el
`SecurityConfig` lee el token) sin poder entrar nunca a `/admin` (el guard del
frontend leía la base). Por eso el rol de negocio se resuelve una sola vez, al
auto-registrar la cuenta.

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
| Base de datos | PostgreSQL 16 (producción) · H2 en memoria (dev local) |

Cada microservicio es un proyecto Maven independiente con su propio `mvnw`
(wrapper). **No hay reactor raíz**: se compilan por separado.

### Frontend

| Componente | Versión |
|---|---|
| Angular | 22.1.x |
| Angular Material / CDK | 22.1.7 |
| TypeScript | ~6.0.2 |
| Zone.js | ~0.16.0 |
| Gestor de paquetes | npm 11.19.0 |

Angular 22 usa el builder `@angular/build:application` y **signals** en lugar de
RxJS para el estado de los componentes.

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
├── README.md                      Resumen: qué hace, stack, deploy local
├── MANUAL.md                      Manual de uso y operación
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
│       ├── home/ request/ my-requests/             Flujo del cliente
│       ├── activation/ account/                    Flujo del profesional
│       ├── admin/                 Shell + 4 listados y 2 altas del panel
│       └── legal/                 Términos, FAQ y el modal de aceptación
│
├── keycloak/import/               Realm `vincula-up` (JSON de importación)
├── nginx/                         Config + certificados TLS
└── scripts/
    ├── linux-macos/               *.sh — Linux y macOS
    │   ├── keycloak-bootstrap.sh
    │   ├── import-ca.sh
    │   └── generate-certs.sh
    └── windows/                   *.ps1 — Windows
        ├── keycloak-bootstrap.ps1
        ├── import-ca.ps1
        ├── generate-certs.ps1
        └── start-local.ps1        Desarrollo sin Docker (solo Windows)
```

> **Nota sobre el prototipo.** La maqueta original de diseño se construyó en
> [v0](https://v0.app) (Next.js) y sigue desplegada en
> **https://v0-vincula-up.vercel.app/**. El código fuente de ese prototipo se
> eliminó del repositorio al consolidarse la documentación; la aplicación real
> es la SPA Angular de `frontend/vincula-up-web`.

---

## 6. API del BFF: los 45 endpoints

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
| PATCH | `/api/profesionales/{id}/suspender` | ADMIN | Baja lógica. En la interfaz se llama **desactivar** |
| PATCH | `/api/profesionales/{id}/reactivar` | ADMIN | Levanta la suspensión |
| PUT | `/api/profesionales/{id}/disponibilidad` | PROFESIONAL | Horarios semanales |
| GET | `/api/profesionales/{id}/disponibilidad` | Autenticado | Lee horarios |
| GET | `/api/mi-reputacion` | PROFESIONAL | Reputación del propio profesional |

### 6.2 Solicitudes

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/solicitudes` | CLIENTE | Crea la solicitud (valida disponibilidad y GPS) |
| GET | `/api/solicitudes/mias` | Autenticado | Solicitudes del actor (cliente o profesional) |
| GET | `/api/solicitudes/panel` | ADMIN | Indicadores de demanda y recorrido de las solicitudes |
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
| PATCH | `/api/usuarios/{id}/suspender` | ADMIN | Desactiva la cuenta (estado SUSPENDIDO) |
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
| POST | `/api/fotos` | Autenticado | Sube una foto al volumen y devuelve su **clave** (no hay URL pública) |
| GET | `/api/usuarios/{id}/foto` | Autenticado + rol | Devuelve la foto de un usuario si el rol la tiene permitida ([§10.4](#104-quién-ve-la-foto-de-quién)) |
| PATCH | `/api/terminos/aceptar` | Autenticado | Registra la aceptación de los términos; **el id sale del token**, nunca del cuerpo ([§8.5](#85-aceptación-de-los-términos-y-condiciones)) |
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
| `fotoUrl` | String, 512 | URL pública de la foto, servida por el almacenamiento de objetos. **El archivo no vive en la base** |
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
| `zonaCoberturaLat` | Texto cifrado | Centro de la zona de cobertura (AES-256-GCM) |
| `zonaCoberturaLng` | Texto cifrado | |
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

> Las coordenadas se guardan **cifradas**: las columnas `latitud` y `longitud`
> almacenan texto cifrado, no el número. Ver [§10.2](#102-cifrado-de-ubicaciones).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `clienteId` | UUID | Quién pide el turno |
| `profesionalId` | UUID | Quién lo atiende |
| `especialidadId` | UUID | Categoría elegida |
| `direccionServicio` | String | Dirección del domicilio. **No se envía al profesional hasta que acepta** (ver §10.4) |
| `zonaAproximada` | String | Barrio y localidad. Es lo que ve el profesional mientras la solicitud está pendiente |
| `descripcion` | String | Mínimo 20 caracteres, obligatorio |
| `latitud` / `longitud` | Texto cifrado | Punto del servicio. Se guarda cifrado (AES-256-GCM) |
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

`Usuario.fotoUrl` y `Profesional.fotoUrl` existen ambos, y los dos guardan la
**clave** del archivo, no una URL: la foto se pide por
`GET /api/usuarios/{id}/foto` ([§10.4](#104-quién-ve-la-foto-de-quién)).
`ms-usuarios` guarda la foto general de la persona y `ms-profesionales` la que se
muestra en el padrón. No hay FK entre microservicios: la consistencia se resuelve
en el BFF, que al enriquecer el listado busca el usuario y lo omite si no
responde. Los listados devuelven `tieneFoto` (un booleano) y nunca la clave, para
que no quede una ruta con la que pedirle la foto a cualquiera.


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
| ADMIN | Listar/crear/editar/borrar usuarios, alta y edición de profesionales, desactivar/reactivar, CRUD de especialidades, `GET /api/solicitudes/panel`, `GET /api/usuarios/por-email` |
| PROFESIONAL | `POST /api/profesionales/activar`, `mi-perfil`, `vincular`, `PUT .../disponibilidad`, `GET /api/mi-reputacion`, aceptar y rechazar solicitudes |
| CLIENTE | `POST /api/solicitudes`, `POST /api/solicitudes/{id}/calificacion` |
| Cualquiera de los dos | `PATCH .../completar`, `PATCH .../cancelar` |
| Solo autenticado | `/api/solicitudes/mias`, mensajes, leer calificación, ver disponibilidad ajena, ficha de la contraparte |

**No hay borrado físico del padrón**: la baja es lógica (desactivar), para
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

**La otra mitad: qué pasa cuando la fila no existe.** El paso 2 assumes que el
administrador ya dio de alta al profesional. Si alguien entra y no hay fila, el
rol sale del token ([§2](#2-roles-del-mvp)). Esto cubre el caso del
**administrador institucional**: su cuenta la crea el administrador de Keycloak,
no el padrón, así que si el auto-alta no respetara el token quedaría trancado
—nada en la aplicación crea un `ADMIN`— y el panel `/admin` sería inalcanzable
aunque el backend lo autorizara.

`SEMBRAR_DEMO=true` siembra las tres cuentas de prueba (`cliente@`,
`profesional@`, `admin@`) con su rol ya asignado, así el padrón y el panel
funcionan desde el primer arranque ([§16-bis](#16-bis-datos-de-demostración)).

### 8.5 Aceptación de los términos y condiciones

El alta de cuentas la hace Keycloak, así que la aceptación se pide **después** del
primer ingreso, no en un formulario propio.

**Dónde se guarda.** Dos columnas en `usuarios`:

| Columna | Qué guarda |
|---|---|
| `terminos_version` | La versión del documento que aceptó (máx. 32 caracteres) |
| `terminos_aceptado_en` | Cuándo |

Ambas nullable, igual que `estado`: las cuentas anteriores quedan como "no aceptó"
y el sistema se los pide. El texto vive en el frontend (`legal/terminos/terminos.ts`),
que es lo único que define qué versión está vigente.

**El flujo:**

1. La app llama a `GET /api/usuarios/yo` (que ya hacía) y lee los tres campos.
2. Si la versión guardada no es la vigente, `terminosPendientes` es `true`.
3. Aparece un modal montado en `app.html`, **sin botón de cerrar**.
4. Al marcar el casillero, `PATCH /api/terminos/aceptar` guarda versión y fecha.

**Por qué es un modal y no un guard.** Es una capa sobre toda la aplicación, no
una pantalla: escribir una URL no lo esquiva, y tampoco navegar. La única forma de
salir es aceptar. Mientras el backend no responde, `terminosPendientes` devuelve
`true`: se prefiere bloquear de más un instante antes que dejar pasar a alguien
que no aceptó.

**El id sale del token.** El endpoint no acepta un id en el cuerpo; si lo
aceptara, cualquiera con su propia sesión podría registrar la aceptación en la
cuenta de otro.

**Si falla el registro, el modal no se cierra.** El estado solo cambia a aceptado
cuando la llamada volvió bien.

**Limitación conocida:** el realm tiene `verifyEmail: false`. Quien se registre
con el correo de un prerregistro queda vinculado a ese prerregistro y se activa
como profesional ([§16](#16-deuda-técnica-conocida)).

### 8.6 Configuración del realm

`keycloak/import/vincula-up-realm.json`:

| Propiedad | Valor |
|---|---|
| `realm` | `vincula-up` |
| `registrationAllowed` | `true` (auto-registro de clientes) |
| `registrationEmailAsUsername` | `true` — **el registro pide solo el correo**, que además queda como nombre de usuario interno |
| `loginWithEmailAllowed` | `true` — se accede con el email, sin nombre de usuario aparte |
| `duplicateEmailsAllowed` | `false` |
| `resetPasswordAllowed` | `true` (requiere SMTP configurado) |
| `verifyEmail` | `false` |
| `sslRequired` | `none` (el TLS lo termina nginx) |
| Roles de realm | `CLIENTE`, `PROFESIONAL`, `ADMIN` |

> **Por qué `registrationEmailAsUsername`.** La aplicación se identifica por
> correo, y el email es además la identidad con la que el backend vincula la
> cuenta. Pedir un "nombre de usuario" aparte obligaba a inventarse un alias que
> nadie recordaba, y terminaba siendo el correo otra vez pero escrito distinto
> (`juan.perez` vs `juan.perez@gmail.com`), que es justamente la forma de romper
> el vínculo. Con esta opción, Keycloak oculta el campo del formulario y usa el
> correo como `username` interno: el identificador técnico sigue existiendo
> (Keycloak lo necesita para todo) pero la persona nunca lo ve ni lo escribe.
>
> No obliga a migrar nada: las cuentas de demostración del import ya tienen
> `username` igual a `email`. Para aplicar el cambio sobre un realm que ya está
> corriendo, `scripts/{linux-macos,windows}/keycloak-bootstrap.*` lo actualizan de
> forma idempotente ([§14.1](#141-keycloak-bootstrap-sh--ps1)).

**Clientes:**

| Client | Tipo | Uso |
|---|---|---|
| `vincula-up-public` | Público | App Angular. PKCE S256 obligatorio, redirect URIs para `localhost`, `:4200` y `vincula-up.local`, `directAccessGrantsEnabled` (lo usa la verificación de la API con `curl`) |
| `vincula-up-admin` | Confidencial | Service account del BFF para promover roles. Sin `standardFlowEnabled` ni `directAccessGrantsEnabled` |

> **El realm se importa solo la primera vez.** Como Keycloak persiste en
> Postgres, los cambios posteriores al JSON no se aplican solos: hay que correr
> `scripts/linux-macos/keycloak-bootstrap.sh` (o `.ps1` en Windows) — ver
> [§14](#14-scripts-operativos).

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
| **Resumen** | Indicadores de demanda y recorrido de las solicitudes, sobre datos reales de `GET /api/solicitudes/panel` |
| **Profesionales** | Padrón completo, alta de preregistros y detalle |
| **Categorías** | CRUD de especialidades |
| **Clientes** | Listado y detalle con edición de datos y gestión del acceso |

El alta de un profesional usa `POST /api/profesionales/alta`, que en un solo
paso crea el usuario invitado y su perfil pendiente (ver
[§8.4](#84-promoción-de-rol-del-profesional-invitado)).

**El flujo de las pantallas de detalle: entrar a consultar, y adentro
modificar.** Las dos listas (profesionales y clientes) muestran **una sola acción
por fila: "Consultar"**. El detalle que se abre tiene, en orden:

1. **Consultar** — los datos, solo lectura.
2. **Modificar** — los campos editables (legajo y especialidades en el padrón;
   nombre, apellido y teléfono en el cliente). El email no se edita: es la
   identidad con la que la persona accede a su cuenta.
3. **Acceso** — al pie, separado con un borde y aire, el botón de **desactivar** o
   **reactivar**, que siempre pide confirmación.

**Por qué las acciones sensibles están adentro.** En una lista, un botón rojo
junto a cada nombre queda a un clic de distancia y se aprieta sin querer. Meterlo
en el detalle obliga a abrir la ficha de esa persona concreta: el que va a
desactivar a alguien ya sabe a quién.

**Una sola palabra para la misma acción.** Los dos paneles usan
desactivar/reactivar (el de clientes ya lo decía; el de profesionales decía
"suspender"). "Suspender" suena más técnico y cuesta más entender sin contexto. El
estado interno sigue siendo `SUSPENDIDO` y el endpoint `/suspender`: eso es la
API, no la interfaz.

**No se expone "eliminar".** Existe `DELETE /api/usuarios/{id}` y borra de verdad,
con historial de solicitudes y calificaciones colgando. Con ese historial, un
borrado accidental no se recupera, así que la interfaz no lo ofrece.

**Sobre el directorio.** El cliente no ve un padrón suelto: busca y elige
profesional en el paso 4 de `/solicitar`, un flujo guiado que consume el mismo
endpoint público `GET /api/profesionales`. Esa ruta sigue siendo pública, que es
lo que garantiza que el cliente pueda buscar sin sesión.

---



## 10. Ubicaciones: geocodificación, cifrado y fotos

### 10.1 Geocodificación

`GET /api/gps?direccion=...` es público y consulta **Nominatim (OpenStreetMap)**.

**Hay una sola implementación**, en el `GeocodingClient` de `ms-solicitudes`.
El BFF expone el endpoint público y proxea a `GET /solicitudes/geocodificar`
mediante `BackendGateway.geocodificar()`. La duplicación de la lógica, con
timeouts distintos entre el controlador y el microservicio, hacía imposible saber
cuál de los dos rigiera el resultado: una implementación única con caché y rate
limiting hace que el comportamiento sea predecible.

**Respuesta** (siempre 200, con campos duplicados por compatibilidad):

| Campo | Descripción |
|---|---|
| `resolved` | `true` si se resolvió a coordenadas |
| `latitude` / `longitude` | Coordenadas (null si no se resolvió) |
| `latitud` / `longitud` | Alias del mismo valor |
| `address` | Dirección normalizada que devuelve Nominatim |
| `source` | `nominatim-osm` · `nominatim-empty` · `empty-query` · `nominatim-error` · `nominatim-parse` · `servicio-no-disponible` |
| `error` | Mensaje legible, solo si no se resolvió |

**Caché en memoria con TTL de 10 minutos**, LRU acotada a 500 direcciones. Solo
se cachean los aciertos: un fallo por red puede ser transitorio y no conviene
repetirlo durante 10 minutos. El frontend geocodifica mientras la persona escribe
y vuelve a pedir la misma dirección al elegir el punto del mapa, así que la caché
evita consultas repetidas contra un proveedor que limita a 1 req/s.

**Degradación en dos capas.** Si Nominatim falla, `ms-solicitudes` devuelve
`resolved: false` con un mensaje. Si además `ms-solicitudes` no responde, el BFF
devuelve lo mismo con `source: servicio-no-disponible` en vez de cortar con 502:
una falla del backend de solicitudes no debe dejar sin geocodificar a toda la
app. En ninguno de los dos casos se lanza excepción.

### 10.2 Cifrado de ubicaciones

Las coordenadas se cifran **en reposo** con **AES-256-GCM**, en la capa de
aplicación (no es cifrado de disco de Postgres). Afecta a:

| Servicio | Columnas |
|---|---|
| `ms-solicitudes` | `solicitudes.latitud`, `solicitudes.longitud` — ubicación del domicilio del cliente |
| `ms-profesionales` | `profesionales.zona_cobertura_lat`, `profesionales.zona_cobertura_lng` |

**Cómo funciona.** `CifradorUbicaciones` cifra al escribir y descifra al leer, de
forma transparente para services y DTOs. Como las entidades no son beans de
Spring, el cifrado se inyecta con un holder estático que el propio `CifradorUbicaciones`
registra en un `@PostConstruct`. El resultado es `base64(iv || cifrado)`, con el
IV aleatorio de 12 bytes al principio: dos coordenadas iguales producen textos
distintos, así que no se puede deducir que dos vecinos están en el mismo punto.

**Configuración.** Clave de 32 bytes en Base64 en `UBICACIONES_CLAVE`, **compartida
por los dos servicios** (si difieren, cada uno descifra lo que el otro cifró):

```bash
openssl rand -base64 32    # genera una
```

Sin la variable los servicios arrancan igual y registran un aviso, guardando en
claro: preferible eso a no dejar trabajar en desarrollo.

**Qué protege y qué no.** Un dump de la base no expone ubicaciones. **No** protege
contra un usuario con sesión que ve las coordenadas por la API, porque la API las
devuelve descifradas: es lo que permite que el orden por cercanía se calcule en el
navegador.

**Consecuencia a tener en cuenta.** Las columnas cifradas no admiten consultas
espaciales: no hay `WHERE latitud BETWEEN ...` ni orden por cercanía en SQL. Hoy
eso no rompe nada porque el radio de cobertura se persiste pero no se usa para
filtrar, y la distancia se calcula en el cliente. Si alguna vez hace falta
filtrar por distancia en SQL, hay que agregar una columna en claro deliberada.

**Compatibilidad.** Si el texto guardado no es un ciphertext válido —por ejemplo,
un valor en claro de una base anterior— se interpreta como número en lugar de
fallar.

---

### 10.3 Almacenamiento de fotos

Las fotos **no se guardan en PostgreSQL**: viven fuera de la base, en el volumen
Docker `fotos_data`, y ahí solo se conserva la **clave** del archivo
(`perfiles/<uuid>.jpg`).

**Flujo completo:**

```
1. El usuario elige una imagen → previsualización local (data URL, no se envía)
2. El frontend sube el archivo con POST /api/fotos (multipart/form-data)
3. El BFF valida tipo y tamaño, lo escribe en el volumen y devuelve { key }
4. El frontend manda esa clave a /api/profesionales/activar o /api/usuarios/yo
5. El microservicio guarda la clave (512 caracteres)
```

**Por qué el BFF y no cada microservicio:** evita duplicar el cliente de
almacenamiento en dos servicios, y el BFF ya es quien valida sesión y rol. Los
servicios de dominio solo reciben la clave: nunca ven el archivo.

**Una sola implementación (`FotoStorageLocal`).** No hay bucket ni servicio de
objetos: el stack no usa ninguno. La interfaz `FotoStorage` queda con un método
de escritura y uno de lectura, lo que deja el punto de extensión si alguna vez
hacía falta otro backend.

### 10.4 Quién ve la foto de quién

Las fotos de perfil **no son públicas**. No existe ninguna URL de foto: el
frontend nunca recibe una ruta, solo el `usuarioId` del dueño y un booleano
`tieneFoto`. La imagen se pide a `GET /api/usuarios/{id}/foto`, que exige sesión
y aplica esta matriz antes de devolver los bytes:

| mi rol \ foto del otro | `CLIENTE` | `PROFESIONAL` | `ADMIN` |
|---|---|---|---|
| **`CLIENTE`** | no | sí | no |
| **`PROFESIONAL`** | sí | no | no |
| **`ADMIN`** | sí | sí | no |

Más la **propia**, que siempre se ve. Traducido: un cliente ve las fotos de los
profesionales (los elige y agenda con ellos), un profesional ve las de los
clientes (coordinan el turno) y el administrador ve las de ambos, pero nadie ve
las de su propio rol ni las de otro administrador.

**Por qué el BFF y no nginx.** nginx puede servir un volumen como estático, con
`Cache-Control: public` y 30 días de caché: cualquiera con la URL descargaría la
foto de cualquiera y un proxy compartido la guardaría. Por eso `nginx` **no monta**
el volumen `fotos_data`; el BFF es el único que lo lee. Responde con
`Cache-Control: private, no-cache` más un
`ETag`, así el navegador revalida en vez de re-descargar y nada queda en cachés
compartidos.

**Por qué `403` y no `404`.** "No existe" y "no te corresponde" son respuestas
distintas a la misma pregunta y distinguen cuentas que existen de las que no. Se
acepta el costo: los identificadores son UUID, así que no se adivinan, y no se
filtra ningún dato sensible — solo que ese rol no puede ver esa foto.

**En el frontend.** Un `<img src>` no manda el header `Authorization`, así que la
imagen no puede pedirse con la etiqueta. El `FotoService` la pide con
`HttpClient`, cachea los blobs por usuario y devuelve una URL `blob:`. El
`vu-avatar` es el único lugar que lo usa: recibe `usuarioId` + `tieneFoto` en vez
de una URL, así que las ocho pantallas que muestran fotos no cambian al pasar de
URL a endpoint.

**Límites:** 2 MB por imagen (`STORAGE_MAX_BYTES`) y solo JPEG, PNG o WebP — SVG
queda excluido a propósito, porque es XML ejecutable. Las claves se generan con
`UUID` y usan el prefijo `perfiles/`: usar el nombre original permitiría
colisiones y rutas manipulables con `../` (la lectura normaliza el path y
rechaza el que salga del volumen). `nginx` sube `client_max_body_size` a 3 m: ya
no necesita el margen que exigía el base64.

**Eliminación de datos:** las fotos que estaban en base 64 en versiones previas se
descartaron. Las filas que guardaban la URL pública completa
(`/fotos/perfiles/x.jpg`) se normalizan quitando el prefijo; el BFF acepta ambas
formas, así que una base existente no necesita migración.
### 10.5 Privacidad de la dirección del cliente

El domicilio del cliente **no se le muestra al profesional hasta que acepta el turno**.

| Estado | Cliente | Profesional | Admin |
|---|---|---|---|
| `PENDIENTE` | Su dirección completa | **Zona** (barrio y localidad) + punto redondeado a ~1,1 km | Todo (panel) |
| `ACEPTADA` en adelante | Su dirección completa | Dirección completa y coordenadas exactas | Todo |

**Por qué la zona y no nada.** El profesional necesita poder decidir: si el trabajo le queda muy lejos o si la zona le resulta insegura, son motivos reales para rechazar. Ocultarle todo lo obligaría a aceptar a ciegas, y en la práctica terminaría preguntando por la dirección igual.

**Cómo se calcula la zona.** Se reutiliza el geocodificado que ya se hace al crear la solicitud: `GeocodingClient.extraerZona()` toma el `display_name` que devuelve Nominatim (`"Urquiza 1234, Barrio Norte, Concepción del Uruguay"`), descarta el primer segmento —la vía con su altura— y se queda con los dos siguientes. Es una función pura de strings: **no agrega ninguna llamada de red**. Cuando el cliente elige el punto en el mapa y manda coordenadas en vez de escribir la dirección, no hay `display_name` del cual extraerla, así que se hace **una** consulta inversa al proveedor, que entra por la caché existente.

**Las coordenadas se redondean a 2 decimales**, que equivalen a ~1,1 km de margen. Con 3 decimales el punto estaría a ~110 m, demasiado cerca para llamarlo aproximado. El mapa que ve el profesional usa esas coordenadas redondeadas, así que tampoco filtra el domicilio.

**Dónde se aplica el filtro.** En el BFF, en `ocultarDireccionSiEstaPendiente()`: es el único que sabe quién está preguntando, porque `ms-solicitudes` recibe el `usuarioId` como parámetro y no valida la identidad. Al salir de `PENDIENTE` no se vuelve a ocultar, aunque el profesional termine rechazando: ya vio la dirección, volver a ocultarla no aportaría nada.

**Lo que esto no cubre:**

- La **descripción** que escribe el cliente es texto libre: si la persona escribe la dirección ahí, se ve. La prevención es aclarar en el formulario que describa el problema, no la ubicación.
- `ms-solicitudes` sigue devolviendo la dirección exacta a quien le pregunte: el filtrado vive en el BFF. Los microservicios están publicados solo en `127.0.0.1` y sin autenticación, así que el alcance es un acceso local.
- Las coordenadas siguen **cifradas en reposo** en la base: el cifrado no cambia, lo que cambia es que la API devuelve un punto redondeado.

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
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | `vincula-up-admin-secret` | Secret del client de servicio. Vacío en `.env.example`: rige el default de demo, que es público |

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

**Estado: configurado y verificado.** El correo saliente está operativo sobre
Gmail, con una **contraseña de aplicación** vigente en
`KEYCLOAK_SMTP_PASSWORD`. La verificación se hizo el **2 de octubre de 2026** con
un envío real desde el flujo de "¿Olvidó su contraseña?" de la pantalla de
ingresar: el correo llegó a la casilla y Keycloak no registró errores de SMTP.
Con eso quedan habilitados los tres correos que manda el sistema:

| Correo | Quién lo dispara |
|---|---|
| Recuperación de contraseña (`resetPasswordAllowed`) | La persona desde "¿Olvidó su contraseña?" del login |
| Aviso de prerregistro | El alta de un profesional en el panel (`POST /api/profesionales/alta`) |
| Enlace de activación | El mismo aviso, con la `APP_URL` del `.env` |

> **El valor nunca se versiona.** La contraseña vive solo en el `.env` local, que
> está en `.gitignore` y no se sube al repositorio. Las tablas de arriba y el
> `.env.example` documentan la variable, nunca su contenido.
>
> **Cómo se rota.** Google puede revocar una contraseña de aplicación por cuenta
> propia (o el dueño de la cuenta la elimina). Cuando pasa hay que generar otra
> en *Cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de
> aplicación*, pegarla en `KEYCLOAK_SMTP_PASSWORD` y **volver a correr el
> bootstrap**, que es el único camino del `.env` a Keycloak:
>
> ```bash
> ./scripts/linux-macos/keycloak-bootstrap.sh
> # o, en Windows:
> powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1
> ```
>
> El script es idempotente y avisa si encuentra la variable vacía. Sin ella el
> reseteo de contraseña sigue habilitado en el realm, pero Keycloak no puede
> enviar el correo: el resultado es que nadie recibe el mensaje.

> **Cómo llega el SMTP a Keycloak.** El realm importado usa
> `${env.KEYCLOAK_SMTP_*:}` (sintaxis de Keycloak), que se resuelve contra el
> **entorno del contenedor**, no contra el `.env` del host. Por eso
> `docker-compose.yml` declara `KC_SMTP_*` mapeados desde `KEYCLOAK_SMTP_*`.
> Si se edita el `.env` hay que recrear el contenedor:
> `docker compose up -d --force-recreate keycloak`. El
> `keycloak-bootstrap.sh` (o `.ps1`) también aplica el SMTP por `kcadm`, y carga
> el `.env` automáticamente.

### Almacenamiento de fotos

### Almacenamiento de fotos

| Variable | Default | Descripción |
|---|---|---|
| `STORAGE_LOCAL_DIR` | `/data/fotos` | Directorio del volumen donde escribe y lee el BFF |
| `STORAGE_PREFIX` | `perfiles` | Prefijo de la clave dentro del volumen |
| `STORAGE_MAX_BYTES` | `2097152` | Máximo por imagen (2 MB) |

No hay más variables: el almacenamiento es un volumen en disco y las fotos se
sirven por el BFF ([§10.4](#104-quién-ve-la-foto-de-quién)), así que no hay
endpoint, credenciales ni bucket que configurar.

> `STORAGE_LOCAL_DIR` no se define en el `.env`: la fija `docker-compose.yml`
> en `/data/fotos`, que es donde está montado el volumen.
credenciales de la cuenta. El código no cambia.

### Cifrado de ubicaciones

| Variable | Default | Descripción |
|---|---|---|
| `UBICACIONES_CLAVE` | (vacío) | Clave AES-256 de 32 bytes en Base64. **Debe ser la misma en `ms-solicitudes` y `ms-profesionales`.** Vacía = se guarda sin cifrar, con aviso en el log |

Generar con `openssl rand -base64 32`.

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
| Email | `admin@vincula-up.com` (o `PGADMIN_DEFAULT_EMAIL`) |
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

> ⚠️ Es una **CA de desarrollo auto-firmada**, válida hasta diciembre de 2028.
> No sirve para producción: si el repositorio fuera público, cualquiera con la
> clave podría suplantar `vincula-up.local` para todos los que la instalen.

**Renovarlos** (hay scripts para ambos sistemas operativos):

```bash
# Linux
bash scripts/linux-macos/generate-certs.sh

# Windows
powershell -ExecutionPolicy Bypass -File .\scripts\windows\generate-certs.ps1
```

Después hay que **reimportar la CA nueva** en los navegadores, eliminando antes
la anterior (`VinculaUP-CA`) de los almacenes de confianza.

**Importar la CA:**

- **Script automático:** `bash scripts/linux-macos/import-ca.sh` (Linux) o
  `powershell -ExecutionPolicy Bypass -File .\scripts\import-ca.ps1` (Windows).
  Ambos instalan en el store del sistema **y** en la base NSS de Firefox.
- **Firefox** (cualquier SO — tiene su propio almacén, no usa el del sistema):
  Configuración → Privacidad y Seguridad → Ver Certificados → Autoridades →
  Importar → `nginx/certs/ca.crt` → marcar *Confiar en esta CA*.
- **Chrome/Chromium/Edge en Linux** (usan el store del sistema):
  `sudo cp nginx/certs/ca.crt /usr/local/share/ca-certificates/vinculaup-ca.crt && sudo update-ca-certificates`
- **Chrome/Chromium/Edge en Windows** (usan el store de Windows):
  `certutil -addstore -f Root .\nginx\certs\ca.crt`

Además hace falta resolver el dominio local:

```bash
# Linux
echo "127.0.0.1 vincula-up.local" | sudo tee -a /etc/hosts
```

```powershell
# Windows (PowerShell como Administrador)
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 vincula-up.local"
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

Están agrupados por sistema operativo: `scripts/linux-macos/` (`.sh`, para
Linux y macOS) y `scripts/windows/` (`.ps1`). Cada función tiene su versión en
ambos, salvo `start-local` que es solo Windows.

| Función | Linux / macOS | Windows |
|---|---|---|
| **Bootstrap del realm** (obligatorio tras el primer arranque) | `keycloak-bootstrap.sh` | `keycloak-bootstrap.ps1` |
| Confiar la CA en los navegadores | `import-ca.sh` | `import-ca.ps1` |
| Regenerar la CA y el certificado | `generate-certs.sh` | `generate-certs.ps1` |
| Desarrollo sin Docker | — | `start-local.ps1` |

Todos resuelven la raíz del repo por ruta relativa, así que se pueden invocar
desde cualquier directorio.

### 14.1 `keycloak-bootstrap` (`.sh` / `.ps1`)

Aplica la configuración del realm sobre una **instalación ya existente**, de
forma idempotente, vía `kcadm.sh` por `docker exec`. Sin borrar usuarios ni datos.

Es necesario porque `start-dev --import-realm` importa el realm **solo la
primera vez**: como Keycloak persiste en Postgres, los cambios posteriores al
JSON (auto-registro, rol por defecto, client de servicio, SMTP) no se aplican
solos. **Sin él, el registro de usuarios no funciona.**

```bash
./scripts/linux-macos/keycloak-bootstrap.sh                              # Linux / macOS
powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1   # Windows
```

Qué aplica: auto-registro de clientes · rol `CLIENTE` por defecto · client de
servicio `vincula-up-admin` con sus permisos (`manage-users`, `view-users`,
`query-users`, `view-realm`) · configuración SMTP.

Carga el `.env` de la raíz automáticamente (`set -a` + `source` en bash;
parseo línea por línea en PowerShell) y funciona sin él usando defaults.
Requiere el servicio `keycloak` levantado.

### 14.2 `import-ca` (`.sh` / `.ps1`)

Instala `nginx/certs/ca.crt` en los dos almacenes de confianza que existen:

- el **store del sistema** → Chromium, Chrome, Edge (y `curl`, Node, la JVM);
- la **base NSS de Firefox** → que ignora el store del sistema.

```bash
bash scripts/linux-macos/import-ca.sh                                # Linux / macOS
powershell -ExecutionPolicy Bypass -File .\scripts\windows\import-ca.ps1   # Windows
```

La versión de Windows instala en `CurrentUser\Root` (no requiere elevación) y
acepta `-Machine` para el almacén local de la máquina. Ver [§13.2](#132-tls) para
el detalle por navegador.

### 14.3 `generate-certs` (`.sh` / `.ps1`)

Regenera la CA y el certificado del servidor, que hoy vencen en diciembre de
2028. Emite el certificado con `subjectAltName` para `vincula-up.local`,
`localhost` y `127.0.0.1`, sin el cual los navegadores modernos lo rechazan.

```bash
bash scripts/linux-macos/generate-certs.sh                                  # Linux / macOS
powershell -ExecutionPolicy Bypass -File .\scripts\windows\generate-certs.ps1   # Windows
```

Pide confirmación antes de sobrescribir y borra los intermedios (`server.csr`,
`ca.srl`). Tras regenerar hay que **reimportar la CA** (§14.2).

### 14.4 `start-local.ps1`

Desarrollo **sin Docker** en Windows: abre una ventana de PowerShell por
microservicio con `mvnw.cmd spring-boot:run` y un perfil JVM liviano
(`-Xmx512m -XX:+UseSerialGC -XX:ActiveProcessorCount=2`) para no fallar por
memoria. Los servicios usan **H2 en memoria**: los datos se pierden al reiniciar.
El frontend se levanta aparte con `npm start` en otra terminal.

### 14.5 Aviso de prerregistro por correo

No es un script: es parte del BFF, pero se documenta acá porque es el paso que
cierra el flujo de alta de un profesional.

**El flujo completo:**

1. El **administrador** da de alta el profesional desde el panel
   (`POST /api/profesionales/alta`), con sus datos, legajo y especialidad. Esto
   crea la cuenta en `ms-usuarios` **sin cuenta de Keycloak**: es una invitación.
2. El BFF envía un correo al profesional (`NotificacionService`) con el legajo, la
   especialidad y los pasos numerados para activar el perfil.
3. El **profesional** se registra en Keycloak con ese mismo correo. Al primer
   ingreso, `ms-usuarios` lo reconoce por email y conserva su rol `PROFESIONAL`
   (un correo no prerregistrado nace con el rol del token; ver
   [§8.4](#84-promoción-de-rol-del-profesional-invitado)).
4. El BFF promueve el rol en Keycloak (`KeycloakAdminService`) para que el
   siguiente token ya traiga `PROFESIONAL`.
5. El profesional **activa su perfil** (foto, zona de cobertura y horarios).

**El correo no habla de la implementación.** Decirle a un profesional "se registra
en Keycloak" o "el prerregistro se vincula por email" le da información que no
necesita. El texto va en términos del servicio, y lo importante es que explique
el paso que más se confunde: **entrar no alcanza, hace falta tener cuenta con ese
mismo correo**. El correo se repite en el cuerpo por eso.

**El prerregistro solo acepta correos sin cuenta.** Si el correo ya tiene una
sesión —alguien se registró y usó esa dirección— el alta se rechaza con `409` y el
mensaje *"Ese correo ya está en uso. Elegí otro para el prerregistro."* El
criterio es `keycloakId`: si viene vacío es una invitación anterior del mismo
administrador y se puede completar; si viene lleno, hay una persona real detrás.

> **El correo es best-effort, pero el panel lo dice.** Si el SMTP no está
> configurado o el servidor rechaza el mensaje, el prerregistro queda guardado y
> el fallo queda en el log: dar de alta a un profesional nunca falla porque no salió
> un correo. Para que el administrador no asuma que el profesional se enteró,
> `avisarPrerregistro` devuelve si el mensaje salió y la respuesta del alta trae
> `correoEnviado`: el panel dice *"Le enviamos las instrucciones por correo"* o,
> si no salió, *"Avisale por otra vía"*.

**Configuración:** reusa el mismo SMTP que Keycloak (`KEYCLOAK_SMTP_*`), así que
no hay credenciales duplicadas. `APP_URL` es la base del enlace del correo; si
se despliega en otro dominio, hay que cambiarla.

> **Limitación conocida:** con `verifyEmail: false` (el estado actual del realm),
> el paso 3 no verifica que el correo sea del propio profesional. Alguien con
> acceso a su casilla puede activarlo primero. Ver §16.2.

---

## 15. Estado real del MVP

### 15.1 Qué está completo

- Ciclo de vida completo de la solicitud, con validación de transiciones.
- Autenticación real contra Keycloak (OIDC + PKCE), sin atajos de desarrollo.
- RBAC de 27 reglas, aplicado en el BFF.
- Los tres roles recorren su flujo completo contra backend real.
- Geolocalización real (Nominatim) con degradación controlada.
- Datos semilla para que la demo arranque sin carga manual.
- Fotos de perfil privadas, con control de visibilidad por rol
  ([§10.4](#104-quién-ve-la-foto-de-quién)).
- Términos y condiciones y preguntas frecuentes
  ([Anexo A](#anexo-a-términos-y-datos) y [Anexo B](#anexo-b-preguntas-frecuentes)).
- Aceptación obligatoria de los términos al primer ingreso, con versión y fecha
  registradas ([§8.5](#85-aceptación-de-los-términos-y-condiciones)).
- Tema claro y oscuro ([Anexo C](#anexo-c-tema-claro-y-oscuro)).
- Mapas reales (Leaflet + OpenStreetMap) en la activación del perfil
  ([§17.7](#177-el-mapa-es-real-no-un-dibujo)).

### 15.2 Lo que no está

| Brecha | Detalle |
|---|---|
| **Sin CI** | No hay `.github/`. Nada verifica que el código compile |
| **Sin suite automatizada** | La verificación de la cadena completa (Postgres + Keycloak reales) queda para la validación de QA previa al despliegue |

---

## 16. Deuda técnica conocida

Pendientes conocidos. No bloquean la demo, pero conviene tenerlos fichados.

### 16.1 Prioridad alta

| # | Deuda | Impacto |
|---|---|---|
| 1 | **Sin CI** | Nada garantiza que el código compile. Un cambio roto se descubre en la máquina de quien lo hizo |
| 2 | **`ddl-auto=update` como esquema** | Sin migraciones versionadas no hay forma de reproducir una base ni de revertir un cambio de modelo. Correr el stack con `JPA_DDL_AUTO=validate` falla: no hay esquema que valide |
| 3 | **Secret del client de servicio sin rotar** | `.env.example` deja `KEYCLOAK_ADMIN_CLIENT_SECRET` **vacío** a propósito, pero con el vacío **rige el default de demo** `vincula-up-admin-secret`, que es **público** (está en `docker-compose.yml` y en el JSON del realm). El stack arranca y la promoción de rol funciona, pero con un secreto que cualquiera puede leer en el repositorio: quien lo tenga puede pedir un token de servicio y promover cuentas a PROFESIONAL. Se cierra rotando (`openssl rand -hex 24`), poniendo el valor en `.env` y **re-corriendo el bootstrap**, que es lo único que lo copia a Keycloak: el import del realm **no** resuelve `${env.*}` (verificado en Keycloak 26.3.3, ver `keycloak/import/README.md`). Después hay que recrear `bff-web` |
| 4 | **`webOrigins: ["*"]`** en el client público | Permitido en demo; en producción conviene restringirlo a los orígenes reales |
| 5 | **`redirectUris: ["https://*"]`** en el client público | Agregado para que los túneles de Cloudflare funcionen sin reconfigurar el client cada vez que `cloudflared` genera una URL nueva: Keycloak sólo matchea comodines **al final** del patrón, así que `https://*.trycloudflare.com/*` nunca matchearía (el soporte de comodines de host sigue sin mergear). `https://*` es un prefijo y matchea **cualquier** origen https, no sólo los de Cloudflare. Cerrado en producción reemplazando ese patrón por el dominio real. Mitiga que el client sea público con PKCE S256: sin el `code_verifier` el código no se cambia por tokens |
| 6 | **`KC_HOSTNAME` vacío (hostname dinámico)** | Con `KC_HOSTNAME_STRICT=false` y sin hostname fijo, Keycloak resuelve el host desde el request, que es lo que hace que el túnel funcione. El mismo mecanismo documenta que un atacante podría manipular el `Host` para falsificar los enlaces de recuperación de contraseña. Cerrado fijando `KEYCLOAK_HOSTNAME` en `.env` al dominio propio y con un proxy delante que no acepte `Host` arbitrarios |

### 16.2 Prioridad media

| # | Deuda | Impacto |
|---|---|---|
| 7 | **`verifyEmail: false`** | Un profesional puede activar su perfil con el email de otro, porque nadie confirma que la dirección sea suya. Cerrarlo requiere `verifyEmail: true` en el realm **y** `docker compose down -v`; además rompe las cuentas `@vincula-up.local` de prueba, que no son entregables |
| 8 | **H2 por defecto en desarrollo** | Sin `DATABASE_URL`, los datos se pierden al reiniciar y el comportamiento difiere de producción |
| 9 | **CORS con lista de orígenes fija** | `SecurityConfig.java` enumera los orígenes. Agregar un dominio es tocar código |
| 10 | **Geocodificación puede resolver a otra ciudad** | Nominatim a veces devuelve un lugar homónimo: una dirección de Concepción del Uruguay terminó en Entre Ríos, Argentina. Es un comportamiento del servicio público, no del código; convendría validar el país del resultado |

### 16.3 Higiene del repositorio

El repositorio está limpio:

- `node_modules/` no está versionado; lo cubre el `.gitignore` de la raíz.
- Los logs de crash de la JVM (`hs_err_pid*.log`, `replay_pid*.log`) y los
  archivos de salida del build están fuera del índice y en `.gitignore`.
- Hay un solo `.gitignore` y un solo `.gitattributes`, ambos en la raíz: los que
  existían por microservicio se absorbieron.
- La documentación vive en este archivo, en el `README.md` y en el `MANUAL.md`. No
  hay copias ni documentos contradictorios.
- El prototipo Next.js de v0 no está en el repo. Sigue desplegado en
  https://v0-vincula-up.vercel.app/ y es la referencia de diseño.

---

## 16-bis. Datos de demostración

Con `SEMBRAR_DEMO=true` (por defecto) cada base nueva se siembra al arrancar:

| Qué | Dónde | Contenido |
|---|---|---|
| 3 cuentas de prueba | `ms-usuarios` | `cliente@` (CLIENTE), `profesional@` (PROFESIONAL) y `admin@` (ADMIN), con el `keycloakId` fijo del realm |
| 6 especialidades | `ms-profesionales` | Electricidad, plomería, refrigeración, electrodomésticos, pintura, cerrajería |
| 1 profesional | `ms-profesionales` | Luciano Benítez, legajo `P-2001`, activado, con disponibilidad de lunes a sábado |
| 4 solicitudes | `ms-solicitudes` | 1 pendiente, 1 aceptada con 2 mensajes, 1 completada y calificada, 1 rechazada |

La siembra es **idempotente** (si ya hay datos no inserta nada) y
**best-effort** (un fallo se registra y el servicio arranca igual: un inicializador
que tumba el contenedor dejaría toda la API en 502).

**Por qué ahora sí se siembran los usuarios.** El rol de negocio que guía al
frontend sale de `ms-usuarios` ([§2](#2-roles-del-mvp)), así que sin fila toda
cuenta nueva nace `CLIENTE`: el `admin@` quedaba sin rol administrativo y el
`profesional@` sin el suyo, y ambos entraban a `/solicitudes`. Las tres cuentas
del realm se siembran con su rol ya asignado, y el `id` lo genera la base (no hay
un UUID fijo que hardcodear), así que `ProfesionalDataInitializer` resuelve el de
Luciano por email con una consulta SQL, con el `keycloakId` como respaldo si
`ms-usuarios` todavía no sembró.

Las solicitudes siguen necesitando que existan esas dos cuentas, y el
inicializador lo avisa por log con el mensaje *"No se siembran solicitudes: falta
la cuenta de…"*.

> Los tres microservicios comparten la misma base, así que es ahí donde el
> inicializador de profesionales resuelve el id de usuario por email.

Para una base limpia: `SEMBRAR_DEMO=false` en el `.env`, más
`docker compose down -v && docker compose up --build` (el volumen hay que
recrearlo para que el cambio aplique).

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

**Estos son los tokens del tema claro.** El tema oscuro no los redefine: los
*pisa* en un bloque `[data-tema='oscuro']`, así que la lista de arriba sigue
describiendo la identidad visual. El detalle del segundo tema está en el
[Anexo C](#anexo-c-tema-claro-y-oscuro).

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

### 17.4 Botones: qué hace cada variante y cómo se mueve

Las cinco variantes de `.vu-btn` se distinguen por **relleno, no por tamaño**, y
todas son accionables. La regla que hace que ninguna se pierda: **todo botón tiene
fondo o borde**. La variante `quiet` es la única transparente, y por eso lleva
`border-color: var(--line)`: sin ese borde, sobre el papel claro o dentro de una
tarjeta blanca, el texto queda como una palabra suelta y no se sabe que se puede
apretar.

| Variante | Aspecto | Cuándo |
|---|---|---|
| `vu-btn--ink` | Relleno oscuro, texto claro | Acción principal de la pantalla |
| `vu-btn--coral` | Relleno coral | Acción que crea algo nuevo |
| `vu-btn--outline` | Fondo transparente, borde | Acciones secundarias en grupo |
| `vu-btn--quiet` | Borde tenue, sin relleno | Cancelar, cerrar, acciones terciarias |
| `vu-btn--danger` | Relleno de alerta | Borrado y acciones irreversibles |

**El hover solo cambia color, nunca mueve nada.** La transición es de
`background-color`, `border-color` y `color`; no incluye `transform`. Un botón que
se levanta con `translateY(-2px)` empuja el contenido de abajo en superficies
chicas —la tarjeta de "solicitud enviada", los avisos de error— y el texto parece
bailar dentro del botón. Un hover que mueve píxeles se nota en los elementos
vecinos, y en un formulario lleno de campos eso se lee como salto. La respuesta al
puntero tiene que ser "esto cambió de color", no "esto se movió".

Los hovers de los controles que no son botones (días, categorías, sugerencias)
mantienen su excepción: cambian el color del borde, que en una tarjeta no empuja
nada porque la tarjeta no cambia de tamaño.

### 17.5 Etiquetas de los botones

Los rótulos dicen la **acción**, no la aspiración. Tres reglas:

| Rótulo | Regla | Ejemplos |
|---|---|---|
| `Nuevo` / `Nueva` | Abre un formulario de alta | "Nueva solicitud", "Nuevo profesional", "Nueva categoría" |
| `Guardar` | Confirma el envío de un formulario | "Guardar", "Guardando..." mientras espera |
| Verbo de la acción | Cuando no es alta ni guardado | "Desactivar", "Eliminar", "Confirmar esta ubicación" |

Una etiqueta como "Guardar preregistro" repite el nombre de la entidad que la
pantalla ya dice en el título, y "Crear nueva solicitud" repite la palabra
"nueva" que el botón ya tiene en el ícono `+`. Queda el verbo solo.

### 17.6 Los formularios de alta no van sobre el listado

El alta de un profesional (`/admin/profesionales/nuevo`) y de una categoría
(`/admin/categorias/nueva`) son **pantallas propias**, no un panel que se abre
encima de la grilla: con la lista cargada, el formulario quedaría arriba de veinte
tarjetas y habría que scrollear para verlo. Además, el `+` del botón sugiere
"agregar a la lista", no "ir a otra pantalla". La pantalla de alta tiene su
encabezado, su "Volver" y un botón `Cancelar`, y al guardar devuelve a la lista
con el aviso ya redactado (vía `navigate(..., { state })`).

### 17.7 El mapa es real, no un dibujo

La activación del perfil muestra un **Leaflet de verdad** con tiles de
OpenStreetMap. Un dibujo con gradientes que imite un mapa se lee como un mapa y no
tiene nada que ver con la dirección elegida.

Hay dos mapas en el paso 2, con propósitos distintos:

- **Vista de referencia** (`#zone-map`): solo lectura, sin arrastre ni zoom con
  rueda. Muestra dónde quedó el punto para que el profesional se ubique.
- **Modal "Ajustar en el mapa"** (`#activation-map`): interactivo, con búsqueda de
  dirección, GPS y confirmación.

El de referencia va en solo lectura a propósito: si se pudiera arrastrar el
marcador ahí, competiría con el input de texto de arriba y nadie sabría cuál de
los dos manda. El punto se ajusta en un solo lugar.

**Las tiles en tema oscuro.** OpenStreetMap no publica un tema oscuro, así que el
cuadrado blanco se invierte con un filtro sobre `.leaflet-tile-pane`
(`invert` + `hue-rotate(180deg)`), que además devuelve los colores a su tono: sin
el `hue-rotate`, el verde de los parques salía violeta. El marcador y los controles
quedan fuera del filtro porque son nuestros y sí deben quedar en color de marca.

### 17.8 Criterio

La interfaz debe transmitir **calidez, seriedad universitaria y claridad técnica
editorial**. No debe parecer una app corporativa genérica azul, ni una red social
saturada. Por eso la paleta parte de un papel cálido y reserva el croma para lo
que exige atención: estados y errores.

Los valores viven en `src/styles.css` como custom properties, de modo que la
implementación Angular y la maqueta comparten el mismo vocabulario visual.

**Todo color que no sea un acento pasa por un token.** Cuando se agregan pantallas
o estados, el color se declara en `styles.css` (o se reutiliza uno existente) y
no en el CSS del componente. Es la condición para que el tema oscuro siga siendo
correcto: si un color queda escrito a mano, el bloque oscuro no lo alcanza y
aparece un parche del color anterior. La verificación es mecánica, y está en el
[MANUAL §Tema claro y oscuro](MANUAL.md#tema-claro-y-oscuro).

---

## Anexo A. Términos y datos

Ruta `/terminos`. Es a la vez los términos y la política de datos y cookies.

**Por qué están en un solo documento.** La política de cookies no está aparte a
propósito: la aplicación **no tiene cookies publicitarias, de analítica ni de
terceros**, así que un documento propio prometería una privacidad que el usuario
tendría que ir a buscar. Todo junto, con el pie del sitio apuntando directo a la
sección de datos.

**Las ocho secciones:**

1. Qué es Vincula-UP
2. Qué hace cada rol
3. **Tus datos y el almacenamiento en tu navegador**
4. Cómo entra un profesional al padrón
5. Responsabilidad y alcance
6. Cancelaciones y calificación
7. Fotos de perfil
8. Cambios en estos términos

Debajo, el contacto (`vinculaup@gmail.com`) y la fecha de vigencia.

La sección 3 dice, en términos llanos: que no hay cookies de seguimiento ni
terceros y por eso no hay cartel de consentimiento; cuáles son las de sesión de
autenticación; que el token vive en `localStorage` **con la limitación escrita**;
qué datos se guardan; que la dirección exacta no se ve hasta que el profesional
acepta; y la matriz de quién ve la foto de quién.

**Cómo se mantiene.** El contenido vive como datos (`legal-doc.ts`) y la versión
en `VERSION_TERMINOS`, que es la que compara el modal contra lo que hay guardado
([§8.5](#85-aceptación-de-los-términos-y-condiciones)). Si se edita el texto, hay que **subir la
versión** o el sistema no vuelve a pedir la aceptación.

**Contacto:** `vinculaup@gmail.com`.

---

## Anexo B. Preguntas frecuentes

Ruta `/preguntas-frecuentes`. Catorce preguntas agrupadas por momento de uso:

| Grupo | Preguntas |
|---|---|
| Cuenta | Crear una cuenta · Olvidé la contraseña |
| Tus datos | Quién ve mis datos · Quién ve mi foto · Qué ve el profesional de mi dirección |
| Turnos | Cómo pido un servicio · Cancelar · Cómo funciona la calificación |
| Trabajar en la red | Entrar al padrón · Qué falta para activar el perfil · Zonas y horarios |
| Privacidad y ayuda | Cookies y rastreo · A quién escribo |

Cada pregunta es una sección con `<details>` nativo: se abre y cierra sin
JavaScript y funciona con teclado y lector de pantalla, que es justo lo que un
`div` con click no da.

Comparten el componente `legal-page` con los términos: mismo formato de índice
lateral fijo en desktop y mismos tokens, así que el tema oscuro las revierte sin
tocar estos archivos.

---

## Anexo C. Tema claro y oscuro

**Cómo se decide.** Tres estados en `TemaService`: `claro`, `oscuro` y `sistema`.
La primera visita usa `sistema` (respeta `prefers-color-scheme`); desde ahí en
adelante manda la elección, guardada en `localStorage` bajo `vincula-up-tema`. Si
queda en `sistema`, sigue en vivo los cambios del ajuste del sistema con la app
abierta.

**Cómo se aplica.** Como atributo `data-tema` en `<html>`, que es lo que lee el
bloque `[data-tema='oscuro']` de `styles.css`.

**Por qué hay un script aparte en `index.html`.** Angular arranca después de que
se pinte el primer fotograma, así que aplicar el tema desde el servicio dejaría
un destello blanco en cada recarga para quien está en oscuro. El script inline
corre **antes** y pone el atributo. Está escrito a mano y no importado de un
archivo justamente porque un import de módulos llega tarde. **Tiene que coincidir
con `TemaService`: misma clave, mismos valores.**

**Los colores viven centralizados.** Los ~100 colores que usan los componentes
están declarados como tokens en `styles.css`. Si un color queda escrito a mano en
el CSS de un componente, el bloque `[data-tema='oscuro']` no lo alcanza y aparece
un parche del color anterior en medio de la pantalla.

| Familia | Tokens |
|---|---|
| Superficies | `--surface-input`, `-subtle`, `-tint`, `-sunken`, `-strong`, `--line-strong` |
| Alertas | `--alert-{error,success,warning,info,neutral}-{bg,ink,border}` |
| Sombras | `--shadow-color` y `--shadow-strength`, que multiplican a los cuatro tokens `--shadow-*` |
| Sobre acento | `--on-accent`, `--deco-line` |
| Sobre color sólido | `--on-solid` — tinta sobre coral, esmeralda o navy; siempre blanca, no se invierte |
| Superficie oscura de marca | `--band-dark`, `--band-dark-hover`, `--band-ink`, `--band-ink-soft`, `--band-muted`, `--band-accent` |
| Barra inferior | `--tabbar-h` — alto de la barra fija de móvil; el pie reserva ese espacio |
| Velos | `--scrim` (fondo de los modales), `--bar-translucent` |

**Lo que deliberadamente no se tocó:** los acentos (`coral`, `emerald`, `amber`,
`navy`). Ya tienen contraste suficiente sobre fondo oscuro y son la identidad de
la marca. Quedó fuera del sistema de tokens un solo color: el rojo del botón de
peligro, que es un acento.

**Las superficies que no cambian con el tema.** Los tokens `--band-*` y
`--on-solid` se declaran una sola vez en `:root` y el bloque `[data-tema='oscuro']`
no los toca. No es una excepción: son superficies cuyo color no depende del tema.

La regla que hay que respetar es que **un token de tinta no se usa como fondo**.
`--ink` es tinta, y por lo tanto se invierte: pasa a `#e8edea` en el tema oscuro. Si
se lo usa de fondo, en oscuro el bloque queda claro, y si encima lleva tinta clara
queda ilegible. Los tres casos donde se usa una superficie oscura fija son el botón
primario `.vu-btn--ink`, la banda "Para egresados" de la portada y la burbuja
propia del chat. El caso más llamativo era el botón primario: con `--ink` como
fondo y `--surface-strong` en el hover, en tema oscuro el botón pasaba de blanco a
casi negro al pasar el mouse, con la tinta oscura encima: **1.11:1** de contraste.
Ahora es `#1e2926` con texto blanco en los dos temas (15:1).

**La barra inferior de móvil.** Es `position: fixed` y ocupa el ancho de la
pantalla, así que tapa lo que haya debajo. Su alto vive en `--tabbar-h` y lo
comparten la barra, que lo aplica, y el pie, que reserva ese espacio a partir del
mismo token. Si el número estuviera duplicado en los dos archivos, cualquier cambio
en uno volvería a tapar el pie.

**Las sombras son el caso que más delata.** Sobre fondo claro, una sombra verde
al 3,5% casi no se ve. Sobre oscuro, directamente no se ve y las tarjetas quedan
planas. Por eso el tema oscuro lleva `--shadow-strength: 2.6` y el color de sombra
en negro puro.

**Dónde está el botón:** en la navbar, antes del menú de usuario, para que también
esté disponible sin sesión — cambiar el tema no pide iniciar sesión.

---

*Fin de la especificación. Para el resumen ver [`README.md`](README.md), y para el
uso y la operación, [`MANUAL.md`](MANUAL.md).*

