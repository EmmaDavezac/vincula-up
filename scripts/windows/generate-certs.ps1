<#
.SYNOPSIS
    Genera la CA y el certificado del servidor de Vincula-UP.

.DESCRIPTION
    Equivalente en Windows de scripts/linux-macos/generate-certs.sh.

    Por qué existe: los certificados versionados en nginx/certs/ son una CA de
    DESARROLLO auto-firmada. Regeneralos si vencen (diciembre 2028) o si preferís
    que cada máquina tenga su propia CA.

    IMPORTANTE: al regenerar, todos los navegadores que tengan instalada la CA
    vieja van a marcar el sitio como no confiable. Hay que reimportar la nueva.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\generate-certs.ps1

.NOTES
    Requiere openssl en el PATH (Windows 10 1809+ lo trae; si no, instalalo con
    'winget install ShiningLight.OpenSSL' o descargalo de slpro.org).
    Escribe en el mismo directorio que nginx/certs del repo.
#>

[CmdletBinding()]
param(
    [int]$Days = 825,
    # Sobrescribir sin preguntar (para uso no interactivo).
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# El script vive en scripts\windows\, así que la raíz del repo es dos niveles
# arriba: scripts\windows\ -> scripts\ -> <raíz>.
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$certsDir = Join-Path $repoRoot 'nginx\certs'
$days = $Days

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Error 'Hace falta openssl. Instalalo con: winget install ShiningLight.OpenSSL'
    exit 1
}

New-Item -ItemType Directory -Force -Path $certsDir | Out-Null
Push-Location $certsDir
try {
    if ((Test-Path 'ca.key') -or (Test-Path 'server.key')) {
        if ($Force) {
            Write-Host '⚠️  Sobrescribiendo los certificados existentes (-Force).' -ForegroundColor Yellow
        } else {
            $reply = Read-Host '⚠️  Ya existen ca.key/server.key. ¿Sobrescribirlos? esto INVALIDA los certificados actuales [s/N]'
            if ($reply -notmatch '^[sSyY]') {
                Write-Host 'Cancelado. No se modificó nada.'
                exit 0
            }
        }
    }

    Write-Host '==> 1/3 Generando la CA (esta es la que se importa en el navegador)'
    & openssl genrsa -out ca.key 2048

    & openssl req -x509 -new -nodes -key ca.key -sha256 -days $days `
        -out ca.crt -subj '/CN=VinculaUP-CA' `
        -addext "basicConstraints=critical,CA:TRUE" `
        -addext "keyUsage=critical,keyCertSign,cRLSign"

    Write-Host '==> 2/3 Generando la clave y el CSR del servidor'
    & openssl genrsa -out server.key 2048
    & openssl req -new -key server.key -out server.csr `
        -subj '/CN=vincula-up.local/O=VinculaUP Dev/C=AR'

    Write-Host '==> 3/3 Firmando el certificado del servidor con la CA'
    # El SAN es lo que hace que el navegador acepte vincula-up.local y localhost.
    # Sin subjectAltName, los navegadores modernos rechazan el certificado.
    $extFile = Join-Path $certsDir 'server-ext.cnf'
    @(
        '[ext]',
        'subjectAltName=DNS:vincula-up.local,DNS:localhost,IP:127.0.0.1',
        'basicConstraints=CA:FALSE',
        'keyUsage=critical,digitalSignature,keyEncipherment',
        'extendedKeyUsage=serverAuth'
    ) | Set-Content -Path $extFile -Encoding ASCII

    & openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key `
        -CAcreateserial -out server.crt -days $days -sha256 `
        -extfile $extFile -extensions ext

    Remove-Item -Force -ErrorAction SilentlyContinue server.csr, ca.srl, $extFile

    Write-Host ''
    Write-Host "✅ Certificados regenerados en $certsDir" -ForegroundColor Green
    & openssl x509 -in server.crt -noout -subject -enddate
    Write-Host ''
    Write-Host 'Ahora importá la CA nueva (ca.crt) en los navegadores:'
    Write-Host '  powershell -ExecutionPolicy Bypass -File .\scripts\import-ca.ps1'
    Write-Host ''
    Write-Host '⚠️  Si tenías importada la CA anterior, eliminá "VinculaUP-CA" de los' -ForegroundColor Yellow
    Write-Host '    almacenes de confianza antes de importar la nueva.'
}
finally {
    Pop-Location
}
