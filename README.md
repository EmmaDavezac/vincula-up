# Vincula-UP — Red Técnica con Respaldo Universitario

> *“Antes de que entre a tu casa, ya lo conocemos nosotros”*

Plataforma web (PWA) de inserción laboral para egresados de oficios técnicos de la **Universidad Popular de Concepción del Uruguay (UP)**, desarrollada en el marco del **Proyecto Final de Carrera (PFC) de Ingeniería en Sistemas de Información** en la **Universidad Tecnológica Nacional — Facultad Regional Concepción del Uruguay (UTN - FRCU)**.

### Equipo del Proyecto
- **Docentes:** Lucas Scheider · Adrian Tournour
- **Alumnos:**
  - Davezac, Luciano Emmanuel (`LD`) — Backend
  - Morales, Nicolas (`NM`) — Infraestructura, integración en BFF y pruebas
  - Velazquez, Julian (`JV`) — Historias de usuario
  - Vergara, Agustin (`AV`) — Frontend
  - Villanueva, Antonio Nicolas (`NV`) — Relevamiento, modelado de datos y testing

---

## Descripción del Proyecto y Problemática

Hoy, cuando un vecino o una empresa busca un técnico egresado en la región, el proceso es analógico y desestructurado (consulta manual del Libro Matriz y triangulación con docentes), demorando entre 2 y 3 días hábiles.
Vincula-UP sistematiza y moderniza esta vinculación:
1. **Búsqueda y solicitud:** El cliente busca por oficio y cercanía geográfica, describe el trabajo y elige día/horario.
2. **Privacidad:** La dirección exacta permanece oculta al profesional hasta que acepta el turno (ve solo zona y punto aproximado a ~1.1 km).
3. **Gestión de turnos:** El profesional acepta o rechaza indicando motivo obligatorio, validando no superposición de horarios.
4. **Coordinación:** Ambos participantes coordinan detalles mediante chat en tiempo real por WebSocket.
5. **Cierre y reputación:** Al completarse el trabajo, el cliente califica el servicio con estrellas y comentario.

## Stack Tecnológico

| Capa | Tecnología | Detalle |
|---|---|---|
| **Backend** | Java 21 · Spring Boot 4 | 3 microservicios de dominio (`ms-usuarios`, `ms-profesionales`, `ms-solicitudes`) detrás de un BFF (`bff-web`) |
| **Frontend** | Angular 22 | PWA con componentes standalone, signals y Angular Material |
| **Identidad** | Keycloak 26 | Autenticación OIDC + PKCE S256, roles y validación JWKS |
| **Persistencia** | PostgreSQL 16 | Base de datos relacional para datos de negocio |
| **Archivos** | Volumen Docker `fotos_data` | Almacenamiento privado de fotos fuera de la base de datos relacional |
| **Tiempo Real** | WebSocket + STOMP | Mensajería de chat en vivo y notificaciones reactivas |
| **Geolocalización** | OpenStreetMap / Nominatim | Geocodificación y orden por cercanía con caché y rate limiting |
| **Infraestructura** | Docker Compose + Nginx 1.27 | Proxy inverso, terminación TLS y enrutamiento con buffers |

Todo el entorno se ejecuta mediante Docker: no se requiere instalar Node ni Java en la máquina host.

---

## Deploy local desde cero

La configuración del realm de Keycloak se aplica automáticamente al levantar
Docker. Para el entorno local solo hay que preparar el host y confiar en la CA
de desarrollo; `.env` es opcional si se usan los valores de demo. Después, un
único comando construye y arranca todo el stack.

### 1. Requisitos

Solo Docker y Compose:

- **Linux:** Docker Engine + plugin Compose.
- **Windows y macOS:** Docker Desktop (ya trae Compose).

### 2. Dominio local y certificado

La app se sirve en `https://vincula-up.local`, asi que ese nombre tiene que
resolver a tu maquina. Agrega esta linea al archivo `hosts`:

**Linux / macOS:**
```bash
echo "127.0.0.1 vincula-up.local" | sudo tee -a /etc/hosts
```

**Windows** — abrí PowerShell **como Administrador**:
```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 vincula-up.local"
```

El repositorio trae una CA de desarrollo (`nginx/certs/ca.crt`). Instalala asi:

**Linux:** `bash scripts/linux-macos/import-ca.sh`
**Windows:** `powershell -ExecutionPolicy Bypass -File .\scripts\windows\import-ca.ps1`

> Importa siempre `ca.crt` (la CA), nunca `server.crt`.

### 3. Configuración opcional

Compose trae valores por defecto para desarrollo local. Si querés personalizarlos,
creá `.env` desde la plantilla; el archivo real guarda secretos y **no se versiona**.

**Linux / macOS:**
```bash
cp .env.example .env
```

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

> Si te pasaron un `.env` ya configurado, usa ese.

### 4. Levantar la aplicación

```bash
# Despliegue rápido (importa CA, crea .env, levanta stack y bootstrap Keycloak)
./scripts/deploy.sh  # script que importa CA, crea .env, levanta el stack y bootstrap Keycloak en un solo paso
```

#### Opción 1: Despliegue totalmente automatizado
```bash
# Importa CA, crea .env, levanta stack y bootstrap Keycloak
./scripts/deploy.sh  # script que importa CA, crea .env, levanta el stack y bootstrap Keycloak en un solo paso
```

#### Opción 2: Despliegue manual (pasos por separado)
```bash
# Importar la CA (Linux/macOS)
bash scripts/linux-macos/import-ca.sh

# Crear .env si no existe (usar la plantilla)
cp .env.example .env   # o ajusta según necesites

# Levantar el stack (rebuild)
docker compose up --build -d

# Ejecutar bootstrap de Keycloak (opcional, para realms existentes)
bash scripts/linux-macos/keycloak-bootstrap.sh
```

La primera vez puede tardar varios minutos: Docker compila los microservicios y
Angular, inicia PostgreSQL y Keycloak, importa el realm, ejecuta `keycloak-init`
(registro, roles, client de servicio, permisos, SMTP y temas) y, al finalizar,
arranca el BFF y Nginx. El init es idempotente y se ejecuta antes del BFF. En
una instalación nueva no hay que correr el bootstrap de Keycloak manualmente.

Para revisar el progreso: `docker compose ps` y `docker compose logs -f keycloak-init`.

El bootstrap del host queda como herramienta de recuperación para realms existentes
que no hayan ejecutado el init actualizado, o para sincronizar manualmente los
redirects del cliente público:

**Linux:** `./scripts/linux-macos/keycloak-bootstrap.sh`
**Windows:** `powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1`

### Cómo entrar

| Servicio | URL | Usuario / clave |
|---|---|---|
| **App web** | https://vincula-up.local | `cliente@vincula-up.local` / `password` |
| **Keycloak** | http://localhost:8080 | `admin` / `admin` |
| **pgAdmin** | http://localhost:5050 | `admin@vincula-up.com` / `admin` |

También existen `profesional@` y `admin@vincula-up.local` (clave `password`). El login pide el email.

### Detener

```bash
docker compose down       # apaga todo (conserva los datos)
```

> `docker compose down -v` además borra la base de datos. Después hay que
> volver a levantar el stack; Keycloak importará el realm y `keycloak-init`
> aplicará automáticamente su configuración.

---

## Documentación

- [`MANUAL.md`](MANUAL.md)
- [`ESPECIFICACION.md`](ESPECIFICACION.md)
- [`Entrega Proyecto Final Grupo 5.md`](Entrega%20Proyecto%20Final%20Grupo%205.md) — Informe de la entrega parcial final del Proyecto Final de Carrera (PFC)
- [`MVP Grupo 8- DACS.md`](MVP%20Grupo%208-%20DACS.md) — Informe del MVP desarrollado en DACS
