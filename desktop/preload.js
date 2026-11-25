// The only bridge between the page and the app. The page sees window.desktop and nothing else of Electron.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  docState: s => ipcRenderer.send('doc-state', s),
  discardOk: () => ipcRenderer.invoke('discard-ok'),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: o => ipcRenderer.invoke('save-file', o),
  closeNow: () => ipcRenderer.send('close-now'),
  examState: () => ipcRenderer.invoke('exam-state'),
  examEnable: pw => ipcRenderer.invoke('exam-enable', pw),
  examDisable: pw => ipcRenderer.invoke('exam-disable', pw),
  onExam: f => ipcRenderer.on('exam', (_, on) => f(on)),
  onMenu: f => ipcRenderer.on('menu', (_, a) => f(a))
});
