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

Son 5 pasos y la primera vez tarda unos minutos.

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

### 3. Preparar el `.env`

El `.env` guarda los secretos y **no se versiona**:

```bash
cp .env.example .env
```

> Si te pasaron un `.env` ya configurado, usa ese.

### 4. Levantar la aplicación

```bash
docker compose up --build
```

La primera vez tarda unos minutos. Para dejarlo en segundo plano, agrega `-d`.

### 5. Importar el realm de Keycloak

Con los contenedores ya arriba (el script aplica el auto-registro, el rol por
defecto, el client de servicio y el SMTP):

**Linux:** `./scripts/linux-macos/keycloak-bootstrap.sh`
**Windows:** `powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1`

> Sin este paso, el registro de usuarios no funciona. Es idempotente: se puede
> volver a correr sin romper nada. Tambien hay que repetirlo despues de un
> `docker compose down -v`.

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
> repetir el paso 5.

---

## Documentación

- [`MANUAL.md`](MANUAL.md)
- [`ESPECIFICACION.md`](ESPECIFICACION.md)
