// 从全局 window 对象中获取 electronAPI
const electronAPI = (window as any).electronAPI

// 导出 IPC 通信相关的方法
export const ipcRenderer = {
  invoke: electronAPI.invoke,
  send: electronAPI.send,
  on: electronAPI.on,
  once: electronAPI.once,
  removeListener: electronAPI.removeListener
}

// 导出其他 electron 相关的工具方法
export const electron = {
  platform: electronAPI.platform,
  version: electronAPI.version,
  minimize: electronAPI.minimize,
  maximize: electronAPI.maximize,
  close: electronAPI.close
} 