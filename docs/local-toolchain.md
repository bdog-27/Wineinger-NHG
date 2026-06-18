# Local Desktop Toolchain

The development runtimes are installed under the ignored `tools/` directory so
Wineinger NHG can be developed without depending on global package installations.

| Runtime | Installed version | Local role |
| --- | --- | --- |
| Node.js / npm | Node 22.22.0 / npm 10.9.4 | Electron desktop UI |
| Electron | 42.2.0 | Desktop application shell |
| uv / Python | uv 0.11.16 / Python 3.12.13 | Future chemistry and job service |
| Rust / Cargo | Rust 1.95.0 / Cargo 1.95.0 | Available for future native work |

HADDOCK3 is intentionally executed on the Argon Linux cluster rather than in
the local Windows app runtime. Wineinger NHG configures and exports docking jobs
locally; see [argon-integration.md](./argon-integration.md) for the cluster
installation and submission workflow.

## Launch

Use the root-level Windows launchers:

```powershell
.\start-wineinger-nhg.cmd
.\start-wineinger-nhg-demo.cmd
```

The `.cmd` files invoke the PowerShell helpers with process-scoped execution
permission because this Windows account does not permit direct `.ps1` launches.

## LocalColabFold

Wineinger NHG can open a WSL-based LocalColabFold install if it is located at:

```text
~/tools/localcolabfold
```

For full install, run, and tandem-use instructions, see
[localcolabfold-workflow.md](./localcolabfold-workflow.md).

## Development Commands

To enter a PowerShell session with the local tools configured:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ". .\scripts\tools.ps1; npm run start:demo"
```

The tool paths configured by [scripts/tools.ps1](../scripts/tools.ps1) include:

```text
tools/node-v22.22.0-win-x64/
tools/uv/
tools/python/
tools/cargo/
tools/rustup/
```

## Desktop Choice

Electron is used for the first desktop shell because it runs immediately from
portable Node. Rust is installed, but building a Tauri Windows app would also
require Microsoft native build prerequisites that are not installed yet.
