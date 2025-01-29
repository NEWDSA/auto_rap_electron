import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  version: process.versions.electron,

  // IPC 通信
  invoke: (channel: string, ...args: any[]) => {
    // 白名单通道
    const validChannels = ['flow:start', 'flow:stop', 'dialog:showSaveDialog', 'open-browser', 'element:startPicker']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    throw new Error(`不允许访问通道: ${channel}`)
  },
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  },
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.on(channel, callback)
  },
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.once(channel, callback)
  },
  removeListener: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },

  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
}) 