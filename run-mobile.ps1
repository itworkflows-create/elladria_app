param([ValidateSet('start','android','ios','web','test','typecheck','export:all')][string]$Task = 'start')
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runtime = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($runtime) { $env:Path = "$($runtime.FullName);$env:Path" }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22.13+ or restore the project-local runtime in .tools.' }
$env:npm_config_cache = Join-Path $projectRoot '.tools\npm-cache'
if (-not $env:EXPO_PUBLIC_API_URL) {
 $network = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } | Select-Object -First 1
 if ($network) { $env:EXPO_PUBLIC_API_URL = "http://$($network.IPv4Address.IPAddress):8093" }
}
if ($env:EXPO_PUBLIC_API_URL) { Write-Host "App catalog: $env:EXPO_PUBLIC_API_URL (start run-admin.ps1 in another terminal)" }
Push-Location (Join-Path $projectRoot 'mobile')
try { & npm.cmd run $Task; exit $LASTEXITCODE } finally { Pop-Location }

