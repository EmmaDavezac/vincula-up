#!/usr/bin/env bash

set -euo pipefail

# Detect OS for CA import
if [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "darwin"* ]]; then
  echo "Importando certificado de autoridad (CA) para Linux/macOS..."
  bash scripts/linux-macos/import-ca.sh
else
  echo "Importación de CA no implementada para este SO. Continuando sin importar..."
fi

# Generar .env si no existe
if [[ ! -f .env ]]; then
  echo "Creando .env a partir de la plantilla .env.example..."
  cp .env.example .env
fi

# Levantar la aplicación con Docker Compose (rebuild)
echo "Levantando stack con Docker Compose..."
docker compose up --build -d

# Esperar a que Keycloak esté listo
echo "Esperando a que Keycloak esté listo..."
until curl -s http://localhost:8080 > /dev/null; do
  sleep 2
done

# Ejecutar bootstrap de Keycloak
echo "Ejecutando bootstrap de Keycloak..."
bash scripts/linux-macos/keycloak-bootstrap.sh

echo "Despliegue completado. Acceda a https://vincula-up.local"

