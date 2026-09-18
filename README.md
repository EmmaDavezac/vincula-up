# Vincula-UP

Plataforma de vinculación entre profesionales y clientes, compuesta por microservicios Spring Boot, un BFF (Backend for Frontend), frontend Angular y autenticación con Keycloak.

---

## Arquitectura

```
https://vincula-up.local  (nginx :443/:80)
        │
        ├── /           → Angular SPA
        ├── /api/       → BFF Spring Boot (:9001)
        └── /realms/    → Keycloak (:8080)

BFF → ms-usuarios      (:8081)
    → ms-profesionales (:8082)
    → ms-solicitudes   (:8083)

Todos los servicios → PostgreSQL (:5432)
```

---

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) >= 24
- [Docker Compose](https://docs.docker.com/compose/) >= 2.20
- `openssl` (para generar certificados, incluido en Linux/macOS)

---

## 1. Configurar el dominio local

Agregar `vincula-up.local` a `/etc/hosts`:

```bash
echo "127.0.0.1 vincula-up.local" | sudo tee -a /etc/hosts
```

Verificar:
```bash
ping -c1 vincula-up.local   # debe responder desde 127.0.0.1
```

---

## 2. Certificado TLS autofirmado

El repositorio ya incluye un certificado en `nginx/certs/`. Si querés regenerarlo:

Los navegadores modernos requieren **dos certificados separados**: una CA y un certificado de servidor firmado por ella.

```bash
cd nginx/certs

# 1. Generar la CA (ésta se importa en el navegador)
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 825 \
  -out ca.crt \
  -subj "/CN=VinculaUP-CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# 2. Generar clave y CSR del servidor
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

> El repositorio ya incluye estos certificados generados. Solo necesitás importar `ca.crt` en el navegador.

### Importar la CA en el navegador

**Firefox:**  
Configuración → Privacidad y Seguridad → Ver Certificados → **Autoridades** → Importar → seleccionar `nginx/certs/ca.crt`  
✅ Marcar *"Confiar en esta CA para identificar sitios web"*

**Linux – Chrome/Chromium:**
```bash
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," \
  -n "VinculaUP-CA" -i nginx/certs/ca.crt
```

> ⚠️ Importar siempre `ca.crt` (la CA), **nunca** `server.crt`.

---

## 3. Levantar la aplicación

```bash
docker compose up --build
```

> La primera vez descarga imágenes y compila todo (~3-5 min).

Para correr en segundo plano:
```bash
docker compose up --build -d
```

Ver logs en tiempo real:
```bash
docker compose logs -f
```

---

## 4. URLs de acceso

| Servicio | URL |
|---|---|
| **App web** | https://vincula-up.local |
| **Keycloak Admin** | http://localhost:8080 |
| **pgAdmin** | http://localhost:5050 |
| **BFF API** | http://localhost:9001 |

---

## 5. Credenciales por defecto

### Keycloak Admin
| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin` |

### Usuarios de prueba (realm `vincula-up`)
| Rol | Usuario | Contraseña |
|---|---|---|
| Cliente | `cliente@vincula-up.local` | `password` |
| Profesional | `profesional@vincula-up.local` | `password` |
| Admin | `admin@vincula-up.local` | `password` |

### pgAdmin
| Campo | Valor |
|---|---|
| Email | `admin@vincula-up.local` |
| Contraseña | `admin` |
| Host BD | `postgres` · Puerto `5432` · BD `vinculaup` |
| Usuario BD | `postgres` · Contraseña `postgres` |

---

## 6. Verificar servicios

```bash
curl -k https://vincula-up.local                # Frontend
curl http://localhost:9001/actuator/health       # BFF
curl http://localhost:8081/actuator/health       # ms-usuarios
curl http://localhost:8082/actuator/health       # ms-profesionales
curl http://localhost:8083/actuator/health       # ms-solicitudes
```

---

## 7. Detener la aplicación

```bash
docker compose down          # detiene y elimina contenedores
docker compose down -v       # también elimina volúmenes (borra la BD)
```

---

## 8. Comandos útiles

```bash
# Logs de un servicio
docker compose logs -f ms-profesionales

# Reiniciar un servicio
docker compose restart ms-usuarios

# Reconstruir y relanzar un servicio
docker compose build ms-profesionales && docker compose up -d ms-profesionales

# Estado de contenedores
docker compose ps
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz para sobreescribir valores por defecto:

```env
POSTGRES_DB=vinculaup
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=jdbc:postgresql://postgres:5432/vinculaup
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JPA_DDL_AUTO=update
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_HOSTNAME=vincula-up.local
KEYCLOAK_ISSUER_URI=http://keycloak:8080/realms/vincula-up
PGADMIN_DEFAULT_EMAIL=admin@vincula-up.local
PGADMIN_DEFAULT_PASSWORD=admin
```
