const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  version: process.versions.electron,

  // IPC 通信
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },
  once: (channel, callback) => {
    ipcRenderer.once(channel, (_, ...args) => callback(...args))
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },

  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
})
