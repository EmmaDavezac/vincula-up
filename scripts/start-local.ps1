$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$javaOptions = '-Xms128m -Xmx512m -Xss256k -XX:+UseSerialGC -XX:ActiveProcessorCount=2'
$services = @(
  @{ Name = 'ms-usuarios'; Path = 'backend\ms-usuarios'; Port = 8081 },
  @{ Name = 'ms-profesionales'; Path = 'backend\ms-profesionales'; Port = 8082 },
  @{ Name = 'ms-solicitudes'; Path = 'backend\ms-solicitudes'; Port = 8083 },
  @{ Name = 'bff-web'; Path = 'backend\bff-web'; Port = 9001 }
)

foreach ($service in $services) {
  $workingDirectory = Join-Path $root $service.Path
  $scriptCommand = "Set-Location '$workingDirectory'; `$env:JAVA_TOOL_OPTIONS = '$javaOptions'; `$env:MAVEN_OPTS = '$javaOptions'; .\mvnw.cmd spring-boot:run"
  $arguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-NoExit',
    '-Command',
    $scriptCommand
  )
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WorkingDirectory $workingDirectory -WindowStyle Normal
  Write-Host "Iniciado $($service.Name) en http://localhost:$($service.Port)"
  Start-Sleep -Seconds 5
}

Write-Host ''
Write-Host 'Frontend: abrir otra terminal y ejecutar:'
Write-Host '  cd frontend\vincula-up-web'
Write-Host '  npm start'
Write-Host ''
Write-Host 'Para usar Neon, definir DATABASE_URL, DATABASE_USERNAME y DATABASE_PASSWORD antes de ejecutar este script.'
