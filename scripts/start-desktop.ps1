. (Join-Path $PSScriptRoot "tools.ps1")

if (-not (Test-Path (Join-Path $WorkspaceRoot "node_modules\electron"))) {
  Write-Error "Desktop dependencies are not installed. Run: .\scripts\install-desktop-deps.ps1"
  exit 1
}

Set-Location $WorkspaceRoot
& $Npm run start

