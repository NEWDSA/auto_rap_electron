import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { exec } from 'child_process'
import os from 'os'
import { AutomationController } from './automation-controller'
import { EmailService } from './email-service'
import fs from 'fs'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import DatabaseService from './database'
import { RecorderService } from '../src/core/recorder/RecorderService'
import { TaskScheduler } from './scheduler'
import { TaskStatus } from './scheduler'

// 是否是开发环境
const isDev = process.env.NODE_ENV === 'development'

try {
  const cacheDir = path.join(os.tmpdir(), `auto_rap_cache_${process.pid}`)
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir)
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
} catch {}

// 自动化控制器实例
const automationController = new AutomationController()

// 数据库服务实例
const dbService = DatabaseService.getInstance()

// 录制服务实例
let recorderService: RecorderService

// 主窗口实例
let mainWindow: BrowserWindow | null = null

// 初始化数据库服务和自动化控制器
const taskScheduler = TaskScheduler.getInstance(automationController)

// 打印用户数据目录路径
console.log('用户数据目录路径:', app.getPath('userData'))

// 测试数据库连接
try {
  console.log('开始测试数据库连接...')
  // 获取所有配置
  dbService
    .getAllConfigurations()
    .then(configs => {
      console.log('数据库连接正常，获取到配置数量:', configs.length)
      // 不再自动插入测试数据
    })
    .catch(error => {
      console.error('数据库操作失败:', error)
    })
} catch (error) {
  console.error('测试数据库连接时出错:', error)
}

// 启动 Chrome
function launchChrome() {
  const chromePath =
    process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  spawn(
    chromePath,
    [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--user-data-dir=' + path.join(app.getPath('userData'), 'chrome-data'),
    ],
    {
      stdio: 'ignore',
      detached: true,
    }
  ).unref()
}

// 创建主窗口
async function createWindow() {
  try {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
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

    // 隐藏菜单栏
    mainWindow.setMenuBarVisibility(false)

    // 根据环境加载不同URL
    if (process.env.NODE_ENV === 'development') {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:3000'
      await mainWindow.loadURL(devServerUrl)
      mainWindow.webContents.openDevTools()
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // 监听任务调度器的事件并转发到渲染进程
    taskScheduler.on('taskStarted', task => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-started', task)
    })

    taskScheduler.on('taskCompleted', result => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-completed', result)
    })

    taskScheduler.on('taskFailed', result => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-failed', result)
    })

    taskScheduler.on('taskStopped', task => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-stopped', task)
    })

    taskScheduler.on('taskQueued', task => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-queued', task)
    })

    taskScheduler.on('taskUpdated', task => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-updated', task)
    })

    // 监听任务执行次数更新事件，更新数据库中的记录
    taskScheduler.on('taskExecutionCountUpdated', async data => {
      try {
        // 获取当前配置
        const config = await dbService.getConfigurationById(data.taskId)
        if (config) {
          // 解析配置内容
          let content = {}
          try {
            content = JSON.parse(config.content)
          } catch (e) {
            console.error('解析配置内容失败:', e)
            content = {}
          }

          // 更新执行次数
          content = {
            ...content,
            executionCount: data.executionCount,
          }

          // 保存回数据库
          await dbService.updateConfiguration(data.taskId, config.name, JSON.stringify(content))

          console.log(`已更新数据库中任务 ${data.taskId} 的执行次数: ${data.executionCount}`)
        } else {
          console.warn(`找不到ID为 ${data.taskId} 的配置记录，无法更新执行次数`)
        }
      } catch (error) {
        console.error('更新任务执行次数失败:', error)
      }
    })

    taskScheduler.on('taskScheduled', data => {
      if (!mainWindow) return
      mainWindow.webContents.send('scheduler:task-scheduled', data)
    })

    return mainWindow
  } catch (error) {
    console.error('创建窗口失败:', error)
    return null
  }
}

// 注册 IPC 处理程序
ipcMain.handle('test-ipc-channel', async (_, data) => {
  console.log('收到测试IPC通道请求:', data)
  return { success: true, message: '测试IPC通道成功', data }
})

ipcMain.handle('recorder:start', async (_, url) => {
  console.log('收到录制开始请求:', url)
  try {
    const result = await recorderService.startRecording(url)
    console.log('录制开始结果:', result)
    return result
  } catch (error) {
    console.error('录制开始失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('recorder:stop', async () => {
  console.log('收到录制停止请求')
  try {
    const result = await recorderService.stopRecording()
    console.log('录制停止结果:', result)
    return result
  } catch (error) {
    console.error('录制停止失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('flow:start', async (_, nodes) => {
  try {
    // 创建临时任务并启动
    const tempTask = taskScheduler.addTask({
      name: '临时任务',
      status: TaskStatus.PENDING,
      nodes: nodes,
    })
    await taskScheduler.startTask(tempTask.id)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('flow:stop', async () => {
  try {
    // 获取当前运行的任务并停止
    const tasks = taskScheduler.getAllTasks()
    const runningTask = tasks.find(task => task.status === TaskStatus.RUNNING)
    if (runningTask) {
      await taskScheduler.stopTask(runningTask.id)
    } else {
      await automationController.stop()
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 添加视频下载测试处理程序
ipcMain.handle('video:download', async (event, { url, options }) => {
  try {
    console.log(`[IPC] 收到视频下载请求: ${url}`)
    console.log(`[IPC] 选项:`, JSON.stringify(options, null, 2))

    const { VideoTools } = await import('./utils/video-tools')

    // 确保保存路径存在
    if (options.savePath) {
      if (!fs.existsSync(options.savePath)) {
        console.log(`[IPC] 创建保存目录: ${options.savePath}`)
        fs.mkdirSync(options.savePath, { recursive: true })
      }
    }

    const onProgress = (progress: number, status: string) => {
      // 通过 IPC 发送进度到请求的渲染进程
      event.sender.send('video:progress', { progress, status })
    }

    const result = await VideoTools.getInstance().downloadVideo(url, {
      ...options,
      onProgress,
    })
    console.log(`[IPC] 下载结果:`, result)
    return result
  } catch (error: any) {
    console.error('[IPC] 视频下载处理失败:', error)
    return { success: false, message: error.message, stack: error.stack }
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

    if (!browser || browser.isDestroyed()) {
      // 如果没有活动的浏览器实例，创建一个新的
      await automationController.initBrowser({
        headless: false,
        forElementPicker: true,
      })
    }

    // 获取当前页面
    const currentPage = automationController.getCurrentPage()
    if (!currentPage || currentPage.isDestroyed()) {
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
    const {
      fileName = 'export',
      exportType = 'excel',
      imageFormat = 'png',
      title,
      defaultPath,
      filters: customFilters,
    } = options || {}

    // 优先使用传入的filters，否则根据导出类型准备不同的文件过滤器
    let filters = customFilters || [{ name: '所有文件', extensions: ['*'] }]

    if (!customFilters) {
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
            { name: '所有文件', extensions: ['*'] },
          ]
      }
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: title || '保存文件',
      defaultPath: defaultPath || fileName,
      filters: filters,
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
      properties: ['openDirectory', 'createDirectory'],
    })

    if (canceled || !filePaths || filePaths.length === 0) {
      return null
    }

    return filePaths[0] // 返回选择的文件夹路径
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
    else if (
      content instanceof ArrayBuffer ||
      (typeof content === 'object' &&
        content !== null &&
        content.constructor &&
        content.constructor.name === 'ArrayBuffer')
    ) {
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
      fs.writeFileSync(filePath, JSON.stringify(content), 'utf-8')
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
    // 使用 initBrowser 而不是 start
    await automationController.initBrowser({
      url: options.url,
      width: options.width,
      height: options.height,
      userAgent: options.userAgent,
    })

    return { success: true }
  } catch (error) {
    console.error('打开浏览器失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
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

// 注册保存流程配置的处理程序
ipcMain.handle('save-configuration', async (event, name, content) => {
  console.log('收到保存请求:', name, '数据长度:', content ? content.length : 0)
  try {
    // 检查是否已存在同名配置
    const configs = await dbService.getAllConfigurations()
    console.log('获取到所有配置:', configs.length)
    const existingConfig = configs.find(config => config.name === name)

    if (existingConfig) {
      console.log('更新现有配置:', existingConfig.id)
      // 更新现有配置
      await dbService.updateConfiguration(existingConfig.id, name, content)
      console.log('更新成功')
      return { success: true, id: existingConfig.id }
    } else {
      console.log('创建新配置')
      // 创建新配置
      const id = await dbService.saveConfiguration(name, content)
      console.log('创建成功, ID:', id)
      return { success: true, id }
    }
  } catch (error: any) {
    console.error('保存流程配置失败:', error)
    return { success: false, error: error.message || '未知错误' }
  }
})

// 注册获取所有流程配置的处理程序
ipcMain.handle('get-all-configurations', async () => {
  try {
    const configs = await dbService.getAllConfigurations()
    return { success: true, data: configs }
  } catch (error: any) {
    console.error('获取流程配置失败:', error)
    return { success: false, error: error.message }
  }
})

// 注册获取单个流程配置的处理程序
ipcMain.handle('get-configuration', async (_, id) => {
  try {
    const config = await dbService.getConfigurationById(id)
    return { success: true, data: config }
  } catch (error: any) {
    console.error('获取流程配置失败:', error)
    return { success: false, error: error.message }
  }
})

// 注册删除流程配置的处理程序
ipcMain.handle('delete-configuration', async (_, id) => {
  try {
    await dbService.deleteConfiguration(id)
    return { success: true }
  } catch (error: any) {
    console.error('删除流程配置失败:', error)
    return { success: false, error: error.message }
  }
})

// 注册 AI 配置相关的处理程序
ipcMain.handle('get-ai-config', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'ai-config.json')
    if (existsSync(configPath)) {
      const config = readFileSync(configPath, 'utf-8')
      return JSON.parse(config)
    }
    return null
  } catch (error) {
    console.error('读取 AI 配置失败:', error)
    return null
  }
})

ipcMain.handle('save-ai-config', async (event, config) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'ai-config.json')
    writeFileSync(configPath, JSON.stringify(config, null, 2))
    return { success: true }
  } catch (error: any) {
    console.error('保存 AI 配置失败:', error)
    return { success: false, error: error.message }
  }
})

// 注册自定义模型相关的处理程序
ipcMain.handle('get-custom-models', async () => {
  try {
    const modelsPath = path.join(app.getPath('userData'), 'custom-models.json')
    if (fs.existsSync(modelsPath)) {
      const models = fs.readFileSync(modelsPath, 'utf-8')
      return JSON.parse(models)
    }
    return []
  } catch (error) {
    console.error('读取自定义模型失败:', error)
    return []
  }
})

ipcMain.handle('save-custom-models', async (event, models) => {
  try {
    const modelsPath = path.join(app.getPath('userData'), 'custom-models.json')
    fs.writeFileSync(modelsPath, JSON.stringify(models, null, 2))
    return { success: true }
  } catch (error: any) {
    console.error('保存自定义模型失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('test-custom-model', async (event, model) => {
  try {
    // 构建测试请求
    const testPrompt = 'Hello, please respond with "OK" if you can understand this message.'

    const requestBody: any = {
      model: model.model,
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 10,
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // 添加认证
    if (model.apiKey) {
      headers['Authorization'] = `Bearer ${model.apiKey}`
    }

    // 添加自定义头部
    if (model.customHeaders) {
      try {
        const customHeaders = JSON.parse(model.customHeaders)
        headers = { ...headers, ...customHeaders }
      } catch {
        if (model.customHeaders.trim()) {
          headers['Authorization'] = model.customHeaders
        }
      }
    }

    // 发送测试请求
    const response = await fetch(model.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000), // 10秒超时
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${error}` }
    }

    const data = await response.json()
    return { success: true, response: data }
  } catch (error: any) {
    console.error('测试自定义模型失败:', error)
    return { success: false, error: error.message || '连接失败' }
  }
})

// 注册获取数据库路径的处理程序
ipcMain.handle('get-database-path', () => {
  try {
    const dbPath = DatabaseService.getDatabasePath()
    return { success: true, path: dbPath }
  } catch (error: any) {
    console.error('获取数据库路径失败:', error)
    return { success: false, error: error.message }
  }
})

// 注册设置数据库路径的处理程序
ipcMain.handle('set-database-path', async (_, newPath) => {
  try {
    // 保存旧路径，以便迁移数据
    const oldPath = DatabaseService.getDatabasePath()

    // 如果路径相同，不做任何操作
    if (oldPath === newPath) {
      return { success: true, path: newPath }
    }

    // 设置新路径
    DatabaseService.setDatabasePath(newPath)

    // 重新获取数据库服务实例（会使用新路径）
    const newDbService = DatabaseService.getInstance()

    // 更新全局实例
    Object.assign(dbService, newDbService)

    return { success: true, path: newPath }
  } catch (error: any) {
    console.error('设置数据库路径失败:', error)
    return { success: false, error: error.message }
  }
})

// 注册构建数据库路径的处理程序
ipcMain.handle('build-database-path', (_, dirPath) => {
  try {
    // 使用 path.join 确保路径格式在不同操作系统上都正确
    const dbPath = path.join(dirPath, 'data.db')
    return dbPath
  } catch (error: any) {
    console.error('构建数据库路径失败:', error)
    return dirPath + '/data.db' // 回退到简单拼接
  }
})

ipcMain.handle('recorder:capture-action', async (_, action) => {
  console.log('收到录制操作:', action)
  try {
    if (!recorderService) {
      throw new Error('录制服务未初始化')
    }
    const result = await recorderService.captureAction(action)
    return result
  } catch (error) {
    console.error('捕获操作失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 注册任务调度相关的IPC处理程序
ipcMain.handle('scheduler:get-all-tasks', async () => {
  try {
    const tasks = taskScheduler.getAllTasks()
    return { success: true, data: tasks }
  } catch (error: any) {
    console.error('获取所有任务失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:get-task', async (_, taskId) => {
  try {
    const task = taskScheduler.getTask(taskId)
    return { success: true, data: task }
  } catch (error: any) {
    console.error('获取任务详情失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:add-task', async (_, taskData) => {
  try {
    const newTask = taskScheduler.addTask(taskData)
    return { success: true, data: newTask }
  } catch (error: any) {
    console.error('添加任务失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:update-task', async (_, taskId, updates) => {
  try {
    const updatedTask = taskScheduler.updateTask(taskId, updates)
    return { success: true, data: updatedTask }
  } catch (error: any) {
    console.error('更新任务失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:delete-task', async (_, taskId) => {
  try {
    console.log(`收到删除任务请求，任务ID: ${taskId}`)

    // 首先检查任务是否存在于调度器中
    const taskExists = taskScheduler.getTask(taskId)
    console.log(`任务检查结果: ${taskExists ? '存在' : '不存在'}`)

    // 删除任务调度器中的任务
    const result = taskScheduler.deleteTask(taskId)
    console.log(`从调度器删除任务结果: ${result ? '成功' : '失败'}`)

    // 同时删除数据库中的配置记录
    if (result) {
      try {
        // 先检查配置是否存在
        const configExists = await dbService.getConfigurationById(taskId)
        console.log(`数据库中配置检查结果: ${configExists ? '存在' : '不存在'}, ID: ${taskId}`)

        await dbService.deleteConfiguration(taskId)
        console.log('已从数据库删除配置记录 ID:', taskId)
      } catch (dbError) {
        console.warn('从数据库删除配置记录失败:', dbError)
        // 即使数据库删除失败，也返回调度器删除成功的结果
      }
    }

    return { success: result }
  } catch (error: any) {
    console.error('删除任务失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:start-task', async (_, taskId) => {
  try {
    const result = await taskScheduler.startTask(taskId)
    return { success: result }
  } catch (error: any) {
    console.error('启动任务失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:stop-task', async (_, taskId) => {
  try {
    const result = await taskScheduler.stopTask(taskId)
    return { success: result }
  } catch (error: any) {
    console.error('停止任务失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('scheduler:get-task-log', async (_, taskId) => {
  try {
    const log = taskScheduler.getTaskLog(taskId)
    return { success: true, data: log }
  } catch (error: any) {
    console.error('获取任务日志失败:', error)
    return { success: false, error: error.message }
  }
})

// 处理获取统计数据的请求
ipcMain.handle('get-stats', async () => {
  try {
    // 获取所有任务
    const allTasks = taskScheduler.getAllTasks()

    // 计算统计数据
    const totalProcesses = allTasks.length
    const runningTasks = allTasks.filter(task => task.status === TaskStatus.RUNNING).length

    // 获取今日执行的任务数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayExecutions = allTasks.filter(
      task => task.lastRunTime && new Date(task.lastRunTime) >= today
    ).length

    // 计算成功率（这里简化处理，实际应该根据任务执行结果计算）
    const completedTasks = allTasks.filter(
      task => task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED
    )
    const successRate =
      completedTasks.length > 0
        ? Math.round(
            (completedTasks.filter(task => task.status === TaskStatus.COMPLETED).length /
              completedTasks.length) *
              100
          )
        : 0

    return {
      totalProcesses,
      runningTasks,
      todayExecutions,
      successRate,
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return {
      totalProcesses: 0,
      runningTasks: 0,
      todayExecutions: 0,
      successRate: 0,
    }
  }
})

// 系统电源控制（仅在受支持的平台执行）
ipcMain.handle('system:power', async (_event, payload) => {
  try {
    const { action, force } = (payload || {}) as {
      action: 'shutdown' | 'restart' | 'sleep' | 'lock'
      force?: boolean
    }

    if (process.platform === 'win32') {
      let cmd = ''
      switch (action) {
        case 'shutdown':
          cmd = `shutdown /s ${force ? '/f ' : ''}/t 0`
          break
        case 'restart':
          cmd = `shutdown /r ${force ? '/f ' : ''}/t 0`
          break
        case 'sleep':
          // 注意：睡眠可能受系统休眠/快速启动设置影响
          cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'
          break
        case 'lock':
          cmd = 'rundll32.exe user32.dll,LockWorkStation'
          break
        default:
          return { success: false, error: '不支持的操作' }
      }

      exec(cmd, error => {
        if (error) {
          console.error('执行电源命令失败:', error)
        }
      })

      return { success: true }
    }

    // 其他平台可按需扩展（macOS/Linux）
    return { success: false, error: `当前平台不支持: ${process.platform}` }
  } catch (error: any) {
    return { success: false, error: error?.message || '电源操作失败' }
  }
})

// 文件读取处理程序
ipcMain.handle('file:read', async (_event, payload) => {
  try {
    const { filePath, fileType, encoding, includeMetadata, extractImages, extractTables } = payload

    if (!filePath) {
      return { success: false, error: '文件路径不能为空' }
    }

    const fs = require('fs')
    const path = require('path')

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `文件不存在: ${filePath}` }
    }

    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase().slice(1)
    const actualFileType = fileType === 'auto' ? ext : fileType

    let content = ''
    let metadata: any = {}

    switch (actualFileType) {
      case 'pdf':
        const pdfParse = require('pdf-parse')
        const pdfBuffer = fs.readFileSync(filePath)
        const pdfData = await pdfParse(pdfBuffer)
        content = pdfData.text
        if (includeMetadata) {
          metadata = {
            pages: pdfData.numpages,
            info: pdfData.info,
            version: pdfData.version,
          }
        }
        break

      case 'txt':
        const detectedEncoding = encoding === 'auto' ? 'utf8' : encoding
        try {
          content = fs.readFileSync(filePath, detectedEncoding)
        } catch (encodingError) {
          // 如果指定编码失败，尝试其他编码
          const encodings = ['utf8', 'gbk', 'gb2312']
          for (const enc of encodings) {
            try {
              content = fs.readFileSync(filePath, enc)
              break
            } catch (e) {
              continue
            }
          }
          if (!content) {
            return { success: false, error: '无法读取文件，尝试了多种编码格式' }
          }
        }
        break

      case 'docx':
        const mammoth = require('mammoth')
        const docxBuffer = fs.readFileSync(filePath)
        const docxResult = await mammoth.extractRawText({ buffer: docxBuffer })
        content = docxResult.value
        if (includeMetadata) {
          metadata = {
            messages: docxResult.messages,
          }
        }
        break

      case 'doc':
        return { success: false, error: 'DOC格式暂不支持，请使用DOCX格式' }

      default:
        return { success: false, error: `不支持的文件格式: ${actualFileType}` }
    }

    return {
      success: true,
      data: {
        content,
        metadata: includeMetadata ? metadata : undefined,
        filePath,
        fileType: actualFileType,
        size: fs.statSync(filePath).size,
        lastModified: fs.statSync(filePath).mtime,
      },
    }
  } catch (error: any) {
    return { success: false, error: error?.message || '文件读取失败' }
  }
})

// 文件预览处理程序
ipcMain.handle('file:preview', async (_event, payload) => {
  try {
    const { filePath, fileType } = payload

    if (!filePath) {
      return { success: false, error: '文件路径不能为空' }
    }

    // 使用系统默认程序打开文件
    const { exec } = require('child_process')
    const command =
      process.platform === 'win32'
        ? `start "" "${filePath}"`
        : process.platform === 'darwin'
          ? `open "${filePath}"`
          : `xdg-open "${filePath}"`

    exec(command, (error: any) => {
      if (error) {
        console.error('预览文件失败:', error)
      }
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || '文件预览失败' }
  }
})

// 文件对话框处理程序
ipcMain.handle('dialog:openFile', async (_event, options) => {
  try {
    if (!mainWindow) {
      return {
        canceled: true,
        filePaths: [],
        error: '主窗口未初始化',
      }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || '选择文件',
      filters: options.filters || [{ name: '所有文件', extensions: ['*'] }],
      properties: ['openFile'],
    })

    return result
  } catch (error: any) {
    return {
      canceled: true,
      filePaths: [],
      error: error?.message || '打开文件对话框失败',
    }
  }
})

// 语音合成处理程序 - 已迁移到 Web Speech API
// 保留此处理程序以兼容旧版本，但建议使用前端 Web Speech API
ipcMain.handle('voice:speak', async (_event, payload) => {
  try {
    const { text, voiceType, language, voice, speed, pitch, volume, outputFile, playImmediately } =
      payload

    if (!text) {
      return { success: false, error: '朗读文本不能为空' }
    }

    // 建议使用前端 Web Speech API
    console.warn('建议使用前端 Web Speech API 进行语音播放，此方法已废弃')

    if (voiceType === 'system') {
      // 对于文件导出，仍使用 say.js
      if (outputFile) {
        const say = require('say')
        const path = require('path')

        const options = {
          voice: voice === 'default' ? undefined : voice,
          speed: speed || 1.0,
        }

        const outputPath = path.resolve(outputFile)
        await exportWithRetry(text, options, outputPath)

        return { success: true, message: '语音文件已保存' }
      } else {
        return { success: false, error: '请使用前端 Web Speech API 进行语音播放' }
      }
    } else {
      return { success: false, error: '在线语音合成暂未实现' }
    }
  } catch (error: any) {
    const friendlyError = getFriendlyErrorMessage(error)
    return { success: false, error: friendlyError }
  }
})

// 添加带重试机制的语音播放方法
async function speakWithRetry(text: string, options: any, maxRetries: number = 3): Promise<void> {
  const say = require('say')

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`语音播放尝试 ${attempt}/${maxRetries}`)

      // 针对中文语音的特殊处理
      const voiceOptions = getOptimalVoiceOptions(options, text)
      console.log(`使用语音选项:`, voiceOptions)

      // 如果是中文文本，尝试多种语音选项
      const isChinese = /[\u4e00-\u9fff]/.test(text)
      if (isChinese && attempt > 1) {
        const chineseVoices = [
          'Microsoft Huihui Desktop - Chinese (Simplified, PRC)',
          'Microsoft Yaoyao Desktop - Chinese (Simplified, PRC)',
          'Microsoft Kangkang Desktop - Chinese (Simplified, PRC)',
          'Microsoft Huihui - Chinese (Simplified, PRC)',
          'Microsoft Yaoyao - Chinese (Simplified, PRC)',
          'Microsoft Kangkang - Chinese (Simplified, PRC)',
          'Chinese (Simplified, PRC) - Huihui',
          'Chinese (Simplified, PRC) - Yaoyao',
          'Chinese (Simplified, PRC) - Kangkang',
          'zh-CN-HuihuiNeural',
          'zh-CN-YaoyaoNeural',
          'zh-CN-KangkangNeural',
        ]

        if (chineseVoices[attempt - 1]) {
          voiceOptions.voice = chineseVoices[attempt - 1]
          console.log(`尝试中文语音: ${voiceOptions.voice}`)
        }
      }

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('语音播放超时'))
        }, 30000) // 30秒超时

        say.speak(text, voiceOptions.voice, voiceOptions.speed, (err: any) => {
          clearTimeout(timeout)
          if (err) {
            console.error(`语音播放尝试 ${attempt} 失败:`, err)
            reject(err)
          } else {
            console.log(`语音播放尝试 ${attempt} 成功`)
            resolve(void 0)
          }
        })
      })

      // 如果成功，退出重试循环
      return
    } catch (error) {
      console.error(`语音播放尝试 ${attempt} 失败:`, error)

      if (attempt === maxRetries) {
        // 最后一次尝试失败，尝试使用系统默认语音
        const isChinese = /[\u4e00-\u9fff]/.test(text)
        if (isChinese) {
          console.log('尝试使用系统默认语音播放中文')
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('语音播放超时'))
              }, 30000)

              say.speak(text, undefined, options.speed || 1.0, (err: any) => {
                clearTimeout(timeout)
                if (err) {
                  reject(err)
                } else {
                  console.log('使用系统默认语音播放成功')
                  resolve(void 0)
                }
              })
            })
            return
          } catch (fallbackError) {
            console.error('系统默认语音也失败:', fallbackError)
          }
        }
        // 抛出原始错误
        throw error
      }

      // 等待一段时间后重试
      console.log(`等待 2 秒后重试...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// 获取最优的语音选项，特别针对中文
function getOptimalVoiceOptions(options: any, text: string): any {
  const isChinese = /[\u4e00-\u9fff]/.test(text)

  if (isChinese) {
    // 中文文本的特殊处理 - 与 automation-controller.ts 保持一致
    const chineseVoices = [
      'Microsoft Huihui Desktop - Chinese (Simplified, PRC)',
      'Microsoft Yaoyao Desktop - Chinese (Simplified, PRC)',
      'Microsoft Kangkang Desktop - Chinese (Simplified, PRC)',
      'Microsoft Huihui - Chinese (Simplified, PRC)',
      'Microsoft Yaoyao - Chinese (Simplified, PRC)',
      'Microsoft Kangkang - Chinese (Simplified, PRC)',
      'Chinese (Simplified, PRC) - Huihui',
      'Chinese (Simplified, PRC) - Yaoyao',
      'Chinese (Simplified, PRC) - Kangkang',
      'zh-CN-HuihuiNeural',
      'zh-CN-YaoyaoNeural',
      'zh-CN-KangkangNeural',
    ]

    return {
      voice: chineseVoices[0] || undefined, // 使用第一个可用的中文语音
      speed: options.speed || 1.0,
      // 移除不支持的参数
    }
  } else {
    // 非中文文本使用原始选项
    return {
      voice: options.voice,
      speed: options.speed || 1.0,
    }
  }
}

// 添加带重试机制的语音导出方法
async function exportWithRetry(
  text: string,
  options: any,
  outputPath: string,
  maxRetries: number = 3
): Promise<void> {
  const say = require('say')

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`语音导出尝试 ${attempt}/${maxRetries}`)

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('语音导出超时'))
        }, 60000) // 60秒超时

        say.export(text, options.voice, options.speed, outputPath, (err: any) => {
          clearTimeout(timeout)
          if (err) {
            console.error(`语音导出尝试 ${attempt} 失败:`, err)
            reject(err)
          } else {
            console.log(`语音导出尝试 ${attempt} 成功`)
            resolve(void 0)
          }
        })
      })

      // 如果成功，退出重试循环
      return
    } catch (error) {
      console.error(`语音导出尝试 ${attempt} 失败:`, error)

      if (attempt === maxRetries) {
        // 最后一次尝试失败，抛出错误
        throw error
      }

      // 等待一段时间后重试
      console.log(`等待 2 秒后重试...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// 获取友好的错误信息
function getFriendlyErrorMessage(error: any): string {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // 检查是否是已知的TTS错误
  if (errorMessage.includes('J9SC') || errorMessage.includes('SelectVoice')) {
    return 'Windows语音引擎初始化失败，请检查系统语音设置或尝试重启应用程序'
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
    return '语音播放超时，请检查系统语音服务是否正常运行'
  }

  if (errorMessage.includes('voice') || errorMessage.includes('语音')) {
    return '语音服务不可用，请检查系统语音设置'
  }

  if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
    return '没有语音播放权限，请检查应用程序权限设置'
  }

  // 返回原始错误信息，但截断过长的错误信息
  if (errorMessage.length > 200) {
    return errorMessage.substring(0, 200) + '...'
  }

  return errorMessage
}

// 停止语音播放处理程序
ipcMain.handle('voice:stop', async () => {
  try {
    const say = require('say')
    say.stop()
    return { success: true, message: '语音播放已停止' }
  } catch (error: any) {
    return { success: false, error: error?.message || '停止语音播放失败' }
  }
})

// 中文语音诊断处理程序
ipcMain.handle('voice:diagnose-chinese', async () => {
  try {
    const say = require('say')
    const os = require('os')

    // 获取系统信息
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      version: os.release(),
      language: process.env.LANG || process.env.LC_ALL || 'unknown',
    }

    // 测试中文语音
    const testText = '测试中文语音'
    let hasChineseVoice = false
    let testError = null

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('测试超时'))
        }, 5000)

        say.speak(testText, undefined, 1.0, (err: any) => {
          clearTimeout(timeout)
          if (err) {
            reject(err)
          } else {
            hasChineseVoice = true
            resolve(void 0)
          }
        })
      })
    } catch (error: any) {
      testError = error?.message || '未知错误'
      console.log('中文语音测试失败:', error)
    }

    // 生成建议
    const recommendations: string[] = []

    if (!hasChineseVoice) {
      recommendations.push('1. 检查Windows语音设置中是否有中文语音选项')
      recommendations.push('2. 安装Microsoft Speech Platform Runtime')
      recommendations.push('3. 下载并安装中文语音包')
      recommendations.push('4. 在控制面板中测试语音功能')
      recommendations.push('5. 重启应用程序和系统')
    }

    return {
      success: true,
      data: {
        hasChineseVoice,
        systemInfo,
        testError,
        recommendations,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || '语音诊断失败',
    }
  }
})

// 注册打开外部链接处理程序
ipcMain.handle('open-external', async (_, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('打开外部链接失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 注册邮件发送处理程序
ipcMain.handle('email:send', async (_, options) => {
  try {
    const emailService = EmailService.getInstance()
    // 确保 port 是数字
    const sendOptions = {
      ...options,
      port: Number(options.port),
    }
    const result = await emailService.sendEmail(sendOptions)
    return result
  } catch (error) {
    console.error('发送邮件失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 设置 UTF-8 编码
process.env.LANG = 'zh_CN.UTF-8'
process.env.LC_ALL = 'zh_CN.UTF-8'

// Windows 特定编码设置
if (process.platform === 'win32') {
  // 设置系统代码页为 UTF-8
  try {
    require('child_process').execSync('chcp 65001', { stdio: 'ignore' })
  } catch (error) {
    // 忽略错误，继续执行
  }

  // 设置控制台编码
  try {
    const { execSync } = require('child_process')
    execSync(
      'powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8"',
      { stdio: 'ignore' }
    )
  } catch (error) {
    // 忽略错误，继续执行
  }
}

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

// 处理自动化语音播放请求
ipcMain.on('automation:speak', async (event, data) => {
  try {
    const { text, options } = data

    if (!text) {
      event.reply('automation:speech-error', '朗读文本不能为空')
      return
    }

    // 使用 Web Speech API 播放语音
    const { speechManager } = require('../src/utils/speech')

    const result = await speechManager.speak(text, options)

    if (result.success) {
      event.reply('automation:speech-end')
    } else {
      event.reply('automation:speech-error', result.error)
    }
  } catch (error) {
    console.error('自动化语音播放失败:', error)
    event.reply('automation:speech-error', `语音播放失败: ${error}`)
  }
})

// 处理未捕获的异常
process.on('uncaughtException', error => {
  console.error('未捕获的异常:', error)
})
