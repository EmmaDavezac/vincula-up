FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
# El caché de BuildKit conserva ~/.m2 entre builds: evita volver a descargar todas
# las dependencias (minutos de espera y fallos por red inestable) en cada compilación.
RUN --mount=type=cache,target=/root/.m2 mvn -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/*.jar /app/app.jar
EXPOSE 9001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
