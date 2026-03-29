const electronAPI = (typeof window !== 'undefined' && (window as any).electronAPI) || null

const notAvailable = (method: string) => {
  throw new Error(`electronAPI 不可用，无法调用: ${method}`)
}

export const ipcRenderer = {
  invoke: (...args: any[]) => (electronAPI ? electronAPI.invoke(...args) : notAvailable('invoke')),
  send: (...args: any[]) => (electronAPI ? electronAPI.send(...args) : notAvailable('send')),
  on: (...args: any[]) => (electronAPI ? electronAPI.on(...args) : notAvailable('on')),
  once: (...args: any[]) => (electronAPI ? electronAPI.once?.(...args) : notAvailable('once')),
  removeListener: (...args: any[]) => (electronAPI ? electronAPI.removeListener?.(...args) : notAvailable('removeListener')),
}

// 初始化自动化语音播放监听器
if (typeof window !== 'undefined' && electronAPI) {
  // 监听自动化语音播放请求
  try {
    ipcRenderer.on('automation:speak', async (event: any, data: any) => {
      try {
        const { text, options } = data

        // 导入语音管理器
        const { speechManager } = await import('./speech')

        // 播放语音
        const result = await speechManager.speak(text, options)

        if (result.success) {
          // 通知主进程播放完成
          ipcRenderer.send('automation:speech-end')
        } else {
          // 通知主进程播放失败
          ipcRenderer.send('automation:speech-error', result.error)
        }
      } catch (error) {
        console.error('自动化语音播放失败:', error)
        ipcRenderer.send('automation:speech-error', `语音播放失败: ${error}`)
      }
    })
  } catch (error) {
    console.warn('无法注册自动化语音播放监听器:', error)
  }
}

// 导出其他 electron 相关的工具方法
export const electron = {
  platform: electronAPI?.platform,
  version: electronAPI?.version,
  minimize: (...args: any[]) => (electronAPI ? electronAPI.minimize?.(...args) : notAvailable('minimize')),
  maximize: (...args: any[]) => (electronAPI ? electronAPI.maximize?.(...args) : notAvailable('maximize')),
  close: (...args: any[]) => (electronAPI ? electronAPI.close?.(...args) : notAvailable('close')),
}
