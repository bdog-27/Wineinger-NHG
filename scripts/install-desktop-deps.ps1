. (Join-Path $PSScriptRoot "tools.ps1")

Set-Location $WorkspaceRoot
& $Npm install --save-dev electron@latest

