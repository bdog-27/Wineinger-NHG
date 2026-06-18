const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeExportBundle } = require("./project-exports.cjs");

const workspaceRoot = path.resolve(__dirname, "..");
const desktopDataPath = path.join(workspaceRoot, "workspace-data", "desktop-profile");
const projectExportsPath = path.join(workspaceRoot, "projects");

function safeLocalRoot(localRoot) {
  if (!localRoot) {
    return projectExportsPath;
  }
  const resolved = path.resolve(String(localRoot));
  if (!resolved.startsWith(workspaceRoot + path.sep)) {
    throw new Error("Choose a local project folder inside the Wineinger NHG workspace.");
  }
  return resolved;
}

function windowsPathToWsl(localPath) {
  const resolved = path.resolve(String(localPath || ""));
  const driveMatch = resolved.match(/^([A-Za-z]):\\(.*)$/);
  if (!driveMatch) {
    throw new Error("WSL rsync needs a normal Windows drive path.");
  }
  const drive = driveMatch[1].toLowerCase();
  const rest = driveMatch[2].split(path.sep).map(encodeURIComponent).join("/").replace(/%20/g, " ");
  return "/mnt/" + drive + "/" + rest;
}

function cleanRemotePath(remotePath) {
  const value = String(remotePath || "").trim();
  if (!value || /[\r\n"'`]/.test(value)) {
    throw new Error("Enter a valid Argon project path.");
  }
  return value.replace(/\/+$/g, "");
}

function cleanHost(host) {
  const value = String(host || "").trim();
  if (!/^[A-Za-z0-9_.@-]+$/.test(value)) {
    throw new Error("Enter an Argon host like bwineinger@argon.hpc.uiowa.edu.");
  }
  return value;
}

function remoteHomePath(host) {
  const userMatch = String(host || "").match(/^([A-Za-z0-9_.-]+)@/);
  return userMatch ? "/Users/" + userMatch[1] : "~";
}

function expandRemotePath(remotePath, host) {
  const value = cleanRemotePath(remotePath);
  if (value === "~") {
    return remoteHomePath(host);
  }
  if (value.indexOf("~/") === 0) {
    return remoteHomePath(host) + value.slice(1);
  }
  return value;
}

function workspaceRsyncArgs(request) {
  const profile = request && request.profile || {};
  const action = String(request && request.action || "");
  const localPath = safeLocalRoot(profile.localPath);
  fs.mkdirSync(localPath, { recursive: true });
  const localWsl = windowsPathToWsl(localPath);
  const host = cleanHost(profile.host);
  const remoteBase = expandRemotePath(profile.remotePath, host);
  const port = Number(profile.port || 22);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SSH port must be between 1 and 65535.");
  }
  const ssh = "ssh -p " + port;
  const args = ["-avz", "--progress", "--old-args", "-e", ssh];
  if (action === "push-project") {
    return args.concat([localWsl.replace(/\/+$/g, "") + "/", host + ":" + remoteBase + "/"]);
  }
  if (action === "pull-project") {
    return args.concat([host + ":" + remoteBase + "/", localWsl.replace(/\/+$/g, "") + "/"]);
  }
  if (action === "pull-outputs") {
    return args.concat([host + ":" + remoteBase + "/outputs/", localWsl.replace(/\/+$/g, "") + "/outputs/"]);
  }
  if (action === "pull-analysis") {
    return args.concat([host + ":" + remoteBase + "/analysis/", localWsl.replace(/\/+$/g, "") + "/analysis/"]);
  }
  throw new Error("Unsupported sync action.");
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
}

function workspaceRsyncCommand(request) {
  return "rsync " + workspaceRsyncArgs(request).map(shellQuote).join(" ");
}

async function launchInteractiveWsl(command, options) {
  const settings = options || {};
  const launcherDir = path.join(os.tmpdir(), "wineinger-nhg-launchers");
  fs.mkdirSync(launcherDir, { recursive: true });
  const launcherBase = "wineinger-nhg-" + (settings.slug || "terminal") + "-" + Date.now();
  const launcherPath = path.join(launcherDir, launcherBase + ".sh");
  const commandPath = path.join(launcherDir, launcherBase + ".cmd");
  const launcherWslPath = windowsPathToWsl(launcherPath);
  const script = [
    "#!/usr/bin/env bash",
    "set +e",
    command,
    "status=$?",
    "echo",
    "echo \"" + (settings.doneMessage || "Wineinger NHG command finished") + " with exit code ${status}.\"",
    "read -p \"Press Enter to close this terminal...\"",
    "exit ${status}",
    ""
  ].join("\n");
  fs.writeFileSync(launcherPath, script, "utf8");
  const commandScript = [
    "@echo off",
    "title " + (settings.title || "Wineinger NHG Terminal"),
    "wsl.exe bash \"" + launcherWslPath + "\"",
    "set EXITCODE=%ERRORLEVEL%",
    "echo.",
    "echo Wineinger NHG Windows launcher finished with exit code %EXITCODE%.",
    "pause",
    "exit /b %EXITCODE%",
    ""
  ].join("\r\n");
  fs.writeFileSync(commandPath, commandScript, "utf8");
  const openError = await shell.openPath(commandPath);
  if (openError) {
    throw new Error(openError);
  }
  return {
    launcherPath: launcherPath,
    commandPath: commandPath,
    launcherWslPath: launcherWslPath,
    command: "\"" + commandPath + "\""
  };
}

app.setName("Wineinger NHG");
fs.mkdirSync(desktopDataPath, { recursive: true });
app.setPath("userData", desktopDataPath);

ipcMain.handle("rcsb:fetch-pdb", async function (_event, structureId) {
  const pdbId = String(structureId || "").trim().toUpperCase();
  if (!/^[0-9A-Z]{4}$/.test(pdbId)) {
    throw new Error("Enter a valid four-character PDB ID.");
  }
  const url = "https://files.rcsb.org/download/" + pdbId + ".pdb";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("RCSB did not return a PDB structure for " + pdbId + ".");
  }
  return {
    pdbId: pdbId,
    url: url,
    text: await response.text()
  };
});

ipcMain.handle("projects:write-export", async function (_event, exportRequest) {
  const result = writeExportBundle(safeLocalRoot(exportRequest && exportRequest.localRoot), exportRequest);
  await shell.openPath(result.folderPath);
  return result;
});

ipcMain.handle("workspace:sync", async function (_event, request) {
  const command = workspaceRsyncCommand(request);
  const launched = await launchInteractiveWsl(command, {
    title: "Wineinger NHG Sync",
    slug: "sync",
    doneMessage: "Wineinger NHG sync finished"
  });
  return {
    ok: true,
    launched: true,
    command: launched.command,
    output: "Opened an interactive Windows command launcher for WSL/password/Duo prompts. If no window appears, run the command above from PowerShell."
  };
});

ipcMain.handle("colabfold:open", async function (_event, request) {
  request = request || {};
  const localRoot = safeLocalRoot(request.localPath);
  const fastaName = String(request.fastaName || "").replace(/[^A-Za-z0-9_.-]/g, "");
  const exportFolderName = String(request.exportFolderName || "").replace(/[^A-Za-z0-9_.-]/g, "");
  const exportFolder = exportFolderName ? path.join(localRoot, exportFolderName) : localRoot;
  const localRootWsl = windowsPathToWsl(localRoot);
  const exportFolderWsl = windowsPathToWsl(exportFolder);
  const expectedFastaPath = fastaName ? exportFolderWsl.replace(/\/+$/g, "") + "/" + fastaName : "";
  const expectedOutputPath = fastaName ? exportFolderWsl.replace(/\/+$/g, "") + "/output" : "output";
  const command = [
    "cd ~/tools/localcolabfold 2>/dev/null || { echo \"LocalColabFold was not found at ~/tools/localcolabfold.\"; echo \"Install it there or open WSL manually.\"; exit 2; }",
    "echo \"LocalColabFold directory: $(pwd)\"",
    "echo",
    "if [[ -x ./.pixi/envs/default/bin/colabfold_batch ]]; then",
    "  echo \"Found: ./.pixi/envs/default/bin/colabfold_batch\"",
    "  CF_CMD=\"./.pixi/envs/default/bin/colabfold_batch\"",
    "elif command -v colabfold_batch >/dev/null 2>&1; then",
    "  echo \"Found on PATH: $(command -v colabfold_batch)\"",
    "  CF_CMD=\"colabfold_batch\"",
    "else",
    "  echo \"LocalColabFold opened, but colabfold_batch was not found.\"",
    "  echo \"Try: pixi install && pixi run setup\"",
    "  exit 2",
    "fi",
    "echo",
    expectedFastaPath ? "FASTA_PATH=" + shellQuote(expectedFastaPath) : "FASTA_PATH=\"\"",
    expectedFastaPath ? "OUTPUT_PATH=" + shellQuote(expectedOutputPath) : "OUTPUT_PATH=\"output\"",
    expectedFastaPath ? "if [[ ! -f \"${FASTA_PATH}\" ]]; then" : "",
    expectedFastaPath ? "  FOUND_FASTA=$(find " + shellQuote(localRootWsl) + " -maxdepth 4 -type f -name " + shellQuote(fastaName) + " 2>/dev/null | head -n 1)" : "",
    expectedFastaPath ? "  if [[ -n \"${FOUND_FASTA}\" ]]; then" : "",
    expectedFastaPath ? "    FASTA_PATH=\"${FOUND_FASTA}\"" : "",
    expectedFastaPath ? "    OUTPUT_PATH=\"$(dirname \"${FOUND_FASTA}\")/output\"" : "",
    expectedFastaPath ? "  fi" : "",
    expectedFastaPath ? "fi" : "",
    expectedFastaPath ? "if [[ -f \"${FASTA_PATH}\" ]]; then" : "",
    expectedFastaPath ? "  echo \"Suggested Wineinger NHG command:\"" : "echo \"Export ColabFold files from Wineinger NHG to generate a project FASTA command.\"",
    expectedFastaPath ? "  printf '%q %q %q --num-recycle 3 --num-models 5\\n' \"${CF_CMD}\" \"${FASTA_PATH}\" \"${OUTPUT_PATH}\"" : "",
    expectedFastaPath ? "  echo" : "",
    expectedFastaPath ? "  echo \"Paste/run the command above when you are ready.\"" : "",
    expectedFastaPath ? "else" : "",
    expectedFastaPath ? "  echo \"Wineinger NHG could not find " + fastaName + " under " + localRootWsl + ".\"" : "",
    expectedFastaPath ? "  echo \"Click Export ColabFold files first, then reopen LocalColabFold.\"" : "",
    expectedFastaPath ? "fi" : "",
    "echo \"You are now in an interactive LocalColabFold shell.\"",
    "exec bash"
  ].join("\n");
  const launched = await launchInteractiveWsl(command, {
    title: "Wineinger NHG LocalColabFold",
    slug: "colabfold",
    doneMessage: "Wineinger NHG LocalColabFold check finished"
  });
  return {
    ok: true,
    launched: true,
    command: launched.command,
    output: "Opened an interactive LocalColabFold shell. If no terminal appears, run the command shown in Wineinger NHG from PowerShell."
  };
});

function createWindow() {
  const window = new BrowserWindow({
    title: "Wineinger NHG",
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#edf2f6",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  const query = process.argv.includes("--demo") ? { query: { demo: "1" } } : undefined;
  window.loadFile(path.join(__dirname, "renderer", "index.html"), query);

  window.webContents.setWindowOpenHandler(function (details) {
    if (/^https?:\/\//.test(details.url)) {
      shell.openExternal(details.url);
    }
    return { action: "deny" };
  });
}

app.whenReady().then(function () {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

