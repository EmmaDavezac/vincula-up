$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$services = @(
  @{ Name = 'ms-usuarios'; Path = 'backend\ms-usuarios'; Port = 8081 },
  @{ Name = 'ms-profesionales'; Path = 'backend\ms-profesionales'; Port = 8082 },
  @{ Name = 'ms-solicitudes'; Path = 'backend\ms-solicitudes'; Port = 8083 },
  @{ Name = 'bff-web'; Path = 'backend\bff-web'; Port = 9001 }
)

foreach ($service in $services) {
  $workingDirectory = Join-Path $root $service.Path
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', '.\mvnw.cmd spring-boot:run' -WorkingDirectory $workingDirectory -WindowStyle Normal
  Write-Host "Iniciado $($service.Name) en http://localhost:$($service.Port)"
}

Write-Host ''
Write-Host 'Frontend: abrir otra terminal y ejecutar:'
Write-Host '  cd frontend\vincula-up-web'
Write-Host '  npm start'
Write-Host ''
Write-Host 'Para usar Neon, definir DATABASE_URL, DATABASE_USERNAME y DATABASE_PASSWORD antes de ejecutar este script.'
