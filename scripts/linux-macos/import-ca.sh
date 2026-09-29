#!/bin/bash
# Instala la CA de VinculaUP en los navegadores de Linux (Ubuntu/Debian).
#
# Cubre los dos mecanismos de confianza que existen en Linux:
#   - Store del sistema  → Chromium, Chrome, Edge, curl, Node.js, Java
#   - Base NSS de Firefox → Firefox tiene su propio almacén, ignorando el sistema
#
# Uso: bash scripts/linux-macos/import-ca.sh
#
# En Windows usar el equivalente:
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\import-ca.ps1

set -e

# El script vive en scripts/linux-macos/, así que la raíz del repo es dos
# niveles arriba: scripts/linux-macos/ -> scripts/ -> <raíz>.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CA_CERT="$REPO_ROOT/nginx/certs/ca.crt"

if [ ! -f "$CA_CERT" ]; then
  echo "ERROR: no se encontró la CA en $CA_CERT" >&2
  exit 1
fi

echo "🔐 Importando CA: $CA_CERT"

# ── 1. Store del sistema ──────────────────────────────────────────────────────
# Chromium/Chrome/Edge leen el almacén del sistema. Actualizarlo también cubre
# curl, Node.js y la JVM, que usan la misma lista de confianza.
echo ""
echo "📦 Instalando en el store del sistema (Chromium, Chrome, Edge, curl)..."
sudo cp "$CA_CERT" /usr/local/share/ca-certificates/vinculaup-ca.crt
sudo update-ca-certificates
echo "✅ CA instalado en el sistema"

# ── 2. Base NSS de Firefox ───────────────────────────────────────────────────
# Firefox NO consulta el store del sistema: mantiene su propia base NSS.
echo ""
echo "🦊 Importando en Firefox (base NSS propia)..."

# Instalar certutil si no está disponible
if ! command -v certutil &>/dev/null; then
  echo "   Instalando libnss3-tools..."
  sudo apt-get install -y libnss3-tools 2>/dev/null || true
fi

# Buscar todos los perfiles de Firefox
FIREFOX_PROFILES_DIR="$HOME/.mozilla/firefox"
if [ -d "$FIREFOX_PROFILES_DIR" ]; then
  for profile_dir in "$FIREFOX_PROFILES_DIR"/*.*/; do
    if [ -f "$profile_dir/cert9.db" ]; then
      echo "   Perfil: $profile_dir"
      certutil -A -n "VinculaUP-CA" -t "CT,," -i "$CA_CERT" -d "sql:$profile_dir"
      echo "   ✅ Importado"
    fi
  done
else
  echo "   ⚠️  No se encontró directorio de perfiles de Firefox en $FIREFOX_PROFILES_DIR"
  echo "      Importa el CA manualmente siguiendo las instrucciones de abajo."
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "✅  LISTO. Reinicia el navegador para que tome efecto."
echo "══════════════════════════════════════════════════"
echo ""
echo "Si Firefox sigue mostrando error, importa manualmente:"
echo "  1. Abre Firefox → Configuración → Privacidad y seguridad"
echo "  2. Sección 'Certificados' → Ver certificados..."
echo "  3. Pestaña 'Autoridades' → Importar..."
echo "  4. Selecciona: $CA_CERT"
echo "  5. Marca '✅ Confiar en esta CA para identificar sitios web'"
echo "  6. Reinicia Firefox"
echo ""
echo "⚠️  Importá siempre ca.crt (la CA), NUNCA server.crt (el del servidor)."
