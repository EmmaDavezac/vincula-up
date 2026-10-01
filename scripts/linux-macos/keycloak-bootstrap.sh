#!/usr/bin/env bash
#
# Aplica el flujo de registro de Vincula-UP sobre un realm ya existente.
#
# Por qué existe: `start-dev --import-realm` sólo importa el realm la PRIMERA
# vez. Como Keycloak persiste en Postgres, en una instalación ya en marcha los
# cambios de `keycloak/import/vincula-up-realm.json` (auto-registro de clientes,
# rol CLIENTE por defecto y el client de servicio que promueve a PROFESIONAL)
# no se aplican solos. Este script los aplica de forma idempotente vía kcadm.sh
# sin borrar usuarios ni datos.
#
# Uso:  ./scripts/linux-macos/keycloak-bootstrap.sh
# En Windows:
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1
#
# Requiere: docker compose con el servicio `keycloak` levantado.

set -euo pipefail

# Cargar el .env de la raíz para que las variables de configuración (SMTP
# incluido) estén disponibles. `set -a` las exporta al entorno: sin esto,
# KEYCLOAK_SMTP_PASSWORD queda vacía y el reseteo de contraseña no envía emails.
# Se hace tras `set -euo pipefail` y con tolerance a que el archivo no exista.
# El script vive en scripts/linux-macos/, así que la raíz del repo es dos
# niveles arriba: scripts/linux-macos/ -> scripts/ -> <raíz>.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
  echo "==> Configuración cargada desde $REPO_ROOT/.env"
else
  echo "==> No se encontró .env en la raíz: se usan valores por defecto"
fi

# Invariante del secreto: este script es el ÚNICO camino del .env a Keycloak.
# El import del realm no resuelve sus placeholders ${env.*} (ver
# keycloak/import/README.md), así que si rotás KEYCLOAK_ADMIN_CLIENT_SECRET hay
# que volver a correr esto. Si no, el BFF pide tokens con un secreto y Keycloak
# responde 401: la promoción de rol falla en silencio, solo con un warning.
REALM="${KEYCLOAK_REALM:-vincula-up}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
ADMIN_CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-vincula-up-admin}"
ADMIN_CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-vincula-up-admin-secret}"
# Client público del frontend. Su redirectUris se sincronizan más abajo leyendo el
# JSON del import, que es la fuente de verdad.
PUBLIC_CLIENT_ID="${KEYCLOAK_PUBLIC_CLIENT_ID:-vincula-up-public}"
CONTAINER="${KEYCLOAK_CONTAINER:-vinculaup-keycloak}"
KCADM=/opt/keycloak/bin/kcadm.sh

# El default de demo es público (está en el repositorio). Se avisa fuerte para
# que nadie exponga el stack creyendo que tiene un secreto propio.
SECRETO_DEMO="vincula-up-admin-secret"
if [ "$ADMIN_CLIENT_SECRET" = "$SECRETO_DEMO" ]; then
  echo
  echo "  AVISO: se está usando el secreto de demo de $ADMIN_CLIENT_ID, que es"
  echo "  PÚBLICO. Alcanza para local, pero cualquiera que lea el repositorio"
  echo "  puede pedir un token de servicio y promover cuentas a PROFESIONAL."
  echo "  Para rotarlo: generá uno (openssl rand -hex 24), ponelo en"
  echo "  KEYCLOAK_ADMIN_CLIENT_SECRET del .env y volvé a correr este script."
  echo
fi

kcadm() {
  docker exec -i "$CONTAINER" "$KCADM" "$@"
}

echo "==> Esperando a Keycloak..."
for _ in $(seq 1 30); do
  if kcadm config credentials --server http://localhost:8080 --realm master \
      --user "$ADMIN_USER" --password "$ADMIN_PASSWORD" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
echo "==> Autenticado como $ADMIN_USER"

echo "==> Habilitando auto-registro y rol CLIENTE por defecto en el realm $REALM"
# `registrationEmailAsUsername=true` hace que el registro pida SOLO el correo y lo
# use como nombre de usuario interno. La aplicación se accede por email, así que
# pedir además un "nombre de usuario" era un campo de más que nadie recordaba.
kcadm update "realms/$REALM" \
  -s registrationAllowed=true \
  -s registrationEmailAsUsername=true \
  -s loginWithEmailAllowed=true \
  -s duplicateEmailsAllowed=false \
  -s resetPasswordAllowed=true

# El rol CLIENTE se agrega al compuesto `default-roles-<realm>`: así toda cuenta
# que se auto-registre entra como cliente y el BFF acepta su rol de negocio.
kcadm add-roles -r "$REALM" --rname "default-roles-$REALM" --rolename CLIENTE

echo "==> Verificando el client de servicio $ADMIN_CLIENT_ID"
CLIENT_UUID="$(kcadm get clients -r "$REALM" -q clientId="$ADMIN_CLIENT_ID" --fields id --format csv --noquotes | tail -n 1 || true)"
if [ -z "${CLIENT_UUID:-}" ]; then
  kcadm create clients -r "$REALM" \
    -s clientId="$ADMIN_CLIENT_ID" \
    -s name="Vincula-UP Admin Service Account" \
    -s enabled=true \
    -s publicClient=false \
    -s secret="$ADMIN_CLIENT_SECRET" \
    -s serviceAccountsEnabled=true \
    -s standardFlowEnabled=false \
    -s directAccessGrantsEnabled=false \
    -s 'protocol=openid-connect'
  echo "    client creado"
  CLIENT_UUID="$(kcadm get clients -r "$REALM" -q clientId="$ADMIN_CLIENT_ID" --fields id --format csv --noquotes | tail -n 1)"
else
  kcadm update "clients/$CLIENT_UUID" -r "$REALM" \
    -s publicClient=false \
    -s secret="$ADMIN_CLIENT_SECRET" \
    -s serviceAccountsEnabled=true
  echo "    client ya existía: se actualizaron secret y service account"
fi

echo "==> Sincronizando el client público $PUBLIC_CLIENT_ID con el JSON del import"
# Por qué leer el JSON y no hardcodear la lista: `keycloak/import/vincula-up-realm.json`
# es la fuente de verdad de redirectUris/webOrigins (y lo que se aplica al crear el
# realm). Copiar los valores acá sería una segunda lista que se desincroniza sola.
# Con `https://*` en esa lista, los túneles de Cloudflare de demo funcionan sin
# tocar nada cada vez que cloudflared genera una URL nueva.
PUBLIC_CLIENT_UUID="$(kcadm get clients -r "$REALM" -q clientId="$PUBLIC_CLIENT_ID" --fields id --format csv --noquotes | tail -n 1 || true)"
if [ -z "${PUBLIC_CLIENT_UUID:-}" ]; then
  echo "    AVISO: el client $PUBLIC_CLIENT_ID no existe en el realm $REALM."
  echo "    No se toca nada: probablemente falte importar el realm."
elif ! command -v python3 >/dev/null 2>&1; then
  echo "    OMITIDO: se necesita python3 para leer el JSON del import."
  echo "    Sincronizá redirectUris a mano desde la consola de administración."
else
  PUBLIC_CLIENT_JSON="$REPO_ROOT/keycloak/import/vincula-up-realm.json"
  # Una sola lectura del JSON: la primera línea es redirectUris, la segunda webOrigins.
  CLIENT_CONFIG="$(python3 -c '
import json, sys
for c in json.load(open(sys.argv[1])).get("clients", []):
    if c.get("clientId") == sys.argv[2]:
        print(json.dumps(c.get("redirectUris", [])))
        print(json.dumps(c.get("webOrigins", [])))
        break
' "$PUBLIC_CLIENT_JSON" "$PUBLIC_CLIENT_ID" 2>/dev/null || true)"
  REDIRECT_URIS="$(printf '%s\n' "$CLIENT_CONFIG" | sed -n 1p)"
  WEB_ORIGINS="$(printf '%s\n' "$CLIENT_CONFIG" | sed -n 2p)"
  if [ -z "${REDIRECT_URIS:-}" ] || [ "$REDIRECT_URIS" = "[]" ]; then
    echo "    AVISO: no se pudo leer redirectUris de $PUBLIC_CLIENT_JSON. No se toca nada."
  else
    # `attributes."..."` con notación de puntos fija UNA clave sin pisar el resto.
    kcadm update "clients/$PUBLIC_CLIENT_UUID" -r "$REALM" \
      -s "redirectUris=$REDIRECT_URIS" \
      -s "webOrigins=${WEB_ORIGINS:-[]}" \
      -s 'attributes."pkce.code.challenge.method"=S256'
    echo "    redirectUris aplicado: $REDIRECT_URIS"
  fi
fi

echo "==> Otorgando permisos de administración de usuarios al service account"
kcadm add-roles -r "$REALM" \
  --uusername "service-account-$ADMIN_CLIENT_ID" \
  --cclientid realm-management \
  --rolename manage-users --rolename view-users --rolename query-users --rolename view-realm

echo "==> Configurando SMTP del realm $REALM (recupero de contraseña)"
echo "    Lee KEYCLOAK_SMTP_* del entorno (.env). Sin password, el reseteo"
echo "    queda habilitado en el realm pero Keycloak no puede enviar emails."
kcadm update "realms/$REALM" \
  -s "smtpServer.host=${KEYCLOAK_SMTP_HOST:-smtp.gmail.com}" \
  -s "smtpServer.port=${KEYCLOAK_SMTP_PORT:-587}" \
  -s "smtpServer.from=${KEYCLOAK_SMTP_FROM:-}" \
  -s "smtpServer.fromDisplayName=${KEYCLOAK_SMTP_FROM_DISPLAY_NAME:-Vincula-UP}" \
  -s "smtpServer.replyTo=${KEYCLOAK_SMTP_FROM:-}" \
  -s "smtpServer.starttls=${KEYCLOAK_SMTP_STARTTLS:-true}" \
  -s "smtpServer.auth=${KEYCLOAK_SMTP_AUTH:-true}" \
  -s "smtpServer.user=${KEYCLOAK_SMTP_USER:-}" \
  -s "smtpServer.password=${KEYCLOAK_SMTP_PASSWORD:-}"

if [ -n "${KEYCLOAK_SMTP_PASSWORD:-}" ]; then
  echo "    (SMTP aplicado; la verificación se hace con '¿Olvidó su contraseña?' en el login)"
else
  echo "    (sin KEYCLOAK_SMTP_PASSWORD: se omite el test de conexión)"
fi

echo
echo "Listo."
echo "  Client de servicio : $ADMIN_CLIENT_ID"
if [ "$ADMIN_CLIENT_SECRET" = "$SECRETO_DEMO" ]; then
  echo "  Secreto            : el de DEMO, que es público. Rotar antes de exponer."
else
  echo "  Secreto            : propio (no se imprime)."
fi
echo
echo "Si rotaste el secreto, el BFF quedó con el valor viejo. Recrealo:"
echo "  docker compose up -d --force-recreate bff-web"