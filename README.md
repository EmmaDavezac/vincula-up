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

> El profesional ve la **zona** del trabajo (barrio y localidad) mientras la
> solicitud está pendiente, no el domicilio. Al aceptarla se le revela la
> dirección exacta, para que pueda decidir si le queda lejos o si la zona le
> resulta insegura.

Además: geocodificación de direcciones contra OpenStreetMap (con caché),
reputación con promedio y cantidad de reseñas, y panel administrativo con
métricas calculadas sobre datos reales.

Las fotos de perfil se guardan en un **volumen en disco** (no en la base de
datos: ahí solo queda la URL). Las coordenadas de los domicilios y las zonas de
cobertura se guardan **cifradas** con AES-256-GCM.

---

## Requisitos

| | Linux | Windows |
|---|---|---|
| **Obligatorio** | [Docker](https://docs.docker.com/get-docker/) >= 24 + [Compose](https://docs.docker.com/compose/) >= 2.20 | [Docker Desktop](https://docs.docker.com/desktop/) (incluye Compose v2) |
| **Para los scripts de CA** | `openssl` (ya viene en la mayoría de las distros) | `certutil.exe` (viene con Windows 10/11) |
| **Para regenerar certificados** | `openssl` | `openssl` — `winget install ShiningLight.OpenSSL` |
| **Solo si desarrollás fuera de Docker** | Node.js 22 + Java 21 | Node.js 22 + Java 21 |

No hace falta Node ni Java para levantar la aplicación: todo compila dentro de Docker.

### Scripts

Están agrupados por sistema operativo. Cada función tiene su versión en ambos,
salvo `start-local` que es solo Windows.

| Función | 🐧 Linux / macOS | 🪟 Windows |
|---|---|---|
| **Bootstrap del realm** — obligatorio tras el primer arranque | `bash scripts/linux-macos/keycloak-bootstrap.sh` | `powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1` |
| Confiar la CA en los navegadores | `bash scripts/linux-macos/import-ca.sh` | `powershell -ExecutionPolicy Bypass -File .\scripts\windows\import-ca.ps1` |
| Regenerar la CA y el certificado | `bash scripts/linux-macos/generate-certs.sh` | `powershell -ExecutionPolicy Bypass -File .\scripts\windows\generate-certs.ps1` |
| Desarrollo sin Docker | — | `.\scripts\windows\start-local.ps1` |

En Windows, `ExecutionPolicy Bypass` evita el error de "script deshabilitado por
la política de ejecución"; también podés ejecutarlos con `.\scripts\windows\<script>.ps1`
desde PowerShell si tu equipo ya lo tiene permitido.

Todos resuelven la raíz del repo por ruta relativa, así que se pueden invocar
desde cualquier directorio.

---

## Puesta en marcha

Los pasos son los mismos en Linux y Windows; cambia el intérprete. Cada uno
tiene su versión para **🪟 Windows** y **🐧 Linux**.

### 1. Configurar el dominio local

El servidor TLS está emitido para `vincula-up.local`, así que esa nombre debe
resolver a tu máquina.

**🐧 Linux / macOS**
```bash
echo "127.0.0.1 vincula-up.local" | sudo tee -a /etc/hosts
```

**🪟 Windows** — abrí PowerShell **como Administrador**:
```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 vincula-up.local"
```

### 2. Importar la CA en el navegador

El repositorio ya incluye los certificados en `nginx/certs/`, así que no hace
falta generar nada.

> ⚠️ **Importá siempre `ca.crt` (la CA), nunca `server.crt` (el del servidor).**
> Importar el certificado equivocado es el error más común y deja el sitio
> marcado como no confiable.

**Automático — cubre Firefox y los navegadores Chromium (Chrome, Edge, Brave):**

**🐧 Linux**
```bash
bash scripts/linux-macos/import-ca.sh
```

**🪟 Windows** (desde PowerShell en el repo):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-ca.ps1
```

**Manual**, si preferís hacerlo a mano:

**Firefox** (Linux y Windows por igual) — tiene su propio almacén y **no** usa
el del sistema:
1. Configuración → Privacidad y Seguridad → **Ver certificados**
2. Pestaña **Autoridades** → **Importar**
3. Elegí `nginx/certs/ca.crt` → marcá *"Confiar en esta CA para identificar sitios web"*
4. Reiniciá Firefox

**Chrome / Chromium / Edge (Linux)** — leen el almacén del sistema:
```bash
sudo cp nginx/certs/ca.crt /usr/local/share/ca-certificates/vinculaup-ca.crt
sudo update-ca-certificates
```

**Chrome / Chromium / Edge (Windows)** — leen el almacén de Windows:
```powershell
certutil -addstore -f Root .\nginx\certs\ca.crt
```

### 3. Preparar las variables de entorno

`.env` **no se versiona** (tiene secretos). Copiá la plantilla:

**🐧 Linux** · `cp .env.example .env`
**🪟 Windows** · `Copy-Item .env.example .env`

Opcional: cambiá credenciales o configurá el SMTP de Keycloak.

### 4. Levantar la aplicación

Idéntico en ambos sistemas operativos:
```bash
docker compose down -v    # solo si venís de una versión anterior del esquema
docker compose up --build
```

La primera vez descarga imágenes y compila todo (~3-5 min). Para correr en
segundo plano: `docker compose up --build -d`.

> **Importante:** si venís de una versión anterior, usá `docker compose down -v`.
> Cambió el esquema de la base: las coordenadas ahora se guardan cifradas (texto
> en vez de número) y `foto_url` pasó a ser una URL corta en vez de una imagen en
> base 64. `down -v` borra el volumen y se recrea todo limpio.

Al terminar, importa la configuración del realm una vez:

**🐧 Linux**
```bash
./scripts/linux-macos/keycloak-bootstrap.sh
```

**🪟 Windows**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\keycloak-bootstrap.ps1
```

> ¿Por qué este paso extra? Keycloak importa el realm **solo la primera vez**
> (persiste en Postgres). El script aplica de forma idempotente el
> auto-registro, el rol por defecto, el client de servicio y el SMTP.
> **Sin él, el registro de usuarios no funciona.**

### 5. Verificar

```bash
curl -k https://vincula-up.local                          # Frontend
curl http://localhost:9001/actuator/health                # BFF
curl http://localhost:8080/realms/vincula-up/.well-known/openid-configuration
```

### Certificados TLS

`nginx/certs/` contiene una **CA de desarrollo auto-firmada** y un certificado
de servidor válido hasta **diciembre de 2028**. No sirven para producción: si
el repositorio fuera público, cualquiera con la clave podría suplantar
`vincula-up.local` para todos los que instalen esa CA.

**Renovarlos** (por vencimiento, o si preferís que cada máquina tenga su propia CA):

**🐧 Linux** · `bash scripts/linux-macos/generate-certs.sh`
**🪟 Windows** · `powershell -ExecutionPolicy Bypass -File .\scripts\generate-certs.ps1`

Después hay que **volver a importar la CA nueva** en los navegadores. Si tenías
la anterior instalada, eliminá `VinculaUP-CA` de los almacenes de confianza
primero.

---

## URLs

| Servicio | URL |
|---|---|
| **App web** | https://vincula-up.local |
| **Keycloak** | http://localhost:8080 |
| **pgAdmin** | http://localhost:5050 |
| **MinIO** (consola) | http://localhost:9001 |
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

Email `admin@vincula-up.com` · Contraseña `admin`
Servidor de BD: host `postgres`, puerto `5432`, base `vinculaup`
Usuario `postgres` · Contraseña `postgres`

> El email de pgAdmin usa un TLD real (`.com`) a propósito: pgAdmin 8.12 rechaza
> `.local` y entra en un bucle de reinicios. Es solo la credencial de esa
> consola, no afecta a la app.

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

La suite se escribe sobre la infraestructura que ya está configurada, así que
al agregar los tests alcanza con correr los comandos habituales:

```bash
# Backend (un módulo por vez)
cd backend/ms-usuarios      && ./mvnw test
cd backend/ms-profesionales && ./mvnw test
cd backend/ms-solicitudes   && ./mvnw test
cd backend/bff-web          && ./mvnw test

# Frontend
cd frontend/vincula-up-web && npm test
```

✅ **Ya está listo para recibirlos:**

- Los cuatro `pom.xml` tienen las dependencias de test (`spring-boot-starter-*-test`).
- `angular.json` conserva el target `test` y `tsconfig.spec.json` sigue presente.
- `tsconfig.app.json` excluye `src/**/*.spec.ts`, así que los specs nunca entran al
  build de producción.

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

**Infraestructura:** Keycloak 26 (OIDC + PKCE) · Nginx 1.27 · Docker Compose · pgAdmin 8 · MinIO (S3)

---

## Documentación

- [`ESPECIFICACION.md`](ESPECIFICACION.md) — fuente única de verdad: arquitectura,
  API completa, modelo de datos, autenticación y RBAC, flujos, geolocalización,
  variables de entorno, infraestructura, estado del MVP y deuda técnica.
- https://v0-vincula-up.vercel.app/ — maqueta de diseño original (v0 / Next.js).
