param([ValidateSet('start','android','ios','web','test','typecheck','export:all')][string]$Task = 'start')
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runtime = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($runtime) { $env:Path = "$($runtime.FullName);$env:Path" }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22.13+ or restore the project-local runtime in .tools.' }
$env:npm_config_cache = Join-Path $projectRoot '.tools\npm-cache'
Push-Location (Join-Path $projectRoot 'mobile')
try { & npm.cmd run $Task; exit $LASTEXITCODE } finally { Pop-Location }
