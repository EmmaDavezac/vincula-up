# Guía visual de Vincula-UP

Este documento define las reglas de diseño y la identidad visual de la aplicación Vincula-UP. Todo componente nuevo o modificado debe respetar estas reglas. Es un documento obligatorio junto a [`AGENTS.md`](AGENTS.md) y [`ESPECIFICACION.md`](ESPECIFICACION.md).

---

## 1. Paleta de colores

Los colores se declaran como tokens CSS en [`src/styles.css`](frontend/vincula-up-web/src/styles.css) y se consumen mediante `var(--token)`. **Está prohibido escribir colores "sueltos" (hardcoded) en los componentes**; si un color no está en los tokens, hay que agregarlo al sistema de diseño.

### Tema claro (`:root`)

| Token | Valor HEX | Rol |
|-------|-----------|-----|
| `--paper` | `#F6F3EC` | Fondo global, tono papel pergamino |
| `--surface-card` | `#FFFDF8` | Tarjetas, paneles y modales |
| `--surface-highlight` | `#F3F5F1` | Tags, chips, burbujas de mensaje entrante |
| `--ink` | `#1E2926` | Títulos, texto fuerte |
| `--muted` | `#67716C` | Subtítulos, metadatos, placeholders |
| `--line` | `#D8D8CE` | Bordes y divisores |
| `--coral` | `#E35F43` | Acento principal, acciones que crean algo nuevo |
| `--coral-dark` | `#C34F3D` | Hover de acciones coral |
| `--emerald` | `#448064` | Éxito, estado "Activo" |
| `--amber` | `#A56C19` | Pendiente, avisos de espera |
| `--navy` | `#1E4B7A` | Burbuja de mensaje propio, botón abrir chat |
| `--band-dark` | `#1E2926` | Superficie oscura de marca (botón primario, banda "Para egresados") |
| `--band-dark-hover` | `#263834` | Hover del botón primario |
| `--band-ink` | `#FFFFFF` | Texto sobre superficie oscura de marca |
| `--on-solid` | `#FFFFFF` | Texto sobre colores saturados (coral, esmeralda, navy) |
| `--scrim` | `rgb(0 0 0 / 0.55)` | Fondo de los modales / overlay |
| `--bar-translucent` | `rgb(20 24 26 / 0.92)` | Barra inferior móvil (ver nota abajo) |
| `--tabbar-h` | `4.25rem` | Alto de la barra inferior fija de móvil |

### Tema oscuro (`[data-tema='oscuro']`)

El tema oscuro redefine los tokens de superficie, tinta, líneas, sombras y velos en el bloque `[data-tema='oscuro']` de `styles.css`. Los acentos de marca (`--coral`, `--emerald`, `--amber`, `--navy`) y las superficies de marca fijas (`--band-*`, `--on-solid`) **no cambian** con el tema: ya tienen contraste suficiente sobre fondo oscuro y son la identidad de la marca.

> Regla de oro: un token de tinta (como `--ink`) nunca se usa como fondo, porque en el tema oscuro se invierte y quedaría ilegible.

---

## 2. Botones

### 2.1 Todos los botones son planos y cuadrados

Cada botón de la aplicación usa la clase base `.vu-btn`. La regla de diseño es:

- **Planos:** sin sombras elevadas, sin `transform`, sin movimiento al hacer hover.
- **Cuadrados:** `border-radius` mínimo (sin redondeo excesivo, sin píldoras).

La variante `.vu-btn--pill` (`border-radius: 999px`) **no se usa**. Si aparece en algún componente, se elimina y se reemplaza por el estilo base cuadrado.

### 2.2 Diferenciación primario vs secundario

Los botones primarios y secundarios deben diferenciarse claramente por relleno y borde:

| Clase | Aspecto | Uso |
|-------|---------|-----|
| `.vu-btn--ink` | Relleno oscuro (`--band-dark`), texto blanco | **Primario:** acción principal de la pantalla (ej. "Guardar", "Ingresar", "Activar") |
| `.vu-btn--outline` | Fondo transparente, borde `--line`, texto `--ink` | **Secundario:** acciones secundarias en grupo (ej. "Cancelar", "Editar", "Limpiar") |
| `.vu-btn--quiet` | Fondo transparente, borde tenue, sin relleno marcado | Terciario: acciones menores, "Cerrar", "Limpiar búsqueda" |
| `.vu-btn--coral` | Relleno coral (`--coral`), texto blanco | Acción que crea algo nuevo (ej. "Nueva categoría", "Nuevo profesional") |
| `.vu-btn--danger` | Relleno de alerta, texto de error | Borrado y acciones irreversibles |

### 2.3 Hover

El hover **solo cambia color** (`background-color`, `border-color`, `color`). Nunca incluye `transform` ni `translateY`: un botón que se mueve empuja el contenido de abajo y hace que el texto parezca bailar dentro del botón.

### 2.4 Estados

- `:focus-visible`: anillo de 2px en `--coral` con `outline-offset: 2px`.
- `:disabled`: `opacity: 0.4`, `cursor: not-allowed`.

---

## 3. Radios y componentes

| Componente | Radio | Nota |
|------------|-------|------|
| Botones e inputs | Cuadrado (mínimo) | Reglas de la guía visual |
| Tarjetas, paneles, modales | `1rem` – `1.25rem` | `vu-card`, `vu-panel`, `vu-confirm__dialog` |
| Chips, badges, estados | `999px` (píldora) | Excepción documentada: son etiquetas, no botones |
| Avatar | `999px` | Círculo |

---

## 4. Barra inferior de móvil

La barra inferior (`vu-tabbar`, `src/app/shared/tabbar/tabbar.css`) es `position: fixed` y ocupa el ancho de la pantalla. **No debe ser transparente:** debe tener un fondo sólido que se lea como una barra de navegación y no como una superposición translúcida sobre el contenido.

El alto de la barra vive en el token `--tabbar-h` y lo comparten la barra (que lo aplica) y el pie (que reserva ese espacio mediante `padding-bottom`). No se duplica el valor en dos archivos.

---

## 5. Tema claro y oscuro

- Se decide con `TemaService` (tres estados: `claro`, `oscuro`, `sistema`).
- Se aplica como atributo `data-tema` en `<html>`.
- Un script inline en `index.html` pone el atributo antes de que Angular arranque, para evitar destellos blancos en tema oscuro. Debe coincidir con `TemaService` (misma clave, mismos valores).
- Todos los colores de los componentes deben ser tokens CSS; el bloque `[data-tema='oscuro']` no alcanza los colores escritos a mano.

---

## 6. Documentos relacionados

- [`AGENTS.md`](AGENTS.md): reglas de comportamiento, Git y convenciones (incluye obligación de respetar esta guía visual).
- [`ESPECIFICACION.md`](ESPECIFICACION.md) §17 y Anexo C: detalle técnico de tokens, tipografía, radios, sombras y tema claro/oscuro.
- [`WALKTHROUGH.md`](WALKTHROUGH.md): registro de cambios realizados.
