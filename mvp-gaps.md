# Estado del MVP: Completado

## Estado del Sistema
- **BFF Web**: Expone API REST unificada con control de acceso basado en roles (RBAC) validando firmas JWT contra Keycloak JWKS.
- **Keycloak OIDC**: Realm `vincula-up` configurado con clientes públicos y usuarios de prueba sembrados (`cliente@vincula-up.local`, `profesional@vincula-up.local`, `admin@vincula-up.local`). Soporta flujo OIDC estándar y token directo.
- **Microservicios**:
  - `ms-usuarios`: Gestión y vinculación automática de identidades Keycloak.
  - `ms-profesionales`: Padrón, alta individual, especialidades, activación con zona GPS y disponibilidad horaria, suspensión y reactivación.
  - `ms-solicitudes`: Ciclo de vida de solicitudes (PENDIENTE, ACEPTADA, RECHAZADA, COMPLETADA, CANCELADA), mensajería en tiempo real, calificaciones y listado de panel (`GET /solicitudes/panel`) para los indicadores de administración.
- **Frontend Angular**: Flujo visual completo implementado:
  - Directorio con búsqueda y filtrado.
  - Solicitud de turno con geolocalización GPS.
  - Mis solicitudes con ciclo completo, chat integrado por solicitud y calificación por estrellas.
  - Panel de administración con shell propio y cuatro pantallas (Resumen, Profesionales, Categorías y Clientes): indicadores de demanda y embudo calculados sobre datos reales, alta de profesionales, edición del padrón, suspensión/reactivación y gestión del acceso de clientes.
  - Asistente de activación profesional en 3 pasos (foto, zona GPS y horarios).
  - Acceso seguro con Keycloak y selector de perfiles de prueba.
- **Docker Compose**: Orquestación completa con Postgres 16 (healthchecked), Keycloak 26, los 4 microservicios Spring Boot optimizados para bajo consumo de memoria y Nginx con SSL y reverse proxy.

