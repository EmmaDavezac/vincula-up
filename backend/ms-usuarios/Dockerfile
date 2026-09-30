# =============================================================================
#  Imagen del microservicio ms-usuarios (identidades y roles de negocio)
# =============================================================================
#  Cuentas de usuario: nombre, email, telefono, rol de negocio (cliente,
#  profesional, administrador), foto de perfil y estado (activo o suspendido).
#  Las crea Keycloak al registrarse; este servicio las refleja en la base.
#
#  Build en DOS ETAPAS (multi-stage), igual que los demas modulos:
#    1) build  -> imagen con Maven y el JDK 21. Descarga dependencias y compila.
#    2) final -> imagen con SOLO el JRE: sin Maven, sin codigo fuente y sin
#                dependencias de compilacion. De ~700 MB a ~250 MB.
#
#  CONTEXTO DE BUILD: docker-compose.yml construye este servicio con
#  `context: ./backend/ms-usuarios`, o sea que Docker SOLO ve esa carpeta. Por eso hay un
#  Dockerfile por microservicio y no uno en la raiz: cada modulo necesita su
#  propio contexto para que `COPY . .` traiga su pom.xml y su src/.
#
#  POR QUE -DskipTests: el stack se despliega sin ejecutar la suite. Los tests
#  corren aparte (QA), no durante el build de la imagen.

# --- Etapa 1: compilar -------------------------------------------------------
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

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
