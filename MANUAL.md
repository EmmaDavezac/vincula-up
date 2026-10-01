# Manual de Vincula-UP

Cómo se usa y se opera la aplicación una vez levantada. Para el arranque desde
cero, ver el [`README.md`](README.md); para el diseño técnico, la
[`ESPECIFICACION.md`](ESPECIFICACION.md).

---

## Servicios y accesos

| Servicio | URL | Credenciales |
|---|---|---|
| **App web** | https://vincula-up.local | usuario de prueba (abajo) |
| **Keycloak** (login) | http://localhost:8080 | `admin` / `admin` |
| **pgAdmin** (base de datos) | http://localhost:5050 | `admin@vincula-up.com` / `admin` |
| **BFF API** | http://localhost:9001/api/... | pide token; ver abajo |
| Postgres | `localhost:5432` (host) | base `vinculaup` · `postgres` / `postgres` |

### Lo que encuentra el visitante

- `/terminos` — términos y condiciones, que incluyen la política de datos y
  cookies. La aceptación es obligatoria la primera vez que se entra.
- `/preguntas-frecuentes` — catorce preguntas agrupadas por momento de uso.
- La portada explica en un párrafo qué es la plataforma y qué ofrece cada rol.
- Selector de tema **claro / oscuro / sistema** en la navbar, sin iniciar sesión.

Ver [Términos, datos y cookies](#términos-datos-y-cookies) y
[Tema claro y oscuro](#tema-claro-y-oscuro).

### La aplicación

`https://vincula-up.local` · usuarios de prueba (todos con contraseña `password`):

| Rol | Email | Qué puede hacer |
|---|---|---|
| Cliente | `cliente@vincula-up.local` | Pedir un técnico, chatear, calificar |
| Profesional | `profesional@vincula-up.local` | Activar perfil, aceptar trabajos, chatear |
| Administrador | `admin@vincula-up.local` | Padrón, categorías, clientes, métricas |

> Las tres cuentas se siembran con su rol ya asignado (CLIENTE, PROFESIONAL y
> ADMIN), así que entran derecho a su sección desde el primer arranque: el
> administrador va a `/admin` y el profesional a `/solicitudes`, sin pasar por
> `/activar-perfil`.
>
> La única diferencia es que **a las tres les aparece el modal de los términos**
> la primera vez, porque la aceptación es obligatoria para cualquier cuenta.

### Se accede con el email, no con nombre de usuario

El login de Keycloak pide **solo el correo**. El realm tiene
`registrationEmailAsUsername: true`, así que el formulario de registro no muestra
campo "nombre de usuario" y usa el correo como identificador interno.

> Si el realm ya venía corriendo, el cambio no se aplica solo: hay que correr el
> bootstrap, que es idempotente y no toca usuarios.
>
> ```bash
> ./scripts/linux-macos/keycloak-bootstrap.sh
> # o, en Windows:
> powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1
> ```

### Los mapas

La activación del perfil usa **Leaflet con tiles de OpenStreetMap**: la vista de
referencia del paso 2 y el modal "Ajustar en el mapa". Los dos son mapas reales,
no ilustraciones. En tema oscuro las tiles se invierten con un filtro, así que no
se ve el cuadrado blanco de OpenStreetMap en medio de la pantalla oscura.

> Leaflet se carga desde unpkg por CDN: hace falta internet para que los mapas se
> vean. Es la única parte de la app que depende de un tercero en el cliente.

### Botones y etiquetas

Cinco variantes (`.vu-btn--ink`, `--coral`, `--outline`, `--quiet`, `--danger`) y
tres reglas de rótulo:

| Rótulo | Para qué |
|---|---|
| `Nuevo` / `Nueva` | Abre un formulario de alta |
| `Guardar` | Confirma el envío de un formulario |
| Verbo de la acción | Todo lo demás ("Desactivar", "Eliminar") |

**El hover solo cambia el color** (fondo, borde o texto). Ningún botón se levanta,
escala ni se desplaza: un hover que mueve píxeles empuja el contenido de abajo y
se lee como un salto. La variante `quiet` lleva borde justamente para que se vea
sobre el papel claro: transparente y sin borde, un botón es solo una palabra
suelta.

Las reglas completas, con el porqué, están en
[ESPECIFICACION §17.4-17.7](ESPECIFICACION.md#174-botones-qué-hace-cada-variante-y-cómo-se-mueve).

### Altas del panel

El alta de un profesional y la de una categoría son **pantallas propias**
(`/admin/profesionales/nuevo` y `/admin/categorias/nueva`), no un formulario
abierto encima del listado. Con la grilla cargada, el formulario quedaba arriba de
veinte tarjetas.

### pgAdmin — ver la base de datos

1. Abrí **http://localhost:5050** e ingresá con `admin@vincula-up.com` / `admin`.
2. Es la **primera** vez: pgAdmin no tiene servidores cargados. Menú
   **Servers → Add Server** (o el ícono de enchufe, arriba a la izquierda).
3. Completá:

   | Campo | Valor |
   |---|---|
   | Name | `vincula-up` (lo que quieras) |
   | Host | `postgres` ← **no** `localhost` |
   | Port | `5432` |
   | Maintenance database | `vinculaup` |
   | Username | `postgres` |
   | Password | `postgres` |

4. **Save**. Te conectás y podés navegar `Schemas → public → Tables`.

> **¿Por qué el host es `postgres` y no `localhost`?** pgAdmin corre *dentro* de
> Docker. Desde ahí, `localhost` es el propio contenedor de pgAdmin; el nombre
> `postgres` es el servicio de base de datos en la red de Docker.
> (Para conectarte desde una app en tu máquina, ahí sí va `localhost`.)

> El email de pgAdmin usa un TLD real (`.com`) a propósito: pgAdmin 8.12 rechaza
> `.local` y entra en un bucle de reinicios. Es solo la credencial de esa
> consola, no afecta a la app.

### Keycloak — identidades, roles y usuarios

1. Abrí **http://localhost:8080**, entrá con `admin` / `admin`.
2. Arriba a la izquierda, elegí el realm **`vincula-up`** (no `master`).
3. Desde ahí:

| Sección | Qué muestra |
|---|---|
| **Users** | Las cuentas. `cliente@`, `profesional@`, `admin@` son las de prueba |
| **Clients** | `vincula-up-public` (la app) y `vincula-up-admin` (el client de servicio) |
| **Roles** | `CLIENTE`, `PROFESIONAL`, `ADMIN` |
| **Realm settings → Email** | Configuración de SMTP para recuperar contraseñas |

> El primer ingreso de un profesional invitado lo **promueve** de `CLIENTE` a
> `PROFESIONAL` automáticamente (si el email estaba prerregistrado en el padrón).
> Esa promoción necesita el **secreto del client de servicio**, que tiene que
> coincidir en Keycloak y en el BFF: ver
> [El secreto del client de servicio](#el-secreto-del-client-de-servicio).

### BFF API (para depurar)

No se navega: expone JSON y pide token. Se consulta con `curl`:
```bash
# Listado público de profesionales (no pide token)
curl -s http://localhost:9001/api/profesionales

# Un endpoint que sí pide token: primero conseguís uno
TOKEN=$(curl -s -X POST http://localhost:8080/realms/vincula-up/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' -d 'client_id=vincula-up-public' \
  -d 'username=admin@vincula-up.local' -d 'password=password' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9001/api/usuarios
```

> **Por qué no se abre `http://localhost:8081` (ms-usuarios) ni `:8082`,
> `:8083` en el navegador:** esos microservicios internos no validan tokens ni
> aplican permisos. Sus puertos están publicados **solo en `127.0.0.1`** (la
> propia máquina), nunca en la red. Todo el tráfico de la app pasa por nginx y
> el BFF, que sí valida el token.

### Datos de demostración

Con `SEMBRAR_DEMO=true` (por defecto) se siembran las 3 cuentas de prueba (con
su rol), 6 especialidades, un profesional de ejemplo con disponibilidad, y **4
solicitudes en distintos estados** (pendiente, aceptada con chat, completada y
calificada, rechazada) para que los listados no se vean vacíos.

> Las **solicitudes** solo se siembran si el profesional de ejemplo tiene su
> cuenta resuelta. Es automático: al sembrar las cuentas, `ms-profesionales`
> encuentra la de `profesional@` y el perfil `P-2001` ya queda bien enlazado. Si
> igual salen vacías, reiniciá `docker compose restart ms-solicitudes`.

Para una base limpia: `SEMBRAR_DEMO=false` en el `.env`, y
`docker compose down -v && docker compose up --build` (hay que recrear el
volumen para que el cambio aplique).

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

> Desde tu máquina, la base se alcanza en `localhost:5432` (el puerto está
> publicado en el host). Dentro de la red de Docker, el host es `postgres`.

---

## El secreto del client de servicio

El BFF usa un *client de servicio* de Keycloak (`vincula-up-admin`) para promover
a PROFESIONAL al profesional invitado, en su primer ingreso. Ese client tiene un
secreto, y **el mismo valor tiene que estar en dos lados**: en el BFF y en
Keycloak. La fuente de verdad es una sola variable del `.env`:

```text
.env (KEYCLOAK_ADMIN_CLIENT_SECRET)
  ├─ docker-compose.yml  →  BFF        (env del contenedor, al arrancar)
  └─ scripts/*/keycloak-bootstrap.*  →  Keycloak   (Admin API, al correr el script)
```

**Por qué el bootstrap y no el import del realm.** Lo natural sería que
`keycloak/import/vincula-up-realm.json` leyera el `.env`, pero no funciona: los
placeholders `${env.*}` de ese archivo **no se resuelven** contra el entorno del
contenedor (verificado en Keycloak 26.3.3, con las variables presentes). El
import siempre toma el valor por defecto, y si el placeholder no tiene default
guarda la cadena literal `${env.X}` como si fuera el secreto. La tabla de la
prueba está en [`keycloak/import/README.md`](keycloak/import/README.md).

Y como el import del realm **solo corre una vez** (el realm persiste en Postgres),
el bootstrap es lo que reconcilia un Keycloak ya en marcha.

**Si lo dejás vacío en el `.env`.** Rige el default de demo,
`vincula-up-admin-secret`, y el stack funciona: el BFF y Keycloak quedan con el
mismo valor. Pero ese secreto está **en el repositorio**, o sea que es público:
quien lo lea puede pedir un token de servicio y promover cuentas a PROFESIONAL.
Alcanza para local, no para algo expuesto. Lo avisan el BFF en el log y el
bootstrap en su salida.

**Cómo rotarlo:**

```bash
openssl rand -hex 24                            # 1. generá el secreto
#   2. pegalo en KEYCLOAK_ADMIN_CLIENT_SECRET del .env
./scripts/linux-macos/keycloak-bootstrap.sh     # 3. es lo ÚNICO que lo copia a Keycloak
docker compose up -d --force-recreate bff-web   # 4. que el BFF lea el valor nuevo
```

En Windows, el paso 3 es
`powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1`.

Los pasos 3 y 4 no son opcionales. Sin el 3, Keycloak sigue con el secreto viejo
y el BFF recibe **401** al pedir el token; sin el 4, el BFF sigue con el viejo.
El síntoma en los dos casos es el mismo y **no hay error visible**: el
profesional invitado entra y sigue siendo CLIENTE, sin promoción de rol.

**Si le pasás el proyecto a otra persona.** El `.env` tiene los secretos, así que
está en `.gitignore` y **no viaja con el repo**: hay que pasarlo aparte (junto con
la CA, si va a entrar por HTTPS). Con tu `.env` puesto, su primer arranque queda
así:

| Paso | Quién tiene el secreto |
|---|---|
| `docker compose up --build` | El **BFF** ya lo tiene: viene en el `.env`. Keycloak todavía tiene el **de demo**, porque el import usó el JSON versionado |
| `./scripts/.../keycloak-bootstrap.sh` | Keycloak pasa a tener el mismo que el BFF |

Por eso, en una máquina nueva, el bootstrap **no es opcional**: además del
auto-registro, es lo que alinea el secreto. Si se lo saltea, el síntoma es el de
siempre: el profesional invitado entra y sigue siendo CLIENTE, sin que aparezca
ningún error.

---

## Certificados TLS

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

## Desarrollo

### Compilar

```bash
# Frontend
cd frontend/vincula-up-web && npm run build

# Backend (un módulo por vez; no hay reactor raíz)
cd backend/ms-usuarios      && ./mvnw package -DskipTests
cd backend/ms-profesionales && ./mvnw package -DskipTests
cd backend/ms-solicitudes   && ./mvnw package -DskipTests
cd backend/bff-web          && ./mvnw package -DskipTests
```

### Tests

La suite **todavía no está escrita**: hoy hay 0 tests. La infraestructura está
lista, así que al agregarlos alcanza con correr los comandos habituales:

```bash
# Backend (un módulo por vez; no hay reactor raíz)
cd backend/ms-usuarios      && ./mvnw test
cd backend/ms-profesionales && ./mvnw test
cd backend/ms-solicitudes   && ./mvnw test
cd backend/bff-web          && ./mvnw test

# Frontend
cd frontend/vincula-up-web && npm test
```

**Ya está listo para recibirlos:**

- Los cuatro `pom.xml` traen las dependencias de test de Spring Boot 4
  (`spring-boot-starter-*-test`: actuator, validation y webmvc).
- `angular.json` conserva el target `test` y `tsconfig.spec.json` sigue presente.
- `tsconfig.app.json` excluye `src/**/*.spec.ts`, así que los specs nunca entran
  al build de producción.

> Usá `npm test` y no `npx vitest run`: el runner directo no carga la configuración
> de Angular y falla con `describe is not defined`.

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

### Si venís de una versión anterior

Cambió el esquema de la base: las coordenadas ahora se guardan cifradas (texto en
vez de número) y `foto_url` pasó a ser una clave corta en vez de una imagen en
base 64. Con `docker compose down -v` se recrea todo limpio.

Con la misma actualización, las fotos dejaron de servirse como archivos públicos
en `/fotos/` y ahora pasan por `GET /api/usuarios/{id}/foto`, que exige sesión. Si
venís de una versión anterior, cerrá sesión o recargá la página: si no, el perfil
guardado en el navegador sigue esperando la foto por la URL vieja.

También se agregaron las columnas `terminos_version` y `terminos_aceptado_en`. Se
crean solas por el `ddl-auto`, y las cuentas que ya existían quedan con la
aceptación pendiente: la primera vez que volvés a entrar se pide aceptar los
términos.

---

## Términos, datos y cookies

La ruta es `/terminos` y no requiere sesión: cualquiera puede leerla antes de
registrarse.

**El documento incluye la política de datos y cookies.** No hay página aparte ni
cartel de consentimiento, porque la aplicación no usa cookies de terceros,
publicitarias ni de analítica: un banner que se puede aceptar sin leer no
informaría a nadie.

**La aceptación es obligatoria y se pide una sola vez.** La primera vez que se
entra con una cuenta, un modal cubre la aplicación y no se puede cerrar: hay que
leer y marcar el casillero. Al aceptar, quedan guardados la versión del documento
y la fecha.

```text
GET  /api/usuarios/yo          →  terminosVersion, terminosAceptadoEn
PATCH /api/terminos/aceptar    →  registra la aceptación (el id sale del token)
```

El backend expone la versión y la fecha en la respuesta de `GET /api/usuarios/yo`
que la app ya llamaba; el frontend compara esa versión con la que tiene cargada
y muestra el modal si difieren.

**Si se edita el texto, hay que subir la versión.** Está en `VERSION_TERMINOS`
(`frontend/vincula-up-web/src/app/legal/terminos/terminos.ts`). Si el texto
cambia y la versión no, el sistema no vuelve a pedir la aceptación.

> Los términos son un documento de proyecto educativo. Antes de una salida real
> conviene que los revise alguien del proyecto. Contacto:
> `vinculaup@gmail.com`.

---

## Tema claro y oscuro

Tres estados: **claro**, **oscuro** y **sistema**. La primera visita usa
`sistema`, que respeta el ajuste del sistema operativo; después manda la
elección, guardada en `localStorage` bajo `vincula-up-tema`.

El botón está en la navbar, antes del menú de usuario, y funciona sin sesión.

**Cómo se aplica.** Como atributo `data-tema` en `<html>`. Un script inline en
`index.html` lo pone **antes** de que arranque Angular, para que no haya un
destello blanco en cada recarga. Si se cambia ese script, hay que cambiar también
`TemaService`: misma clave y mismos valores.

**Verificar que el tema claro no se rompió.** Todos los colores de la
aplicación son custom properties de `src/styles.css`. El chequeo es que ningún
componente escriba un color literal:

```bash
cd frontend/vincula-up-web
# colores literales fuera de styles.css
grep -rnE '#[0-9a-fA-F]{3,8}\b' src/app --include='*.css' | grep -v '\-\-'
```

Salida esperada: **1**, y es deliberado —

```text
src/app/shared/confirm/confirm.css:103:  background: #a5382b;   # botón de peligro
```

Cualquier otra línea es un color que el tema oscuro no alcanza.

**El icono de la pestaña es la excepción.** `public/favicon.svg` lleva los dos
colores escritos (el coral de la marca y blanco) y no sigue el tema: el navegador
lo pinta fuera de la página, donde `data-tema` no llega. El coral es un tono medio
que se lee bien igual sobre una barra de pestañas clara y sobre una oscura, así que
no hace falta una variante por tema. La comprobación de arriba no lo ve porque solo
mira archivos `.css`.

De ese mismo dibujo salen `public/favicon.ico` (16, 32 y 48 px, para la pestaña y
los marcadores) y `public/apple-touch-icon.png` (180 px, para iOS, que ignora los
otros dos al agregar el sitio a la pantalla de inicio). Los tres archivos están
versionados: si cambia la marca hay que rehacer los tres, no solo el SVG.
