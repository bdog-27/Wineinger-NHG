const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ezDesktop", {
  isDesktop: true,
  platform: process.platform,
  fetchPdb: function (structureId) {
    return ipcRenderer.invoke("rcsb:fetch-pdb", structureId);
  },
  writeProjectExport: function (request) {
    return ipcRenderer.invoke("projects:write-export", request);
  },
  syncWorkspace: function (request) {
    return ipcRenderer.invoke("workspace:sync", request);
  },
  openLocalColabfold: function (request) {
    return ipcRenderer.invoke("colabfold:open", request);
  }
});
