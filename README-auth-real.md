# Autenticación real: Keycloak y realm importado

Este repositorio ya cuenta con:

- servicio `keycloak` en `docker-compose.yml`
- import de un realm `vincula-up` mediante `keycloak/import/vincula-up-realm.json`
- configuración de entorno de Angular con `keycloakUrl`, `keycloakRealm`, `keycloakClientId` y `keycloakRedirectUri`

El siguiente paso de integración real es cambiar el flujo de `AuthService.loginWithKeycloak()` para:

1. abrir el auth endpoint del realm de Keycloak,
2. obtener el `access_token` o `id_token` con OpenID Connect,
3. llamar al endpoint `GET /api/usuarios/por-keycloak?keycloakId=<sub>` usando el identificador real del subject del token,
4. guardar la sesión con el token recibido y permitir el middleware JWT del BFF a mapear roles con `roles`, `realm_access.roles` y `role`.

El realm de ejemplo incluye usuarios cliente/profesional/admin con contraseña `password` para reconocer el alcance del flujo local.
