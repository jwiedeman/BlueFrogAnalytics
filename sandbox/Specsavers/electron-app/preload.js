const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getWhitelist: () => ipcRenderer.invoke('whitelist-get'),
  setWhitelist: (list) => ipcRenderer.invoke('whitelist-set', list),
  addWhitelist: (domain) => ipcRenderer.invoke('whitelist-add', domain),
  removeWhitelist: (domain) => ipcRenderer.invoke('whitelist-remove', domain),
  updateWhitelist: (oldDomain, newDomain) => ipcRenderer.invoke('whitelist-update', { oldDomain, newDomain }),
  getRules: () => ipcRenderer.invoke('rules-get'),
  setRules: (rules) => ipcRenderer.invoke('rules-set', rules),
  startProxy: () => ipcRenderer.invoke('start-proxy'),
  stopProxy: () => ipcRenderer.invoke('stop-proxy'),
  getStatus: () => ipcRenderer.invoke('proxy-status'),
  getFlows: () => ipcRenderer.invoke('flows-get'),
  clearFlows: () => ipcRenderer.invoke('flows-clear'),
  getProcessed: () => ipcRenderer.invoke('processed-get'),
  clearProcessed: () => ipcRenderer.invoke('processed-clear'),
  getSessions: () => ipcRenderer.invoke('sessions-get'),
  exportSession: (id) => ipcRenderer.invoke('sessions-export', id),
  startSessionRecording: () => ipcRenderer.invoke('start-session-recording'),
  stopSessionRecording: () => ipcRenderer.invoke('stop-session-recording'),
  importSession: (sessObj) => ipcRenderer.invoke('import-session', sessObj),
  processSession: (id) => ipcRenderer.invoke('process-session', id),
  getDimensions: () => ipcRenderer.invoke('get-dimensions'),
  setDimension: (dim) => ipcRenderer.invoke('set-dimension', dim),
  removeDimension: (key) => ipcRenderer.invoke('remove-dimension', key),
  syncCA: () => ipcRenderer.invoke('sync-ca'),
  regenerateCA: () => ipcRenderer.invoke('regenerate-ca')
  , exportDb: () => ipcRenderer.invoke('export-db')
  , importDb: (data) => ipcRenderer.invoke('import-db', data)
});