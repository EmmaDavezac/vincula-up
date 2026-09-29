<#
.SYNOPSIS
    Instala la CA de VinculaUP en los navegadores de Windows.

.DESCRIPTION
    Cubre los dos mecanismos de confianza que existen en Windows:
      - Store de Windows (CurrentUser\Root) → Chromium, Chrome, Edge, .NET
      - Base NSS de Firefox             → Firefox tiene su propio almacén

    Equivalente en Linux:  bash scripts/import-ca.sh

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\import-ca.ps1

.NOTES
    El store se instala en CurrentUser (no requiere privilegios de administrador)
    salvo que se pase -Machine. Importá siempre ca.crt (la CA), nunca server.crt.
#>

[CmdletBinding()]
param(
    # Instalar en el almacén de la máquina (requiere elevación) en vez del usuario.
    [switch]$Machine
)

$ErrorActionPreference = 'Stop'

$caCert = Join-Path (Split-Path -Parent $PSScriptRoot) 'nginx\certs\ca.crt'
if (-not (Test-Path $caCert)) {
    Write-Error "No se encontró el certificado de la CA en: $caCert"
    exit 1
}
$caCert = (Resolve-Path $caCert).Path

Write-Host "🔐 Importando CA: $caCert" -ForegroundColor Cyan

# ── 1. Store de Windows (Chromium, Chrome, Edge, .NET) ──────────────────────
# Se usa CurrentUser\Root para no pedir elevación: basta para el navegador del
# usuario actual y es lo que espera la app en https://vincula-up.local.
Write-Host ''
Write-Host '📦 Instalando en el store de Windows (Chromium, Chrome, Edge)...' -ForegroundColor Cyan

if ($Machine) {
    $store = 'Root'
    $storePath = 'LocalMachine'
    Write-Host '   → almacén LocalMachine (requiere elevación)'
} else {
    $store = 'Root'
    $storePath = 'CurrentUser'
    Write-Host '   → almacén CurrentUser (sin elevación)'
}

& certutil.exe -addstore -f $storePath $caCert | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warning '   ⚠️  certutil falló. Probá abrir PowerShell como Administrador.'
} else {
    Write-Host '   ✅ CA instalada en el store de Windows' -ForegroundColor Green
}

# ── 2. Base NSS de Firefox ──────────────────────────────────────────────────
# Firefox NO consulta el store de Windows: mantiene su propia base NSS por perfil.
Write-Host ''
Write-Host '🦊 Importando en Firefox (base NSS propia)...' -ForegroundColor Cyan

$certutil = Get-Command certutil.exe -ErrorAction SilentlyContinue
if (-not $certutil) {
    # certutil.exe viene con Windows, pero en imágenes mínimos puede faltar.
    Write-Warning '   ⚠️  No se encontró certutil.exe. Importá la CA desde la interfaz de Firefox.'
}

$profilesDir = Join-Path $env:APPDATA 'Mozilla\Firefox\Profiles'
if (Test-Path $profilesDir) {
    $profiles = Get-ChildItem -Path $profilesDir -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'cert9.db') }

    if ($profiles) {
        foreach ($profile in $profiles) {
            Write-Host "   Perfil: $($profile.Name)"
            & certutil.exe -A -n 'VinculaUP-CA' -t 'CT,,' -i $caCert -d "sql:$($profile.FullName)"
            Write-Host '   ✅ Importado' -ForegroundColor Green
        }
    } else {
        Write-Warning "   ⚠️  No se encontraron perfiles de Firefox en $profilesDir"
    }
} else {
    Write-Warning "   ⚠️  No se encontró el directorio de perfiles de Firefox en $profilesDir"
}

Write-Host ''
Write-Host '══════════════════════════════════════════════════' -ForegroundColor Green
Write-Host '✅  LISTO. Reiniciá el navegador para que tome efecto.' -ForegroundColor Green
Write-Host '══════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ''
Write-Host 'Si Firefox sigue mostrando error, importá la CA manualmente:'
Write-Host '  1. Abrí Firefox → Configuración → Privacidad y seguridad'
Write-Host '  2. Sección "Certificados" → Ver certificados...'
Write-Host '  3. Pestaña "Autoridades" → Importar...'
Write-Host "  4. Seleccioná: $caCert"
Write-Host '  5. Marcá "Confiar en esta CA para identificar sitios web"'
Write-Host '  6. Reiniciá Firefox'
Write-Host ''
Write-Host '⚠️  Importá siempre ca.crt (la CA), NUNCA server.crt (el del servidor).' -ForegroundColor Yellow
