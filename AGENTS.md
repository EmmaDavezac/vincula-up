# Guía para Agentes de IA (AGENTS.md)

Este documento define las reglas de comportamiento, directivas de Git y convenciones que **cualquier agente de IA** (Antigravity, Cursor, Claude Code, Copilot, Windsurf, etc.) debe seguir strictly al interactuar con este repositorio.

---

## 1. Política de Git y Estrategia de Ramas (MANDATORIO)

> ⚠️ **REGLA ESTRICTA**: NUNCA realices commits directos sobre las ramas `master`, `main` ni `dev`.

### Flujo de trabajo para cada nueva funcionalidad o corrección:
Cada vez que el usuario solicite implementar, modificar o corregir algo:

1. **Verificar el estado del repositorio:**
   ```bash
   git status
   ```
   Asegúrate de que no haya cambios sin confirmar. Si hay cambios previos, consulta con el usuario o haz un stash antes de continuar.

2. **Posicionarse en `dev` y actualizar:**
   ```bash
   git checkout dev
   git pull origin dev
   ```
   *(Si la rama `dev` no existe localmente pero está en remoto: `git checkout -b dev origin/dev`)*.

3. **Crear y activar la nueva rama a partir de `dev`:**
   Usa nombres descriptivos en minúsculas separados por guiones:
   - Nuevas funcionalidades: `feat/<nombre-descriptivo>`
   - Correcciones de errores: `fix/<nombre-descriptivo>`
   - Tareas o refactorizaciones: `chore/<nombre-descriptivo>`

   ```bash
   git checkout -b feat/<nombre-descriptivo>
   ```

4. **Verificar la rama activa:**
   Confirma que estás en la rama creada antes de editar cualquier archivo:
   ```bash
   git branch --show-current
   ```

5. **Commits y Mensajes:**
   - Realiza los cambios únicamente dentro de la rama creada.
   - Usa Conventional Commits en español o inglés según el historial (ej: `feat: agregar endpoint de turnos`, `fix: validación de contraseña`).

---

## 2. Registro de Walkthroughs y Actualización de Especificaciones (MANDATORIO)

Cada vez que se complete una tarea, funcionalidad o corrección relevante:

1. **Registrar el Walkthrough:**
   - Documenta el trabajo realizado en [`WALKTHROUGH.md`](file:///home/emma/Desktop/vincula-up/WALKTHROUGH.md) agregando una entrada al final o en la sección correspondiente.
   - Incluye: Fecha, Tarea/Objetivo, Cambios principales realizados, Archivos modificados y Pasos de verificación/ejecución.

2. **Actualizar Especificaciones Técnicas y Documentación (MANDATORIO):**
   - **`ESPECIFICACION.md`:** Debe mantenerse **siempre actualizado**. Cada vez que una tarea o refactorización modifique rutas/endpoints, contratos de API, modelos de datos, flujos de autenticación, reglas de negocio o variables de entorno, es obligatorio reflejar y actualizar los cambios correspondientes en [`ESPECIFICACION.md`](file:///home/emma/Desktop/vincula-up/ESPECIFICACION.md).
   - Si aplica, actualiza también cualquier otra especificación o documentación técnica existente en la carpeta `docs/`.

---

## 3. Verificación Automática y Compilación (MANDATORIO)

> ⚠️ **REGLA ESTRICTA**: NUNCA des por finalizada una tarea ni afirmes que un cambio funciona sin haber ejecutado primero la compilación o pruebas de verificación.

- **Backend (Spring Boot / Java):** Verifica que el microservicio afectado (o el BFF) compile limpiamente mediante su wrapper de Maven:
  ```bash
  ./mvnw clean compile  # (o ./mvnw test)
  ```
- **Frontend (Angular 22):** Verifica que la SPA compile sin errores de TypeScript ni de plantillas:
  ```bash
  npm run build
  ```

---

## 4. Convenciones de Arquitectura y Código

- **Backend (Java 21 · Spring Boot):**
  - Mantener la separación de responsabilidades: `Controller` (BFF/Endpoints) ➔ `Service` (Lógica de negocio) ➔ `Repository/Client` (Persistencia / Comunicación entre microservicios).
  - Usar DTOs explícitos para contratos de API y evitar exponer entidades JPA directamente.
  - La identidad del usuario **siempre se obtiene del token JWT** en el BFF (nunca confíes en IDs enviados en el body).
- **Frontend (Angular 22):**
  - Usar **Components Standalone** y gestión de estado reactiva moderna mediante **Signals** (evitar RxJS donde Signals sea más simple y directo).
  - Mantener los servicios HTTP centralizados en `core/services/`.

---

## 5. Manejo Estricto de Secretos y Entorno

- **Variables de Entorno (`.env`):**
  - NUNCA incluyas valores del `.env` en los commits ni expongas contraseñas / claves reales en la documentación o código público.
  - Si agregas una nueva variable de entorno requerida, regístrala siempre en `.env.example` con un valor de demostración/dummy y documenta su propósito en [`ESPECIFICACION.md`](file:///home/emma/Desktop/vincula-up/ESPECIFICACION.md).
- **Infraestructura (`docker-compose.yml`):**
  - No alteres los nombres de servicio, redes o puertos publicados a menos que la tarea lo requiera explícitamente.

---

## 6. Contexto General del Proyecto

- **Nombre:** Vincula-UP
- **Backend:** Java 21 · Spring Boot (microservicios detrás de un BFF).
- **Frontend:** Angular 22.
- **Identidad:** Keycloak.
- **Base de datos:** PostgreSQL.
- **Entorno:** Todo se ejecuta mediante contenedores Docker (`docker compose`).
- **Secretos:** El archivo `.env` almacena variables sensibles y **nunca** debe comitearse.

---

## 7. Guía visual obligatoria (MANDATORIO)

Todo agente de IA debe respetar [`GUÍA-VISUAL.md`](GUÍA-VISUAL.md) como documento de diseño de referencia. Antes de crear o modificar cualquier componente de interfaz:

1. **Leer `GUÍA-VISUAL.md`** y aplicar sus reglas: paleta de colores como tokens CSS (nunca colores sueltos/hardcoded), botones planos y cuadrados, diferenciación clara entre botones primarios (`.vu-btn--ink`, relleno) y secundarios (`.vu-btn--outline`, borde), hover solo con cambio de color (sin `transform`), y barra inferior de móvil con fondo sólido (no transparente).
2. **Nunca usar `.vu-btn--pill`**: la guía visual exige botones cuadrados; la variante píldora está anulada (`border-radius: 0`) en `styles.css`.
3. **Verificar con `npm run build`** que la SPA compila sin errores de TypeScript ni plantillas antes de considerar la tarea terminada.

