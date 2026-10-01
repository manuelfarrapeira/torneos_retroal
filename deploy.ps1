# Compila el frontend y lo despliega en el NAS.
# A diferencia de un simple Copy-Item, usa robocopy /MIR en la carpeta "assets"
# para que los ficheros de builds anteriores (con hash distinto) se borren
# automáticamente en cada despliegue, en vez de acumularse.
#
# ⚠️ CRÍTICO - PROTECCIONES CONTRA PÉRDIDA DE DATOS:
# - /MIR (que borra ficheros sobrantes) SOLO se aplica a la carpeta "assets"
# - NUNCA toca "uploads/" (imágenes subidas por usuarios)
# - NUNCA toca "data/" (base de datos - IRREEMPLAZABLE)
# - NUNCA toca "api/" (archivos PHP - se despliegan por separado)
# - Validaciones de seguridad detienen cualquier intento de /PURGE fuera de assets/
#
# Uso: desde la raíz del proyecto -> powershell -File deploy.ps1

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$frontendDir = Join-Path $root 'frontend'
$distDir = Join-Path $frontendDir 'dist'
$nasDest = '\\nas_farra\web\codefm\retroal'

Write-Host "==> Compilando frontend..." -ForegroundColor Cyan
Push-Location $frontendDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build falló (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

if (-not (Test-Path $distDir)) { throw "No existe la carpeta dist ($distDir)" }

# Guard de seguridad: si el destino calculado no termina en "\assets", abortar
# antes de ejecutar robocopy /MIR, para no borrar nada fuera de esa carpeta.
$assetsDest = Join-Path $nasDest 'assets'
if (-not $assetsDest.EndsWith('\assets')) {
    throw "Ruta de destino de assets sospechosa, abortando por seguridad: $assetsDest"
}

Write-Host "==> Sincronizando assets/ (borra hashes antiguos, NO toca uploads/data/api)..." -ForegroundColor Cyan
robocopy "$distDir\assets" $assetsDest /MIR /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw "robocopy falló al sincronizar assets (código $LASTEXITCODE)" }

Write-Host "==> Copiando ficheros raíz (index.html, favicons)..." -ForegroundColor Cyan
Get-ChildItem $distDir -File | Copy-Item -Destination $nasDest -Force

Write-Host "==> Despliegue completado. uploads/, data/ y api/ no se han tocado." -ForegroundColor Green
Write-Host ""
Write-Host "✅ IMPORTANTE: uploads/ (imágenes de usuarios), data/ (BD) y api/ (PHP) ESTÁN PROTEGIDOS" -ForegroundColor Green

