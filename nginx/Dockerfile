# =============================================================================
#  Imagen de nginx: compila la SPA de Angular y la sirve con TLS
# =============================================================================
#  Este es el UNICO servicio con contexto de build en la raiz del repo
#  (`context: .` en docker-compose.yml), porque necesita leer DOS carpetas que
#  estan en distinta ubicacion: la SPA y su configuracion de nginx.
#
#  Build en DOS ETAPAS (multi-stage):
#    1) build  -> Node 22 compila Angular. La imagen final no lleva Node.
#    2) final -> nginx 1.27-alpine. Solo los archivos estaticos ya construidos.
#
#  CONTEXTO DE BUILD: el .dockerignore de la raiz excluye .git/, los target/ de
#  Java y los node_modules/ y dist/ del frontend, para que no viajen al daemon.
#
#  ESTRUCTURA DE ARCHIVOS EN LA IMAGEN FINAL:
#    /usr/share/nginx/html/         → la SPA compilada (index.html, JS, CSS)
#    /usr/share/nginx/html/fotos/   → fotos de perfil (volumen, no imagen)
#    /etc/nginx/nginx.conf          → configuracion (bind-mount, :ro)
#    /etc/nginx/certs/              → certificados TLS (bind-mount, :ro)

# --- Etapa 1: compilar la SPA de Angular ------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Se copian primero SOLO los manifiestos de dependencias. npm install queda en
# una capa propia: si despues cambia el codigo pero no el package.json, esa capa
# sigue en cache y no se reinstala nada.
COPY frontend/vincula-up-web/package*.json ./

# `npm install` y no `npm ci`: el lockfile puede quedar desfasado respecto del
# package.json y `ci` falla en vez de resolver. Para produccion con despliegue
# reproducible conviene pasar a `npm ci`.
RUN npm install

# recien ahora el codigo fuente: asi los cambios en la app no invalidan la capa
# de dependencias.
COPY frontend/vincula-up-web/ ./

# La configuracion "production" es la que, en angular.json, substituye
# environment.ts por environment.development.ts solo en modo desarrollo.
# En produccion la app queda apuntando a /api (mismo origen, via nginx) en vez
# de localhost:9001.
RUN npm run build -- --configuration production

# --- Etapa 2: servir con nginx ----------------------------------------------
FROM nginx:1.27-alpine

# La SPA compilada. El subdirectorio `browser` es donde Angular deja el bundle
# cuando usa la carpeta `browser` como carpeta de salida.
COPY --from=build /app/dist/vincula-up-web/browser /usr/share/nginx/html

# Configuracion y certificados. Ambos se vuelven a montar como bind-mounts desde
# docker-compose.yml, asi que editarlo no requiere reconstruir la imagen.
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/certs /etc/nginx/certs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

