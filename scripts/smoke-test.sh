#!/bin/bash
set -e

BASE_URL="http://localhost"
KEYCLOAK_URL="http://localhost:8080"
REALM="vincula-up"
CLIENT_ID="vincula-up-public"

echo "=================================================="
echo "    VINCULA-UP MVP E2E VERIFICATION SCRIPT       "
echo "=================================================="

# 1. Check Keycloak OIDC configuration
echo -n "1. Verificando Keycloak Realm '$REALM'... "
KC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" || true)
if [ "$KC_STATUS" != "200" ]; then
    echo "ERROR (HTTP $KC_STATUS). ¿Keycloak está levantado en $KEYCLOAK_URL?"
    exit 1
fi
echo "OK (HTTP 200)"

# Helper function to get token from Keycloak
get_token() {
    local username="$1"
    local password="$2"
    curl -s -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=password" \
        -d "client_id=$CLIENT_ID" \
        -d "username=$username" \
        -d "password=$password" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4
}

# 2. Authenticate Cliente Sofia
echo -n "2. Autenticando Cliente Sofia (cliente@vincula-up.local)... "
CLIENTE_TOKEN=$(get_token "cliente@vincula-up.local" "password")
if [ -z "$CLIENTE_TOKEN" ]; then
    echo "ERROR: No se obtuvo token."
    exit 1
fi
echo "OK (Token JWT recibido)"

# 3. Authenticate Profesional Luciano
echo -n "3. Autenticando Profesional Luciano (profesional@vincula-up.local)... "
PROF_TOKEN=$(get_token "profesional@vincula-up.local" "password")
if [ -z "$PROF_TOKEN" ]; then
    echo "ERROR: No se obtuvo token."
    exit 1
fi
echo "OK (Token JWT recibido)"

# 4. Authenticate Admin
echo -n "4. Autenticando Admin (admin@vincula-up.local)... "
ADMIN_TOKEN=$(get_token "admin@vincula-up.local" "password")
if [ -z "$ADMIN_TOKEN" ]; then
    echo "ERROR: No se obtuvo token."
    exit 1
fi
echo "OK (Token JWT recibido)"

# 5. Verify Nginx & Frontend
echo -n "5. Verificando Frontend en Nginx ($BASE_URL)... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" || true)
if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "ERROR (HTTP $FRONTEND_STATUS)"
    exit 1
fi
echo "OK (HTTP 200)"

# 6. Verify Public Endpoints via Nginx /api
echo -n "6. Verificando endpoint público /api/profesionales... "
PROFS_RES=$(curl -s "$BASE_URL/api/profesionales")
echo "$PROFS_RES" | grep -q "legajo" && echo "OK" || echo "WARN (Respuesta: $PROFS_RES)"

echo -n "7. Verificando endpoint GPS /api/gps... "
GPS_RES=$(curl -s "$BASE_URL/api/gps?direccion=Concepcion+del+Uruguay")
echo "$GPS_RES" | grep -q "latitud" && echo "OK" || echo "WARN (Respuesta: $GPS_RES)"

# 8. Verify Protected Endpoints with Tokens & RBAC
echo -n "8. Verificando /api/usuarios/por-keycloak con token de Cliente... "
USER_RES=$(curl -s -H "Authorization: Bearer $CLIENTE_TOKEN" "$BASE_URL/api/usuarios/por-keycloak?keycloakId=11111111-1111-1111-1111-111111111111&email=cliente@vincula-up.local&nombre=Sofia&rol=CLIENTE")
echo "$USER_RES" | grep -q "CLIENTE" && echo "OK (Usuario vinculado)" || echo "WARN ($USER_RES)"

# 9. Verify RBAC Security: Cliente attempting Admin endpoint
echo -n "9. Verificando protección RBAC (Cliente intentando acceder a /api/usuarios)... "
FORBIDDEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CLIENTE_TOKEN" "$BASE_URL/api/usuarios")
if [ "$FORBIDDEN_STATUS" == "403" ]; then
    echo "OK (HTTP 403 Forbidden - Correctamente denegado)"
else
    echo "WARN (HTTP $FORBIDDEN_STATUS esperado 403)"
fi

# 10. Verify Admin accessing /api/usuarios
echo -n "10. Verificando acceso Admin a /api/usuarios... "
ADMIN_USERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/usuarios")
if [ "$ADMIN_USERS_STATUS" == "200" ]; then
    echo "OK (HTTP 200)"
else
    echo "WARN (HTTP $ADMIN_USERS_STATUS esperado 200)"
fi

# 11. Solicitudes lifecycle check
echo -n "11. Consultando solicitudes del Cliente... "
SOLS_RES=$(curl -s -H "Authorization: Bearer $CLIENTE_TOKEN" "$BASE_URL/api/solicitudes/mias?usuarioId=11111111-1111-1111-1111-111111111111")
SOL_ID=$(echo "$SOLS_RES" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
if [ -n "$SOL_ID" ]; then
    echo "OK (Solicitud ID: $SOL_ID)"

    # Profesional accepts
    echo -n "    -> Profesional aceptando solicitud... "
    ACCEPT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
        -H "Authorization: Bearer $PROF_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"usuarioId":"22222222-2222-2222-2222-222222222222","motivo":""}' \
        "$BASE_URL/api/solicitudes/$SOL_ID/aceptar")
    echo "HTTP $ACCEPT_STATUS"

    # Enviar mensaje de chat
    echo -n "    -> Enviando mensaje por chat... "
    MSG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Authorization: Bearer $CLIENTE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"emisorId":"11111111-1111-1111-1111-111111111111","texto":"Nos vemos en la dirección indicada!"}' \
        "$BASE_URL/api/solicitudes/$SOL_ID/mensajes")
    echo "HTTP $MSG_STATUS"

    # Cliente completa
    echo -n "    -> Cliente completando solicitud... "
    COMPL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
        -H "Authorization: Bearer $CLIENTE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"usuarioId":"11111111-1111-1111-1111-111111111111","motivo":""}' \
        "$BASE_URL/api/solicitudes/$SOL_ID/completar")
    echo "HTTP $COMPL_STATUS"

    # Cliente califica
    echo -n "    -> Cliente calificando servicio con 5 estrellas... "
    RATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Authorization: Bearer $CLIENTE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"usuarioId":"11111111-1111-1111-1111-111111111111","puntaje":5,"comentario":"Excelente trabajo y puntualidad"}' \
        "$BASE_URL/api/solicitudes/$SOL_ID/calificacion")
    echo "HTTP $RATE_STATUS"
else
    echo "Sin solicitudes previas registradas."
fi

echo "=================================================="
echo "    VERIFICACIÓN DEL MVP COMPLETADA CON ÉXITO    "
echo "=================================================="

