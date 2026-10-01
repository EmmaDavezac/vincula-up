<#
.SYNOPSIS
    Aplica el flujo de registro de Vincula-UP sobre un realm ya existente.

.DESCRIPTION
    Equivalente en Windows de scripts/linux-macos/keycloak-bootstrap.sh.

    Por qué existe: 'start-dev --import-realm' sólo importa el realm la PRIMERA
    vez. Como Keycloak persiste en Postgres, en una instalación ya en marcha los
    cambios de keycloak/import/vincula-up-realm.json (auto-registro de clientes,
    rol CLIENTE por defecto y el client de servicio que promueve a PROFESIONAL)
    no se aplican solos. Este script los aplica de forma idempotente vía kcadm.sh
    sin borrar usuarios ni datos.

    Requiere: Docker Compose con el servicio 'keycloak' levantado.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\keycloak-bootstrap.ps1

.NOTES
    Es idempotente: correrlo de nuevo actualiza en vez de duplicar.
#>

[CmdletBinding()]
param(
    # Nombre del contenedor de Keycloak (por defecto, el que crea docker-compose).
    [string]$Container = $(if ($env:KEYCLOAK_CONTAINER) { $env:KEYCLOAK_CONTAINER } else { 'vinculaup-keycloak' })
)

$ErrorActionPreference = 'Stop'

# ── Cargar el .env de la raíz ───────────────────────────────────────────────
# Sin esto las variables de configuración (SMTP incluido) quedan vacías y el
# reseteo de contraseña no envía emails. Se parsea en vez de 'source' porque
# PowerShell no tiene equivalente directo.
# El script vive en scripts\windows\, así que la raíz del repo es dos niveles
# arriba: scripts\windows\ -> scripts\ -> <raíz>.
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $repoRoot '.env'
if (Test-Path $envFile) {
    Write-Host "==> Configuración cargada desde $envFile"
    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        # Ignorar comentarios y líneas vacías
        if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
        $key, $value = $trimmed.Split('=', 2)
        $key = $key.Trim()
        $value = $value.Trim().Trim('"').Trim("'")
        # No sobreescribir variables ya presentes en el entorno.
        if (-not [Environment]::GetEnvironmentVariable($key)) {
            [Environment]::SetEnvironmentVariable($key, $value)
        }
    }
} else {
    Write-Host '==> No se encontró .env en la raíz: se usan valores por defecto'
}

# ── Configuración (mismos defaults que el script bash) ──────────────────────
$realm          = if ($env:KEYCLOAK_REALM)                  { $env:KEYCLOAK_REALM }                  else { 'vincula-up' }
$adminUser      = if ($env:KEYCLOAK_ADMIN)                   { $env:KEYCLOAK_ADMIN }                   else { 'admin' }
$adminPassword  = if ($env:KEYCLOAK_ADMIN_PASSWORD)          { $env:KEYCLOAK_ADMIN_PASSWORD }          else { 'admin' }
$adminClientId  = if ($env:KEYCLOAK_ADMIN_CLIENT_ID)         { $env:KEYCLOAK_ADMIN_CLIENT_ID }         else { 'vincula-up-admin' }
$adminSecret    = if ($env:KEYCLOAK_ADMIN_CLIENT_SECRET)     { $env:KEYCLOAK_ADMIN_CLIENT_SECRET }     else { 'vincula-up-admin-secret' }
$smtpHost       = if ($env:KEYCLOAK_SMTP_HOST)               { $env:KEYCLOAK_SMTP_HOST }               else { 'smtp.gmail.com' }
$smtpPort       = if ($env:KEYCLOAK_SMTP_PORT)               { $env:KEYCLOAK_SMTP_PORT }               else { '587' }
$smtpStarttls   = if ($env:KEYCLOAK_SMTP_STARTTLS)           { $env:KEYCLOAK_SMTP_STARTTLS }           else { 'true' }
$smtpAuth       = if ($env:KEYCLOAK_SMTP_AUTH)               { $env:KEYCLOAK_SMTP_AUTH }               else { 'true' }
$smtpFrom       = if ($env:KEYCLOAK_SMTP_FROM)               { $env:KEYCLOAK_SMTP_FROM }               else { '' }
$smtpFromName   = if ($env:KEYCLOAK_SMTP_FROM_DISPLAY_NAME)  { $env:KEYCLOAK_SMTP_FROM_DISPLAY_NAME }  else { 'Vincula-UP' }
$smtpUser       = if ($env:KEYCLOAK_SMTP_USER)               { $env:KEYCLOAK_SMTP_USER }               else { '' }
$smtpPassword   = if ($env:KEYCLOAK_SMTP_PASSWORD)           { $env:KEYCLOAK_SMTP_PASSWORD }           else { '' }

# Invariante del secreto: este script es el UNICO camino del .env a Keycloak.
# El import del realm no resuelve sus placeholders ${env.*} (ver
# keycloak/import/README.md), asi que si rotas KEYCLOAK_ADMIN_CLIENT_SECRET hay
# que volver a correr esto. Si no, el BFF pide tokens con un secreto y Keycloak
# responde 401: la promocion de rol falla en silencio, solo con un warning.
# El default de demo es publico (esta en el repositorio). Se avisa fuerte para
# que nadie exponga el stack creyendo que tiene un secreto propio.
$secretoDemo = 'vincula-up-admin-secret'
if ($adminSecret -eq $secretoDemo) {
    Write-Host ''
    Write-Host "  AVISO: se esta usando el secreto de demo de $adminClientId, que es" -ForegroundColor Yellow
    Write-Host '  PUBLICO. Alcanza para local, pero cualquiera que lea el repositorio' -ForegroundColor Yellow
    Write-Host '  puede pedir un token de servicio y promover cuentas a PROFESIONAL.' -ForegroundColor Yellow
    Write-Host '  Para rotarlo: genera uno (openssl rand -hex 24), ponelo en' -ForegroundColor Yellow
    Write-Host '  KEYCLOAK_ADMIN_CLIENT_SECRET del .env y volve a correr este script.' -ForegroundColor Yellow
    Write-Host ''
}

$kcadm = '/opt/keycloak/bin/kcadm.sh'

function Invoke-Kcadm {
    # Ejecuta kcadm.sh dentro del contenedor y propaga el error.
    docker exec -i $Container $kcadm @args
    if ($LASTEXITCODE -ne 0) { throw "kcadm falló con código $LASTEXITCODE" }
}
# ── Autenticar contra el realm master ───────────────────────────────────────
Write-Host '==> Esperando a Keycloak...'
$authenticated = $false
for ($i = 0; $i -lt 30; $i++) {
    docker exec -i $Container $kcadm config credentials `
        --server http://localhost:8080 --realm master `
        --user $adminUser --password $adminPassword *> $null
    if ($LASTEXITCODE -eq 0) { $authenticated = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $authenticated) {
    Write-Error "No se pudo autenticar en Keycloak. ¿Está el servicio 'keycloak' levantado?"
    exit 1
}
Write-Host "==> Autenticado como $adminUser"

# ── 1. Auto-registro de clientes ────────────────────────────────────────────
Write-Host "==> Habilitando auto-registro y rol CLIENTE por defecto en el realm $realm"
# `registrationEmailAsUsername=true` hace que el registro pida SOLO el correo y lo
# use como nombre de usuario interno. La aplicación se accede por email, así que
# pedir además un "nombre de usuario" era un campo de más que nadie recordaba.
Invoke-Kcadm update "realms/$realm" `
    -s registrationAllowed=true `
    -s registrationEmailAsUsername=true `
    -s loginWithEmailAllowed=true `
    -s duplicateEmailsAllowed=false `
    -s resetPasswordAllowed=true

# El rol CLIENTE se agrega al compuesto 'default-roles-<realm>': así toda cuenta
# que se auto-registre entra como cliente y el BFF acepta su rol de negocio.
Invoke-Kcadm add-roles -r $realm --rname "default-roles-$realm" --rolename CLIENTE

# ── 2. Client de servicio ───────────────────────────────────────────────────
Write-Host "==> Verificando el client de servicio $adminClientId"
$clientUuid = (docker exec -i $Container $kcadm get clients -r $realm `
    -q "clientId=$adminClientId" --fields id --format csv --noquotes |
    Select-Object -Last 1).Trim()

if (-not $clientUuid) {
    Invoke-Kcadm create clients -r $realm `
        -s "clientId=$adminClientId" `
        -s 'name=Vincula-UP Admin Service Account' `
        -s enabled=true `
        -s publicClient=false `
        -s "secret=$adminSecret" `
        -s serviceAccountsEnabled=true `
        -s standardFlowEnabled=false `
        -s directAccessGrantsEnabled=false `
        -s 'protocol=openid-connect'
    Write-Host '    client creado'
} else {
    Invoke-Kcadm update "clients/$clientUuid" -r $realm `
        -s publicClient=false `
        -s "secret=$adminSecret" `
        -s serviceAccountsEnabled=true
    Write-Host '    client ya existía: se actualizaron secret y service account'
}

# ── 3. Permisos de administración de usuarios ───────────────────────────────
Write-Host '==> Otorgando permisos de administración de usuarios al service account'
Invoke-Kcadm add-roles -r $realm `
    --uusername "service-account-$adminClientId" `
    --cclientid realm-management `
    --rolename manage-users --rolename view-users --rolename query-users --rolename view-realm

# ── 4. SMTP del realm (recuperación de contraseña) ───────────────────────────
Write-Host "==> Configurando SMTP del realm $realm (recuperación de contraseña)"
Write-Host '    Lee KEYCLOAK_SMTP_* del entorno (.env). Sin password, el reseteo'
Write-Host '    queda habilitado en el realm pero Keycloak no puede enviar emails.'
Invoke-Kcadm update "realms/$realm" `
    -s "smtpServer.host=$smtpHost" `
    -s "smtpServer.port=$smtpPort" `
    -s "smtpServer.from=$smtpFrom" `
    -s "smtpServer.fromDisplayName=$smtpFromName" `
    -s "smtpServer.replyTo=$smtpFrom" `
    -s "smtpServer.starttls=$smtpStarttls" `
    -s "smtpServer.auth=$smtpAuth" `
    -s "smtpServer.user=$smtpUser" `
    -s "smtpServer.password=$smtpPassword"

if ($smtpPassword) {
    Write-Host '    (SMTP aplicado; la verificación se hace con "¿Olvidó su contraseña?" en el login)'
} else {
    Write-Host '    (sin KEYCLOAK_SMTP_PASSWORD: se omite el test de conexión)'
}

Write-Host ''
Write-Host 'Listo.' -ForegroundColor Green
Write-Host "  Client de servicio : $adminClientId"
if ($adminSecret -eq $secretoDemo) {
    Write-Host '  Secreto            : el de DEMO, que es publico. Rotar antes de exponer.'
} else {
    Write-Host '  Secreto            : propio (no se imprime).'
}
Write-Host ''
Write-Host 'Si rotaste el secreto, el BFF quedo con el valor viejo. Recrealo:'
Write-Host '  docker compose up -d --force-recreate bff-web'
