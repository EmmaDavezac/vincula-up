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

REALM="${KEYCLOAK_REALM:-vincula-up}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
ADMIN_CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-vincula-up-admin}"
ADMIN_CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-vincula-up-admin-secret}"
CONTAINER="${KEYCLOAK_CONTAINER:-vinculaup-keycloak}"
KCADM=/opt/keycloak/bin/kcadm.sh

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
kcadm update "realms/$REALM" \
  -s registrationAllowed=true \
  -s registrationEmailAsUsername=false \
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
echo "Listo. El BFF debe conocer estas credenciales (docker-compose.yml):"
echo "  KEYCLOAK_ADMIN_CLIENT_ID=$ADMIN_CLIENT_ID"
echo "  KEYCLOAK_ADMIN_CLIENT_SECRET=$ADMIN_CLIENT_SECRET"