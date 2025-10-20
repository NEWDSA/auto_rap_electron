import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  version: process.versions.electron,

  // IPC 通信
  invoke: (channel: string, ...args: any[]) => {
    // 白名单通道
    const validChannels = [
      'flow:start', 
      'flow:stop', 
      'dialog:showSaveDialog', 
      'dialog:showOpenDirectoryDialog',
      'fs:writeFile', 
      'open-browser', 
      'element:startPicker', 
      'extract:preview', 
      'window:toggleFullscreen',
      'save-configuration',
      'get-all-configurations',
      'get-configuration',
      'delete-configuration',
      'get-database-path',
      'set-database-path',
      'build-database-path',
      // 录制相关通道
      'recorder:start',
      'recorder:stop',
      'recorder:capture-action',
      'test-ipc-channel',
      // 自动化相关通道
      'automation:export-data',
      // 任务调度相关通道
      'scheduler:get-all-tasks',
      'scheduler:get-task',
      'scheduler:add-task',
      'scheduler:update-task',
      'scheduler:delete-task',
      'scheduler:start-task',
      'scheduler:stop-task',
      'scheduler:get-task-log',
      // AI配置相关通道
      'get-ai-config',
      'save-ai-config',
      // 统计相关通道
      'get-stats',
      // 系统电源控制
      'system:power'
    ]
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    throw new Error(`不允许访问通道: ${channel}`)
  },
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  },
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    // 添加事件通道白名单检查
    const validChannels = [
      'recorder:action-captured',
      'recorder:recording-completed',
      'automation:export-data',
      // 任务调度相关事件通道
      'scheduler:task-started',
      'scheduler:task-completed',
      'scheduler:task-failed',
      'scheduler:task-stopped',
      'scheduler:task-scheduled'
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback)
      return () => {
        ipcRenderer.removeListener(channel, callback)
      }
    }
    throw new Error(`不允许监听通道: ${channel}`)
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