# Qué falta para el MVP

## Estado observado
- El BFF expone API REST para profesionales, especialidades, solicitudes y mensajes.
- El frontend Angular ya trae directorio, solicitud, mis solicitudes, admin y activación.
- Los microservicios están separados en usuarios, profesionales, solicitudes y gateway BFF.
- La autenticación actual es una simulación de demo con JWT fake en localStorage.

## Faltantes para cerrar un MVP real

### Prioridad 0 — MVP mínimo viable de demo
1. Completar el flujo visual del ciclo de solicitud en UI:
   - PENDIENTE
   - ACEPTADA
   - RECHAZADA
   - COMPLETADA
2. Mejorar mensajes de error y confirmación cuando el backend responde con conflicto, permisos o datos faltantes.
3. Hacer funcionar el admin de profesionales con flujo completo de alta y suspensión del perfil.

### Prioridad 1 — autenticación real
4. Reemplazar el auth demo por Keycloak o un login real con roles verificados.
5. Ajustar permisos de rutas y endpoints con claims del JWT del usuario real.

### Prioridad 2 — activación profesional real
6. Conectar la activación del profesional con persistencia real:
   - fotoUrl,
   - zonaCoberturaLat,
   - zonaCoberturaLng,
   - radioKm,
   - disponibilidad y horarios.

### Prioridad 3 — datos y arquitectura
7. Reemplazar la base H2 en memoria por Postgres/Neon y preparar seed/migraciones reales.
8. Añadir estado de errores, retries y salud del sistema observables.

### Prioridad 4 — calidad
9. Mantener un set de pruebas de integración y smoke test para:
   - alta profesional,
   - creación de solicitud,
   - aceptación/rechazo/cierre,
   - calificación y mensajes.

## Línea de implementación más fácil
La parte más fácil de continuar es cerrar el flujo visual de solicitud y admin en el frontend, porque la estructura ya existe en Angular y el backend ya tiene endpoints básicos para crear y listar solicitudes y profesionales.
