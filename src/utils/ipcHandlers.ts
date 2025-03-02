import { ExportUtils } from './exportUtils'

// 为window对象添加electronAPI接口
declare global {
  interface Window {
    electronAPI: {
      on: (channel: string, callback: (event: any, ...args: any[]) => void) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
      // 其他可能的electronAPI方法
    }
  }
}

// 初始化IPC处理程序
export function initializeIpcHandlers() {
  // 确保在浏览器环境中运行
  if (typeof window === 'undefined' || !window.electronAPI) {
    console.error('IPC处理程序初始化失败：不在浏览器环境或没有electronAPI')
    return
  }

  console.log('开始初始化IPC事件处理程序...')

  // 监听导出数据请求
  window.electronAPI.on('automation:export-data', async (event, message) => {
    try {
      if (!message || !message.options) {
        console.error('导出数据无效: 未收到有效的选项')
        return
      }
      
      console.log('接收到导出数据请求:', message.options)
      
      const { data, options } = message
      
      if (!data || !Array.isArray(data)) {
        console.error('导出数据无效:', data)
        return
      }
      
      console.log(`准备导出数据: 类型=${options.type}, 文件名=${options.fileName}, 保存模式=${options.saveMode}`)
      
      // 检查是否有预设的保存路径
      if (options.saveMode === 'auto' && options.savePath) {
        console.log('使用预设保存路径:', options.savePath)
        // 对于auto模式，如果没有预设路径或路径为空，添加警告
        if (!options.savePath.trim()) {
          console.warn('警告: 自动保存模式下没有设置保存路径，将使用默认下载路径')
        }
      } else if (options.saveMode === 'select') {
        console.log('将使用对话框让用户选择保存路径')
      }
      
      try {
        // 使用ExportUtils执行导出操作
        await ExportUtils.exportData(data, options)
        console.log('数据导出成功完成')
      } catch (error) {
        console.error('导出操作失败:', error)
      }
    } catch (error) {
      console.error('渲染进程导出数据失败:', error)
    }
  })
  
  console.log('IPC事件处理程序初始化完成')
} 