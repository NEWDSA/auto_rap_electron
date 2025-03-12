const { contextBridge, ipcRenderer } = require('electron');

// 暴露给录制窗口的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 调用主进程方法
  invoke: (channel, ...args) => {
    // 白名单安全检查
    const validChannels = ['recorder:start', 'recorder:stop', 'recorder:capture-action'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    
    return Promise.reject(new Error(`无效的 IPC 通道: ${channel}`));
  },
  
  // 接收主进程事件
  on: (channel, callback) => {
    const validChannels = ['recorder:recording-completed', 'recorder:action-captured'];
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  }
}); 