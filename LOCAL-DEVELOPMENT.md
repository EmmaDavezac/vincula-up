# Desarrollo local sin Docker

El proyecto puede ejecutarse sin Docker. Los microservicios usan H2 en memoria por defecto y exponen estos puertos:

| Servicio | Puerto |
| --- | ---: |
| `ms-usuarios` | `8081` |
| `ms-profesionales` | `8082` |
| `ms-solicitudes` | `8083` |
| `bff-web` | `9001` |
| Angular | `4200` |

## Arranque rapido

### Opcion A - sin Docker

Desde PowerShell, en la raiz del repositorio:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\start-local.ps1
```

### Opcion B - con Docker Compose

Cuando Docker este instalado en la máquina, en la raiz del repositorio se puede probar el stack con:

```powershell
docker compose up --build
```

Esto levanta PostgreSQL, `ms-usuarios`, `ms-profesionales`, `ms-solicitudes` y `bff-web` con la ruta interna del servicio y el `KEYCLOAK_ISSUER_URI` apuntando al contenedor de identidad.

Si la máquina tiene poco espacio o memoria disponible, el script ya usa un perfil JVM más liviano para no fallar al arrancar Spring Boot:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Xms128m -Xmx512m -Xss256k -XX:+UseSerialGC -XX:ActiveProcessorCount=2'
```

En otra terminal:

```powershell
Set-Location frontend\vincula-up-web
npm start
```

La aplicación queda disponible en `http://localhost:4200`.

## Verificacion

```powershell
Invoke-WebRequest http://localhost:9001/actuator/health
Invoke-WebRequest http://localhost:9001/api/profesionales
```

Los servicios usan H2 en memoria, por lo que los datos se pierden al reiniciarlos.

## Variables de entorno y secretos

No guardar credenciales reales en el repositorio. Copiar el ejemplo:

```powershell
Copy-Item .env.example .env
```

Y luego editar `.env` con los valores locales reales. En Docker Compose, esos valores se leen desde el archivo `.env` del directorio raíz. El repositorio ya ignora `.env` y `.env.*` a excepción de `.env.example`.

### Usar Neon

Neon reemplaza H2 sin cambiar el código. En PowerShell, definir las variables antes de arrancar los servicios:

```powershell
$env:DATABASE_URL = 'jdbc:postgresql://HOST/DB?sslmode=require'
$env:DATABASE_USERNAME = 'USUARIO'
$env:DATABASE_PASSWORD = 'PASSWORD'
$env:JPA_DDL_AUTO = 'update'
.\scripts\start-local.ps1
```

No guardar esos valores en el repositorio. Para desarrollo compartido, usar variables de entorno del sistema o un gestor de secretos.

## Detener servicios

Cerrar las cuatro ventanas de PowerShell iniciadas por el script. El frontend se detiene con `Ctrl+C` en su terminal.
