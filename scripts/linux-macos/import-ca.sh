#!/bin/bash
# Instala la CA de VinculaUP en los navegadores de Linux (Ubuntu/Debian).
#
# Cubre los almacenes de confianza que usan los navegadores en Linux:
#   - Store del sistema → curl, Node.js, Java y navegadores que lo consulten
#   - Base NSS de Chromium/Chrome → ~/.pki/nssdb
#   - Base NSS de Firefox → cada perfil de Firefox
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
# Actualizar el store del sistema también cubre curl, Node.js y la JVM.
echo ""
echo "📦 Instalando en el store del sistema..."
sudo cp "$CA_CERT" /usr/local/share/ca-certificates/vinculaup-ca.crt
sudo update-ca-certificates
echo "✅ CA instalado en el sistema"

# Chromium/Chrome en Linux pueden usar su base NSS, independiente del store
# del sistema. Importar explícitamente evita depender del paquete/distribución.
echo ""
echo "🌐 Importando en la base NSS de Chromium/Chrome..."

if ! command -v certutil &>/dev/null; then
  if ! command -v apt-get &>/dev/null; then
    echo "ERROR: falta certutil. Instala las herramientas NSS de tu distribución." >&2
    exit 1
  fi
  echo "   Instalando libnss3-tools..."
  sudo apt-get install -y libnss3-tools
fi

CHROMIUM_NSS_DB="$HOME/.pki/nssdb"
mkdir -p "$CHROMIUM_NSS_DB"
if [ ! -f "$CHROMIUM_NSS_DB/cert9.db" ] && [ ! -f "$CHROMIUM_NSS_DB/cert8.db" ]; then
  certutil -N --empty-password -d "sql:$CHROMIUM_NSS_DB"
fi
if certutil -L -d "sql:$CHROMIUM_NSS_DB" -n "VinculaUP-CA" >/dev/null 2>&1; then
  certutil -D -d "sql:$CHROMIUM_NSS_DB" -n "VinculaUP-CA"
fi
certutil -A -n "VinculaUP-CA" -t "C,," -i "$CA_CERT" -d "sql:$CHROMIUM_NSS_DB"
echo "✅ CA importada en $CHROMIUM_NSS_DB"

# ── Base NSS de Firefox ──────────────────────────────────────────────────────
# Firefox tampoco consulta el store del sistema: mantiene su propia base NSS.
echo ""
echo "🦊 Importando en Firefox (base NSS propia)..."

# Buscar todos los perfiles de Firefox
FIREFOX_PROFILES_DIR="$HOME/.mozilla/firefox"
if [ -d "$FIREFOX_PROFILES_DIR" ]; then
  for profile_dir in "$FIREFOX_PROFILES_DIR"/*.*/; do
    if [ -f "$profile_dir/cert9.db" ]; then
      echo "   Perfil: $profile_dir"
      if certutil -L -d "sql:$profile_dir" -n "VinculaUP-CA" >/dev/null 2>&1; then
        certutil -D -d "sql:$profile_dir" -n "VinculaUP-CA"
      fi
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
echo "Cierra todas las ventanas de Chromium/Chrome y vuelve a abrirlo."
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
