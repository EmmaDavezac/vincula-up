# Vincula-UP

Plataforma de vinculación entre clientes y profesionales de oficios técnicos, con
respaldo institucional de la Universidad Popular de Concepción del Uruguay.

Un cliente pide un turno con su ubicación, un profesional lo acepta o rechaza con
motivo, ambos coordinan por chat, el trabajo se completa y el cliente califica.
Todo con autenticación real contra Keycloak y datos persistidos en PostgreSQL.

> **Documentación completa:** [`ESPECIFICACION.md`](ESPECIFICACION.md) — arquitectura,
> los 40 endpoints del BFF, modelo de datos, flujos, variables de entorno,
> estado del MVP y deuda técnica.
>
> **Maqueta de diseño original:** https://v0-vincula-up.vercel.app/

---

## Qué hace

| Rol | Funcionalidades |
|---|---|
| **Cliente** | Solicitud de turno en 4 pasos (ubicación con geocodificación real, categoría, día y horario, elección de profesional) · Chat por solicitud · Cancelación · Calificación con estrellas |
| **Profesional** | Activación de perfil en 3 pasos (foto, zona de cobertura GPS, horarios semanales) · Aceptar o rechazar con motivo · Completar el trabajo · Chat con el cliente · Ingreso al padrón por invitación del administrador |
| **Administrador** | Panel con 4 pantallas: resumen con indicadores de demanda, padrón de profesionales, CRUD de categorías y gestión de clientes · Alta de profesionales · Suspensión y reactivación |

Además: geocodificación de direcciones contra OpenStreetMap, reputación con
promedio y cantidad de reseñas, y panel administrativo con métricas calculadas
sobre datos reales.

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) >= 24
- [Docker Compose](https://docs.docker.com/compose/) >= 2.20
- `openssl` (Linux/macOS) para regenerar certificados
- Node.js 22 y Java 21 solo si vas a desarrollar fuera de Docker

---

## Puesta en marcha

### 1. Configurar el dominio local

```bash
echo "127.0.0.1 vincula-up.local" | sudo tee -a /etc/hosts
```

### 2. Importar la CA en el navegador

El repositorio ya incluye los certificados en `nginx/certs/`. **Hay que importar
la CA (`ca.crt`), nunca el certificado de servidor.** Con el script:

```bash
bash scripts/import-ca-firefox.sh
```

O a mano en Firefox: Configuración → Privacidad y Seguridad → Ver Certificados →
**Autoridades** → Importar → `nginx/certs/ca.crt` → marcar *"Confiar en esta CA"*.

### 3. Levantar la aplicación

```bash
cp .env.example .env      # opcional: cambiar credenciales o configurar SMTP
docker compose up --build
```

La primera vez descarga imágenes y compila todo (~3-5 min). Para correr en
segundo plano: `docker compose up --build -d`.

Al terminar, importa la configuración del realm una vez:

```bash
./scripts/keycloak-bootstrap.sh
```

> ¿Por qué este paso extra? Keycloak importa el realm **solo la primera vez**
> (persiste en Postgres). El script aplica de forma idempotente el
> auto-registro, el rol por defecto, el client de servicio y el SMTP.

### 4. Verificar

```bash
curl -k https://vincula-up.local    # Frontend
curl http://localhost:9001/actuator/health    # BFF
curl http://localhost:8080/realms/vincula-up/.well-known/openid-configuration
```

Opcional, con el stack levantado:

```bash
./scripts/smoke-test.sh    # verificación end-to-end del ciclo completo
```

---

## URLs

| Servicio | URL |
|---|---|
| **App web** | https://vincula-up.local |
| **Keycloak** | http://localhost:8080 |
| **pgAdmin** | http://localhost:5050 |
| **BFF API** | http://localhost:9001 |

---

## Credenciales

### Usuarios de prueba (realm `vincula-up`)

| Rol | Email | Contraseña |
|---|---|---|
| Cliente | `cliente@vincula-up.local` | `password` |
| Profesional | `profesional@vincula-up.local` | `password` |
| Administrador | `admin@vincula-up.local` | `password` |

### Keycloak

Usuario `admin` · Contraseña `admin`

### pgAdmin

Email `admin@vincula-up.local` · Contraseña `admin`
Servidor de BD: host `postgres`, puerto `5432`, base `vinculaup`
Usuario `postgres` · Contraseña `postgres`

> Desde tu máquina, la base se alcanza en `localhost:5432` (el puerto está
> publicado en el host). Dentro de la red de Docker, el host es `postgres`.
## Detener

```bash
docker compose stop       # detener, conservar datos
docker compose down       # eliminar contenedores
docker compose down -v    # también los volúmenes (borra la base de datos)
```

---

## Desarrollo

### Tests

```bash
# Backend (66 tests, uno por módulo)
cd backend/ms-usuarios      && ./mvnw test
cd backend/ms-profesionales && ./mvnw test
cd backend/ms-solicitudes   && ./mvnw test
cd backend/bff-web          && ./mvnw test

# Frontend (162 tests)
cd frontend/vincula-up-web && npm test
```

> Usá `npm test` y no `npx vitest run`: el runner directo no carga la
> configuración de Angular y falla con `describe is not defined`.

### Sin Docker

En Windows, `.\scripts\start-local.ps1` levanta los cuatro microservicios con H2
en memoria (los datos se pierden al reiniciar) y el frontend aparte con
`npm start` en otra terminal.

### Comandos de uso diario

```bash
docker compose logs -f ms-solicitudes     # ver logs de un servicio
docker compose restart bff-web            # reiniciar un servicio
docker compose up -d --build bff-web      # reconstruir y relanzar
docker compose ps                         # estado de contenedores
```

---

## Stack

**Backend:** Java 21 · Spring Boot 4.1.1 · Spring Security (OAuth2 Resource Server) · JPA/Hibernate · PostgreSQL 16

**Frontend:** Angular 22 · TypeScript 6 · Signals · Vitest

**Infraestructura:** Keycloak 26 (OIDC + PKCE) · Nginx 1.27 · Docker Compose · pgAdmin 8

---

## Documentación

- [`ESPECIFICACION.md`](ESPECIFICACION.md) — fuente única de verdad: arquitectura,
  API completa, modelo de datos, autenticación y RBAC, flujos, geolocalización,
  variables de entorno, infraestructura, estado del MVP y deuda técnica.
- https://v0-vincula-up.vercel.app/ — maqueta de diseño original (v0 / Next.js).
