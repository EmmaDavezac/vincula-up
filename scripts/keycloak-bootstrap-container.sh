#!/usr/bin/env bash
set -euo pipefail

KCADM=/opt/keycloak/bin/kcadm.sh
REALM="${KEYCLOAK_REALM:-vincula-up}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-vincula-up-admin}"
CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-vincula-up-admin-secret}"

printf 'Waiting for Keycloak Admin API...\n'
AUTHENTICATED=false
for _ in $(seq 1 120); do
    if (: >/dev/tcp/keycloak/8080) 2>/dev/null; then
        if "$KCADM" config credentials --server http://keycloak:8080 --realm master \
            --user "$ADMIN_USER" --password "$ADMIN_PASSWORD" >/dev/null 2>&1; then
            AUTHENTICATED=true
            break
        fi
    fi
    sleep 2
done

if [ "$AUTHENTICATED" != true ]; then
    printf 'ERROR: Keycloak Admin API did not become available.\n' >&2
    exit 1
fi

printf 'Keycloak is ready; reconciling realm %s.\n' "$REALM"

# Reconcile realm settings that import-realm applies only on first startup.
"$KCADM" update "realms/$REALM" \
    -s registrationAllowed=true \
    -s registrationEmailAsUsername=true \
    -s loginWithEmailAllowed=true \
    -s duplicateEmailsAllowed=false \
    -s resetPasswordAllowed=true \
    -s emailTheme=vincula-up \
    -s loginTheme=vincula-up
"$KCADM" add-roles -r "$REALM" --rname "default-roles-$REALM" --rolename CLIENTE

# Keep the BFF and the Keycloak service account on the same configured secret.
CLIENT_UUID="$("$KCADM" get clients -r "$REALM" -q "clientId=$CLIENT_ID" \
    --fields id --format csv --noquotes | tail -n 1 | tr -d '\r')"
if [ -z "$CLIENT_UUID" ]; then
    "$KCADM" create clients -r "$REALM" \
        -s "clientId=$CLIENT_ID" \
        -s 'name=Vincula-UP Admin Service Account' \
        -s enabled=true \
        -s publicClient=false \
        -s "secret=$CLIENT_SECRET" \
        -s serviceAccountsEnabled=true \
        -s standardFlowEnabled=false \
        -s directAccessGrantsEnabled=false \
        -s 'protocol=openid-connect'
    CLIENT_UUID="$("$KCADM" get clients -r "$REALM" -q "clientId=$CLIENT_ID" \
        --fields id --format csv --noquotes | tail -n 1 | tr -d '\r')"
else
    "$KCADM" update "clients/$CLIENT_UUID" -r "$REALM" \
        -s publicClient=false \
        -s "secret=$CLIENT_SECRET" \
        -s serviceAccountsEnabled=true
fi

"$KCADM" add-roles -r "$REALM" \
    --uusername "service-account-$CLIENT_ID" \
    --cclientid realm-management \
    --rolename manage-users --rolename view-users --rolename query-users --rolename view-realm

SMTP_REPLY_TO="${KEYCLOAK_SMTP_REPLY_TO:-${KEYCLOAK_SMTP_FROM:-}}"
"$KCADM" update "realms/$REALM" \
    -s "smtpServer.host=${KEYCLOAK_SMTP_HOST:-smtp.gmail.com}" \
    -s "smtpServer.port=${KEYCLOAK_SMTP_PORT:-587}" \
    -s "smtpServer.from=${KEYCLOAK_SMTP_FROM:-}" \
    -s "smtpServer.fromDisplayName=${KEYCLOAK_SMTP_FROM_DISPLAY_NAME:-Vincula-UP}" \
    -s "smtpServer.replyTo=$SMTP_REPLY_TO" \
    -s "smtpServer.starttls=${KEYCLOAK_SMTP_STARTTLS:-true}" \
    -s "smtpServer.auth=${KEYCLOAK_SMTP_AUTH:-true}" \
    -s "smtpServer.user=${KEYCLOAK_SMTP_USER:-}" \
    -s "smtpServer.password=${KEYCLOAK_SMTP_PASSWORD:-}"

printf 'Keycloak realm %s initialized.\n' "$REALM"
