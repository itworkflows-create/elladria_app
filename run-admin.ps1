param([switch]$Build)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runtime = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($runtime) { $env:Path = "$($runtime.FullName);$env:Path" }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js 22.13+ is required.' }
Push-Location $projectRoot
try {
 if ($Build -or -not (Test-Path 'mobile\dist\index.html')) {
  Push-Location mobile
  try { & npm.cmd run export:all; if ($LASTEXITCODE -ne 0) { throw 'App export failed.' } } finally { Pop-Location }
 }
 Write-Host 'Admin: http://localhost:8093/?admin=1'
 Write-Host 'Mobile preview: http://localhost:8093/mobile-preview.html'
 Write-Host 'Keep this terminal running. Admin edits are allowed only from this computer.'
 & node.exe admin-server/server.mjs
} finally { Pop-Location }
