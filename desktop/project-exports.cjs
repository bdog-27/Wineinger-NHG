const fs = require("node:fs");
const path = require("node:path");

function writeExportBundle(projectExportsPath, exportRequest) {
  const request = exportRequest || {};
  const folderName = String(request.folderName || "").replace(/[^A-Za-z0-9_.-]/g, "-").replace(/^-|-$/g, "").slice(0, 96);
  const files = Array.isArray(request.files) ? request.files : [];
  if (!folderName || folderName === "." || folderName === ".." || !files.length || files.length > 24) {
    throw new Error("The Wineinger NHG export package is not valid.");
  }
  const exportsRoot = path.resolve(projectExportsPath);
  const targetFolder = path.resolve(exportsRoot, folderName);
  if (!targetFolder.startsWith(exportsRoot + path.sep)) {
    throw new Error("The Wineinger NHG export path is not valid.");
  }
  fs.mkdirSync(targetFolder, { recursive: true });
  files.forEach(function (file) {
    const filename = path.basename(String(file.name || ""));
    if (!filename || filename === "." || filename === ".." || filename !== file.name || typeof file.contents !== "string") {
      throw new Error("A Wineinger NHG export file is not valid.");
    }
    fs.writeFileSync(path.join(targetFolder, filename), file.contents, "utf8");
  });
  return {
    folderPath: targetFolder,
    files: files.map(function (file) { return file.name; })
  };
}

module.exports = { writeExportBundle };
