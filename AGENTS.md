# Guía para Agentes de IA (AGENTS.md)

Este documento define las reglas de comportamiento, directivas de Git y convenciones que **cualquier agente de IA** (Antigravity, Cursor, Claude Code, Copilot, Windsurf, etc.) debe seguir estrictamente al interactuar con este repositorio.

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

## 2. Contexto General del Proyecto

- **Nombre:** Vincula-UP
- **Backend:** Java 21 · Spring Boot (microservicios detrás de un BFF).
- **Frontend:** Angular 22.
- **Identidad:** Keycloak.
- **Base de datos:** PostgreSQL.
- **Entorno:** Todo se ejecuta mediante contenedores Docker (`docker compose`).
- **Secretos:** El archivo `.env` almacena variables sensibles y **nunca** debe comitearse.
