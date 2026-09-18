#!/bin/bash
# Importa el CA de VinculaUP en Firefox y en el sistema (Ubuntu/Debian)
# Uso: bash scripts/import-ca-firefox.sh

set -e

CA_CERT="$(dirname "$0")/../nginx/certs/ca.crt"
CA_CERT="$(realpath "$CA_CERT")"

echo "🔐 Importando CA: $CA_CERT"

# ── 1. Sistema operativo (para Chrome/Chromium también) ──────────────────────
echo ""
echo "📦 Instalando en el store del sistema..."
sudo cp "$CA_CERT" /usr/local/share/ca-certificates/vinculaup-ca.crt
sudo update-ca-certificates
echo "✅ CA instalado en el sistema"

# ── 2. Firefox (NSS database) ────────────────────────────────────────────────
echo ""
echo "🦊 Importando en Firefox..."

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
echo "✅  LISTO. Reinicia Firefox para que tome efecto."
echo "══════════════════════════════════════════════════"
echo ""
echo "Si Firefox sigue mostrando error, importa manualmente:"
echo "  1. Abre Firefox → Configuración → Privacidad y seguridad"
echo "  2. Sección 'Certificados' → Ver certificados..."
echo "  3. Pestaña 'Autoridades' → Importar..."
echo "  4. Selecciona: $CA_CERT"
echo "  5. Marca '✅ Confiar en esta CA para identificar sitios web'"
echo "  6. Reinicia Firefox"
