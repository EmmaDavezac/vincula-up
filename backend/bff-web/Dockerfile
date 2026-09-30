# =============================================================================
#  Imagen del microservicio bff-web (API + gateway)
# =============================================================================
#  BFF = Backend For Frontend. Es el único servicio que el navegador toca
#  directamente para los datos: valida el token de Keycloak, aplica el RBAC y
#  agrega lo que viene de los demas microservicios. Por eso es el unico con
#  dependencia de Spring Security y OAuth2.
#
#  Build en DOS ETAPAS (multi-stage):
#    1) build  -> imagen con Maven y el JDK 21. Descarga dependencias y compila.
#    2) final -> imagen con SOLO el JRE. No lleva Maven, ni el codigo fuente,
#                ni las dependencias de compilacion.
#  Resultado: la imagen final ronda los 250 MB en vez de los ~700 MB que
#  tendria con una sola etapa. Menos superficie de ataque y menos para actualizar.
#
#  IMPORTANTE sobre el contexto de build:
#  En docker-compose.yml este servicio se construye con
#  `context: ./backend/bff-web`, o sea que el daemon de Docker SOLO ve esta
#  carpeta. Por eso el `COPY . .` copia el modulo completo (pom.xml, src/) y no
#  el repo entero. Es la razon por la que hay un Dockerfile por microservicio y
#  no uno solo en la raiz: cada uno necesita su propio contexto.

# Etapa 1: compilar
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# El contexto es la carpeta del modulo, asi que `COPY . .` trae su pom.xml y su
# src/ completos, nada mas.
COPY . .

# El cache de BuildKit conserva ~/.m2 entre builds: evita volver a descargar
# todas las dependencias (minutos de espera y fallos por red inestable) en cada
# compilacion.
RUN --mount=type=cache,target=/root/.m2 mvn -DskipTests package

# --- Etapa 2: ejecutar -------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Se copia solo el .jar ya empaquetado desde la etapa de compilacion.
COPY --from=build /workspace/target/*.jar /app/app.jar

EXPOSE 9001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
