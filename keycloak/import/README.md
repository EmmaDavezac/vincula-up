# `keycloak/import/`

`vincula-up-realm.json` es el realm que Keycloak importa **una sola vez**, en su
primer arranque (`start-dev --import-realm`, montado en `/opt/keycloak/data/import`).
Keycloak persiste el realm en Postgres: si el realm ya existe, el import **se
saltea** y este archivo deja de tener efecto.

## Lo que este archivo NO hace

El `smtpServer` y el `secret` del client `vincula-up-admin` que están acá son
**defaults de primera importación**, no la configuración del stack. El `.env` no
llega hasta acá.

La intención original era que los placeholders `${env.KEYCLOAK_*}` se resolvieran
contra el entorno del contenedor. **No lo hacen.** Verificado con Keycloak
26.3.3 y `start-dev --import-realm`, con las variables presentes en el contenedor:

| Sintaxis en el JSON          | Queda guardado  | Qué pasó                                  |
|------------------------------|-----------------|-------------------------------------------|
| `${env.MYENV:NO_ENV}`        | `NO_ENV`        | usó el default e ignoró el env var         |
| `${env.MYENV}` (sin default) | `${env.MYENV}`  | quedó el **literal**, sin resolver         |
| `${env.KC_LOG_LEVEL:NO_KC}`  | `NO_KC`         | ignoró incluso una opción real de Keycloak |
| `${env.HOME:NO_HOME}`        | `NO_HOME`       | ignoró `HOME`, que existe siempre          |

O sea: la sustitución siempre toma la parte del default. El caso sin default es
peor, porque guarda la cadena `${env.X}` como si fuera un secreto válido.

Por eso en este archivo los valores van **literales**: es lo que Keycloak
resolvía igual, pero así se lee lo que de verdad queda guardado.

> El issue de Keycloak [#20199](https://github.com/keycloak/keycloak/issues/20199)
> reporta el mismo comportamiento. La documentación de Keycloak describe la
> función, pero en este escenario no opera.

## Entonces, ¿cómo se configura el realm?

Con los scripts de reconciliación, que usan la Admin API (`kcadm.sh`) y **sí**
leen el `.env`:

```bash
./scripts/linux-macos/keycloak-bootstrap.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1
```

Son idempotentes y aplican, sobre un realm ya en marcha: el auto-registro, el rol
`CLIENTE` por defecto, el client de servicio `vincula-up-admin` (con su **secret**
tomado de `KEYCLOAK_ADMIN_CLIENT_SECRET`) y el **SMTP**.

**Regla práctica:** si cambiás algo de identidad o de SMTP en el `.env`, volvé a
correr el bootstrap. Es el único camino del `.env` a Keycloak.

## Si querés que el import vuelva a correr

Como el import se saltea si el realm existe, para que este archivo vuelva a
mandar hay que borrar el realm junto con el volumen:

```bash
docker compose down -v && docker compose up --build
```

Perdés todos los usuarios y los datos cargados. Para cambios incrementales, el
bootstrap es el camino.

## Credenciales de demo que viven acá

| Qué | Valor | Nota |
|---|---|---|
| `secret` de `vincula-up-admin` | `vincula-up-admin-secret` | **Público**: rotar antes de exponer el stack (ver el README principal) |
| `smtpServer` | vacío salvo host y puerto | El bootstrap lo completa desde el `.env` |
| `cliente@vincula-up.local` | contraseña `password` | Cuenta de prueba del seed |
| `profesional@vincula-up.local` | contraseña `password` | Cuenta de prueba del seed |
| `admin@vincula-up.local` | contraseña `password` | Cuenta de prueba del seed |
