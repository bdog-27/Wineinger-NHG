$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$ToolsRoot = Join-Path $WorkspaceRoot "tools"
$NodeRoot = Join-Path $ToolsRoot "node-v22.22.0-win-x64"

$env:PATH = "$NodeRoot;$(Join-Path $ToolsRoot 'cargo\bin');$env:PATH"
$env:CARGO_HOME = Join-Path $ToolsRoot "cargo"
$env:RUSTUP_HOME = Join-Path $ToolsRoot "rustup"
$env:UV_PYTHON_INSTALL_DIR = Join-Path $ToolsRoot "python"
$env:UV_CACHE_DIR = Join-Path $ToolsRoot "uv-cache"
$env:npm_config_cache = Join-Path $ToolsRoot "npm-cache"

$Node = Join-Path $NodeRoot "node.exe"
$Npm = Join-Path $NodeRoot "npm.cmd"
$Uv = Join-Path $ToolsRoot "uv\uv.exe"
$Cargo = Join-Path $ToolsRoot "cargo\bin\cargo.exe"

