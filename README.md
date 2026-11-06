# Vincula-UP

Plataforma de vinculación entre clientes y profesionales de oficios técnicos, con
respaldo institucional de la Universidad Popular de Concepción del Uruguay.

Un cliente pide un turno, un profesional lo acepta o rechaza, coordinan por chat
y el cliente califica.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21 · Spring Boot 4 · 4 microservicios detrás de un BFF |
| Frontend | Angular 22 |
| Identidad | Keycloak (login con email y contraseña) |
| Datos | PostgreSQL |

No hace falta Node ni Java: todo compila dentro de Docker.

Todo se levanta con Docker.

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
./scripts/deploy.sh
```

#### Opción 1: Despliegue totalmente automatizado
```bash
# Importa CA, crea .env, levanta stack y bootstrap Keycloak
./scripts/deploy.sh
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
