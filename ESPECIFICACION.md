# Especificación Técnica — Vincula-UP

> **Documento único de referencia del proyecto.** Si algo no está aquí, no está documentado.
>
> El [`README.md`](README.md) tiene el resumen: qué hace el sistema, el stack y el deploy local desde cero. El [`MANUAL.md`](MANUAL.md) tiene el uso y la operación: los servicios, el secreto del client de servicio, los certificados, el desarrollo y el tema. Este archivo contiene la especificación funcional, el relevamiento formal, el modelado, los requisitos, la arquitectura y el detalle técnico completo.
>
> Los informes académicos formales se encuentran en [`Entrega Proyecto Final Grupo 5.md`](Entrega%20Proyecto%20Final%20Grupo%205.md) (PFC — entrega parcial final) y [`MVP Grupo 8- DACS.md`](MVP%20Grupo%208-%20DACS.md) (DACS — informe del MVP). La matriz de aceptación del DACS se actualizó al 16/11/2026.

---

### Metadatos Institucionales y Equipo del Proyecto

- **Institución:** Universidad Tecnológica Nacional (UTN) — Facultad Regional Concepción del Uruguay (FRCU)
- **Carrera:** Ingeniería en Sistemas de Información
- **Cátedra:** Proyecto Final de Carrera (PFC)
- **Alcance de esta entrega:** Fase 1 — MVP (Minimum Viable Product)
- **Docentes:**
  - Lucas Scheider
  - Adrian Tournour
- **Equipo de Desarrollo (Alumnos):**
  - Davezac, Luciano Emmanuel (`LD`) — Backend
  - Morales, Nicolas (`NM`) — Infraestructura, integración en BFF y pruebas de integración
  - Velazquez, Julian (`JV`) — Historias de usuario
  - Vergara, Agustin (`AV`) — Frontend
  - Villanueva, Antonio Nicolas (`NV`) — Relevamiento, modelado de datos y testing

---

## Índice

1. [Tema del proyecto, problemática y razón de ser](#1-tema-del-proyecto-problemática-y-razón-de-ser)
   - 1.1 [Tema del proyecto y lema institucional](#11-tema-del-proyecto-y-lema-institucional)
   - 1.2 [Problemática](#12-problemática)
   - 1.3 [Razón de ser del proyecto](#13-razón-de-ser-del-proyecto)
   - 1.4 [El MVP dentro del Proyecto Final de Carrera](#14-el-mvp-dentro-del-proyecto-final-de-carrera)
2. [Objetivo y alcance del MVP](#2-objetivo-y-alcance-del-mvp)
   - 2.1 [Objetivo](#21-objetivo)
   - 2.2 [Alcance](#22-alcance)
   - 2.3 [Criterios de éxito de la demo](#23-criterios-de-éxito-de-la-demo)
3. [Organización del trabajo](#3-organización-del-trabajo)
   - 3.1 [Equipo y metodología](#31-equipo-y-metodología)
   - 3.2 [Épicas](#32-épicas)
   - 3.3 [Sprints y subtareas detalladas](#33-sprints-y-subtareas-detalladas)
   - 3.4 [Definition of Done (DoD)](#34-definition-of-done-dod)
4. [Relevamiento](#4-relevamiento)
   - 4.1 [Historias de usuario: Gestión de usuarios](#41-historias-de-usuario-gestión-de-usuarios)
   - 4.2 [Historias de usuario: Gestión de solicitudes](#42-historias-de-usuario-gestión-de-solicitudes)
   - 4.3 [Requisitos funcionales](#43-requisitos-funcionales)
   - 4.4 [Requisitos no funcionales](#44-requisitos-no-funcionales)
   - 4.5 [Trazabilidad de historias de usuario](#45-trazabilidad-de-historias-de-usuario)
5. [Modelado](#5-modelado)
   - 5.1 [Diagrama de casos de uso](#51-diagrama-de-casos-de-uso)
   - 5.2 [Diagrama de clases](#52-diagrama-de-clases)
   - 5.3 [Diagramas de estados y transiciones](#53-diagramas-de-estados-y-transiciones)
6. [Arquitectura y tecnología](#6-arquitectura-y-tecnología)
   - 6.1 [Componentes y stack](#61-componentes-y-stack)
   - 6.2 [Responsabilidades por servicio](#62-responsabilidades-por-servicio)
   - 6.3 [Puntos clave a revisar de la arquitectura](#63-puntos-clave-a-revisar-de-la-arquitectura)
   - 6.4 [Roles del sistema](#64-roles-del-sistema)
   - 6.5 [Decisiones de diseño clave](#65-decisiones-de-diseño-clave)
7. [Estructura del repositorio](#7-estructura-del-repositorio)
8. [API del BFF: catálogo de endpoints](#8-api-del-bff-catálogo-de-endpoints)
   - 8.1 [Profesionales](#81-profesionales) · 8.2 [Solicitudes](#82-solicitudes) · 8.3 [Mensajes, chat en vivo y calificaciones](#83-mensajes-chat-en-vivo-y-calificaciones) · 8.4 [Usuarios](#84-usuarios) · 8.5 [Especialidades](#85-especialidades) · 8.6 [Activación y vinculación](#86-activación-y-vinculación) · 8.7 [Utilidades](#87-utilidades)
9. [Modelo de datos detallado](#9-modelo-de-datos-detallado)
   - 9.1 [ms-usuarios](#91-ms-usuarios--usuario) · 9.2 [ms-profesionales](#92-ms-profesionales--profesional-especialidad-y-disponibilidad) · 9.3 [ms-solicitudes](#93-ms-solicitudes--solicitud-mensaje-y-calificación) · 9.4 [Consistencia de claves de fotos](#94-consistencia-de-claves-de-fotos)
10. [Autenticación, autorización y seguridad](#10-autenticación-autorización-y-seguridad)
    - 10.1 [Flujo de login OIDC + PKCE](#101-flujo-de-login-oidc-authorization-code--pkce) · 10.2 [Validación del token en el BFF y Resource Servers](#102-validación-del-token-en-el-bff-y-resource-servers) · 10.3 [RBAC: 27 reglas](#103-rbac-27-reglas) · 10.4 [Alta del profesional sin auto-registro](#104-alta-del-profesional-sin-auto-registro) · 10.5 [Aceptación de términos y condiciones](#105-aceptación-de-los-términos-y-condiciones) · 10.6 [Configuración del realm](#106-configuración-del-realm)
11. [Ubicaciones: geocodificación, cifrado y fotos](#11-ubicaciones-geocodificación-cifrado-y-fotos)
    - 11.1 [Geocodificación con OpenStreetMap / Nominatim](#111-geocodificación-con-openstreetmap--nominatim) · 11.2 [Cifrado de ubicaciones en reposo](#112-cifrado-de-ubicaciones-en-reposo-aes-256-gcm) · 11.3 [Almacenamiento de fotos](#113-almacenamiento-de-fotos-y-volúmenes) · 11.4 [Quién ve la foto de quién](#114-quién-ve-la-foto-de-quién) · 11.5 [Privacidad de la dirección del cliente](#115-privacidad-de-la-dirección-del-cliente)
12. [Variables de entorno y configuración](#12-variables-de-entorno-y-configuración)
13. [Datos de arranque y migraciones](#13-datos-de-arranque-y-migraciones)
14. [Infraestructura: TLS, Nginx](#14-infraestructura-tls-nginx)
15. [Scripts operativos y despliegue](#15-scripts-operativos-y-despliegue)
16. [Prototipos de pantallas](#16-prototipos-de-pantallas)
17. [Diseño visual](#17-diseño-visual)
18. [Estado real del MVP y deuda técnica](#18-estado-real-del-mvp-y-deuda-técnica)

Anexos:
- [A. Términos y datos](#anexo-a-términos-y-datos)
- [B. Preguntas frecuentes](#anexo-b-preguntas-frecuentes)
- [C. Tema claro y oscuro](#anexo-c-tema-claro-y-oscuro)

---

## 1. Tema del proyecto, problemática y razón de ser

### 1.1 Tema del proyecto y lema institucional

Vincula-UP es una plataforma web (PWA) de inserción laboral para los egresados de la Universidad Popular de Concepción del Uruguay (UP). Conecta a la comunidad, tanto vecinos como empresas, con técnicos y profesionales de oficios que egresaron de la institución y cuyo perfil fue validado por ella: el ciudadano busca un profesional por oficio y cercanía, solicita un turno, coordina por chat y califica el servicio.

Su lema resume la propuesta institucional de confianza:
> *“Antes de que entre a tu casa, ya lo conocemos nosotros”*.

El proyecto se desarrolla en el marco de la carrera de Ingeniería en Sistemas de Información (UTN, Facultad Regional Concepción del Uruguay) y este documento corresponde a su MVP (Fase 1).

### 1.2 Problemática

La Universidad Popular cumple un rol fundamental en la formación técnica y de oficios de la región. Sin embargo, existe una brecha operativa entre la finalización del trayecto formativo y la inserción efectiva del egresado en el mercado laboral local. Hoy, cuando un vecino o una empresa busca a un técnico egresado, el proceso es analógico y desestructurado: se consultan registros físicos (el Libro Matriz) y se triangula la información con el cuerpo docente. Según el relevamiento realizado con la Secretaría de la Universidad, esa respuesta demora entre dos y tres días hábiles, un plazo incompatible con una necesidad de asistencia técnica inmediata, como una falla eléctrica o una pérdida de gas.

El problema no es solo de demora. Afecta de manera distinta a los tres actores involucrados:

| Actor | Problema | Consecuencia |
|---|---|---|
| **Ciudadano (cliente)** | Busca un profesional sin referencias previas y debe permitir el ingreso a su domicilio a alguien de quien no conoce la identidad ni la aptitud técnica. | Espera, incertidumbre y riesgo percibido; recurre al boca a boca o a canales informales. |
| **Egresado (profesional)** | No cuenta con un canal institucional que haga visibles sus competencias certificadas. | Dificultad para conseguir clientes apenas termina sus estudios y para generar ingresos en el ámbito local. |
| **Universidad (secretaría y rectoría)** | Atiende las consultas de forma manual y no registra qué oficios busca la comunidad. | Interrupciones constantes en la secretaría, pérdida de trazabilidad del egresado y planificación académica basada en la intuición y no en datos. |

### 1.3 Razón de ser del proyecto

Vincula-UP surge de la necesidad de sistematizar esa vinculación, transformando un proceso administrativo tradicional en una solución tecnológica segura, escalable y de acceso inmediato que beneficie a las tres partes:

- **Para el ciudadano:** reduce la espera y la incertidumbre al buscar un técnico. Como solo se publican perfiles validados por la Universidad, la plataforma aporta una capa de seguridad y un respaldo técnico cuando se permite el ingreso de un prestador al hogar.
- **Para el egresado:** le da un canal digital directo para visibilizar sus competencias certificadas, aumentar su empleabilidad y generar ingresos dentro de la comunidad local.
- **Para la Universidad:** libera tiempo del personal administrativo al delegar la búsqueda y el contacto inicial en el sistema, y le entrega por primera vez datos objetivos sobre los oficios más demandados para planificar futuros cursos.
- **Para la región:** su arquitectura modular permite replicarla en otras instituciones similares que busquen modernizar su bolsa de trabajo y crear entornos seguros de vinculación laboral.

### 1.4 El MVP dentro del Proyecto Final de Carrera

Este MVP es la primera versión funcional del PFC *Vincula-UP: plataforma digital de inserción laboral para egresados*, y corresponde a su Fase 1. Todo el relevamiento, los requisitos, las decisiones de arquitectura y el modelado que se presentan acá se toman como base de la información obtenida durante el desarrollo del PFC. El MVP no reemplaza al proyecto completo: implementa el circuito de mayor valor, el que permite comprobar de punta a punta que la propuesta funciona, y deja el resto para las etapas siguientes del PFC.

---

## 2. Objetivo y alcance del MVP

### 2.1 Objetivo

Demostrar que el circuito completo funciona de punta a punta con datos reales y autenticación real: el cliente pide un turno, el profesional lo acepta o rechaza con motivo, ambos coordinan por chat, el trabajo se completa y el cliente califica.

### 2.2 Alcance

**El MVP incluye:**
- Registro, ingreso y recuperación de contraseña con Keycloak, con los roles Cliente, Profesional y Administrador.
- Alta de profesionales por el administrador y activación del perfil por el propio profesional.
- Directorio de profesionales con búsqueda por categoría, disponibilidad y proximidad geográfica.
- Ciclo completo de la solicitud: crear, aceptar, rechazar con motivo, cancelar, completar y vencimiento automático.
- Chat por solicitud, calificación del servicio y notificaciones por correo y WebPush.
- Paneles del administrador: profesionales, categorías, clientes e indicadores.

**El MVP no incluye** (queda para versiones posteriores):
- Carga masiva de profesionales (el requisito original la mencionaba, pero no tiene historia de usuario en esta fase).
- Pagos o presupuestos dentro de la plataforma.
- Aplicación móvil nativa (se ofrece como Progressive Web App - PWA instalable).

### 2.3 Criterios de éxito de la demo

1. Un administrador da de alta a un profesional, y este activa su perfil (foto, zona de cobertura y horarios) y aparece en el padrón.
2. Un cliente se registra con su correo y envía una solicitud completando el flujo de `/solicitar`.
3. El profesional recibe el aviso y acepta (ve la dirección exacta) o rechaza indicando el motivo.
4. Ambos intercambian mensajes en vivo por chat.
5. El trabajo se marca como completado y el cliente califica una única vez; la reputación del profesional se actualiza.
6. Una solicitud sin respuesta vence sola y ambas partes reciben aviso.
7. Toda la operación pasa por el BFF con autenticación real basada en tokens.

---

## 3. Organización del trabajo

### 3.1 Equipo y metodología

Como metodología se utiliza **Scrum documentado en Jira**, con sprints de dos semanas de duración.

| Integrante | Sigla | Foco principal |
|---|---|---|
| Luciano Emmanuel Davezac | `LD` | Backend |
| Agustín Vergara | `AV` | Frontend |
| Julián Velazquez | `JV` | Historias de usuario |
| Nicolás Morales | `NM` | Infraestructura, integración en BFF y pruebas de integración |
| Nicolás Villanueva | `NV` | Relevamiento, modelado de datos y testing |

### 3.2 Épicas

Se agruparon los sprints en dos épicas de dos sprints cada una:

| Épica | Contenido | Sprints |
|---|---|---|
| **Gestión de usuarios** | Entorno e infraestructura, modelado y backend de administradores, profesionales y usuarios, integración en BFF | Sprint 1 y Sprint 2 |
| **Gestión de solicitudes** | Modelado, historias de usuario, backend, frontend, testing e integración del ciclo de solicitudes | Sprint 3 y Sprint 4 |

### 3.3 Sprints y subtareas detalladas

#### Sprint 1 · 28/09 – 12/10
**Objetivo:** Dejar funcionando el entorno (Docker, Keycloak, Nginx y bff-web), relevamiento, historias de usuarios y modelado terminado.

| Actividad | Subtarea | Responsable | Historias |
|---|---|---|---|
| Relevamiento y modelado de usuarios | Relevar datos y reglas de administradores, profesionales y clientes | NV | HU-U01 a HU-U14 |
| Relevamiento y modelado de usuarios | Modelar las entidades Usuario, Profesional, Disponibilidad y Especialidad, y los enumerados Rol, EstadoUsuario, EstadoProfesional y DiaSemana | NV | — |
| Relevamiento y modelado de usuarios | Armar el diagrama de clases de usuarios | NV | — |
| Relevamiento y modelado de usuarios | Armar el diagrama de estados de cuenta | NV | HU-U06, HU-U09, HU-U11 |
| Relevamiento y modelado de usuarios | Armar el diagrama de casos de uso de usuarios | NV | — |
| Infraestructura y seguridad base | Armar el Docker Compose con PostgreSQL, Keycloak, Nginx y bff-web | NM | — |
| Infraestructura y seguridad base | Configurar Keycloak: realm, roles Cliente, Profesional y Administrador, y cliente del frontend | NM | HU-U01, HU-U15 |
| Infraestructura y seguridad base | Configurar Nginx como reverse proxy con HTTPS (OpenSSL) | NM | — |
| Infraestructura y seguridad base | Crear el esqueleto del bff-web con validación de JWT mediante JWKS | NM | — |
| Infraestructura y seguridad base | Crear los esqueletos de ms-usuarios y ms-profesionales conectados a PostgreSQL | NM | — |
| Historias de usuario de usuarios | Redactar las historias de uso general y de cliente (HU-U01 a HU-U04) con sus escenarios Given/When/Then | JV | HU-U01 a HU-U04 |
| Historias de usuario de usuarios | Redactar las historias de profesional (HU-U05 a HU-U08) | JV | HU-U05 a HU-U08 |
| Historias de usuario de usuarios | Redactar las historias de administrador (HU-U09 a HU-U14) | JV | HU-U09 a HU-U14 |
| Historias de usuario de usuarios | Revisar las historias con el equipo y ajustar los escenarios | JV | HU-U01 a HU-U14 |

#### Sprint 2 · 12/10 – 26/10
**Objetivo:** Backend y frontend terminado. Un administrador puede dar de alta a un profesional y este activa su perfil, todo con autenticación real y a través del BFF. Pruebas manuales y de integración pasadas.

| Actividad | Subtarea | Responsable | Historias |
|---|---|---|---|
| Backend de usuarios | ms-usuarios: registro de clientes, edición de perfil y aceptación de términos y condiciones con versión y fecha | LD | HU-U01, HU-U03, HU-U04 |
| Backend de usuarios | Alta de profesionales por el administrador con contraseña temporal y cambio obligatorio en el primer ingreso | LD | HU-U05, HU-U09 |
| Backend de usuarios | ms-profesionales: activación del perfil (foto, zona de cobertura) y gestión de horarios | LD | HU-U06, HU-U07 |
| Backend de usuarios | Almacenamiento privado de fotos en el volumen | LD | HU-U04, HU-U06 |
| Backend de usuarios | Consulta y edición del padrón, listado de clientes y desactivación o reactivación de cuentas | LD | HU-U10, HU-U11, HU-U13 |
| Backend de usuarios | Alta, edición y baja de categorías | LD | HU-U12 |
| Frontend de usuarios | Pantallas de registro, login y recuperación de contraseña | AV | HU-U01, HU-U02, HU-U15 |
| Frontend de usuarios | Pantallas de términos y condiciones y de edición de perfil | AV | HU-U03, HU-U04 |
| Frontend de usuarios | Pantallas de primer ingreso, activación del perfil y gestión de horarios del profesional | AV | HU-U05 a HU-U07 |
| Frontend de usuarios | Paneles del administrador: alta de profesionales, padrón, categorías y clientes | AV | HU-U09 a HU-U13 |
| Frontend de usuarios | Navegación y menús según el rol | AV | HU-U15 |
| Testing de usuarios | Diseñar los casos de prueba a partir de los escenarios de cada historia | NV | HU-U01 a HU-U15 |
| Testing de usuarios | Ejecutar las pruebas manuales y registrar los defectos | NV | HU-U01 a HU-U15 |
| Testing de usuarios | Repetir las pruebas sobre las correcciones | NV | HU-U01 a HU-U15 |
| Integración en BFF y pruebas de integración | Exponer en el bff-web los endpoints de usuarios y profesionales, propagando el token | NM | HU-U01 a HU-U14 |
| Integración en BFF y pruebas de integración | Probar el flujo completo: alta, primer ingreso, activación del perfil y aparición en el padrón | NM | HU-U05, HU-U06, HU-U09 |

#### Sprint 3 · 26/10 – 09/11
**Objetivo:** El backend de solicitudes cubre el ciclo completo: crear, aceptar, rechazar con motivo, completar y cancelar, con las validaciones de transición y de disponibilidad.

| Actividad | Subtarea | Responsable | Historias |
|---|---|---|---|
| Relevamiento y modelado de solicitudes | Modelar las entidades Solicitud y Calificación y el enumerado EstadoSolicitud | NV | HU-S01 a HU-S17 |
| Relevamiento y modelado de solicitudes | Armar el diagrama de estados de la solicitud y su tabla de transiciones | NV | HU-S09 a HU-S12, HU-S15 |
| Relevamiento y modelado de solicitudes | Actualizar el diagrama de clases y el de casos de uso con solicitudes | NV | — |
| Historias de usuario de solicitudes | Redactar las historias de creación de la solicitud (HU-S01 a HU-S07) | JV | HU-S01 a HU-S07 |
| Historias de usuario de solicitudes | Redactar las historias de gestión: ver, aceptar, rechazar, cancelar y completar (HU-S08 a HU-S12) | JV | HU-S08 a HU-S12 |
| Historias de usuario de solicitudes | Redactar las historias de chat, calificación, vencimiento, notificaciones y solicitudes múltiples en una franja disponible (HU-S13 a HU-S17) | JV | HU-S13 a HU-S17 |
| Backend de solicitudes | Crear la solicitud en estado PENDIENTE, geocodificando la dirección con Nominatim y guardando las coordenadas | LD | HU-S01, HU-S06 |
| Backend de solicitudes | Búsqueda de profesionales por categoría, disponibilidad y cercanía | LD | HU-S02, HU-S04, HU-S05 |
| Backend de solicitudes | Ocultar la dirección exacta y exponer solo la zona y un punto aproximado hasta la aceptación | LD | HU-S07 |
| Backend de solicitudes | Listado de solicitudes según el rol, con filtro por estado | LD | HU-S08 |
| Backend de solicitudes | Aceptar solicitudes con validación de transición y disponibilidad, permitiendo varias en una misma franja | LD | HU-S09, HU-S17 |
| Backend de solicitudes | Rechazar y cancelar con motivo obligatorio, registrando quién canceló | LD | HU-S10, HU-S11 |
| Backend de solicitudes | Completar la solicitud por cualquiera de las partes | LD | HU-S12 |
| Backend de solicitudes | Mensajería por solicitud y calificación única con actualización de la reputación | LD | HU-S13, HU-S14, HU-U08 |
| Backend de solicitudes | Tarea programada que vence las solicitudes pendientes sin respuesta | LD | HU-S15 |

#### Sprint 4 · 09/11 – 23/11
**Objetivo:** El cliente pide un turno, el profesional lo gestiona y el flujo termina de punta a punta. Pruebas manuales y de integración pasadas.

| Actividad | Subtarea | Responsable | Historias |
|---|---|---|---|
| Frontend de solicitudes | Flujo de nueva solicitud (/solicitar): ubicación, categoría, descripción, día y horario, profesional y envío | AV | HU-S01 a HU-S06 |
| Frontend de solicitudes | Pantallas “Mis solicitudes” y “Solicitudes recibidas”, con filtro por estado | AV | HU-S08 |
| Frontend de solicitudes | Acciones de aceptar, rechazar con motivo, cancelar y completar | AV | HU-S09 a HU-S12 |
| Frontend de solicitudes | Pantalla de chat y pantalla de calificación | AV | HU-S13, HU-S14 |
| Frontend de solicitudes | Bandeja de notificaciones y resumen del administrador | AV | HU-S16, HU-U14 |
| Testing de solicitudes | Diseñar los casos de prueba de las historias HU-S01 a HU-S17 | NV | HU-S01 a HU-S17 |
| Testing de solicitudes | Probar el circuito completo: pedir, aceptar, chatear, completar y calificar | NV | HU-S01 a HU-S14 |
| Testing de solicitudes | Probar los casos límite: rechazo, cancelación, vencimiento y varias solicitudes en una franja disponible | NV | HU-S10, HU-S11, HU-S15, HU-S17 |
| Testing de solicitudes | Repetir las pruebas de usuarios para detectar regresiones | NV | HU-U01 a HU-U15 |
| Integración en BFF y pruebas de integración | Exponer en el bff-web los endpoints de solicitudes, chat y calificaciones | NM | HU-S01 a HU-S14 |
| Integración en BFF y pruebas de integración | Integrar el envío de correos por SMTP y las notificaciones WebPush | NM | HU-S06, HU-S16 |
| Integración en BFF y pruebas de integración | Probar de punta a punta con autenticación real y preparar la demo | NM | Criterios de éxito de la demo |

La estrategia por niveles, responsables y matriz trazable de casos de prueba para las 32 historias está en la sección **Plan de pruebas** del [MVP Grupo 8- DACS.md](./MVP%20Grupo%208-%20DACS.md#plan-de-pruebas).

### 3.4 Definition of Done (DoD)

Una historia de usuario se considera terminada cuando:
- Cumple todos los escenarios `Given / When / Then` de su historia.
- El código fue revisado e integrado en la rama principal correspondiente.
- Pasan las pruebas unitarias y de integración aplicables a los cambios.
- Se ejecutaron y registraron en Jira los casos de aceptación aplicables de la matriz de pruebas, en el entorno Docker.
- La tarea quedó formalmente cerrada en Jira.

---

## 4. Relevamiento

### 4.1 Historias de usuario: Gestión de usuarios

#### CLIENTE
- **HU-U01 · Registrarme con mi correo**
  *Como cliente quiero registrarme solo con mi correo para entrar sin inventar un usuario.*
  - **Scenario: Registro exitoso**
    - `Given` que estoy en el formulario de registro.
    - `When` ingreso un correo nuevo y confirmo el enlace que me llega.
    - `Then` mi cuenta se crea con rol `CLIENTE` y puedo ingresar.
- **HU-U02 · Recuperar mi contraseña**
  *Como cliente quiero recuperar mi contraseña para volver a entrar si la olvido.*
  - **Scenario: Pedir el enlace de recuperación**
    - `Given` que olvidé mi contraseña.
    - `When` la pido con mi correo desde el login.
    - `Then` recibo un enlace con caducidad para definir una nueva clave.
- **HU-U03 · Aceptar los términos y condiciones**
  *Como usuario quiero aceptar los términos en mi primer ingreso para usar la plataforma con reglas claras.*
  - **Scenario: Términos pendientes**
    - `Given` que no acepté la versión vigente de los términos.
    - `When` ingreso a la aplicación.
    - `Then` veo un modal sin botón de cerrar.
    - `And` al aceptarlo se guardan la versión y la fecha.
- **HU-U04 · Editar mi perfil**
  *Como usuario quiero editar mi nombre, teléfono y foto para que la otra parte me reconozca.*
  - **Scenario: Guardar cambios**
    - `Given` que estoy en mi perfil.
    - `When` cambio mis datos y guardo.
    - `Then` mis datos se actualizan.
    - `And` mi correo no se puede editar.

#### PROFESIONAL
- **HU-U05 · Primer ingreso con contraseña temporal**
  *Como profesional quiero recibir una contraseña temporal para entrar sin registrarme.*
  - **Scenario: Primer ingreso**
    - `Given` que el administrador me dio de alta.
    - `When` ingreso con la contraseña temporal que llegó por correo.
    - `Then` el sistema me exige cambiarla antes de entrar.
- **HU-U06 · Activar mi perfil**
  *Como profesional quiero activar mi perfil para quedar visible y recibir solicitudes.*
  - **Scenario: Activación completa**
    - `Given` que mi perfil está en estado `CARGADO`.
    - `When` completo foto, zona de cobertura y horarios.
    - `Then` mi perfil pasa a `ACTIVO`.
    - `And` aparezco en el padrón público.
- **HU-U07 · Gestionar mis horarios**
  *Como profesional quiero modificar mis franjas para que solo me pidan turnos cuando atiendo.*
  - **Scenario: Cambiar franjas**
    - `Given` que soy un profesional activo.
    - `When` agrego, edito o quito días y rangos horarios desde "Mi cuenta".
    - `Then` la disponibilidad semanal queda guardada y se muestra al volver a consultar.
    - `And` los clientes solo pueden crear nuevas solicitudes dentro de las franjas actualizadas.
- **HU-U08 · Ver mi reputación**
  *Como profesional quiero ver mis calificaciones para saber cómo me valoran.*
  - **Scenario: Consultar reputación**
    - `Given` que recibí calificaciones.
    - `When` abro mi reputación.
    - `Then` veo mi promedio de estrellas y la cantidad de calificaciones.

#### ADMINISTRADOR
- **HU-U09 · Dar de alta a un profesional**
  *Como administrador quiero dar de alta a un profesional para incorporarlo al padrón.*
  - **Scenario: Alta exitosa**
    - `Given` que estoy en `/admin/profesionales/nuevo`.
    - `When` cargo legajo, especialidades y un correo sin cuenta.
    - `Then` se crea su cuenta con contraseña temporal y su perfil queda `CARGADO`.
  - **Scenario: Correo ya en uso**
    - `Given` que el correo ya tiene una cuenta.
    - `When` intento dar de alta al profesional.
    - `Then` el alta se rechaza con el mensaje *"Ese correo ya está en uso"*.
- **HU-U10 · Consultar y modificar el padrón**
  *Como administrador quiero ver y editar el padrón para saber quién está cargado, activo o suspendido.*
  - **Scenario: Editar un profesional**
    - `Given` que abro el detalle de un profesional.
    - `When` modifico su legajo o sus especialidades y guardo.
    - `Then` los cambios quedan registrados en el padrón.
- **HU-U11 · Desactivar y reactivar cuentas**
  *Como administrador quiero desactivar cuentas para sancionar incumplimientos sin perder el historial.*
  - **Scenario: Desactivar una cuenta**
    - `Given` que abro el detalle de una cuenta activa.
    - `When` la desactivo y confirmo.
    - `Then` queda `SUSPENDIDO` y no puede operar.
    - `And` se conserva su historial.
- **HU-U12 · Gestionar categorías**
  *Como administrador quiero administrar las categorías para mantener actualizado el catálogo de oficios.*
  - **Scenario: Crear una categoría**
    - `Given` que estoy en `/admin/categorias/nueva`.
    - `When` ingreso el nombre y guardo.
    - `Then` la categoría aparece en el catálogo público.
- **HU-U13 · Consultar clientes**
  *Como administrador quiero ver y editar clientes para atender casos y gestionar su acceso.*
  - **Scenario: Editar un cliente**
    - `Given` que abro el detalle de un cliente.
    - `When` cambio su nombre o teléfono y guardo.
    - `Then` los datos se actualizan y su correo no se modifica.
- **HU-U14 · Ver el resumen de la plataforma**
  *Como administrador quiero ver indicadores para entender cómo se usa la red.*
  - **Scenario: Abrir el resumen**
    - `Given` que ingreso con rol `ADMIN`.
    - `When` abro `/admin`.
    - `Then` veo los indicadores de demanda y recorrido de las solicitudes.

#### GENERAL
- **HU-U15 · Iniciar sesión**
  *Como usuario quiero iniciar sesión con mi correo y contraseña para acceder según mi rol.*
  - **Scenario: Ingreso exitoso**
    - `Given` que tengo una cuenta activa.
    - `When` ingreso mi correo y contraseña en el login.
    - `Then` accedo a la aplicación con las opciones de mi rol.
  - **Scenario: Cuenta suspendida**
    - `Given` que mi cuenta está `SUSPENDIDA`.
    - `When` intento ingresar.
    - `Then` no puedo operar en la plataforma (bloqueo en BFF).

---

### 4.2 Historias de usuario: Gestión de solicitudes

#### CLIENTE: PEDIR UN TURNO
- **HU-S01 · Indicar dónde necesito el servicio**
  *Como cliente quiero indicar mi ubicación para que me ofrezcan profesionales cercanos.*
  - **Scenario: Ubicación por dirección**
    - `Given` que estoy en el primer paso de `/solicitar`.
    - `When` escribo mi dirección o marco un punto en el mapa.
    - `Then` se convierte en coordenadas GPS.
    - `And` la dirección exacta no se muestra al profesional hasta que acepte.
- **HU-S02 · Elegir la categoría**
  *Como cliente quiero elegir un oficio para encontrar al técnico que necesito.*
  - **Scenario: Categorías disponibles**
    - `Given` que estoy en el paso de categoría.
    - `When` veo el catálogo.
    - `Then` solo aparecen categorías con al menos un profesional activo.
- **HU-S03 · Describir el problema**
  *Como cliente quiero describir el trabajo para que el profesional decida si puede hacerlo.*
  - **Scenario: Descripción demasiado corta**
    - `Given` que estoy en el paso del problema.
    - `When` escribo menos del mínimo de caracteres exigido (20 caracteres).
    - `Then` no puedo avanzar al paso siguiente.
- **HU-S04 · Elegir día y horario**
  *Como cliente quiero elegir día y horario para acordar cuándo me atienden.*
  - **Scenario: Elegir franja**
    - `Given` que elijo un día entre hoy y los próximos seis.
    - `When` elijo una franja horaria.
    - `Then` solo se me ofrecen profesionales cuya disponibilidad cubre todo ese rango.
- **HU-S05 · Elegir profesional**
  *Como cliente quiero comparar profesionales para elegir el que más me conviene.*
  - **Scenario: Ordenar la lista**
    - `Given` que hay profesionales disponibles.
    - `When` ordeno por cercanía o por reputación.
    - `Then` la lista se reordena y muestra estrellas y cantidad de calificaciones.
- **HU-S06 · Enviar la solicitud**
  *Como cliente quiero confirmar mi pedido para que el profesional lo reciba.*
  - **Scenario: Envío exitoso**
    - `Given` que completé los seis pasos.
    - `When` envío la solicitud.
    - `Then` se crea en estado `PENDIENTE`.
    - `And` el profesional recibe un aviso por correo.
- **HU-S07 · Proteger mi domicilio**
  *Como cliente quiero que mi dirección exacta quede oculta hasta que acepten para cuidar mi privacidad.*
  - **Scenario: Solicitud pendiente**
    - `Given` que mi solicitud está `PENDIENTE`.
    - `When` el profesional la consulta.
    - `Then` ve solo la zona y un punto aproximado (~1.1 km de margen).
    - `And` la dirección exacta aparece cuando la acepta.

#### GESTIONAR SOLICITUDES
- **HU-S08 · Ver mis solicitudes**
  *Como usuario quiero ver mis solicitudes para saber qué está pendiente y qué sigue.*
  - **Scenario: Abrir mis solicitudes**
    - `Given` que tengo solicitudes.
    - `When` abro `/solicitudes`.
    - `Then` veo solo las mías, con su estado y su fecha en formato `dd/mm/aa`.
- **HU-S09 · Aceptar una solicitud**
  *Como profesional quiero aceptar un turno pendiente para comprometerme con el trabajo.*
  - **Scenario: Aceptación**
    - `Given` que tengo una solicitud `PENDIENTE` dirigida a mí.
    - `When` la acepto.
    - `Then` pasa a `ACEPTADA` y veo la dirección exacta.
    - `And` el cliente recibe un aviso.
- **HU-S10 · Rechazar con motivo**
  *Como profesional quiero rechazar indicando el motivo para que el cliente busque otro profesional.*
  - **Scenario: Rechazo con motivo**
    - `Given` que tengo una solicitud `PENDIENTE`.
    - `When` la rechazo indicando un motivo obligatorio.
    - `Then` pasa a `RECHAZADA` y el cliente recibe el motivo.
  - **Scenario: Rechazo sin motivo**
    - `Given` que tengo una solicitud `PENDIENTE`.
    - `When` intento rechazarla sin motivo.
    - `Then` el sistema no me lo permite.
- **HU-S11 · Cancelar un turno**
  *Como cliente o profesional quiero cancelar con un motivo para avisar si no se puede cumplir.*
  - **Scenario: Cancelación**
    - `Given` que la solicitud está `PENDIENTE` o `ACEPTADA`.
    - `When` la cancelo indicando un motivo.
    - `Then` pasa a `CANCELADA` y se registra quién canceló.
    - `And` la otra parte recibe un aviso.
- **HU-S12 · Completar el trabajo**
  *Como cliente o profesional quiero marcar el trabajo como terminado para cerrar el ciclo.*
  - **Scenario: Trabajo terminado**
    - `Given` que la solicitud está `ACEPTADA`.
    - `When` cualquiera de las dos partes la marca como completada.
    - `Then` pasa a `COMPLETADA` y se habilita la calificación.

#### COORDINACIÓN Y CALIFICACIÓN
- **HU-S13 · Chatear para coordinar**
  *Como cliente o profesional quiero chatear para coordinar los detalles del turno.*
  - **Scenario: Enviar un mensaje**
    - `Given` que soy participante de la solicitud.
    - `When` envío un mensaje.
    - `Then` la otra parte lo recibe en vivo vía WebSocket.
    - `And` ningún otro usuario puede leerlo.
- **HU-S14 · Calificar el servicio**
  *Como cliente quiero calificar con estrellas para ayudar a otros vecinos a elegir.*
  - **Scenario: Calificar una vez**
    - `Given` que mi solicitud está `COMPLETADA` y sin calificar.
    - `When` califico de 1 a 5 estrellas con un comentario.
    - `Then` la calificación se guarda.
    - `And` no puedo calificar de nuevo esa solicitud (una calificación por solicitud).
- **HU-S15 · Vencimiento automático**
  *Como cliente quiero que una solicitud sin respuesta venza sola para no esperar indefinidamente.*
  - **Scenario: Solicitud sin respuesta**
    - `Given` que una solicitud `PENDIENTE` superó el tiempo configurado (`SOLICITUDES_TIEMPO_EXPIRACION_HOURS`).
    - `When` corre la expiración automática del scheduler en el BFF.
    - `Then` pasa a `VENCIDA`.
    - `And` el cliente y el profesional reciben un aviso por correo y WebPush.
- **HU-S16 · Recibir notificaciones**
  *Como usuario quiero enterarme de cambios y mensajes nuevos para reaccionar a tiempo.*
  - **Scenario: Cambio de estado**
    - `Given` que tengo la aplicación abierta.
    - `When` cambia el estado de una solicitud o llega un mensaje nuevo.
    - `Then` aparece un aviso en la bandeja de notificaciones.
- **HU-S17 · Aceptar varias solicitudes en una franja disponible**
  *Como profesional quiero poder atender varias solicitudes dentro de una misma franja de disponibilidad.*
  - **Scenario: Aceptar solicitudes en la misma franja**
    - `Given` que tengo dos solicitudes `PENDIENTE` para el mismo día y rango horario, ambos dentro de mi disponibilidad.
    - `When` acepto las dos solicitudes.
    - `Then` ambas pasan a `ACEPTADA` de forma independiente.
    - `And` una solicitud aceptada no bloquea otras solicitudes que correspondan a esa franja disponible.

---

### 4.3 Requisitos funcionales

| ID | Requisito | Historias asociadas |
|---|---|---|
| **RF-01** | Registro, ingreso y recuperación de contraseña, delegados a Keycloak mediante OIDC y PKCE. | HU-U01, HU-U02, HU-U15 |
| **RF-02** | Roles de sistema (Cliente, Profesional y Administrador) con permisos diferenciados mediante RBAC en el BFF. | Transversal |
| **RF-03** | Aceptación obligatoria de la versión vigente de los términos y condiciones, con registro de versión y fecha. | HU-U03 |
| **RF-04** | Edición del perfil propio (nombre, apellido, teléfono y foto de perfil). | HU-U04 |
| **RF-05** | Alta individual de profesionales por el Administrador, con contraseña temporal y cambio obligatorio en el primer ingreso. | HU-U05, HU-U09 |
| **RF-06** | Activación del perfil por el propio profesional (foto, zona geográfica de cobertura y horarios semanales). | HU-U06 |
| **RF-07** | Gestión de la disponibilidad horaria por parte del profesional (franjas semanales por día). | HU-U07 |
| **RF-08** | Consulta y edición del padrón y de los clientes; desactivación y reactivación de cuentas conservando el historial. | HU-U10, HU-U11, HU-U13 |
| **RF-09** | Gestión de categorías de oficios técnicos por el Administrador. | HU-U12 |
| **RF-10** | Directorio con búsqueda de profesionales por categoría, disponibilidad y proximidad geográfica. | HU-S01, HU-S02, HU-S04, HU-S05 |
| **RF-11** | Creación de solicitudes de turno por el cliente, con protección de su dirección exacta hasta la aceptación. | HU-S01 a HU-S07 |
| **RF-12** | Gestión del ciclo de la solicitud: consulta, aceptación, rechazo con motivo, cancelación con motivo y finalización por cualquiera de las partes; se permiten varias solicitudes en una misma franja de disponibilidad. | HU-S08 a HU-S12, HU-S17 |
| **RF-13** | Mensajería de texto en vivo asociada a cada solicitud, entre cliente y profesional mediante WebSocket / STOMP. | HU-S13 |
| **RF-14** | Calificación única de 1 a 5 estrellas con comentario por parte del cliente, y consulta de la reputación por el profesional. | HU-S14, HU-U08 |
| **RF-15** | Vencimiento automático de las solicitudes pendientes sin respuesta al expirar el plazo configurado. | HU-S15 |
| **RF-16** | Notificaciones por correo transaccional y dentro de la aplicación (WebPush y bandeja interna) ante cambios de estado y mensajes. | HU-S06, HU-S16 |
| **RF-17** | Resumen con indicadores de demanda y recorrido de las solicitudes para el Administrador. | HU-U14 |

---

### 4.4 Requisitos no funcionales

| ID | Requisito | Detalle |
|---|---|---|
| **RNF-01** | **Seguridad** | Autenticación basada estrictamente en tokens JWT (OIDC + PKCE); la identidad del actor se toma siempre de los claims del token en el BFF (`sub`), nunca del cuerpo de la petición. |
| **RNF-02** | **Comunicación segura** | Todo el tráfico circula por HTTPS a través de Nginx como terminador TLS. |
| **RNF-03** | **Privacidad de datos** | La dirección exacta del cliente se oculta al profesional hasta que acepta; las coordenadas se cifran en reposo con AES-256-GCM; las fotos se almacenan en un volumen privado y su acceso se controla por matriz de roles. |
| **RNF-04** | **Trazabilidad y auditoría** | Al suspender una cuenta se conserva su historial completo; se registra quién cancela una solicitud y la versión y fecha de los términos aceptados. |
| **RNF-05** | **Tiempo real y reactividad** | Los mensajes y los avisos de cambio de estado llegan a la contraparte sin recargar la aplicación (WebSocket y Signals en Angular). |
| **RNF-06** | **Configurabilidad** | El tiempo de vencimiento de las solicitudes pendientes es un parámetro configurable (`SOLICITUDES_TIEMPO_EXPIRACION_HOURS`). |

---

### 4.5 Trazabilidad de historias de usuario

| Historia | Título | Actor | RF | Sprint |
|---|---|---|---|---|
| `HU-U01` | Registrarme con mi correo | Cliente | RF-01 | 1–2 |
| `HU-U02` | Recuperar mi contraseña | Cliente | RF-01 | 1–2 |
| `HU-U03` | Aceptar los términos y condiciones | Todos | RF-03 | 1–2 |
| `HU-U04` | Editar mi perfil | Todos | RF-04 | 1–2 |
| `HU-U05` | Primer ingreso con contraseña temporal | Profesional | RF-05 | 1–2 |
| `HU-U06` | Activar mi perfil | Profesional | RF-06 | 1–2 |
| `HU-U07` | Gestionar mis horarios | Profesional | RF-07 | 1–2 |
| `HU-U08` | Ver mi reputación | Profesional | RF-14 | 1–2 |
| `HU-U09` | Dar de alta a un profesional | Administrador | RF-05 | 1–2 |
| `HU-U10` | Consultar y modificar el padrón | Administrador | RF-08 | 1–2 |
| `HU-U11` | Desactivar y reactivar cuentas | Administrador | RF-08 | 1–2 |
| `HU-U12` | Gestionar categorías | Administrador | RF-09 | 1–2 |
| `HU-U13` | Consultar clientes | Administrador | RF-08 | 1–2 |
| `HU-U14` | Ver el resumen de la plataforma | Administrador | RF-17 | 3–4 |
| `HU-U15` | Iniciar sesión | Todos | RF-01 | 1–2 |
| `HU-S01` | Indicar dónde necesito el servicio | Cliente | RF-10, RF-11 | 3–4 |
| `HU-S02` | Elegir la categoría | Cliente | RF-10, RF-11 | 3–4 |
| `HU-S03` | Describir el problema | Cliente | RF-11 | 3–4 |
| `HU-S04` | Elegir día y horario | Cliente | RF-10, RF-11 | 3–4 |
| `HU-S05` | Elegir profesional | Cliente | RF-10 | 3–4 |
| `HU-S06` | Enviar la solicitud | Cliente | RF-11, RF-16 | 3–4 |
| `HU-S07` | Proteger mi domicilio | Cliente | RF-11 | 3–4 |
| `HU-S08` | Ver mis solicitudes | Cliente y profesional | RF-12 | 3–4 |
| `HU-S09` | Aceptar una solicitud | Profesional | RF-12, RF-16 | 3–4 |
| `HU-S10` | Rechazar con motivo | Profesional | RF-12, RF-16 | 3–4 |
| `HU-S11` | Cancelar un turno | Cliente y profesional | RF-12, RF-16 | 3–4 |
| `HU-S12` | Completar el trabajo | Cliente y profesional | RF-12 | 3–4 |
| `HU-S13` | Chatear para coordinar | Cliente y profesional | RF-13 | 3–4 |
| `HU-S14` | Calificar el servicio | Cliente | RF-14 | 3–4 |
| `HU-S15` | Vencimiento automático | Sistema | RF-15, RF-16 | 3–4 |
| `HU-S16` | Recibir notificaciones | Todos | RF-16 | 3–4 |
| `HU-S17` | Aceptar varias solicitudes en una franja disponible | Profesional | RF-12 | 3–4 |

---

## 5. Modelado

### 5.1 Diagrama de casos de uso

Los actores del sistema son el **Cliente**, el **Profesional** y el **Administrador**. Los casos de uso se agrupan en las dos épicas del MVP:
- **Gestión de usuarios:** registro, ingreso, recuperación de contraseña, perfil, aceptación de términos, alta y administración del padrón de profesionales, categorías y gestión de clientes.
- **Gestión de solicitudes:** crear solicitud guiada en 6 pasos, aceptar/rechazar con motivo, cancelar, completar, chat en tiempo real, calificación y vencimiento automático.

> Enlace al diagrama de casos de uso:
> **https://drive.google.com/file/d/1Ju9MOgnjGWvL1gTsbLSjPvBHsg_gcU9h/view?usp=sharing**

### 5.2 Diagrama de clases

Las entidades del dominio son:
- **`Usuario`:** datos personales (nombre, apellido, email, teléfono), rol de negocio (`CLIENTE`, `PROFESIONAL`, `ADMIN`), clave de foto de perfil, estado de la cuenta (`CARGADO`, `ACTIVO`, `SUSPENDIDO`, `INACTIVO`) y términos aceptados (versión y fecha).
- **`Profesional`:** legajo institucional único, centro de zona de cobertura (latitud/longitud cifradas), radio en kilómetros, estado del perfil (`CARGADO`, `ACTIVO`, `SUSPENDIDO`) y fecha de activación.
- **`Disponibilidad`:** franjas horarias semanales (`diaSemana`, `horaInicio`, `horaFin`) asociadas a un profesional.
- **`Especialidad`:** catálogo de oficios técnicos validados por la Universidad Popular.
- **`Solicitud`:** domicilio, zona aproximada, coordenadas (cifradas en reposo), descripción del problema, franja horaria propuesta, estado (`EstadoSolicitud`), canceladaPor y motivo de cancelación.
- **`Calificación`:** puntaje (1 a 5 estrellas) y comentario asociado a una solicitud única completada.
- **`Mensaje`:** emisor, solicitud, texto y fecha de envío para el chat en vivo.
- Enumerados: `RolNegocio`, `EstadoUsuario`, `EstadoProfesional`, `EstadoSolicitud`, `DiaSemana`.

> Enlace al diagrama de clases:
> **https://drive.google.com/file/d/1btT906f3BM3RUKJ19vn9AyYQmFGWjRP4/view?usp=sharing**

### 5.3 Diagramas de estados y transiciones

#### 5.3.1 Estados de la solicitud
Los estados posibles son `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `COMPLETADA`, `CANCELADA` y `VENCIDA`. Los estados finales son `RECHAZADA`, `COMPLETADA`, `CANCELADA` y `VENCIDA`.

| Desde | Evento | Actor | Hacia | Condición o efecto |
|---|---|---|---|---|
| *(inicio)* | Crear solicitud | Cliente | `PENDIENTE` | El profesional ve solo la zona y un punto aproximado (~1.1 km de margen); recibe aviso por correo. |
| `PENDIENTE` | Aceptar | Profesional | `ACEPTADA` | Se revela la dirección exacta y coordenadas reales; una solicitud aceptada no bloquea otras de la misma franja de disponibilidad; el cliente recibe aviso. |
| `PENDIENTE` | Rechazar | Profesional | `RECHAZADA` | El motivo es obligatorio y el cliente lo recibe; estado final. |
| `PENDIENTE` | Cancelar | Cliente o Profesional | `CANCELADA` | Motivo obligatorio; se registra quién canceló y la otra parte recibe aviso; estado final. |
| `ACEPTADA` | Cancelar | Cliente o Profesional | `CANCELADA` | Motivo obligatorio; se registra quién canceló y la otra parte recibe aviso; estado final. |
| `ACEPTADA` | Completar | Cliente o Profesional | `COMPLETADA` | Marca el trabajo terminado; habilita la calificación por parte del cliente; estado final. |
| `PENDIENTE` | Vencer | Sistema (Scheduler) | `VENCIDA` | Supera `SOLICITUDES_TIEMPO_EXPIRACION_HOURS` sin respuesta; ambas partes reciben aviso; estado final. |

> Enlace al diagrama de estados de la solicitud:
> **https://drive.google.com/file/d/1Em1No0Op45QV2_i3s2ZJCFdKz--MmYk3/view?usp=sharing**

#### 5.3.2 Estados de cuenta
Los estados son `CARGADO`, `ACTIVO`, `SUSPENDIDO` e `INACTIVO` (este último para clientes baneados).

| Desde | Evento | Actor | Hacia | Condición o efecto |
|---|---|---|---|---|
| *(inicio)* | Registro | Cliente | `ACTIVO` | Cuenta creada con rol Cliente tras confirmar email. |
| *(inicio)* | Alta | Administrador | `CARGADO` | Profesional con contraseña temporal creada en Keycloak; todavía no es visible en el padrón. |
| `CARGADO` | Activar perfil | Profesional | `ACTIVO` | Completa foto, zona de cobertura y horarios semanales; aparece visible en el padrón público. |
| `ACTIVO` | Suspender | Administrador | `SUSPENDIDO` | No puede operar ninguna acción autenticada (corte en BFF); se conserva todo su historial. |
| `SUSPENDIDO` | Reactivar | Administrador | `ACTIVO` | Se levanta la sanción; vuelve a operar con normalidad. |
| `ACTIVO` | Banear | Administrador | `INACTIVO` | Cliente sancionado de forma permanente. |

> Enlace al diagrama de estados de cuenta:
> **https://drive.google.com/file/d/1veufyzMZeWApTWF-NPNIUsajX1ZyAODh/view?usp=sharing**

---

## 6. Arquitectura y tecnología

### 6.1 Componentes y stack

| Componente | Tecnología | Rol en la arquitectura |
|---|---|---|
| **Frontend** | Angular 22 · Angular Material · PWA | Interfaz de usuario reactiva basada en Signals. |
| **BFF (Backend for Frontend)** | Spring Boot 4 · Java 21 | Gateway único, agregación, RBAC, WebSocket, fotos y correos. |
| **ms-usuarios** | Spring Boot 4 · Java 21 | Microservicio de identidades de negocio, perfiles y términos. |
| **ms-profesionales** | Spring Boot 4 · Java 21 | Microservicio de padrón, especialidades y disponibilidad. |
| **ms-solicitudes** | Spring Boot 4 · Java 21 | Microservicio de ciclo de solicitudes, chat y calificaciones. |
| **Identidad y Seguridad** | Keycloak 26 | Proveedor de identidad OIDC, PKCE, emisión de JWT y JWKS. |
| **Base de datos** | PostgreSQL 16 | Almacenamiento relacional en contenedor Docker. |
| **Proxy inverso y TLS** | Nginx 1.27-alpine | Terminación TLS, SPA fallback y enrutamiento con buffers. |
| **Almacenamiento de fotos** | Volumen Docker `fotos_data` | Persistencia privada de binarios fuera de la base de datos. |
| **Servidor de correo** | SMTP (Gmail / Mailpit / SES) | Envío de correos transaccionales y de recuperación. |
| **Notificaciones** | Correo transaccional + WebPush | Avisos de cambio de estado, expiración y chat. |
| **Chat en tiempo real** | WebSocket + STOMP | Conexión bidireccional segura para mensajería en vivo. |
| **API externa** | OpenStreetMap (Nominatim) | Geocodificación y geocodificación inversa con rate limiting. |

```
                    https://vincula-up.local          http://localhost
                               │                            │
                    ┌─────────▼────────────────────────────▼─────────┐
                    │                   Nginx 1.27                    │
                    │  TLS · reverse proxy · SPA fallback · buffers │
                    └──┬──────────────┬───────────────┬─────────────┘
                       │ /            │ /api/         │ /realms/
                       │              │               │ /login-actions/
                       │              │               │ /resources/
                       │              │               │ /js/
              ┌────────▼───────┐ ┌────▼────────┐ ┌───▼─────────────┐
              │ Angular 22 SPA │ │  BFF :9001  │ │  Keycloak :8080 │
              │   estático     │ │  Spring     │ │  OIDC + PKCE    │
              └────────────────┘ └────┬────────┘ └─────────────────┘
                                       │  JWT / JWKS
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
 ┌──────▼────────┐            ┌────────▼────────┐            ┌────────▼────────┐
 │ ms-usuarios   │            │ ms-profesionales│            │ ms-solicitudes  │
 │    :8081      │            │     :8082       │            │     :8083       │
 └──────┬────────┘            └────────┬────────┘            └────────┬────────┘
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                               ┌────────▼────────┐
                               │  PostgreSQL 16  │
                               │   :5432        │
                               └─────────────────┘
```

### 6.2 Responsabilidades por servicio

- **`bff-web` (Puerto 9001):**
  1. **Único punto de entrada:** el frontend Angular nunca contacta a los microservicios directamente.
  2. **Agregación y enriquecimiento:** combina la información del padrón (`ms-profesionales`) con los datos del usuario (`ms-usuarios`) y la reputación (`ms-solicitudes`).
  3. **Autorización y RBAC:** valida el JWT contra el JWKS de Keycloak y aplica las 27 reglas de acceso. Los microservicios de dominio además actúan como OAuth2 Resource Servers para defensa en profundidad.
  4. **Identidad estricta:** inyecta el `sub` de Keycloak en cada petición; un cliente nunca puede falsear su identidad.
  5. **Fotos privadas:** valida tipo y tamaño, escribe en el volumen nombrado `fotos_data` y aplica la matriz de visibilidad de fotos.
  6. **Avisos transaccionales y scheduler:** envía correos de alta, turnos y expiración con plantilla HTML/texto multipart y ejecuta el cron de expiración cada 15 segundos.
- **`ms-usuarios` (Puerto 8081):** Cuentas y perfiles de clientes y administradores, estado de negocio (`CARGADO`, `ACTIVO`, `SUSPENDIDO`, `INACTIVO`), vinculación de `keycloakId` y registro de términos y condiciones (versión y fecha).
- **`ms-profesionales` (Puerto 8082):** Padrón de técnicos, legajos, categorías/especialidades, disponibilidad horaria semanal y activación del perfil.
- **`ms-solicitudes` (Puerto 8083):** Ciclo de vida completo de solicitudes, validación de disponibilidad y transiciones, solicitudes múltiples por franja, geocodificación con Nominatim, chat, calificaciones y vencimiento.

---

### 6.3 Puntos clave a revisar de la arquitectura

#### 6.3.1 ¿Hay que especificar el conector a la API externa (OpenStreetMap / Nominatim)?
**Sí, y está completamente especificado.**
- **Servicio consumido:** OpenStreetMap · Nominatim.
- **Entrada / Salida:** Dirección en texto → Coordenadas geográficas (`latitud`, `longitud`); o coordenadas → dirección normalizada (`display_name`).
- **Servicio consumidor:** `ms-solicitudes` mediante `GeocodingClient`. El BFF expone `GET /api/gps` como proxy público hacia `GET /solicitudes/geocodificar`.
- **Caché y Rate-Limiting:** Nominatim restringe el uso a máximo 1 req/segundo. El sistema implementa una **caché LRU en memoria de 500 entradas con TTL de 10 minutos**. Solo se cachean respuestas exitosas.
- **Degradación controlada en 2 capas:** Si Nominatim falla o se supera el timeout, devuelve `resolved: false` con mensaje descriptivo sin lanzar excepciones. Si `ms-solicitudes` no responde, el BFF devuelve `source: servicio-no-disponible` en lugar de un error 502.

#### 6.3.2 ¿Hay que especificar el conector a SMTP?
**Sí, debe quedar formalmente especificado como contrato de infraestructura.**
- **Canal de envío:** El BFF (`NotificacionService`) y Keycloak (recuperación de contraseña, verificación) se conectan al servidor SMTP configurado por variables de entorno (`KEYCLOAK_SMTP_*`).
- **Separación de remitentes (`From` vs `Reply-To`):**
  - `From`: Cuenta autenticada en el servidor SMTP (ej: `lucianodavezac@gmail.com`).
  - `Reply-To`: Casilla institucional de destino de respuestas (ej: `vinculaup@gmail.com`), configurada en `KEYCLOAK_SMTP_REPLY_TO`.
- **Protocolo y Seguridad:** Puerto 587 con cifrado `STARTTLS` obligatorio (o 465 con SSL implícito). No se permite texto plano.
- **Tolerancia y Best-effort:** Si el servidor SMTP no responde, la operación de negocio (ej. alta del profesional o cambio de estado de solicitud) **se confirma igual** y el fallo se registra en el log. En el alta de un profesional, el BFF devuelve `correoEnviado: false` junto con la contraseña temporal para que el administrador la suministre manualmente.

#### 6.3.3 ¿El volumen de fotos y el protocolo SMTP violan la arquitectura de microservicios?
**No. Ninguno de los dos viola la arquitectura de microservicios si se respetan las siguientes directivas de diseño:**

1. **Almacenamiento de fotos en volumen nombrado (`fotos_data`):**
   - **Por qué NO viola la arquitectura:** Un principio central de los microservicios es no almacenar binarios pesados (imágenes BLOB) dentro de la base de datos relacional transaccional, ya que degradaría los backups, la replicación y el pool de conexiones. Las imágenes se consideran almacenamiento de objetos.
   - **Desacoplamiento:** El BFF gestiona la subida mediante `POST /api/fotos` y la lectura controlada mediante `GET /api/usuarios/{id}/foto` a través de la interfaz abstracta `FotoStorage`. Los microservicios de dominio (`ms-usuarios` y `ms-profesionales`) solo almacenan en su base de datos una **clave textual de 512 caracteres** (`perfiles/<uuid>.jpg`), jamás el archivo físico.
   - **Escalabilidad horizontal futura:** En el entorno local / MVP se utiliza la implementación `FotoStorageLocal` respaldada por el volumen Docker nombrado `fotos_data`. Para escalar a múltiples hosts de producción, se sustituye dicha clase por un cliente de almacenamiento en la nube (AWS S3, MinIO o Google Cloud Storage), manteniendo intacta la API REST y el contrato de los microservicios.

2. **Protocolo SMTP:**
   - **Por qué NO viola la arquitectura:** SMTP es un protocolo estándar de comunicación con un servicio externo de correo saliente. El BFF actúa como orquestador de notificaciones transaccionales para los eventos del sistema. Los microservicios de dominio no tienen dependencias directas con el servidor de correos, preservando el principio de responsabilidad única.

---

### 6.4 Roles del sistema

| Rol | Qué hace | Pantalla principal |
|---|---|---|
| **Cliente / Vecino** | Busca oficios, define su ubicación geográfica, solicita turno, chatea para coordinar y califica el servicio finalizado. | `/solicitar` → `/solicitudes` |
| **Profesional Técnico** | Completa su activación (foto, radio de cobertura, horarios semanales), gestiona solicitudes (acepta/rechaza con motivo), coordina por chat. | `/activar-perfil` → `/solicitudes` |
| **Administrador Institucional** | Da de alta profesionales al padrón con legajo y especialidades, monitorea el estado (Cargado, Activo, Suspendido), suspende y reactiva cuentas. | `/admin` |

Los roles son **roles de negocio** persistidos en `ms-usuarios` (`Usuario.rolNegocio`) y replicados como roles de realm en Keycloak. En Spring Security se mapean con el prefijo estándar `ROLE_CLIENTE`, `ROLE_PROFESIONAL` y `ROLE_ADMIN`.

---

### 6.5 Decisiones de diseño clave

- **Dirección exacta oculta hasta la aceptación:** Protege la privacidad del cliente. Mientras la solicitud está en `PENDIENTE`, el profesional solo ve la zona aproximada (barrio y localidad) y un punto con coordenadas redondeadas a 2 decimales (~1.1 km de margen). Al pasar a `ACEPTADA`, se le revela la dirección exacta.
- **Identidad tomada siempre del token JWT:** Evita que un usuario se haga pasar por otro enviando un identificador ajeno en el cuerpo de la petición. El BFF sobreescribe cualquier ID con el claim `sub` del token.
- **Fotos privadas en volumen con matriz de visibilidad:** Las fotos no se publican en rutas estáticas abiertas de Nginx. El endpoint `GET /api/usuarios/{id}/foto` exige autenticación y valida que el rol del solicitante tenga permitido ver la foto.
- **Expiración automática de solicitudes pendientes:** Una tarea programada en el BFF (`SolicitudExpiracionScheduler`, cada 15 segundos) vence las solicitudes que superan el límite configurado (`SOLICITUDES_TIEMPO_EXPIRACION_HOURS`), notificando a ambas partes.
- **BFF como único punto de entrada:** Centraliza la autorización, la agregación de datos y la exposición de WebSocket, evitando exponer los microservicios directamente a la red pública.
- **Keycloak centralizado:** Delega el registro, el login y la recuperación de credenciales en un proveedor de identidad OIDC con PKCE S256.

---

## 7. Estructura del repositorio

```
.
├── README.md                      Resumen del proyecto, stack y deploy rápido
├── MANUAL.md                      Manual de uso y operación detallada
├── ESPECIFICACION.md              Este documento único de referencia técnica
├── docker-compose.yml             Orquestación de los contenedores Docker
├── .env                           Variables reales de entorno (NO versionado)
├── .env.example                   Plantilla de variables de entorno (versionado)
│
├── backend/
│   ├── bff-web/                   :9001  Gateway, RBAC, agregación, chat, fotos y mail
│   ├── ms-usuarios/               :8081  Identidades de negocio, roles y términos
│   ├── ms-profesionales/          :8082  Padrón, especialidades, disponibilidad
│   └── ms-solicitudes/            :8083  Ciclo de vida, chat, calificaciones, geocodificación
│
├── frontend/vincula-up-web/       SPA Angular 22 (PWA)
│   └── src/app/
│       ├── core/                  Services (HTTP, auth, theme, push), guards, models
│       ├── shared/                Navbar, tabbar, footer, avatar, confirm-modal
│       ├── home/ request/ my-requests/             Flujo del cliente
│       ├── activation/ account/                    Flujo del profesional
│       ├── admin/                 Shell + 4 paneles de administración
│       └── legal/                 Términos, FAQ y modal de aceptación
│
├── keycloak/
│   ├── import/                    Realm `vincula-up` (JSON de importación)
│   └── themes/vincula-up/         Tema personalizado (login, email y cuenta)
├── nginx/                         Configuración del proxy inverso y certificados TLS
└── scripts/
    ├── deploy.sh                  Script de despliegue automatizado en un paso
    ├── linux-macos/               Scripts de bootstrap, CA y certificados para Unix
    └── windows/                   Scripts equivalentes en PowerShell para Windows
```

---

## 8. API del BFF: catálogo de endpoints

Todos los endpoints cuelgan del prefijo `/api`. El BFF aplica RBAC según la regla configurada en `SecurityConfig.java`. El símbolo `—` indica acceso público.

### 8.1 Profesionales
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/profesionales` | — | Listado público del padrón. Acepta filtros `estado` y `todos`; incluye franjas de disponibilidad. |
| GET | `/api/profesionales/{id}` | Autenticado | Ficha completa de un profesional y sus horarios semanales. |
| GET | `/api/profesionales/mi-perfil` | `PROFESIONAL` | Perfil del profesional autenticado. |
| POST | `/api/profesionales` | `ADMIN` | Alta tradicional de profesional en el padrón. |
| POST | `/api/profesionales/alta` | `ADMIN` | Alta en un paso: crea cuenta en Keycloak con contraseña temporal, usuario y perfil pendiente. |
| PUT | `/api/profesionales/{id}` | `ADMIN` | Edición de legajo y especialidades en el padrón. |
| PATCH | `/api/profesionales/{id}/suspender` | `ADMIN` | Desactivación / baja lógica (pasa a estado `SUSPENDIDO`). |
| PATCH | `/api/profesionales/{id}/reactivar` | `ADMIN` | Levanta la suspensión (vuelve a estado `ACTIVO`). |
| PUT | `/api/profesionales/{id}/disponibilidad` | `PROFESIONAL` | Reemplaza las franjas horarias semanales; el BFF valida que el perfil pertenezca al profesional autenticado. Se usa desde "Mi cuenta" y admite varios rangos por día. |
| GET | `/api/profesionales/{id}/disponibilidad` | Autenticado | Consulta los horarios semanales de atención. |
| GET | `/api/mi-reputacion` | `PROFESIONAL` | Consulta la reputación propia como `{ promedio, cantidad, resenas }`; cada reseña incluye puntaje, comentario, fecha y nombre del cliente. Si falla el servicio de calificaciones, se informa el error en lugar de mostrar una reputación vacía. |

### 8.2 Solicitudes
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| POST | `/api/solicitudes` | `CLIENTE` | Crea una solicitud en estado `PENDIENTE`. Valida día y horario contra la disponibilidad y resuelve coordenadas GPS. |
| GET | `/api/solicitudes/mias` | Autenticado | Listado de solicitudes del actor (como cliente o profesional). |
| GET | `/api/solicitudes/panel` | `ADMIN` | Indicadores de demanda y recorrido histórico de solicitudes. |
| PATCH | `/api/solicitudes/{id}/aceptar` | `PROFESIONAL` | Acepta el turno (pasa a `ACEPTADA`); revela la dirección exacta. |
| PATCH | `/api/solicitudes/{id}/rechazar` | `PROFESIONAL` | Rechaza el turno con motivo obligatorio (pasa a `RECHAZADA`). |
| PATCH | `/api/solicitudes/{id}/completar` | `CLIENTE` o `PROFESIONAL` | Marca el trabajo terminado (pasa a `COMPLETADA`); habilita calificar. |
| PATCH | `/api/solicitudes/{id}/cancelar` | `CLIENTE` o `PROFESIONAL` | Cancela el turno con motivo obligatorio (pasa a `CANCELADA`). |

### 8.3 Mensajes, chat en vivo y calificaciones
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/solicitudes/{id}/mensajes` | Autenticado | Historial completo de mensajes de la solicitud. |
| POST | `/api/solicitudes/{id}/mensajes` | Autenticado | Envía y persiste un mensaje en el chat; se publica en vivo al WebSocket. |
| GET | `/api/calificaciones` | — | Reputación pública de profesionales (promedio y total). |
| POST | `/api/solicitudes/{id}/calificacion` | `CLIENTE` | Califica con 1 a 5 estrellas y comentario la solicitud completada. |
| GET | `/api/solicitudes/{id}/calificacion` | Autenticado | Consulta la calificación de la solicitud. |
| WS | `/ws` (protocolo STOMP) | Autenticado | Conexión WebSocket para mensajería en tiempo real suscrita a `/topic/solicitudes/{id}`. |

### 8.4 Usuarios
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | `ADMIN` | Listado general de clientes registrados. |
| GET | `/api/usuarios/yo` | Autenticado | Perfil propio y estado de aceptación de términos. |
| GET | `/api/usuarios/{id}` | Autenticado | Ficha del usuario contraparte para coordinación de turnos. |
| GET | `/api/usuarios/por-keycloak` | Autenticado | Vincula o recupera la entidad de negocio a partir del `sub` del token. |
| GET | `/api/usuarios/por-email` | `ADMIN` | Búsqueda de usuario por email (devuelve 204 si no existe). |
| POST | `/api/usuarios` | `ADMIN` | Creación administrativa de usuario de negocio. |
| PATCH | `/api/usuarios/{id}` | `ADMIN` | Edición de datos personales del usuario. |
| PATCH | `/api/usuarios/yo` | Autenticado | Edición de datos del perfil propio (nombre, apellido, teléfono). |
| PATCH | `/api/usuarios/{id}/suspender` | `ADMIN` | Desactiva una cuenta de cliente (estado `SUSPENDIDO`). |
| PATCH | `/api/usuarios/{id}/reactivar` | `ADMIN` | Reactiva una cuenta de cliente. |
| DELETE | `/api/usuarios/{id}` | `ADMIN` | Baja lógica de la cuenta. |

### 8.5 Especialidades
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/especialidades` | — | Catálogo público de especialidades técnicas. |
| POST | `/api/especialidades` | `ADMIN` | Crea una nueva especialidad en el catálogo. |
| PUT | `/api/especialidades/{id}` | `ADMIN` | Modifica el nombre de una especialidad existente. |
| DELETE | `/api/especialidades/{id}` | `ADMIN` | Elimina una especialidad del catálogo. |

### 8.6 Activación y vinculación
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| POST | `/api/profesionales/activar` | `PROFESIONAL` | Activa el perfil cargando foto, zona GPS y horarios (pasa a `ACTIVO`). |
| POST | `/api/profesionales/vincular` | `PROFESIONAL` | Vincula la identidad de Keycloak con el registro del padrón. |

### 8.7 Utilidades
| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| POST | `/api/fotos` | Autenticado | Sube un archivo de imagen al volumen privado y retorna su **clave** (`perfiles/<uuid>.jpg`). |
| GET | `/api/usuarios/{id}/foto` | Autenticado | Sirve los bytes de la foto si la matriz de visibilidad de roles lo autoriza. |
| DELETE | `/api/fotos/{key}` | Autenticado | Elimina lógicamente una foto de perfil del volumen privado. |
| PATCH | `/api/terminos/aceptar` | Autenticado | Registra la versión y fecha de los términos aceptados por el usuario. |
| GET | `/api/gps` | — | Proxy público de geocodificación de direcciones con Nominatim. |
| GET | `/actuator/health` | — | Endpoint de diagnóstico del estado del servicio. |

---

## 9. Modelo de datos detallado

Los identificadores de todas las entidades son `UUID`. No se utilizan claves foráneas físicas entre bases de datos de diferentes microservicios para garantizar el desacoplamiento.

### 9.1 `ms-usuarios` — Usuario
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | Primary Key. |
| `keycloakId` | `UUID` | Claim `sub` del token JWT. Admite nulos en prerregistros administrativos. |
| `nombre` | `VARCHAR(100)` | Nombre de pila. |
| `apellido` | `VARCHAR(100)` | Apellido. |
| `email` | `VARCHAR(255)` | Único. Identidad de acceso al sistema. |
| `telefono` | `VARCHAR(50)` | Opcional. |
| `fotoUrl` | `VARCHAR(512)` | Almacena la **clave** del archivo en el volumen privado (ej: `perfiles/<uuid>.jpg`), no una URL pública. |
| `rolNegocio` | `ENUM` | `CLIENTE`, `PROFESIONAL`, `ADMIN`. |
| `estado` | `ENUM` | `CARGADO`, `ACTIVO`, `SUSPENDIDO`, `INACTIVO`. |
| `fechaAlta` | `TIMESTAMP WITH TIME ZONE` | Momento de creación del registro. |
| `terminos_version` | `VARCHAR(32)` | Versión de los términos aceptados (ej: `2026-11-01`). |
| `terminos_aceptado_en`| `TIMESTAMP WITH TIME ZONE` | Fecha y hora exacta de aceptación de términos. |

### 9.2 `ms-profesionales` — Profesional, Especialidad y Disponibilidad

#### Entidad `Profesional`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | Primary Key. |
| `usuarioId` | `UUID` | Referencia lógica a `Usuario.id` de `ms-usuarios`. |
| `legajo` | `VARCHAR(50)` | Identificador institucional único otorgado por la UP (ej: `P-2001`). |
| `fotoUrl` | `VARCHAR(512)` | Clave del archivo de foto en el volumen (`perfiles/<uuid>.jpg`). |
| `zonaCoberturaLat` | `TEXT` | Latitud del centro de cobertura cifrada con AES-256-GCM. |
| `zonaCoberturaLng` | `TEXT` | Longitud del centro de cobertura cifrada con AES-256-GCM. |
| `radioKm` | `DOUBLE PRECISION` | Radio de cobertura territorial en kilómetros. |
| `estado` | `ENUM` | `CARGADO`, `ACTIVO`, `SUSPENDIDO`. |
| `fechaCarga` | `TIMESTAMP WITH TIME ZONE` | Fecha de alta administrativa en el padrón. |
| `fechaActivacion` | `TIMESTAMP WITH TIME ZONE` | Fecha en la que completó la activación del perfil. |
| `especialidades` | `Set<Especialidad>` | Relación Many-to-Many con la tabla de especialidades. |

#### Entidades `Especialidad` y `Disponibilidad`
- **`Especialidad`:** `id` (`UUID`, PK), `nombre` (`VARCHAR(100)`).
- **`Disponibilidad`:** `id` (`UUID`, PK), `profesionalId` (`UUID`), `diaSemana` (`ENUM`: `LUNES`...`DOMINGO`), `horaInicio` (`TIME`), `horaFin` (`TIME`).

### 9.3 `ms-solicitudes` — Solicitud, Mensaje y Calificación

#### Entidad `Solicitud`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` | Primary Key. |
| `clienteId` | `UUID` | Referencia lógica al cliente que solicita el servicio. |
| `profesionalId` | `UUID` | Referencia lógica al profesional asignado. |
| `especialidadId` | `UUID` | Especialidad técnica requerida. |
| `direccionServicio` | `VARCHAR(255)` | Dirección exacta; oculta al profesional mientras esté en `PENDIENTE`. |
| `zonaAproximada` | `VARCHAR(255)` | Barrio y localidad extraídos por geocodificación inversa. |
| `descripcion` | `TEXT` | Detalle del problema técnico (mínimo 20 caracteres). |
| `latitud` | `TEXT` | Latitud del domicilio cifrada con AES-256-GCM. |
| `longitud` | `TEXT` | Longitud del domicilio cifrada con AES-256-GCM. |
| `fechaHoraPropuesta` | `TIMESTAMP` | Inicio del turno acordado. |
| `fechaHoraFinPropuesta` | `TIMESTAMP` | Fin estimado del turno. |
| `estado` | `ENUM` | `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `COMPLETADA`, `CANCELADA`, `VENCIDA`. |
| `motivoCancelacion` | `VARCHAR(500)` | Obligatorio si el estado es `RECHAZADA` o `CANCELADA`. |
| `canceladaPor` | `UUID` | Identificador del usuario que canceló la solicitud. |
| `fechaCreacion` | `TIMESTAMP` | Fecha de creación del pedido. |
| `fechaCambioEstado`| `TIMESTAMP` | Fecha de última transición del ciclo de vida. |

#### Entidades `Mensaje` y `Calificación`
- **`Mensaje`:** `id` (`UUID`, PK), `solicitudId` (`UUID`), `emisorId` (`UUID`), `texto` (`TEXT`), `fechaEnvio` (`TIMESTAMP`).
- **`Calificación`:** `id` (`UUID`, PK), `solicitudId` (`UUID`, única por solicitud), `puntaje` (`INTEGER`, 1 a 5), `comentario` (`VARCHAR(500)`), `fechaCalificacion` (`TIMESTAMP`).

### 9.4 Consistencia de claves de fotos
Ambos modelos (`Usuario` y `Profesional`) guardan en `fotoUrl` la **clave interna** (`perfiles/<uuid>.jpg`) del archivo alojado en el volumen privado `fotos_data`. Los endpoints de consulta devuelven un booleano `tieneFoto` en lugar de la clave o ruta directa, evitando la exposición no autorizada de archivos.

---

## 10. Autenticación, autorización y seguridad

### 10.1 Flujo de login (OIDC Authorization Code + PKCE)

1. El usuario navega a `/ingresar`.
2. El guard `redirectToKeycloak` invoca `AuthService.loginWithKeycloak()`.
3. Se generan `state` y `nonce` criptográficos aleatorios de 16 bytes (`crypto.getRandomValues`).
4. Se crea el `code_verifier` PKCE y su hash `code_challenge` mediante SHA-256 (`S256`) con Web Crypto API.
5. Redirección a Keycloak con `response_type=code` y parámetros PKCE.
6. Keycloak autentica al usuario y redirige a la URL de callback con el código de autorización.
7. `handleCodeCallback()` valida el `state`, canjea el código por tokens mediante petición POST al endpoint de tokens de Keycloak.
8. Se almacenan de forma segura el `access_token` y el perfil en `localStorage`.
9. La SPA invoca `GET /api/usuarios/por-keycloak` enviando el Bearer token con el `sub`.
10. El BFF vincula o recupera el usuario de negocio y devuelve el perfil completo con `rolNegocio`.

### 10.2 Validación del token en el BFF y Resource Servers

`SecurityConfig` en el BFF configura un **OAuth2 Resource Server stateless**:
- **Validación de firma:** Comprueba la firma del JWT contra el conjunto de claves públicas JWKS de Keycloak (`KEYCLOAK_JWK_SET_URI`).
- **Validación de emisor:** Rechaza cualquier token cuyo claim `iss` no contenga `/realms/vincula-up`.
- **Mapeo de roles:** Lee los roles desde `roles`, `realm_access.roles` y `role`, mapeándolos al formato `ROLE_<ROL>` en el contexto de Spring Security.
- **Microservicios de dominio:** `ms-usuarios`, `ms-profesionales` y `ms-solicitudes` también incorporan `spring-boot-starter-oauth2-resource-server` y validan el token independientemente en la red interna de Docker.

### 10.3 RBAC: 27 reglas

| Ámbito | Endpoints y Reglas |
|---|---|
| **Público** | `GET /api/profesionales`, `GET /api/calificaciones`, `GET /api/especialidades`, `GET /api/gps`, `GET /actuator/health`, `OPTIONS /**` |
| **ADMIN** | `GET /api/usuarios`, `POST /api/usuarios`, `PATCH /api/usuarios/{id}`, `PATCH /api/usuarios/{id}/suspender`, `PATCH /api/usuarios/{id}/reactivar`, `DELETE /api/usuarios/{id}`, `POST /api/profesionales`, `POST /api/profesionales/alta`, `PUT /api/profesionales/{id}`, `PATCH /api/profesionales/{id}/suspender`, `PATCH /api/profesionales/{id}/reactivar`, CRUD `/api/especialidades/**`, `GET /api/solicitudes/panel`, `GET /api/usuarios/por-email` |
| **PROFESIONAL** | `POST /api/profesionales/activar`, `GET /api/profesionales/mi-perfil`, `POST /api/profesionales/vincular`, `PUT /api/profesionales/{id}/disponibilidad`, `GET /api/mi-reputacion`, `PATCH /api/solicitudes/{id}/aceptar`, `PATCH /api/solicitudes/{id}/rechazar` |
| **CLIENTE** | `POST /api/solicitudes`, `POST /api/solicitudes/{id}/calificacion` |
| **Cualquiera de los dos** | `PATCH /api/solicitudes/{id}/completar`, `PATCH /api/solicitudes/{id}/cancelar` |
| **Solo Autenticado** | `GET /api/solicitudes/mias`, historial de mensajes, envío de mensajes por chat, ver disponibilidad ajena, `GET /api/usuarios/{id}` |

### 10.4 Alta del profesional sin auto-registro

1. El Administrador carga los datos en `/admin/profesionales/nuevo` (`POST /api/profesionales/alta`).
2. El BFF crea la cuenta en Keycloak con el rol `PROFESIONAL` y una **contraseña temporal** (`temporary: true`, `requiredActions: ["UPDATE_PASSWORD"]`).
3. El BFF registra la entidad en `ms-usuarios` (`rolNegocio = PROFESIONAL`) y el perfil en `ms-profesionales` con estado `CARGADO`.
4. El BFF envía un correo transaccional al profesional informando usuario, contraseña temporal y pasos de activación.
5. Al primer ingreso, Keycloak fuerza el cambio obligatorio de contraseña (`UPDATE_PASSWORD`).
6. El profesional activa su perfil completando foto, zona y horarios (`POST /api/profesionales/activar`), pasando su estado a `ACTIVO`.

### 10.5 Aceptación de los términos y condiciones

La aceptación se solicita tras el primer ingreso exitoso a la aplicación:
- La SPA consulta `GET /api/usuarios/yo`. Si el campo `terminos_version` no coincide con la versión vigente (`VERSION_TERMINOS`), se despliega una capa modal sobre `app.html` **sin botón de cierre**.
- Al confirmar, `PATCH /api/terminos/aceptar` registra la versión y la marca temporal. La identidad se toma siempre del token JWT.

### 10.6 Configuración del realm

- `realm`: `vincula-up`
- `registrationAllowed`: `true` (auto-registro de clientes).
- `registrationEmailAsUsername`: `true` (el correo electrónico se utiliza como nombre de usuario interno).
- `loginWithEmailAllowed`: `true`.
- `duplicateEmailsAllowed`: `false`.
- `resetPasswordAllowed`: `true` (recuperación de contraseña vía SMTP).
- `verifyEmail`: `true` (confirmación obligatoria por correo para clientes).
- `sslRequired`: `none` (terminación TLS delegada en Nginx).

---

## 11. Ubicaciones: geocodificación, cifrado y fotos

### 11.1 Geocodificación con OpenStreetMap / Nominatim

- Implementada en `GeocodingClient` de `ms-solicitudes` y expuesta por el BFF en `/api/gps`.
- Entrada de dirección en texto con extracción de coordenadas precisas; soporte para geocodificación inversa detallada (`reverseGeocode`).
- **Caché en memoria LRU de 500 direcciones con TTL de 10 minutos** para respetar la política de uso de 1 req/s de OSM.
- Detección precisa de hardware GPS en frontend mediante Geolocation API (`enableHighAccuracy: true`, `timeout: 15s`).

### 11.2 Cifrado de ubicaciones en reposo (AES-256-GCM)

Las coordenadas geográficas se cifran a nivel de aplicación en:
- `solicitudes.latitud` y `solicitudes.longitud` (`ms-solicitudes`).
- `profesionales.zona_cobertura_lat` y `profesionales.zona_cobertura_lng` (`ms-profesionales`).
- Cifrado simétrico AES-256-GCM con vector de inicialización (IV) de 12 bytes aleatorio (`base64(iv || ciphertext)`). Dos coordenadas idénticas producen cadenas cifradas completamente diferentes.
- Clave de 32 bytes configurada en la variable `UBICACIONES_CLAVE`.

### 11.3 Almacenamiento de fotos y volúmenes

- Las fotos de perfil se almacenan como archivos binarios fuera de PostgreSQL en el volumen Docker `fotos_data`.
- Flujo: El frontend sube el binario a `POST /api/fotos` (`multipart/form-data`); el BFF valida tamaño (máximo 2 MB en `STORAGE_MAX_BYTES`) y tipo MIME (`image/jpeg`, `image/png`, `image/webp`), escribe el archivo en el volumen (`/data/fotos/perfiles/<uuid>.jpg`) y devuelve la clave al frontend.
- Los microservicios solo almacenan la clave. El BFF es el único componente que interactúa con el sistema de archivos.

### 11.4 Quién ve la foto de quién

Las fotos son privadas y se sirven bajo autorización en `GET /api/usuarios/{id}/foto`:

| Rol del solicitante \ Foto de: | `CLIENTE` | `PROFESIONAL` | `ADMIN` |
|---|---|---|---|
| **`CLIENTE`** | No | **Sí** | No |
| **`PROFESIONAL`** | **Sí** | No | No |
| **`ADMIN`** | **Sí** | **Sí** | No |

*Nota: La foto propia siempre es visible para el propio usuario.*

### 11.5 Privacidad de la dirección del cliente

| Estado de la solicitud | Cliente | Profesional | Administrador |
|---|---|---|---|
| `PENDIENTE` | Dirección completa | **Zona aproximada** (barrio y localidad) + punto redondeado a 2 decimales (~1.1 km) | Todo el detalle |
| `ACEPTADA` en adelante | Dirección completa | **Dirección completa y coordenadas exactas** | Todo el detalle |

---

## 12. Variables de entorno y configuración

Configuradas en el archivo `.env` en la raíz del repositorio (ignorado en git; plantilla en `.env.example`):

### 12.1 Base de datos PostgreSQL
- `POSTGRES_DB`: `vinculaup`
- `POSTGRES_USER`: `postgres`
- `POSTGRES_PASSWORD`: contraseña del motor de base de datos
- `DATABASE_URL`: `jdbc:postgresql://postgres:5432/vinculaup`
- `DATABASE_USERNAME`: `postgres`
- `DATABASE_PASSWORD`: contraseña de conexión
- `JPA_DDL_AUTO`: `update`

### 12.2 Keycloak y Service Account
- `KEYCLOAK_ISSUER_URI`: `http://keycloak:8080/realms/vincula-up`
- `KEYCLOAK_JWK_SET_URI`: `http://keycloak:8080/realms/vincula-up/protocol/openid-connect/certs`
- `KEYCLOAK_HOSTNAME`: `vincula-up.local`
- `KEYCLOAK_ADMIN`: `admin`
- `KEYCLOAK_ADMIN_PASSWORD`: contraseña de administración de Keycloak
- `KEYCLOAK_REALM`: `vincula-up`
- `KEYCLOAK_ADMIN_BASE_URL`: `http://keycloak:8080`
- `KEYCLOAK_ADMIN_CLIENT_ID`: `vincula-up-admin`
- `KEYCLOAK_ADMIN_CLIENT_SECRET`: clave secreta de la service account

### 12.3 Configuración SMTP
- `KEYCLOAK_SMTP_HOST`: `smtp.gmail.com`
- `KEYCLOAK_SMTP_PORT`: `587`
- `KEYCLOAK_SMTP_STARTTLS`: `true`
- `KEYCLOAK_SMTP_AUTH`: `true`
- `KEYCLOAK_SMTP_USER`: correo de autenticación
- `KEYCLOAK_SMTP_PASSWORD`: contraseña de aplicación (App Password)
- `KEYCLOAK_SMTP_FROM`: dirección remitente del sistema
- `KEYCLOAK_SMTP_FROM_DISPLAY_NAME`: `Vincula-UP`
- `KEYCLOAK_SMTP_REPLY_TO`: `vinculaup@gmail.com` (casilla institucional de recepción)
- `KEYCLOAK_CONTACTO`: `vinculaup@gmail.com`
- `MAIL_PLANTILLA`: `/app/correos/prerregistro.html`
- `APP_URL`: `https://vincula-up.local`

### 12.4 Cifrado, fotos y expiración
- `STORAGE_LOCAL_DIR`: `/data/fotos` (ruta interna montada en contenedor)
- `STORAGE_PREFIX`: `perfiles`
- `STORAGE_MAX_BYTES`: `2097152` (2 MB)
- `UBICACIONES_CLAVE`: clave AES-256 de 32 bytes en base64 (ej: `openssl rand -base64 32`)
- `SOLICITUDES_TIEMPO_EXPIRACION_HOURS`: horas de vigencia de solicitudes pendientes (default: `24`)

---

## 13. Datos de arranque y migraciones

- **Siembra idempotente y best-effort:** Si los registros ya existen, los inicializadores no realizan modificaciones.
- **Keycloak:** Crea las cuentas demo con contraseña `password`:
  - `cliente@vincula-up.local` (rol `CLIENTE`)
  - `profesional@vincula-up.local` (rol `PROFESIONAL`)
  - `admin@vincula-up.local` (rol `ADMIN`)
- **`ms-profesionales`:** Siembra 6 especialidades oficiales y 1 profesional activo de prueba (Luciano Davezac, legajo `P-2001`, disponibilidad de lunes a sábado de 8:00 a 20:00).
- **`ms-usuarios`:** Vincula el usuario correspondiente por email en su primer acceso.

---

## 14. Infraestructura: TLS, Nginx

- **Proxy inverso centralizado:** Nginx 1.27 termina conexiones TLS en los puertos 80 (redirección automática) y 443.
- **Parámetros de proxy:**
  - `client_max_body_size 3m;` (3 MB otorga margen de seguridad sobre el límite de 2 MB del BFF para fotos de perfil multipart).
  - `proxy_buffer_size 128k`, `proxy_buffers 4 256k`, `proxy_busy_buffers_size 256k` (soporte para cabeceras y tokens JWT voluminosos).
  - `resolver 127.0.0.11 valid=10s` (resolución dinámica de contenedores Docker).
- **Certificados y CA:** CA de desarrollo en `nginx/certs/ca.crt` y certificado del servidor `server.crt` con SAN para `vincula-up.local`, `localhost` y `127.0.0.1`. Fueron creados directamente mediante **OpenSSL**:
  ```bash
  # 1. Autoridad Certificadora (CA):
  openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 825 -out ca.crt -subj "/CN=VinculaUP-CA" \
    -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"

  # 2. Clave y CSR del servidor:
  openssl genrsa -out server.key 2048
  openssl req -new -key server.key -out server.csr -subj "/CN=vincula-up.local/O=VinculaUP Dev/C=AR"

  # 3. Certificado firmado con SAN (Subject Alternative Names):
  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 825 -sha256 \
    -extfile <(printf "subjectAltName=DNS:vincula-up.local,DNS:localhost,IP:127.0.0.1\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth")
  ```

---

## 15. Scripts operativos y despliegue

| Función | Linux / macOS | Windows |
|---|---|---|
| **Despliegue automatizado completo** | `./scripts/deploy.sh` | — |
| **Bootstrap del realm de Keycloak** | `./scripts/linux-macos/keycloak-bootstrap.sh` | `.\scripts\windows\keycloak-bootstrap.ps1` |
| **Instalación de la CA en navegadores y sistema**| `bash scripts/linux-macos/import-ca.sh` | `.\scripts\windows\import-ca.ps1` |

> Todo el stack se ejecuta de forma homogénea y estandarizada mediante contenedores Docker (`docker compose`). No se soportan ni requieren ejecuciones locales sueltas.

Comando de inicio con Docker Compose:
```bash
docker compose up --build -d
```
Comando de detención:
```bash
docker compose down
```

---

## 16. Prototipos de pantallas

### 16.1 Catálogo de prototipos y maqueta interactiva

La maqueta interactiva original del proyecto se desarrolló en v0 (Next.js) y se encuentra desplegada públicamente en:
> **https://v0-vincula-up.vercel.app/**

### 16.2 Figuras de prototipos de interfaz

- **Figura 1:** Página de inicio de Vincula-UP, con accesos a *"Buscar un técnico"* para clientes y *"Soy egresado técnico"* para profesionales.
  *(Enlace: https://drive.google.com/file/d/1Ju9MOgnjGWvL1gTsbLSjPvBHsg_gcU9h/view?usp=sharing)*
- **Figura 2:** Pantalla *"Mis solicitudes"* del cliente, con listado de pedidos, estados y filtro por estado (`HU-S08`).
  *(Enlace: https://drive.google.com/file/d/1btT906f3BM3RUKJ19vn9AyYQmFGWjRP4/view?usp=sharing)*
- **Figura 3:** Pantalla *"Nueva solicitud"*, paso 1: ubicación del servicio por dirección o mapa interactivo (`HU-S01`).
  *(Enlace: https://drive.google.com/file/d/1Em1No0Op45QV2_i3s2ZJCFdKz--MmYk3/view?usp=sharing)*
- **Figura 4:** Pantalla *"Solicitudes recibidas"* del profesional, con ubicación aproximada y acciones de aceptar o rechazar con motivo (`HU-S07`, `HU-S08`, `HU-S09`, `HU-S10`).
- **Figura 5:** Chat de la solicitud en tiempo real (`HU-S13`).
  *(Enlace: https://drive.google.com/file/d/1veufyzMZeWApTWF-NPNIUsajX1ZyAODh/view?usp=sharing)*
- **Figura 6:** Resumen del Administrador con indicadores de demanda y recorrido de solicitudes (`HU-U14`).

**Pantallas sin prototipo en la maqueta inicial (desarrolladas directamente en Angular):**
- Calificación del servicio con estrellas y comentario (`HU-S14`).
- Bandeja de notificaciones en tiempo real (`HU-S16`).

---

## 17. Diseño visual

### 17.1 Paleta de tokens de color (Tema claro)

| Token | HEX | Rol visual |
|---|---|---|
| `--paper` | `#F6F3EC` | Fondo global pergamino. |
| `--surface-card` | `#FFFFFF` | Tarjetas y paneles elevados. |
| `--ink` | `#1E2926` | Títulos y botón primario. |
| `--muted` | `#67716C` | Subtítulos y metadatos. |
| `--line` | `#D8D8CE` | Bordes y separadores. |
| `--coral` | `#E35F43` | Acento institucional y acciones nuevas. |
| `--emerald` | `#448064` | Éxito y estado completado. |
| `--amber` | `#A56C19` | Estados pendientes y advertencias. |
| `--navy` | `#1E4B7A` | Mensaje propio y acción de chat. |

### 17.2 Botones y controles
- Radio uniforme de 8px en todos los botones y contenedores.
- Los botones son rectangulares; la variante píldora está anulada.
- **Hover sin `transform`:** Las transiciones afectan únicamente a `background-color`, `border-color` y `color`, garantizando estabilidad dimensional en la interfaz.

---

## 18. Estado real del MVP y deuda técnica

### 18.1 Funcionalidades completadas
- Ciclo de vida completo de solicitudes con validación estricta de transiciones.
- Autenticación real OIDC + PKCE en Keycloak sin atajos simulados.
- RBAC de 27 reglas aplicado en el BFF y validación en microservicios.
- Chat en vivo bidireccional por WebSocket/STOMP.
- Calificaciones y reputación persistida con cálculo automático de promedios.
- Geocodificación y mapas interactivos reales con Leaflet y OpenStreetMap.
- Cifrado AES-256-GCM en reposo para coordenadas geográficas.
- Fotos privadas con visibilidad por rol y volumen Docker dedicado.
- Aceptación obligatoria de términos y condiciones en primer ingreso.
- Temas claro y oscuro persistidos y sincronizados entre Angular y Keycloak.

### 18.2 Deuda técnica registrada
- **Cierre de aceptación del MVP:** GitHub Actions ejecuta pruebas unitarias de los cuatro servicios, pruebas Angular, auditoría de dependencias, build productivo, smoke E2E de navegador y E2E autenticado contra un stack Docker demo. La implementación del alcance actual está completa; resta terminar la aceptación manual de T-U04 y T-U15, validar HTTPS en un navegador que confíe en la CA de desarrollo y comprobar la entrega WebPush con VAPID de prueba. El detalle y los pasos de cierre están en la sección **Pendientes para el cierre** de [MVP Grupo 8- DACS.md](./MVP%20Grupo%208-%20DACS.md). Después de registrar los resultados, corresponde consolidar la documentación y publicar los cambios finales de la rama.
- **Dominio productivo y correo institucional:** En producción se requiere registrar un dominio con políticas SPF, DKIM y DMARC y reemplazar las credenciales locales por un servicio como Amazon SES o SendGrid.
- **Almacenamiento de fotos en S3:** Migrar de `FotoStorageLocal` a un backend compatible con Amazon S3 / MinIO para clusters multi-nodo.

---

## Anexo A. Términos y datos
Ruta `/terminos`. Documento único de términos de servicio y política de privacidad y cookies. Explica de forma accesible el almacenamiento local de tokens, las medidas de privacidad de ubicación y la protección de datos personales.

## Anexo B. Preguntas frecuentes
Ruta `/preguntas-frecuentes`. Preguntas organizadas por categorías (Cuenta, Tus datos, Turnos, Trabajar en la red, Privacidad y ayuda) con controles accesibles nativos `<details>`.

## Anexo C. Tema claro y oscuro
Gestión mediante `TemaService` en tres modos (`claro`, `oscuro`, `sistema`), atributo `data-tema` en `<html>`, soporte inline en `index.html` para evitar parpadeos y compatibilidad con PatternFly en las pantallas de acceso de Keycloak.
