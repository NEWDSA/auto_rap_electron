import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { AutomationController } from './automation-controller'
import fs from 'fs/promises'

// 是否是开发环境
const isDev = process.env.NODE_ENV === 'development'

// 自动化控制器实例
const automationController = new AutomationController()

// 启动 Chrome
function launchChrome() {
  const chromePath = process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  spawn(chromePath, [
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(app.getPath('userData'), 'chrome-data')
  ], {
    stdio: 'ignore',
    detached: true
  }).unref()
}

function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    icon: isDev 
      ? path.join(process.cwd(), 'public/logo.png')
      : path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  // 加载页面
  if (isDev) {
    // 开发环境：加载本地服务
    mainWindow.loadURL('http://localhost:3000')
    // 打开开发工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// 注册 IPC 处理程序
ipcMain.handle('flow:start', async (_, nodes) => {
  try {
    await automationController.start(nodes)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('flow:stop', async () => {
  try {
    await automationController.stop()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 添加提取预览处理程序
ipcMain.handle('extract:preview', async (_, properties) => {
  try {
    const result = await automationController.previewExtraction(properties)
    return result
  } catch (error) {
    throw error
  }
})

// 开始元素选择
ipcMain.handle('element:startPicker', async () => {
  try {
    // 检查是否有活动的浏览器实例
    const browser = automationController.getCurrentBrowser()
    const page = automationController.getCurrentPage()
    
    if (!browser || !browser.isConnected()) {
      // 如果没有活动的浏览器实例，创建一个新的
      await automationController.initBrowser({
        headless: false,
        forElementPicker: true
      })
    }

    // 获取当前页面
    const currentPage = automationController.getCurrentPage()
    if (!currentPage || currentPage.isClosed()) {
      throw new Error('无法获取有效的页面，请确保浏览器已打开')
    }

    // 调用 startElementPicker 方法
    return await automationController.startElementPicker()
  } catch (error: any) {
    console.error('元素选择失败:', error)
    throw error
  }
})

// 添加文件保存对话框处理程序
ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  try {
    const { fileName = 'export', exportType = 'excel', imageFormat = 'png' } = options || {}
    
    // 根据导出类型准备不同的文件过滤器
    let filters = [{ name: '所有文件', extensions: ['*'] }]
    
    switch (exportType) {
      case 'excel':
        filters.unshift({ name: 'Excel 文件', extensions: ['xlsx'] })
        break
      case 'csv':
        filters.unshift({ name: 'CSV 文件', extensions: ['csv'] })
        break
      case 'json':
        filters.unshift({ name: 'JSON 文件', extensions: ['json'] })
        break
      case 'docx':
        filters.unshift({ name: 'Word 文档', extensions: ['docx'] })
        break
      case 'pdf':
        filters.unshift({ name: 'PDF 文档', extensions: ['pdf'] })
        break
      case 'image':
        if (imageFormat === 'jpeg') {
          filters.unshift({ name: 'JPEG 图片', extensions: ['jpeg', 'jpg'] })
        } else {
          filters.unshift({ name: 'PNG 图片', extensions: ['png'] })
        }
        break
      case 'txt':
        filters.unshift({ name: '文本文件', extensions: ['txt'] })
        break
      default:
        // 默认添加所有可用的格式
        filters = [
          { name: 'Excel 文件', extensions: ['xlsx'] },
          { name: 'CSV 文件', extensions: ['csv'] },
          { name: 'JSON 文件', extensions: ['json'] },
          { name: 'Word 文档', extensions: ['docx'] },
          { name: 'PDF 文档', extensions: ['pdf'] },
          { name: 'PNG 图片', extensions: ['png'] },
          { name: 'JPEG 图片', extensions: ['jpeg', 'jpg'] },
          { name: '文本文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ]
    }
    
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '保存文件',
      defaultPath: fileName,
      filters: filters
    })
    
    if (canceled || !filePath) {
      return null
    }
    
    return filePath
  } catch (error: unknown) {
    console.error('显示保存对话框失败:', error)
    return null
  }
})

// 添加选择文件夹对话框处理程序
ipcMain.handle('dialog:showOpenDirectoryDialog', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '选择保存文件夹',
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (canceled || !filePaths || filePaths.length === 0) {
      return null
    }
    
    return filePaths[0]  // 返回选择的文件夹路径
  } catch (error: unknown) {
    console.error('显示文件夹选择对话框失败:', error)
    return null
  }
})

// 添加文件写入处理程序
ipcMain.handle('fs:writeFile', async (_, filePath, content, options = {}) => {
  try {
    // 如果内容是Buffer，直接写入
    if (Buffer.isBuffer(content)) {
      await fs.writeFile(filePath, content, options)
    } 
    // 如果内容是ArrayBuffer，转为Buffer再写入
    else if (content instanceof ArrayBuffer || (typeof content === 'object' && content !== null && content.constructor && content.constructor.name === 'ArrayBuffer')) {
      const buffer = Buffer.from(content)
      await fs.writeFile(filePath, buffer, options)
    }
    // 如果内容是字符串，直接写入
    else if (typeof content === 'string') {
      const encoding = options.encoding || 'utf-8'
      await fs.writeFile(filePath, content, encoding)
    } 
    // 如果是其他类型，转为JSON字符串
    else {
      await fs.writeFile(filePath, JSON.stringify(content), 'utf-8')
    }
    
    return { success: true }
  } catch (error: unknown) {
    console.error('写入文件失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 添加打开浏览器处理程序
ipcMain.handle('open-browser', async (_, options) => {
  try {
    const browser = automationController.getCurrentBrowser()
    
    // 如果正在选择元素，不允许打开新的浏览器
    if (browser?.isConnected() && automationController.isElementPickerActive()) {
      return { success: false, error: '正在选择元素，请稍后再试' }
    }
    
    await automationController.initBrowser(options)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 添加全屏切换处理程序
ipcMain.handle('window:toggleFullscreen', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    const isFullScreen = win.isFullScreen()
    win.setFullScreen(!isFullScreen)
    return { success: true, isFullScreen: !isFullScreen }
  }
  return { success: false, error: '无法获取窗口' }
})

// 应用程序准备就绪时创建窗口
app.whenReady().then(() => {
  // 移除自动启动Chrome
  // launchChrome()
  createWindow()

  // macOS 应用程序激活时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用程序
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
}) 