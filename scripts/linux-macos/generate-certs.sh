#!/usr/bin/env bash
#
# Genera la CA y el certificado del servidor de Vincula-UP.
#
# Por qué existe: los certificados versionados en nginx/certs/ son una CA de
# DESARROLLO auto-firmada. Regeneralos si vencen (diciembre 2028) o si preferís
# que cada máquina tenga su propia CA.
#
# IMPORTANTE: al regenerar, todos los navegadores que tengan instalada la CA
# vieja van a marcar el sitio como no confiable. Hay que reimportar la nueva.
#
# Uso:  bash scripts/linux-macos/generate-certs.sh
# En Windows:
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\generate-certs.ps1

set -euo pipefail

# El script vive en scripts/linux-macos/, así que la raíz del repo es dos
# niveles arriba: scripts/linux-macos/ -> scripts/ -> <raíz>.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CERTS_DIR="$REPO_ROOT/nginx/certs"
DAYS=825

command -v openssl >/dev/null 2>&1 || { echo "ERROR: hace falta openssl."; exit 1; }

mkdir -p "$CERTS_DIR"
cd "$CERTS_DIR"

if [ -f ca.key ] || [ -f server.key ]; then
  echo "⚠️  Ya existen ca.key/server.key en $CERTS_DIR."
  read -r -p "   ¿Sobrescribirlos? esto INVALIDA los certificados actuales [s/N]: " reply
  case "$reply" in
    [sSyY]*) ;;
    *) echo "Cancelado. No se modificó nada."; exit 0 ;;
  esac
fi

echo "==> 1/3 Generando la CA (esta es la que se importa en el navegador)"
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days "$DAYS" \
  -out ca.crt -subj "/CN=VinculaUP-CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

echo "==> 2/3 Generando la clave y el CSR del servidor"
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=vincula-up.local/O=VinculaUP Dev/C=AR"

echo "==> 3/3 Firmando el certificado del servidor con la CA"
# El SAN es lo que hace que el navegador acepte vincula-up.local y localhost.
# Sin subjectAltName, los navegadores modernos rechazan el certificado.
cat > server-ext.cnf <<'EOF'
[ext]
subjectAltName=DNS:vincula-up.local,DNS:localhost,IP:127.0.0.1
basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
EOF

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days "$DAYS" -sha256 \
  -extfile server-ext.cnf -extensions ext

rm -f server.csr ca.srl server-ext.cnf

echo
echo "✅ Certificados regenerados en $CERTS_DIR"
openssl x509 -in server.crt -noout -subject -enddate
echo
echo "Ahora importá la CA nueva (ca.crt) en los navegadores:"
echo "  bash scripts/linux-macos/import-ca.sh"
echo
echo "⚠️  Si tenías importada la CA anterior, eliminá 'VinculaUP-CA' de los"
echo "    almacenes de confianza antes de importar la nueva."
