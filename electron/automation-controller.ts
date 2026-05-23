import { BrowserWindow, WebContents, Notification, session } from 'electron'
import type { FlowNode, NodeProperties } from '../src/types/node-config'
import { ExportUtils } from '../src/utils/exportUtils'
import { EmailService } from './email-service'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

// Session 持久化分区名称（Cookie/localStorage 自动存到磁盘）
const PERSIST_PARTITION = 'persist:automation'

export class AutomationController {
  private browserWindow: BrowserWindow | null = null
  private currentTaskId: number | null = null

  constructor() {
    // 设置 UTF-8 编码
    process.env.LANG = 'zh_CN.UTF-8';
    process.env.LC_ALL = 'zh_CN.UTF-8';
  }
  private webContents: WebContents | null = null
  private variables: Record<string, any> = {}
  private isRunning: boolean = false
  private isPickingElement: boolean = false
  private pickerLock: boolean = false
  private pickerPromiseState: 'pending' | 'resolved' | 'rejected' | null = null
  private lastExtractedData: any = null

  // ==================== Session 管理 ====================

  /** 获取 Session 存储目录 */
  private getSessionsDir(): string {
    const dir = path.join(app.getPath('userData'), 'sessions')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  /** 获取自动化用的持久化 Session 对象 */
  getAutomationSession() {
    return session.fromPartition(PERSIST_PARTITION)
  }

  /** 保存当前 Session 的 Cookie 到指定名称的文件 */
  async saveSession(name: string): Promise<string> {
    const ses = this.getAutomationSession()
    const cookies = await ses.cookies.get({})
    const filePath = path.join(this.getSessionsDir(), `${name}.json`)
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2), 'utf-8')
    return filePath
  }

  /** 列出所有已保存的 Session */
  listSessions(): Array<{ name: string; size: number; updatedAt: string }> {
    const dir = this.getSessionsDir()
    const result: Array<{ name: string; size: number; updatedAt: string }> = []
    if (!fs.existsSync(dir)) return result
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      const fp = path.join(dir, file)
      const stat = fs.statSync(fp)
      result.push({ name: file.replace('.json', ''), size: stat.size, updatedAt: stat.mtime.toISOString() })
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  /** 删除指定 Session 文件 */
  deleteSession(name: string): void {
    const fp = path.join(this.getSessionsDir(), `${name}.json`)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }

  /** 从文件加载 Cookie 到当前 Session */
  async loadSession(name: string): Promise<number> {
    const fp = path.join(this.getSessionsDir(), `${name}.json`)
    if (!fs.existsSync(fp)) throw new Error(`Session "${name}" 不存在`)
    const cookies = JSON.parse(fs.readFileSync(fp, 'utf-8'))
    const ses = this.getAutomationSession()
    let count = 0
    for (const cookie of cookies) {
      try {
        const url = cookie.secure ? `https://${cookie.domain.replace(/^\./, '')}` : `http://${cookie.domain.replace(/^\./, '')}`
        await ses.cookies.set({ url, ...cookie })
        count++
      } catch {}
    }
    return count
  }

  // 获取当前页面内容
  getCurrentWebContents() {
    return this.webContents
  }

  // 获取当前浏览器窗口
  getCurrentBrowserWindow() {
    return this.browserWindow
  }

  // 获取当前浏览器实例（为了兼容性）
  getCurrentBrowser() {
    return this.browserWindow
  }

  // 获取当前页面（为了兼容性）
  getCurrentPage() {
    return this.webContents
  }

  // 设置当前页面内容
  async setCurrentWebContents(webContents: WebContents) {
    // 如果正在选择元素，不允许更改页面
    if (this.pickerLock) {
      throw new Error('正在选择元素，不能更改页面')
    }
    this.webContents = webContents
  }

  // 检查浏览器是否已打开
  isBrowserOpen() {
    return this.browserWindow !== null && this.webContents !== null && !this.browserWindow.isDestroyed()
  }

  // 检查是否正在选择元素
  isElementPickerActive(): boolean {
    return this.isPickingElement || this.pickerLock
  }

  async initBrowser(options: {
    url?: string
    width?: number
    height?: number
    headless?: boolean
    incognito?: boolean
    userAgent?: string
    forElementPicker?: boolean
  }) {
    // 如果正在选择元素，不允许初始化新的浏览器
    if (this.isPickingElement || this.pickerLock) {
      throw new Error('正在选择元素，请稍后再试')
    }

    // 如果已有浏览器实例且不是元素选择器调用，则关闭现有实例
    if (this.browserWindow && !options.forElementPicker) {
      try {
        this.browserWindow.close()
      } catch (e) {
        // 忽略关闭错误
      }
      this.browserWindow = null
      this.webContents = null
    }

    // 如果浏览器已存在且是元素选择器调用，直接返回
    if (this.browserWindow && !this.browserWindow.isDestroyed() && options.forElementPicker) {
      return
    }

    try {
      // 创建新的浏览器窗口
      this.browserWindow = new BrowserWindow({
        width: options.width || 1280,
        height: options.height || 800,
        show: !options.headless,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          allowRunningInsecureContent: true,
          session: session.fromPartition(PERSIST_PARTITION),  // ← Cookie 自动持久化
        }
      })

      this.webContents = this.browserWindow.webContents

      // 元素拾取场景下，自动打开被控浏览器 DevTools，方便查看真正的 renderer console 报错
      if (options.forElementPicker) {
        try {
          this.webContents.openDevTools({ mode: 'detach' })
        } catch (e) {
          // 忽略打开 devtools 的错误
        }
      }

      // 设置用户代理
      if (options.userAgent) {
        this.webContents.setUserAgent(options.userAgent)
      }

      // 添加窗口关闭的监听
      this.browserWindow.on('closed', () => {
        // 只有在非选择器模式下才重置状态
        if (!this.pickerLock) {
          this.browserWindow = null
          this.webContents = null
        }
      })

      // 拦截 window.open()，将新页面加载到同一个 BrowserWindow 中
      this.browserWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log('[Window] 拦截到 window.open, 重定向 URL:', url)
        // 异步导航到新URL
        setImmediate(() => {
          if (this.browserWindow && !this.browserWindow.isDestroyed()) {
            this.browserWindow.loadURL(url).catch(e => {
              console.error('[Window] 重定向加载失败:', e)
            })
          }
        })
        return { action: 'deny' }
      })

      // 如果提供了URL，则导航到该页面；否则至少加载一个有 document.body 的页面
      if (options.url) {
        await this.browserWindow.loadURL(options.url)
      } else {
        // 空的 data: URL 确保 document.body 存在，避免 executeJavaScript 注入失败
        await this.browserWindow.loadURL('data:text/html,<html><body></body></html>')
        await this.waitForWebContentsReady(this.browserWindow.webContents)
      }
    } catch (error) {
      console.error('初始化浏览器失败:', error)
      throw error
    }
  }

  private async waitForWebContentsReady(wc: WebContents, timeoutMs = 15000): Promise<void> {
    if (!wc || wc.isDestroyed()) throw new Error('页面已关闭')
    // 已经不在加载中则认为可用
    if (!wc.isLoading()) return

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup()
        resolve()
      }
      const onFail = (_event: any, code: number, desc: string) => {
        cleanup()
        reject(new Error(`页面加载失败(${code}): ${desc}`))
      }
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('等待页面加载超时'))
      }, timeoutMs)

      const cleanup = () => {
        clearTimeout(timer)
        wc.removeListener('dom-ready', onReady)
        wc.removeListener('did-finish-load', onReady)
        wc.removeListener('did-fail-load', onFail as any)
      }

      wc.once('dom-ready', onReady)
      wc.once('did-finish-load', onReady)
      wc.once('did-fail-load', onFail as any)
    })
  }

  async start(nodes: FlowNode[], taskId?: number) {
    if (this.isRunning) return
    this.isRunning = true
    this.currentTaskId = taskId || null

    try {
      // 始终关闭现有的浏览器实例，确保每次从干净状态开始
      if (this.browserWindow) {
        try {
          console.log('关闭现有浏览器窗口，准备重新启动...');
          this.browserWindow.close();
        } catch (error: unknown) {
          console.warn('关闭浏览器窗口时出错:', error);
          // 忽略关闭错误
        }
        this.browserWindow = null;
        this.webContents = null;
      }

      // 检查是否需要浏览器窗口（只有浏览器相关节点才需要）
      const needsBrowser = nodes.some(node => 
        ['browser', 'click', 'extract', 'keyboard', 'mouse', 'scroll', 'screenshot', 'input', 'captcha'].includes(node.type)
      )
      
      if (needsBrowser) {
        // 创建新的浏览器窗口
        console.log('创建新的浏览器窗口...');
        this.browserWindow = new BrowserWindow({
          width: 1280,
          height: 800,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            session: session.fromPartition(PERSIST_PARTITION),  // ← Cookie 自动持久化
          }
        });

        this.webContents = this.browserWindow.webContents;
        console.log('浏览器窗口创建成功');
        
        // 加载主窗口的页面，确保语音合成功能可用
        const mainWindow = require('electron').BrowserWindow.getAllWindows().find(w => w !== this.browserWindow)
        if (mainWindow) {
          const mainUrl = mainWindow.webContents.getURL()
          console.log('加载主窗口页面:', mainUrl)
          await this.browserWindow.loadURL(mainUrl)
        } else {
          // 如果没有主窗口，加载一个简单的页面
          await this.browserWindow.loadURL('data:text/html,<html><body><h1>自动化执行中...</h1></body></html>')
        }
        
        // 设置浏览器窗口关闭事件处理
        this.browserWindow.on('closed', () => {
          console.log('浏览器窗口已关闭');
          this.browserWindow = null;
          this.webContents = null;
          this.isRunning = false;
        });

        // 拦截 window.open()，将新页面加载到同一个 BrowserWindow 中
        this.browserWindow.webContents.setWindowOpenHandler(({ url }) => {
          console.log('[Window] 拦截到 window.open, 重定向 URL:', url)
          setImmediate(() => {
            if (this.browserWindow && !this.browserWindow.isDestroyed()) {
              this.browserWindow.loadURL(url).catch(e => {
                console.error('[Window] 重定向加载失败:', e)
              })
            }
          })
          return { action: 'deny' }
        })
      } else {
        console.log('当前流程不需要浏览器窗口，直接执行节点');
      }

      // 执行所有节点（按类型过滤，排除控制节点）
      console.log('开始执行流程节点...');
      const executableNodes = nodes.filter(node => 
        node.type !== 'start' && node.type !== 'end'
      )
      
      console.log(`找到 ${executableNodes.length} 个可执行节点:`, executableNodes.map(n => `${n.type}(${n.id})`))
      
      for (const node of executableNodes) {
        if (!this.isRunning) break
        console.log(`执行节点: ${node.type} (${node.id})`)
        await this.executeNode(node, nodes)
      }

      // 执行完成后设置状态
      this.isRunning = false
      console.log('流程执行完成');
    } catch (error) {
      console.error('执行流程出错:', error)
      // 出错时关闭浏览器
      await this.stop()
      throw error
    }
  }

  async stop() {
    this.isRunning = false
    if (this.browserWindow && !this.browserWindow.isDestroyed()) {
      this.browserWindow.close()
      this.browserWindow = null
      this.webContents = null
    }
  }

  async executeVideoDownloadNode(node: FlowNode) {
    const properties = node.properties
    // 动态引入，避免在不需要时加载
    const { VideoTools } = await import('./utils/video-tools')
    
    const { url, savePath, quality, downloadDanmaku, downloadSubtitle, downloadThumbnail, cookie } = properties as any
    
    if (!url) {
      throw new Error('下载链接不能为空')
    }
    
    if (!savePath) {
      throw new Error('保存路径不能为空')
    }
    
    console.log(`开始下载视频: ${url}, 质量: ${quality || 'best'}`)
    
    try {
      // 检查目录是否存在，不存在则创建
      const fs = require('fs')
      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath, { recursive: true })
      }
      
      const onProgress = (progress: number, status: string) => {
        // 发送 IPC 消息给主窗口
        const windows = BrowserWindow.getAllWindows()
        // 优先寻找 localhost 或 file 协议的窗口，排除自动化专用的浏览器窗口
        const mainWindow = windows.find(w => 
          (w.webContents.getURL().includes('localhost') || w.webContents.getURL().includes('file://')) && 
          w !== this.browserWindow
        )
        
        if (mainWindow) {
          mainWindow.webContents.send('node:progress', {
            taskId: this.currentTaskId,
            nodeId: node.id,
            progress,
            status
          })
        }
      }

      const result = await VideoTools.getInstance().downloadVideo(url, {
        savePath,
        quality,
        downloadDanmaku: !!downloadDanmaku,
        downloadSubtitle: !!downloadSubtitle,
        downloadThumbnail: !!downloadThumbnail,
        cookie,
        onProgress
      })
      
      if (!result.success) {
        throw new Error(result.message)
      }
      
      // 完成时发送 100% 进度
      onProgress(100, '下载完成')
      console.log('视频下载完成')
      
      // 显示系统通知
      if (Notification.isSupported()) {
        new Notification({
          title: '下载完成',
          body: `视频下载任务已完成`
        }).show()
      }
      
    } catch (error: any) {
      // 显示失败通知
      if (Notification.isSupported()) {
        new Notification({
          title: '下载失败',
          body: `视频下载失败: ${error.message}`
        }).show()
      }
      throw new Error(`视频下载失败: ${error.message}`)
    }
  }

  async executeVideoConvertNode(node: FlowNode) {
    const properties = node.properties as any
    const { VideoTools } = await import('./utils/video-tools')

    const inputPath = properties.inputPath as string
    const outputFormat = (properties.outputFormat || 'mp4') as any
    const outputDir = properties.outputDir as string | undefined
    const outputPath = properties.outputPath as string | undefined
    const overwrite = properties.overwrite !== false

    if (!inputPath) {
      throw new Error('输入文件不能为空')
    }

    const onProgress = (progress: number, status: string) => {
      const windows = BrowserWindow.getAllWindows()
      const mainWindow = windows.find(w =>
        (w.webContents.getURL().includes('localhost') || w.webContents.getURL().includes('file://')) &&
        w !== this.browserWindow
      )

      if (mainWindow) {
        mainWindow.webContents.send('node:progress', {
          taskId: this.currentTaskId,
          nodeId: node.id,
          progress,
          status
        })
      }
    }

    try {
      const result = await VideoTools.getInstance().convertVideo(inputPath, {
        outputFormat,
        outputDir,
        outputPath,
        overwrite,
        onProgress
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      onProgress(100, '转换完成')

      if (Notification.isSupported()) {
        new Notification({
          title: '转换完成',
          body: `视频格式转换已完成`
        }).show()
      }
    } catch (error: any) {
      if (Notification.isSupported()) {
        new Notification({
          title: '转换失败',
          body: `视频格式转换失败: ${error.message}`
        }).show()
      }
      throw new Error(`视频格式转换失败: ${error.message}`)
    }
  }

  private async executeNode(node: FlowNode, nodes: FlowNode[] = []) {
    const { type, properties } = node
    
    // 只有需要浏览器的节点才检查 webContents
    const needsBrowser = ['browser', 'click', 'extract', 'keyboard', 'mouse', 'scroll', 'screenshot', 'input', 'captcha'].includes(type)
    if (needsBrowser && !this.webContents) {
      throw new Error('浏览器未启动')
    }
    
    switch (type) {
      case 'start':
      case 'end':
        // 控制节点，不需要执行具体操作
        break
      case 'browser':
        await this.executeBrowserNode(properties)
        break
      case 'video-download':
        await this.executeVideoDownloadNode(node)
        break
      case 'video-convert':
        await this.executeVideoConvertNode(node)
        break
      case 'click':
        await this.executeClickNode(properties)
        break
      case 'extract':
        await this.executeExtractNode(properties)
        break
      case 'keyboard':
        await this.executeKeyboardNode(properties)
        break
      case 'captcha':
        await this.executeCaptchaNode(properties)
        break
      case 'mouse':
        await this.executeMouseNode(properties)
        break
      case 'wait':
        await this.executeWaitNode(properties)
        break
      case 'screenshot':
        await this.executeScreenshotNode(properties)
        break
      case 'switch':
        await this.executeSwitchNode(properties, node, nodes)
        break
      case 'loop':
        await this.executeLoopNode(properties, node, nodes)
        break
      case 'input':
        await this.executeInputNode(properties)
        break
      case 'scroll':
        await this.executeScrollNode(properties)
        break
      case 'export':
        await this.executeExportNode(properties)
        break
      case 'power':
        await this.executePowerNode(properties)
        break
      case 'fileReader':
        await this.executeFileReaderNode(properties)
        break
      case 'voice':
        await this.executeVoiceNode(properties)
        break
      case 'email':
        await this.executeEmailNode(properties)
        break
      default:
        throw new Error(`未知的节点类型: ${type}`)
    }
  }

  private async executeEmailNode(properties: NodeProperties) {
    const { host, port, secure, user, pass, from, to, subject, text, html } = properties as any
    
    // 简单的校验
    if (!host || !user || !pass || !to) {
      throw new Error('邮件配置不完整：请检查服务器、用户、密码和收件人设置')
    }

    try {
      console.log(`正在发送邮件给: ${to}`)
      const emailService = EmailService.getInstance()
      const result = await emailService.sendEmail({
        host,
        port: Number(port),
        secure: !!secure,
        user,
        pass,
        from: from || user,
        to,
        subject: subject || 'Auto RPA Notification',
        text,
        html
      })

      if (!result.success) {
        throw new Error(result.error)
      }
      console.log('邮件发送成功:', result.messageId)
    } catch (error) {
      console.error('发送邮件失败:', error)
      throw new Error(`发送邮件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async executePowerNode(properties: NodeProperties) {
    const { actionType = 'lock', force = true } = properties as any
    try {
      if (process.platform !== 'win32') {
        throw new Error(`当前平台不支持电源节点: ${process.platform}`)
      }

      const { spawn } = require('child_process')
      const fs = require('fs')
      const path = require('path')
      const os = require('os')
      const logFile = path.join(os.tmpdir(), 'autorap-power.log')

      const run = (command: string, args: string[], options: { detached?: boolean } = {}) => {
        return new Promise<{ code: number | null; error?: any }>((resolve) => {
          const child = spawn(command, args, {
            shell: true,
            stdio: ['ignore', 'ignore', 'pipe'],
            detached: !!options.detached
          })
          let errBuf = ''
          child.stderr?.on('data', (d: any) => { errBuf += d?.toString?.() || '' })
          child.on('error', (err: any) => {
            try { fs.appendFileSync(logFile, `spawn error ${command} ${args.join(' ')}\n${String(err)}\n`) } catch {}
            resolve({ code: -1, error: err })
          })
          child.on('close', (code: number) => {
            try { if (errBuf) fs.appendFileSync(logFile, `stderr ${command} ${args.join(' ')}\n${errBuf}\n`) } catch {}
            resolve({ code })
          })
          if (options.detached) {
            try { child.unref() } catch {}
          }
        })
      }
      let command = ''
      let args: string[] = []

      switch (actionType) {
        case 'shutdown':
          command = 'shutdown'
          args = ['/s']
          if (force !== false) args.push('/f')
          args.push('/t', '0')
          break
        case 'restart':
          command = 'shutdown'
          args = ['/r']
          if (force !== false) args.push('/f')
          args.push('/t', '0')
          break
        case 'sleep':
          // 优先使用休眠（更稳定）：shutdown /h；失败再尝试 SetSuspendState 0,0,0
          // 先尝试休眠
          command = 'shutdown'
          args = ['/h']
          break
        case 'lock':
        default:
          command = 'rundll32.exe'
          args = ['user32.dll,LockWorkStation']
          break
      }

      // 主执行与降级链，优先尝试更可靠方式，并记录日志帮助定位
      if (actionType === 'lock') {
        const r1 = await run(command, args)
        if (r1.code === 0) return
        const r2 = await run('tsdiscon', [])
        if (r2.code === 0) return
        throw new Error('锁屏命令未生效（LockWorkStation/tsdiscon 均失败），请以管理员运行或检查组策略。')
      } else if (actionType === 'sleep') {
        const r1 = await run(command, args)
        if (r1.code === 0) return
        const r2 = await run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,0,0'])
        if (r2.code === 0) return
        throw new Error('睡眠/休眠未生效（/h 与 SetSuspendState 均失败），请开启休眠并关闭混合睡眠。')
      } else {
        // shutdown/restart 直接执行（强制）
        const r1 = await run(command, args, { detached: true })
        if (r1.code !== 0) {
          throw new Error('关机/重启命令启动失败，可能被安全策略拦截。')
        }
      }
    } catch (error) {
      console.error('执行电源操作失败:', error)
      throw new Error(`执行电源操作失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async executeFileReaderNode(properties: NodeProperties) {
    const { 
      filePath, 
      fileType = 'auto', 
      fileEncoding = 'auto', 
      outputVariable = 'fileContent',
      includeMetadata = false,
      extractImages = false,
      extractTables = false
    } = properties as any

    if (!filePath) {
      throw new Error('文件路径不能为空')
    }

    try {
      const fs = require('fs')
      const path = require('path')
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`)
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
              version: pdfData.version
            }
          }
          break

        case 'txt':
          if (fileEncoding === 'auto') {
            // 改进的自动检测编码逻辑
            const encodings = ['utf8', 'gbk', 'gb2312', 'utf16le', 'utf16be']
            let success = false
            let bestContent = ''
            let bestEncoding = ''
            
            for (const enc of encodings) {
              try {
                const testContent = fs.readFileSync(filePath, enc)
                // 改进的乱码检测：检查是否包含大量乱码字符
                const garbledChars = (testContent.match(/[^\x00-\x7F\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length
                const totalChars = testContent.length
                const garbledRatio = totalChars > 0 ? garbledChars / totalChars : 0
                
                // 如果乱码比例小于10%，认为是有效内容
                if (garbledRatio < 0.1 && testContent.length > 0) {
                  if (!success || testContent.length > bestContent.length) {
                    bestContent = testContent
                    bestEncoding = enc
                    success = true
                  }
                }
              } catch (e) {
                continue
              }
            }
            
            if (success) {
              content = bestContent
              console.log(`使用编码 ${bestEncoding} 读取成功`)
            } else {
              // 如果所有编码都失败，使用utf8并记录警告
              try {
                content = fs.readFileSync(filePath, 'utf8')
                console.log('使用UTF-8编码读取，可能存在乱码')
              } catch (e) {
                throw new Error('无法读取文件，尝试了多种编码格式')
              }
            }
          } else {
            // 使用指定编码
            try {
              content = fs.readFileSync(filePath, fileEncoding)
              console.log(`使用指定编码 ${fileEncoding} 读取成功`)
            } catch (encodingError) {
              // 如果指定编码失败，尝试其他编码
              const encodings = ['utf8', 'gbk', 'gb2312']
              for (const enc of encodings) {
                try {
                  content = fs.readFileSync(filePath, enc)
                  console.log(`指定编码 ${fileEncoding} 失败，使用 ${enc} 成功`)
                  break
                } catch (e) {
                  continue
                }
              }
              if (!content) {
                throw new Error(`无法读取文件，指定编码 ${fileEncoding} 失败，尝试了多种编码格式`)
              }
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
              messages: docxResult.messages
            }
          }
          break

        case 'doc':
          // 对于老版本的DOC文件，我们只能提供基本支持
          throw new Error('DOC格式暂不支持，请使用DOCX格式')

        default:
          throw new Error(`不支持的文件格式: ${actualFileType}`)
      }

      // 存储到变量中
      this.variables[outputVariable] = {
        content,
        metadata: includeMetadata ? metadata : undefined,
        filePath,
        fileType: actualFileType,
        size: fs.statSync(filePath).size,
        lastModified: fs.statSync(filePath).mtime
      }

      console.log(`文件读取成功: ${filePath}, 内容长度: ${content.length}`)
      console.log(`变量存储: ${outputVariable} =`, {
        content: content.substring(0, 100) + '...',
        filePath,
        fileType: actualFileType,
        size: fs.statSync(filePath).size
      })
      
    } catch (error) {
      console.error('执行文件读取失败:', error)
      throw new Error(`执行文件读取失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async executeVoiceNode(properties: NodeProperties) {
    const { 
      voiceText, 
      voiceType = 'system',
      language = 'zh-CN',
      voice = 'default',
      speed = 1.0,
      pitch = 1.0,
      volume = 0.8,
      outputFile = '',
      playImmediately = true
    } = properties as any

    if (!voiceText) {
      throw new Error('朗读文本不能为空')
    }

    try {
      // 处理变量替换
      let processedText = voiceText
      
      console.log(`Voice synthesis original text: ${voiceText}`)
      console.log(`Available variables:`, Object.keys(this.variables))
      
      if (typeof processedText === 'string') {
        // 先处理HTML实体编码的花括号
        processedText = processedText.replace(/&#123;&#123;(\w+)&#125;&#125;/g, '{{$1}}')
        
        // 然后进行变量替换，将 {{变量名}} 替换为实际值
        processedText = processedText.replace(/\{\{(\w+)\}\}/g, (match: string, varName: string) => {
          const variable = this.variables[varName]
          console.log(`Replacing variable ${varName}:`, variable)
          
          if (variable) {
            // 如果变量是对象且有content属性，返回content
            if (typeof variable === 'object' && variable.content) {
              console.log(`Using variable ${varName} content:`, variable.content.substring(0, 100) + '...')
              return variable.content
            }
            // 如果变量是字符串，直接返回
            if (typeof variable === 'string') {
              console.log(`Using variable ${varName} string value:`, variable.substring(0, 100) + '...')
              return variable
            }
            // 其他情况，尝试转换为字符串
            console.log(`Converting variable ${varName} to string:`, String(variable))
            return String(variable)
          }
          console.log(`Variable ${varName} not found, keeping original`)
          return match
        })
      }
      
      console.log(`Voice synthesis processed text: ${processedText.substring(0, 200)}...`)

      if (voiceType === 'system') {
        // 使用 Web Speech API（通过渲染进程）
        if (playImmediately) {
          console.log('开始播放语音...')
          // 通过 IPC 调用渲染进程的 Web Speech API
          await this.speakWithWebSpeechAPI(processedText, {
            language,
            voice,
            speed,
            pitch,
            volume
          })
          console.log('语音播放完成')
        }

        if (outputFile) {
          // 音频文件导出功能暂时保留使用 say.js
          // 因为 Web Speech API 不直接支持导出音频文件
          await this.exportWithRetry(processedText, {
            voice: voice === 'default' ? undefined : voice,
            speed,
            pitch,
            volume
          }, outputFile)
          console.log(`语音文件已保存到: ${outputFile}`)
        }
      } else {
        // 在线TTS（这里可以集成其他TTS服务）
        throw new Error('在线语音合成暂未实现，请使用系统语音')
      }

      console.log(`语音合成完成: ${processedText.substring(0, 50)}...`)
      
    } catch (error) {
      console.error('执行语音合成失败:', error)
      // 提供更友好的错误信息
      const errorMessage = this.getFriendlyErrorMessage(error)
      throw new Error(`执行语音合成失败: ${errorMessage}`)
    }
  }

  // 使用 Web Speech API 播放语音
  private async speakWithWebSpeechAPI(text: string, options: {
    language: string
    voice: string
    speed: number
    pitch: number
    volume: number
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      // 优先使用自动化窗口，如果没有则使用主窗口
      const targetWindow = this.browserWindow || require('electron').BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('localhost') || w.webContents.getURL().includes('file://'))
      
      if (!targetWindow) {
        reject(new Error('没有可用的窗口进行语音合成'))
        return
      }

      console.log('使用窗口进行语音合成:', targetWindow === this.browserWindow ? '自动化窗口' : '主窗口')

      // 通过 IPC 调用渲染进程的 Web Speech API
      targetWindow.webContents.send('automation:speak', {
        text,
        options: {
          lang: options.language,
          voice: options.voice === 'default' ? undefined : options.voice,
          rate: options.speed,
          pitch: options.pitch,
          volume: options.volume
        }
      })

      // 监听播放完成事件
      const handleSpeechEnd = () => {
        (targetWindow.webContents as any).removeListener('automation:speech-end', handleSpeechEnd)
        (targetWindow.webContents as any).removeListener('automation:speech-error', handleSpeechError)
        resolve()
      }

      const handleSpeechError = (event: any, error: string) => {
        (targetWindow.webContents as any).removeListener('automation:speech-end', handleSpeechEnd)
        (targetWindow.webContents as any).removeListener('automation:speech-error', handleSpeechError)
        reject(new Error(error))
      }

      (targetWindow.webContents as any).on('automation:speech-end', handleSpeechEnd)
      (targetWindow.webContents as any).on('automation:speech-error', handleSpeechError)

      // 设置超时
      setTimeout(() => {
        (targetWindow.webContents as any).removeListener('automation:speech-end', handleSpeechEnd)
        (targetWindow.webContents as any).removeListener('automation:speech-error', handleSpeechError)
        reject(new Error('语音播放超时'))
      }, 30000)
    })
  }

  // 添加带重试机制的语音播放方法（保留用于文件导出）
  private async speakWithRetry(text: string, options: any, maxRetries: number = 3): Promise<void> {
    const say = require('say')
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Voice playback attempt ${attempt}/${maxRetries}`)
        
        // 针对中文语音的特殊处理
        const voiceOptions = this.getOptimalVoiceOptions(options, text)
        console.log(`Using voice options:`, voiceOptions)
        
        // 如果是中文文本，尝试多种语音选项
        const isChinese = /[\u4e00-\u9fff]/.test(text)
        if (isChinese && attempt > 1) {
          const chineseVoices = this.getChineseVoiceOptions()
          if (chineseVoices[attempt - 1]) {
            voiceOptions.voice = chineseVoices[attempt - 1]
            console.log(`Trying Chinese voice: ${voiceOptions.voice}`)
          }
        }
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Voice playback timeout'))
          }, 30000) // 30秒超时
          
          say.speak(text, voiceOptions.voice, voiceOptions.speed, (err: any) => {
            clearTimeout(timeout)
            if (err) {
              console.error(`Voice playback attempt ${attempt} failed:`, err)
              reject(err)
            } else {
              console.log(`Voice playback attempt ${attempt} successful`)
              resolve(void 0)
            }
          })
        })
        
        // 如果成功，退出重试循环
        return
        
      } catch (error) {
        console.error(`Voice playback attempt ${attempt} failed:`, error)
        
        if (attempt === maxRetries) {
          // 最后一次尝试失败，尝试使用系统默认语音
          const isChinese = /[\u4e00-\u9fff]/.test(text)
          if (isChinese) {
            console.log('Trying system default voice for Chinese text')
            try {
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error('Voice playback timeout'))
                }, 30000)
                
                say.speak(text, undefined, options.speed || 1.0, (err: any) => {
                  clearTimeout(timeout)
                  if (err) {
                    reject(err)
                  } else {
                    console.log('System default voice playback successful')
                    resolve(void 0)
                  }
                })
              })
              return
            } catch (fallbackError) {
              console.error('System default voice also failed:', fallbackError)
            }
          }
          // 抛出原始错误
          throw error
        }
        
        // 等待一段时间后重试
        console.log(`Waiting 2 seconds before retry...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }

  // 获取最优的语音选项，特别针对中文
  private getOptimalVoiceOptions(options: any, text: string): any {
    const isChinese = /[\u4e00-\u9fff]/.test(text)
    
    if (isChinese) {
      // 中文文本的特殊处理 - 优先使用系统默认语音
      console.log(`Detected Chinese text, using system default voice`)
      
      return {
        voice: undefined, // 使用系统默认语音，避免语音选择器问题
        speed: options.speed || 1.0
      }
    } else {
      // 非中文文本使用原始选项
      return {
        voice: options.voice,
        speed: options.speed || 1.0
      }
    }
  }

  // 获取中文语音选项
  private getChineseVoiceOptions(): string[] {
    // Windows 常见的中文语音选项，按优先级排序
    const chineseVoices = [
      // 尝试常见的中文语音
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
      'zh-CN-KangkangNeural'
    ]
    
    return chineseVoices
  }

  // 添加带重试机制的语音导出方法
  private async exportWithRetry(text: string, options: any, outputPath: string, maxRetries: number = 3): Promise<void> {
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
  private getFriendlyErrorMessage(error: any): string {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // 检查是否是已知的TTS错误
    if (errorMessage.includes('J9SC') || errorMessage.includes('SelectVoice')) {
      return 'Windows中文语音引擎初始化失败，请检查系统是否安装了中文语音包'
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return '语音播放超时，请检查系统语音服务是否正常运行'
    }
    
    if (errorMessage.includes('voice') || errorMessage.includes('语音')) {
      return '中文语音服务不可用，请检查Windows语音设置中的中文语音选项'
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

  // 诊断中文语音引擎
  async diagnoseChineseVoice(): Promise<{
    hasChineseVoice: boolean
    availableVoices: string[]
    systemInfo: any
    recommendations: string[]
  }> {
    const say = require('say')
    const os = require('os')
    
    try {
      // 获取系统信息
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        version: os.release(),
        language: process.env.LANG || process.env.LC_ALL || 'unknown'
      }
      
      // 尝试获取可用语音（这个功能在say模块中可能有限）
      const availableVoices: string[] = []
      
      // 测试中文语音
      const testText = '测试中文语音'
      let hasChineseVoice = false
      
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
      } catch (testError) {
        console.log('中文语音测试失败:', testError)
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
        hasChineseVoice,
        availableVoices,
        systemInfo,
        recommendations
      }
    } catch (error: any) {
      console.error('语音诊断失败:', error)
      return {
        hasChineseVoice: false,
        availableVoices: [],
        systemInfo: { error: error?.message || '未知错误' },
        recommendations: ['请检查系统语音设置', '尝试重启应用程序']
      }
    }
  }

  private async executeClickNode(properties: NodeProperties) {
    if (!this.webContents) throw new Error('浏览器未启动')

    const { 
      selector: clickSelector,
      selectorType,
      waitAfterClick,
      clickTimeout
    } = properties

    let targetSelector = clickSelector
    
    if (!targetSelector) {
      // 如果没有选择器，需要先选择元素
      try {
        const result = await this.startElementPicker()
        targetSelector = result.selector
        // 更新节点属性
        properties.selector = result.selector
        properties.selectorType = result.selectorType as "css" | "xpath" | "id" | "class" | "name"
      } catch (error: any) {
        throw new Error(`选择点击元素失败: ${error.message}`)
      }
    }

    try {
      // 根据选择器类型构建实际的选择器
      let actualSelector = targetSelector
      const currentSelectorType = selectorType || 'css'

      // 根据选择器类型构建CSS选择器
      switch (currentSelectorType) {
        case 'id':
          actualSelector = `#${targetSelector}` // 始终添加#前缀
          break
        case 'class':
          actualSelector = `.${targetSelector}` // 始终添加.前缀
          break
        case 'name':
          actualSelector = `[name="${targetSelector}"]` // 始终使用属性选择器格式
          break
        case 'xpath':
          // XPath 选择器保持不变
          break
        case 'css':
          // CSS 选择器保持不变
          break
      }

      // 使用 JSON.stringify 安全转义，避免选择器中的引号破坏 JS 字符串
      const safeSelector = JSON.stringify(actualSelector)
      const safeIframe = properties.iframeSelector ? JSON.stringify(properties.iframeSelector) : 'null'

      // 使用 JavaScript 执行点击操作
      const clickResult = await this.webContents.executeJavaScript(`
        (function() {
          const selector = ${safeSelector};
          const iframeSelector = ${safeIframe};
          
          let doc = document;
          
          // 如果指定了 iframe 选择器，先进入 iframe
          if (iframeSelector) {
            const iframe = document.querySelector(iframeSelector);
            if (!iframe) { throw new Error('未找到 iframe: ' + iframeSelector); }
            doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc) { throw new Error('无法访问 iframe 内部文档（可能是跨域）'); }
          }
          
          let element;
          
          // XPath查询在根文档进行
          if (selector.startsWith('//')) {
            const result = document.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            element = result.singleNodeValue;
          } else {
            element = doc.querySelector(selector);
          }
          
          if (!element) {
            throw new Error('未找到可点击的元素: ' + selector);
          }
          
          // 滚动到元素位置
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // 等待一下确保滚动完成
          return new Promise((resolve) => {
            setTimeout(() => {
              // 执行点击
              element.click();
              resolve(true);
            }, 500);
          });
        })()
      `);
      
      if (!clickResult) {
        throw new Error('点击操作失败');
      }
      
      // 如果需要等待加载
      if (waitAfterClick && clickTimeout) {
        const webContents = this.webContents
        await new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            console.warn('等待页面加载超时，继续执行');
            resolve(void 0);
          }, clickTimeout * 1000);
          
          // 监听页面加载完成或URL变化
          const currentUrl = webContents.getURL()
          const checkComplete = () => {
            if (webContents) {
              const newUrl = webContents.getURL()
              if (newUrl !== currentUrl) {
                clearTimeout(timeoutId);
                resolve(void 0);
              }
            }
          };
          
          if (webContents) {
            webContents.once('did-finish-load', () => {
              clearTimeout(timeoutId);
              resolve(void 0);
            });
            
            webContents.once('did-navigate', checkComplete);
            webContents.once('did-navigate-in-page', checkComplete);
          }
        });
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      throw new Error(`点击元素失败: ${errorMessage}`)
    }
  }

  private async executeBrowserNode(properties: NodeProperties) {
    if (!this.webContents || !this.browserWindow) return

    const { 
      actionType, 
      url, 
      waitForLoad, 
      timeout,
      width, 
      height, 
      headless, 
      incognito, 
      userAgent
    } = properties
    
    try {
      console.log(`执行浏览器操作: ${actionType}, 目标: ${url || '当前页面'}`);
      
      // 设置浏览器窗口大小
      if (width && height) {
        console.log(`设置窗口大小: ${width}x${height}`);
        this.browserWindow.setSize(width, height);
      }
  
      // 设置用户代理
      if (userAgent) {
        console.log(`设置用户代理: ${userAgent}`);
        this.webContents.setUserAgent(userAgent);
      }
  
      switch (actionType) {
        case 'goto':
          if (url) {
            console.log(`导航到URL: ${url}`);
            
            // 使用 Electron webContents 导航
            try {
              await this.webContents.loadURL(url);
              console.log(`成功导航到: ${this.webContents.getURL()}`);
              
              // 等待页面加载完成
              if (waitForLoad) {
                await new Promise((resolve) => {
                  const timeoutId = setTimeout(() => {
                    console.warn('等待页面加载超时，继续执行');
                    resolve(void 0);
                  }, timeout ? timeout * 1000 : 30000);
                  
                  if (this.webContents) {
                    this.webContents.once('did-finish-load', () => {
                      clearTimeout(timeoutId);
                      console.log('页面加载完成');
                      resolve(void 0);
                    });
                  }
                });
              }
            } catch (error) {
              console.error('导航失败:', error);
              throw error;
            }
          }
          break;
        case 'back':
          console.log('返回上一页');
          this.webContents.goBack();
          if (waitForLoad) {
            await new Promise((resolve) => {
              const timeoutId = setTimeout(() => {
                console.warn('等待页面加载超时，继续执行');
                resolve(void 0);
              }, timeout ? timeout * 1000 : 30000);
              
              if (this.webContents) {
                this.webContents.once('did-finish-load', () => {
                  clearTimeout(timeoutId);
                  resolve(void 0);
                });
              }
            });
          }
          break;
        case 'forward':
          console.log('前往下一页');
          this.webContents.goForward();
          if (waitForLoad) {
            await new Promise((resolve) => {
              const timeoutId = setTimeout(() => {
                console.warn('等待页面加载超时，继续执行');
                resolve(void 0);
              }, timeout ? timeout * 1000 : 30000);
              
              if (this.webContents) {
                this.webContents.once('did-finish-load', () => {
                  clearTimeout(timeoutId);
                  resolve(void 0);
                });
              }
            });
          }
          break;
        case 'reload':
          console.log('刷新页面');
          this.webContents.reload();
          if (waitForLoad) {
            await new Promise((resolve) => {
              const timeoutId = setTimeout(() => {
                console.warn('等待页面加载超时，继续执行');
                resolve(void 0);
              }, timeout ? timeout * 1000 : 30000);
              
              if (this.webContents) {
                this.webContents.once('did-finish-load', () => {
                  clearTimeout(timeoutId);
                  resolve(void 0);
                });
              }
            });
          }
          break;
        case 'close':
          console.log('关闭页面');
          this.browserWindow.close();
          this.browserWindow = null;
          this.webContents = null;
          break;
        case 'maximize':
          console.log('最大化窗口');
          this.browserWindow.maximize();
          break;
        case 'minimize':
          console.log('最小化窗口');
          this.browserWindow.minimize();
          break;
      }
      
      console.log('浏览器操作完成');
    } catch (error) {
      console.error('执行浏览器操作失败:', error);
      throw new Error(`浏览器操作失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private filterData(value: any, properties: NodeProperties): any {
    const {
      enableFilter,
      filterType,
      filterValue,
      filterCaseInsensitive,
      filterNumeric
    } = properties

    if (!enableFilter || !filterType || !filterValue) {
      return value
    }

    const filterFunction = (item: any): boolean => {
      let itemValue = item
      if (typeof item === 'object') {
        itemValue = JSON.stringify(item)
      }

      switch (filterType) {
        case 'regex': {
          const flags = filterCaseInsensitive ? 'i' : ''
          try {
            const regex = new RegExp(filterValue, flags)
            return regex.test(String(itemValue))
          } catch (e) {
            console.error('正则表达式错误:', e)
            return false
          }
        }

        case 'contains':
          return filterCaseInsensitive
            ? String(itemValue).toLowerCase().includes(filterValue.toLowerCase())
            : String(itemValue).includes(filterValue)

        case 'notContains':
          return filterCaseInsensitive
            ? !String(itemValue).toLowerCase().includes(filterValue.toLowerCase())
            : !String(itemValue).includes(filterValue)

        case 'equals':
          return filterCaseInsensitive
            ? String(itemValue).toLowerCase() === filterValue.toLowerCase()
            : String(itemValue) === filterValue

        case 'notEquals':
          return filterCaseInsensitive
            ? String(itemValue).toLowerCase() !== filterValue.toLowerCase()
            : String(itemValue) !== filterValue

        case 'greaterThan':
          if (filterNumeric) {
            const numValue = Number(itemValue)
            const numFilter = Number(filterValue)
            return !isNaN(numValue) && !isNaN(numFilter) && numValue > numFilter
          }
          return String(itemValue) > filterValue

        case 'lessThan':
          if (filterNumeric) {
            const numValue = Number(itemValue)
            const numFilter = Number(filterValue)
            return !isNaN(numValue) && !isNaN(numFilter) && numValue < numFilter
          }
          return String(itemValue) < filterValue

        default:
          return true
      }
    }

    if (Array.isArray(value)) {
      // 如果是数组，过滤每个元素
      if (Array.isArray(value[0])) {
        // 如果是二维数组（表格数据），过滤每一行
        const headers = value[0] // 保存表头
        const filteredRows = value.slice(1).filter(row => filterFunction(row))
        return [headers, ...filteredRows]
      }
      return value.filter(filterFunction)
    } else {
      // 如果是单个值，直接过滤
      return filterFunction(value) ? value : null
    }
  }

  private async executeExtractNode(properties: NodeProperties) {
    if (!this.webContents) throw new Error('浏览器未启动')

    const { 
      selector, 
      selectorType,
      extractType, 
      attributeName,
      headerSelector,
      rowSelector,
      cellSelector,
      hasHeader,
      extractInnerHTML,
      trimContent,
      variableName,
      waitForVisible,
      timeout = 30 // 默认30秒
    } = properties

    // 记录提取信息
    console.log(`开始执行提取节点: 选择器=${selector}, 选择器类型=${selectorType}, 提取类型=${extractType}, 变量名=${variableName || '未设置'}`)

    // 检查选择器是否存在
    if (!selector) {
      console.log('提取失败: 选择器未设置')
      throw new Error('提取选择器未设置')
    }

    try {
      let value: any = null

      // 根据选择器类型构建实际的选择器
      let actualSelector = selector
      const currentSelectorType = selectorType || 'css'

      // 根据选择器类型构建CSS选择器
      switch (currentSelectorType) {
        case 'id':
          actualSelector = `#${selector}` // 始终添加#前缀
          break
        case 'class':
          actualSelector = `.${selector}` // 始终添加.前缀
          break
        case 'name':
          actualSelector = `[name="${selector}"]` // 始终使用属性选择器格式
          break
        case 'xpath':
          // XPath 选择器保持不变
          break
        case 'css':
          // CSS 选择器保持不变
          break
      }

      console.log(`提取数据: 选择器类型=${currentSelectorType}, 原始选择器=${selector}, 实际选择器=${actualSelector}`)

      // 使用新的等待选项
      const waitOptions = {
        state: waitForVisible ? 'visible' : 'attached',
        timeout: (timeout * 1000) // 转换为毫秒
      }
      console.log(`等待选择器 ${actualSelector} 出现，超时时间 ${timeout} 秒`)
      
      // 使用 webContents.executeJavaScript 等待元素并提取数据
      await new Promise((resolve, reject) => {
        const startTime = Date.now()
        const checkElement = async () => {
          try {
            if (!this.webContents) return;
            const exists = await this.webContents.executeJavaScript(`
              (function() {
                const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
                return element !== null
              })()
            `)
            
            if (exists) {
              resolve(void 0)
            } else if (Date.now() - startTime > timeout * 1000) {
              reject(new Error(`等待选择器 ${actualSelector} 超时`))
            } else {
              setTimeout(checkElement, 100)
            }
          } catch (error) {
            reject(error)
          }
        }
        checkElement()
      })
      
      console.log(`选择器 ${actualSelector} 已找到`)

      switch (extractType) {
        case 'text':
          value = await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
              return element ? element.textContent : null
            })()
          `)
          if (trimContent && typeof value === 'string') {
            value = value.trim()
          }
          break

        case 'attribute':
          if (attributeName) {
            value = await this.webContents.executeJavaScript(`
              (function() {
                const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
                return element ? element.getAttribute('${attributeName.replace(/'/g, "\\'")}'): null
              })()
            `)
            if (trimContent && typeof value === 'string') {
              value = value.trim()
            }
          }
          break

        case 'html':
          value = await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
              return element ? element.innerHTML : null
            })()
          `)
          if (trimContent && typeof value === 'string') {
            value = value.trim()
          }
          break

        case 'table':
          // 提取表格数据
          const tableData = []
          
          // 如果有表头
          if (hasHeader && headerSelector) {
            const headers = await this.webContents.executeJavaScript(`
              (function() {
                const cells = document.querySelectorAll('${headerSelector.replace(/'/g, "\\'")}')
                return Array.from(cells).map(cell => cell.textContent?.trim() || '')
              })()
            `)
            if (headers.length > 0) {
              tableData.push(headers)
            }
          }

          // 提取数据行
          if (rowSelector) {
            const tableRows = await this.webContents.executeJavaScript(`
              (function() {
                const rows = document.querySelectorAll('${rowSelector.replace(/'/g, "\\'")}')
                const result = []
                
                for (const row of rows) {
                  const cells = ${cellSelector ? `row.querySelectorAll('${cellSelector.replace(/'/g, "\\'")}')`  : `row.querySelectorAll('td, th')`}
                  const rowData = Array.from(cells).map(cell => cell.textContent?.trim() || '')
                  result.push(rowData)
                }
                
                return result
              })()
            `)
            
            tableData.push(...tableRows)
          }
          
          value = tableData
          break

        case 'list':
          // 提取列表数据
          value = await this.webContents.executeJavaScript(`
            (function() {
              const elements = document.querySelectorAll('${actualSelector.replace(/'/g, "\\'")}')
              return Array.from(elements).map(el => 
                ${extractInnerHTML ? 'el.innerHTML' : 'el.textContent?.trim()'}
              )
            })()
          `)
          break

        default:
          throw new Error(`不支持的提取类型: ${extractType}`)
      }

      console.log(`原始提取数据: ${value !== null ? (Array.isArray(value) ? `数组(长度=${value.length})` : `${typeof value}`) : 'null'}`)

      // 应用过滤
      value = this.filterData(value, properties)
      console.log(`过滤后数据: ${value !== null ? (Array.isArray(value) ? `数组(长度=${value.length})` : `${typeof value}`) : 'null'}`)

      if (value !== null) {
        // 始终保存最后提取的数据，无论是否有变量名
        this.lastExtractedData = value
        console.log('数据已保存为最后提取的数据', value ? '数据长度: ' + (Array.isArray(value) ? value.length : '1') : '无数据')
        
        // 如果有变量名，则保存到变量
        if (variableName) {
          this.variables[variableName] = value
          console.log(`数据已保存到变量: ${variableName}`, value ? '数据长度: ' + (Array.isArray(value) ? value.length : '1') : '无数据')
        } else {
          console.log('未指定变量名，数据仅保存为最后提取的数据')
        }
      } else {
        console.log('过滤后数据为null，没有保存数据')
      }
    } catch (error: any) {
      console.log(`提取数据失败: ${error.message}`)
      throw new Error(`提取数据失败: ${error.message}`)
    }
  }

  private async executeKeyboardNode(properties: NodeProperties) {
    if (!this.webContents) throw new Error('页面未打开')

    const { 
      keyboardActionType, 
      key, 
      modifiers = [], 
      text, 
      simulateTyping, 
      typingDelay, 
      waitAfterInput, 
      waitTimeout,
      selector
    } = properties

    try {
      // 如果提供了选择器，先定位和聚焦元素
      if (selector) {
        await this.webContents.executeJavaScript(`
          (function() {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              element.focus()
              return true
            }
            return false
          })()
        `)
      }

      switch (keyboardActionType) {
        case 'press':
          if (key) {
            // 使用 webContents.sendInputEvent 发送键盘事件
            const keyEvent: any = {
              type: 'keyDown',
              keyCode: this.getKeyCode(key)
            }
            
            // 添加修饰键
            if (modifiers && modifiers.length > 0) {
              modifiers.forEach(modifier => {
                const normalizedModifier = this.normalizeModifierKey(modifier)
                if (normalizedModifier === 'Control') keyEvent.modifiers = (keyEvent.modifiers || 0) | 2
                if (normalizedModifier === 'Alt') keyEvent.modifiers = (keyEvent.modifiers || 0) | 1
                if (normalizedModifier === 'Shift') keyEvent.modifiers = (keyEvent.modifiers || 0) | 4
                if (normalizedModifier === 'Meta') keyEvent.modifiers = (keyEvent.modifiers || 0) | 8
              })
            }
            
            this.webContents.sendInputEvent(keyEvent)
            this.webContents.sendInputEvent({ ...keyEvent, type: 'keyUp' })

            // 特殊处理：如果是 Enter 键，等待页面变化
            if (key.toLowerCase() === 'enter') {
              await new Promise(resolve => {
                const timeout = setTimeout(resolve, 5000)
                if (this.webContents) {
                  this.webContents.once('did-finish-load', () => {
                    clearTimeout(timeout)
                    resolve(void 0)
                  })
                }
              })
            }
          }
          break

        case 'type':
          if (text) {
            if (selector) {
              // 如果有选择器，直接设置元素值
              await this.webContents.executeJavaScript(`
                (function() {
                  const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
                  if (element) {
                    ${simulateTyping ? `
                      // 模拟逐字符输入
                      const text = '${text.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'
                      element.value = ''
                      let i = 0
                      const typeChar = () => {
                        if (i < text.length) {
                          element.value += text[i]
                          element.dispatchEvent(new Event('input', { bubbles: true }))
                          i++
                          setTimeout(typeChar, ${typingDelay || 100})
                        }
                      }
                      typeChar()
                    ` : `
                      element.value = '${text.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'
                      element.dispatchEvent(new Event('input', { bubbles: true }))
                      element.dispatchEvent(new Event('change', { bubbles: true }))
                    `}
                  }
                })()
              `)
            } else {
              // 如果没有目标元素，使用 insertText
              if (simulateTyping) {
                for (const char of text) {
                  this.webContents.insertText(char)
                  await new Promise(resolve => setTimeout(resolve, typingDelay || 100))
                }
              } else {
                this.webContents.insertText(text)
              }
            }
          }
          break
      }

      // 处理等待时间
      if (waitAfterInput && waitTimeout) {
        await new Promise(resolve => setTimeout(resolve, waitTimeout))
      }
    } catch (error) {
      console.error('键盘操作失败:', error)
      throw new Error(`键盘操作失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 辅助方法：规范化修饰键名称
  private normalizeModifierKey(modifier: string): string {
    const modifierMap: { [key: string]: string } = {
      'Control': 'Control',
      'Ctrl': 'Control',
      'Alt': 'Alt',
      'Shift': 'Shift',
      'Meta': 'Meta',
      'Command': 'Meta',
      'Win': 'Meta'
    }
    return modifierMap[modifier] || modifier
  }

  // 辅助方法：获取键码
  private getKeyCode(key: string): string {
    const keyMap: { [key: string]: string } = {
      'Enter': '\u000d',
      'Tab': '\u0009',
      'Escape': '\u001b',
      'Backspace': '\u0008',
      'Delete': '\u007f',
      'ArrowUp': '\ue013',
      'ArrowDown': '\ue015',
      'ArrowLeft': '\ue012',
      'ArrowRight': '\ue014',
      'F1': '\ue031',
      'F2': '\ue032',
      'F3': '\ue033',
      'F4': '\ue034',
      'F5': '\ue035',
      'F6': '\ue036',
      'F7': '\ue037',
      'F8': '\ue038',
      'F9': '\ue039',
      'F10': '\ue03a',
      'F11': '\ue03b',
      'F12': '\ue03c'
    }
    return keyMap[key] || key
  }

  private async executeMouseNode(properties: NodeProperties) {
    if (!this.webContents) return

    const { actionType, selector, x, y } = properties
    switch (actionType) {
      case 'moveToElement':
        if (selector) {
          // 使用 webContents.executeJavaScript 模拟鼠标悬停
          await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                const event = new MouseEvent('mouseover', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                })
                element.dispatchEvent(event)
                return true
              }
              return false
            })()
          `)
        }
        break
      case 'moveToPosition':
        if (typeof x === 'number' && typeof y === 'number') {
          // 使用 webContents.sendInputEvent 发送鼠标移动事件
          this.webContents.sendInputEvent({
            type: 'mouseMove',
            x: x,
            y: y
          })
        }
        break
    }
  }

  private async executeWaitNode(properties: NodeProperties) {
    if (!this.webContents) return

    const { waitType, timeout = 30, selector, selectorType, reverse } = properties
    
    switch (waitType) {
      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, timeout * 1000))
        break
      case 'visible':
      case 'exists':
      case 'hidden':
      case 'clickable':
        if (selector) {
          // 根据选择器类型构建实际的选择器
          let actualSelector = selector
          const currentSelectorType = selectorType || 'css'

          // 根据选择器类型构建CSS选择器
          switch (currentSelectorType) {
            case 'id':
              actualSelector = `#${selector}` // 始终添加#前缀
              break
            case 'class':
              actualSelector = `.${selector}` // 始终添加.前缀
              break
            case 'name':
              actualSelector = `[name="${selector}"]` // 始终使用属性选择器格式
              break
            case 'xpath':
              // XPath 选择器保持不变
              break
            case 'css':
              // CSS 选择器保持不变
              break
          }

          console.log(`等待元素: 类型=${waitType}, 选择器类型=${currentSelectorType}, 原始选择器=${selector}, 实际选择器=${actualSelector}`)

          // 使用 webContents.executeJavaScript 等待元素状态
          await new Promise((resolve, reject) => {
            const startTime = Date.now()
            const checkCondition = async () => {
              try {
                if (!this.webContents) return;
                let conditionMet = false
                
                if (waitType === 'visible') {
                  conditionMet = await this.webContents.executeJavaScript(`
                    (function() {
                      const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
                      if (!element) return false
                      const rect = element.getBoundingClientRect()
                      const style = window.getComputedStyle(element)
                      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
                    })()
                  `)
                } else if (waitType === 'exists') {
                  conditionMet = await this.webContents.executeJavaScript(`
                    (function() {
                      return document.querySelector('${actualSelector.replace(/'/g, "\\'")}'') !== null
                    })()
                  `)
                } else if (waitType === 'hidden') {
                  conditionMet = await this.webContents.executeJavaScript(`
                    (function() {
                      const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
                      if (!element) return true
                      const rect = element.getBoundingClientRect()
                      const style = window.getComputedStyle(element)
                      return style.display === 'none' || style.visibility === 'hidden' || (rect.width === 0 && rect.height === 0)
                    })()
                  `)
                } else if (waitType === 'clickable') {
                  conditionMet = await this.webContents.executeJavaScript(`
                    (function() {
                      const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
                      if (!element) return false
                      const rect = element.getBoundingClientRect()
                      const style = window.getComputedStyle(element)
                      return !element.disabled && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
                    })()
                  `)
                }
                
                // 如果是反向条件，取反
                if (reverse) {
                  conditionMet = !conditionMet
                }
                
                if (conditionMet) {
                  resolve(void 0)
                } else if (Date.now() - startTime > timeout * 1000) {
                  reject(new Error(`等待元素 ${actualSelector} 状态 ${waitType} 超时`))
                } else {
                  setTimeout(checkCondition, 100)
                }
              } catch (error) {
                reject(error)
              }
            }
            checkCondition()
          })
        }
        break
    }
  }

  private async executeScreenshotNode(properties: NodeProperties) {
    if (!this.webContents) return

    const { screenshotType, selector, path, omitBackground, quality } = properties
    if (!path) return

    try {
      let image: Electron.NativeImage
      
      switch (screenshotType) {
        case 'fullPage':
        case 'viewport':
          // 使用 webContents.capturePage 截取页面
          image = await this.webContents.capturePage()
          break
        case 'element':
          if (selector) {
            // 获取元素位置和大小
            const elementRect = await this.webContents.executeJavaScript(`
              (function() {
                const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
                if (!element) return null
                const rect = element.getBoundingClientRect()
                return {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              })()
            `)
            
            if (elementRect) {
              // 截取指定区域
              image = await this.webContents.capturePage({
                x: Math.round(elementRect.x),
                y: Math.round(elementRect.y),
                width: Math.round(elementRect.width),
                height: Math.round(elementRect.height)
              })
            } else {
              throw new Error(`找不到选择器: ${selector}`)
            }
          } else {
            throw new Error('元素截图需要提供选择器')
          }
          break
        default:
          throw new Error(`不支持的截图类型: ${screenshotType}`)
      }
      
      // 保存图片
      const fs = require('fs')
      const pathModule = require('path')
      
      // 确保目录存在
      const dir = pathModule.dirname(path)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // 根据文件扩展名保存不同格式
      if (path.toLowerCase().endsWith('.png')) {
        fs.writeFileSync(path, image.toPNG())
      } else if (path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg')) {
        const jpegOptions = { quality: quality || 100 }
        fs.writeFileSync(path, image.toJPEG(jpegOptions.quality))
      } else {
        // 默认保存为 PNG
        fs.writeFileSync(path, image.toPNG())
      }
      
      console.log(`截图已保存到: ${path}`)
    } catch (error) {
      console.error('截图失败:', error)
      throw new Error(`截图失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async executeSwitchNode(properties: NodeProperties, node: FlowNode, nodes: FlowNode[]) {
    if (!this.webContents) return

    const { condition, selector, value } = properties
    if (!selector) return

    let result = false
    switch (condition) {
      case 'exists':
        result = await this.webContents.executeJavaScript(`
          (function() {
            return document.querySelector('${selector.replace(/'/g, "\\'")}'') !== null
          })()
        `)
        break
      case 'notExists':
        result = await this.webContents.executeJavaScript(`
          (function() {
            return document.querySelector('${selector.replace(/'/g, "\\'")}'') === null
          })()
        `)
        break
      case 'visible':
        result = await this.webContents.executeJavaScript(`
          (function() {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
            if (!element) return false
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          })()
        `)
        break
      case 'notVisible':
        result = await this.webContents.executeJavaScript(`
          (function() {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
            if (!element) return true
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            return style.display === 'none' || style.visibility === 'hidden' || (rect.width === 0 && rect.height === 0)
          })()
        `)
        break
      case 'clickable':
        result = await this.webContents.executeJavaScript(`
          (function() {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
            if (!element) return false
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            return !element.disabled && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          })()
        `)
        break
      case 'notClickable':
        result = await this.webContents.executeJavaScript(`
          (function() {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
            if (!element) return true
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            return element.disabled || style.display === 'none' || style.visibility === 'hidden' || (rect.width === 0 && rect.height === 0)
          })()
        `)
        break
      case 'textContains':
        if (value) {
          result = await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
              const text = element ? element.textContent : null
              return text ? text.includes('${value.replace(/'/g, "\\'").replace(/\n/g, '\\n')}') : false
            })()
          `)
        }
        break
      case 'textNotContains':
        if (value) {
          result = await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
              const text = element ? element.textContent : null
              return text ? !text.includes('${value.replace(/'/g, "\\'").replace(/\n/g, '\\n')}') : true
            })()
          `)
        }
        break
      case 'textEquals':
        if (value) {
          result = await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
              const text = element ? element.textContent : null
              return text === '${value.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'
            })()
          `)
        }
        break
      case 'textNotEquals':
        if (value) {
          result = await this.webContents.executeJavaScript(`
            (function() {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
              const text = element ? element.textContent : null
              return text !== '${value.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'
            })()
          `)
        }
        break
    }

    // 获取子节点
    const childNodes = nodes.filter(n => n.properties.parentId === node.id)
    
    // 根据条件结果执行相应分支
    for (const childNode of childNodes) {
      // 检查节点是否为条件分支
      const isTrueBranch = childNode.properties.branchType === 'true'
      const isFalseBranch = childNode.properties.branchType === 'false'

      // 根据条件结果选择执行分支
      if ((result && isTrueBranch) || (!result && isFalseBranch)) {
        await this.executeNode(childNode, nodes)
      }
    }

    return result
  }

  private async executeLoopNode(properties: NodeProperties, node: FlowNode, nodes: FlowNode[]) {
    if (!this.webContents) return

    const { loopType, count, selector, condition } = properties
    const childNodes = nodes.filter(n => n.properties.parentId === node.id)

    switch (loopType) {
      case 'count':
        if (count) {
          for (let i = 0; i < count; i++) {
            if (!this.isRunning) break
            // 设置循环变量
            this.variables['loopIndex'] = i
            // 执行循环体节点
            for (const childNode of childNodes) {
              await this.executeNode(childNode, nodes)
            }
          }
        }
        break

      case 'elements':
        if (selector) {
          const elements = await this.webContents.executeJavaScript(`
            Array.from(document.querySelectorAll('${selector.replace(/'/g, "\\'")}')).map((el, index) => ({
              index,
              tagName: el.tagName,
              id: el.id,
              className: el.className
            }))
          `)
          for (let i = 0; i < elements.length; i++) {
            if (!this.isRunning) break
            const element = elements[i]
            // 设置循环变量
            this.variables['loopIndex'] = i
            this.variables['loopElement'] = element
            // 执行循环体节点
            for (const childNode of childNodes) {
              await this.executeNode(childNode, nodes)
            }
          }
        }
        break

      case 'condition':
        if (condition && selector) {
          let shouldContinue = true
          let iterationCount = 0
          const maxIterations = 1000 // 防止无限循环

          while (shouldContinue && iterationCount < maxIterations) {
            if (!this.isRunning) break

            // 检查条件
            shouldContinue = await this.checkLoopCondition(condition, selector)
            if (!shouldContinue) break

            // 设置循环变量
            this.variables['loopIndex'] = iterationCount
            // 执行循环体节点
            for (const childNode of childNodes) {
              await this.executeNode(childNode, nodes)
            }

            iterationCount++
          }
        }
        break
    }
  }

  private async checkLoopCondition(condition: string, selector: string): Promise<boolean> {
    if (!this.webContents) return false

    switch (condition) {
      case 'exists':
        return await this.webContents.executeJavaScript(`
          document.querySelector('${selector.replace(/'/g, "\\'")}')
        `) !== null
      case 'visible':
        return await this.webContents.executeJavaScript(`
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
          if (!element) return false
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        `)
      case 'hidden':
        return !(await this.webContents.executeJavaScript(`
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
          if (!element) return false
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        `))
      case 'clickable':
        return await this.webContents.executeJavaScript(`
          const element = document.querySelector('${selector.replace(/'/g, "\\'")}')
          if (!element) return false
          return !element.disabled && element.offsetParent !== null
        `)
      default:
        return false
    }
  }

  async startElementPicker(): Promise<{ selector: string; selectorType: string; iframeSelector?: string }> {
    if (!this.webContents) throw new Error('浏览器未启动')
    if (this.webContents.isDestroyed()) throw new Error('页面已关闭')
    if (this.pickerPromiseState === 'pending') throw new Error('已有正在进行的元素选择')

    this.pickerPromiseState = 'pending'
    this.isPickingElement = true
    this.pickerLock = true

    try {
      if (!this.webContents.isDestroyed()) {
        await this.waitForWebContentsReady(this.webContents)

        // ── 注入主页面拾取脚本 ──
        const mainJs = [
          '(function(){',
          'try{',
          '  var w=window;var d=document;',
          '  function clean(){',
          '    if(w.__pk){',
          '      d.removeEventListener("mouseover",w.__pk.mo);',
          '      d.removeEventListener("mouseout",w.__pk.mu);',
          '      d.removeEventListener("click",w.__pk.mc,true);',
          '      d.removeEventListener("keydown",w.__pk.kd)',
          '    }',
          '  }',
          '  clean();w.__pk={};',
          '  w.__pk.er=null;',
          '  if(d.body){w.__pk.cur=d.body.style.cursor;d.body.style.cursor="pointer"}',
          // ---- 生成选择器辅助函数 ----
          '  function genSel(t){',
          '    if(!t||t===d.body||t===d.documentElement)return"";',
          '    if(t.id)return t.id;',
          '    var p=[];var c=t;var n=t.parentElement;',
          '    while(n){',
          '      var sib=[].slice.call(n.children);',
          '      var idx=sib.indexOf(c)+1;',
          '      var tag=c.tagName.toLowerCase();',
          '      if(c.id){p.unshift("#"+c.id);break}',
          '      p.unshift(tag+":nth-child("+idx+")");',
          '      c=n;n=n.parentElement;if(p.length>10)break',
          '    }',
          '    return p.join(" > ")',
          '  }',
          // ---- 处理 iframe 消息（iframe 内部发上来的） ----
          '  w.__pk.ifrHdl=function(e){',
          '    if(e.data&&e.data.type==="__PK_IFRAME_SELECT"){',
          '      clean();',
          '      w.__pk.ifrSel=e.data.iframeSel;',
          '      w.__pk.ifrInner=e.data.innerSel;',
          '      w.__pk.sendResult(e.data.innerSel,"css",e.data.iframeSel)',
          '    }',
          '  };',
          '  w.addEventListener("message",w.__pk.ifrHdl);',
          // ---- 鼠标悬停 ----
          '  w.__pk.mo=function(e){',
          '    var t=e.target;',
          '    if(!t||t===d.body||t===d.documentElement)return;',
          '    if(w.__pk.hv){',
          '      w.__pk.hv.style.outline=w.__pk.ol||"";',
          '      w.__pk.hv.style.outlineOffset=""',
          '    }',
          '    w.__pk.hv=t;w.__pk.ol=t.style.outline;',
          '    t.style.outline="2px solid #409eff";t.style.outlineOffset="1px"',
          '  };',
          // ---- 鼠标移出 ----
          '  w.__pk.mu=function(e){',
          '    var t=e.target;if(!t)return;',
          '    if(w.__pk.hv===t){',
          '      t.style.outline=w.__pk.ol||"";t.style.outlineOffset="";w.__pk.hv=null',
          '    }',
          '  };',
          // ---- 点击主页面元素（注意：不阻止传播，让页面原本的事件处理器能正常执行） ----
          '  w.__pk.mc=function(e){',
          '    e.preventDefault();',
          '    var t=e.target;',
          '    if(!t||t===d.body||t===d.documentElement)return;',
          '    var sel=genSel(t);if(!sel)return;',
          '    var st="css";if(t.id){sel=t.id;st="id"}',
          '    clean();w.__pk.sendResult(sel,st,"")',
          '  };',
          // ---- ESC键取消 ----
          '  w.__pk.kd=function(e){',
          '    if(e.key==="Escape"){clean();w.__pk.sendCancel()}',
          '  };',
          // ---- 发送结果 ----
          '  w.__pk.sendResult=function(s,t,f){',
          '    d.removeEventListener("mouseover",w.__pk.mo);d.removeEventListener("mouseout",w.__pk.mu);d.removeEventListener("click",w.__pk.mc,true);d.removeEventListener("keydown",w.__pk.kd);',
          '    w.removeEventListener("message",w.__pk.ifrHdl);',
          '    if(d.body)d.body.style.cursor=w.__pk.cur||"";',
          '    if(w.__pk.hv){w.__pk.hv.style.outline=w.__pk.ol||"";w.__pk.hv.style.outlineOffset="";w.__pk.hv=null}',
          '    w.postMessage({type:"ELEMENT_SELECTED",selector:s,selectorType:t,iframeSelector:f},"*")',
          '  };',
          '  w.__pk.sendCancel=function(){',
          '    d.removeEventListener("mouseover",w.__pk.mo);d.removeEventListener("mouseout",w.__pk.mu);d.removeEventListener("click",w.__pk.mc,true);d.removeEventListener("keydown",w.__pk.kd);',
          '    w.removeEventListener("message",w.__pk.ifrHdl);',
          '    w.postMessage({type:"ELEMENT_SELECTED_CANCELLED"},"*")',
          '  };',
          '  d.addEventListener("mouseover",w.__pk.mo);',
          '  d.addEventListener("mouseout",w.__pk.mu);',
          '  d.addEventListener("click",w.__pk.mc,true);',
          '  d.addEventListener("keydown",w.__pk.kd);',
          // ---- 遍历同源 iframe，注入子拾取器 ----
          '  var ifrs=d.querySelectorAll("iframe");',
          '  for(var i=0;i<ifrs.length;i++){(function(){',
          '    var f=ifrs[i];',
          '    try{',
          '      var fd=f.contentDocument||f.contentWindow.document;',
          '      if(!fd||fd===d)return;',
          '      var fs=genSel(f);',
          '      if(!fd.body)return;',
          '      fd.body.style.cursor="pointer";',
          '      fd.addEventListener("click",function(e){',
          '        e.preventDefault();',
          '        var t=e.target;',
          '        if(!t||t===fd.body||t===fd.documentElement)return;',
          '        var s=t.id||function(el){var p=[];while(el&&el.parentElement){var sib=[].slice.call(el.parentElement.children);var idx=sib.indexOf(el)+1;p.unshift(el.tagName.toLowerCase()+":nth-child("+idx+")");el=el.parentElement;if(p.length>15)break}return p.join(" > ")}(t);',
          '        if(!s)return;',
          '        if(t.id)s=t.id;',
          '        w.postMessage({type:"__PK_IFRAME_SELECT",innerSel:s,iframeSel:fs},"*")',
          '      },true)',
          '    }catch(e){w.__pk.er=e.message}',
          '  })()}',
          '}catch(e){w.__pk.er=e.message}',
          '})()'
        ].join('\n')

        await this.webContents.executeJavaScript(mainJs)

        // ── 第二步：等待用户选择 ──
        const waitJs = [
          'new Promise(function(r,j){',
          '  if(window.__pk&&window.__pk.er){j(new Error(window.__pk.er));return}',
          '  var tid=null;var done=false;',
          '  function hdl(e){',
          '    if(!e.data)return;',
          '    if(e.data.type==="ELEMENT_SELECTED"){',
          '      window.removeEventListener("message",hdl);clearTimeout(tid);done=true;',
          '      r({selector:e.data.selector,selectorType:e.data.selectorType,iframeSelector:e.data.iframeSelector||""})',
          '    }',
          '    if(e.data.type==="ELEMENT_SELECTED_CANCELLED"){',
          '      window.removeEventListener("message",hdl);clearTimeout(tid);j(new Error("已取消"))',
          '    }',
          '  }',
          '  window.addEventListener("message",hdl);',
          '  tid=setTimeout(function(){if(!done){window.removeEventListener("message",hdl);j(new Error("选择元素超时"))}},300000)',
          '})'
        ].join('\n')

        const result = await this.webContents.executeJavaScript(waitJs)
        this.pickerPromiseState = 'resolved'
        return result
      } else {
        this.pickerPromiseState = 'rejected'
        throw new Error('页面已关闭，请重新打开页面')
      }
    } catch (error) {
      this.pickerPromiseState = 'rejected'
      try {
        if (this.webContents && !this.webContents.isDestroyed()) {
          await this.webContents.executeJavaScript(
            '(function(){if(window.__pk){document.removeEventListener("mouseover",window.__pk.mo);document.removeEventListener("mouseout",window.__pk.mu);document.removeEventListener("click",window.__pk.mc,true);document.removeEventListener("keydown",window.__pk.kd);if(window.__pk.hv){window.__pk.hv.style.outline=window.__pk.ol||"";window.__pk.hv.style.outlineOffset="";window.__pk.hv=null};if(document.body)document.body.style.cursor=window.__pk.cur||""}})()'
          )
        }
      } catch (cleanupError) {
        // 忽略清理错误
      }
      throw error
    } finally {
      if (this.pickerPromiseState !== 'pending') {
        this.isPickingElement = false
        this.pickerLock = false
        this.pickerPromiseState = null
      }
    }
  }

  private async executeInputNode(properties: NodeProperties) {
    if (!this.webContents) throw new Error('浏览器未启动')

    const {
      selectorType,
      selector,
      text,
      clearFirst,
      simulateTyping,
      typingDelay,
      waitAfterInput,
      waitTimeout
    } = properties

    if (!selector || !text) throw new Error('选择器或输入文本不能为空')

    try {
      console.log(`执行输入操作: 选择器=${selector}, 类型=${selectorType}, 文本=${text}`);

      // 根据选择器类型构建实际的选择器
      let actualSelector = selector;

      switch (selectorType) {
        case 'id':
          actualSelector = `#${selector}`; // 始终添加#前缀
          break;
        case 'class':
          actualSelector = `.${selector}`; // 始终添加.前缀
          break;
        case 'name':
          actualSelector = `[name="${selector}"]`; // 始终使用属性选择器格式
          break;
        case 'xpath':
          // XPath 需要转换为 CSS 选择器或使用 evaluate
          break;
        default:
          // CSS选择器
          break;
      }
      
      console.log(`输入文本: 选择器类型=${selectorType}, 原始选择器=${selector}, 实际选择器=${actualSelector}`)

      const safeSelector = JSON.stringify(actualSelector)
      const safeIframe = properties.iframeSelector ? JSON.stringify(properties.iframeSelector) : 'null'
      const safeText = JSON.stringify(text)

      // 检查元素是否存在
      const elementExists = await this.webContents.executeJavaScript(`
        (function() {
          const sel = ${safeSelector};
          const ifr = ${safeIframe};
          let d = document;
          if (ifr) { const f = document.querySelector(ifr); if (f) { d = f.contentDocument || f.contentWindow.document; } }
          return d ? !!d.querySelector(sel) : false;
        })()
      `)

      if (!elementExists) {
        console.log('未找到元素，尝试使用备用选择器');
        if (selector.includes('id=') || selector.includes('#')) {
          const idSelector = selector.includes('#') ? selector : `#${selector.replace('id=', '')}`;
          actualSelector = idSelector;
        }
        // 再次检查
        const safeSelector2 = JSON.stringify(actualSelector)
        const fallbackExists = await this.webContents.executeJavaScript(`
          (function() {
            const sel = ${safeSelector2};
            const ifr = ${safeIframe};
            let d = document;
            if (ifr) { const f = document.querySelector(ifr); if (f) { d = f.contentDocument || f.contentWindow.document; } }
            return d ? !!d.querySelector(sel) : false;
          })()
        `)
        if (!fallbackExists) {
          actualSelector = 'input';
          console.log('尝试定位任何输入框');
        }
      }

      // 等待元素可见并滚动到视图中
      console.log('等待元素可见并滚动到视图中...');
      await this.webContents.executeJavaScript(`
        (function() {
          const sel = ${JSON.stringify(actualSelector)};
          const ifr = ${safeIframe};
          let d = document;
          if (ifr) { const f = document.querySelector(ifr); if (f) { d = f.contentDocument || f.contentWindow.document; } }
          if (!d) return false;
          const el = d.querySelector(sel);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
          return false;
        })()
      `)

      // 如果需要清除原有内容
      if (clearFirst) {
        console.log('清除输入框现有内容...');
        await this.webContents.executeJavaScript(`
          (function() {
            const sel = ${JSON.stringify(actualSelector)};
            const ifr = ${safeIframe};
            let d = document;
            if (ifr) { const f = document.querySelector(ifr); if (f) { d = f.contentDocument || f.contentWindow.document; } }
            if (!d) return;
            const el = d.querySelector(sel);
            if (el) { el.focus(); el.select(); el.value = ''; }
          })()
        `)
      }

      // 输入文本
      console.log(`使用${simulateTyping ? '模拟输入' : '直接填充'}方式输入文本...`);
      if (simulateTyping) {
        await this.webContents.executeJavaScript(`
          (async function() {
            const sel = ${JSON.stringify(actualSelector)};
            const ifr = ${safeIframe};
            let d = document;
            if (ifr) { const f = document.querySelector(ifr); if (f) { d = f.contentDocument || f.contentWindow.document; } }
            if (!d) throw new Error('无法访问文档');
            const element = d.querySelector(sel);
            if (!element) throw new Error('元素未找到');
            element.focus();
            const text = ${safeText};
            const delay = ${typingDelay || 50};
            if (element.isContentEditable) {
              element.innerText = '';
              for (let i = 0; i < text.length; i++) {
                element.innerText += text[i];
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, delay));
              }
            } else {
              element.value = '';
              for (let i = 0; i < text.length; i++) {
                element.value += text[i];
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, delay));
              }
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()
        `)
      } else {
        // 智能填充：区分 input/textarea 和 contenteditable
        await this.webContents.executeJavaScript(`
          (function() {
            const sel = ${JSON.stringify(actualSelector)};
            const ifr = ${safeIframe};
            let d = document;
            if (ifr) { const f = document.querySelector(ifr); if (f) { d = f.contentDocument || f.contentWindow.document; } }
            if (!d) throw new Error('无法访问文档');
            const element = d.querySelector(sel);
            if (!element) throw new Error('元素未找到');
            element.focus();
            const text = ${safeText};
            if (element.isContentEditable || element.tagName === 'DIV') {
              element.innerText = text;
              element.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (element.tagName === 'TEXTAREA') {
              element.value = text;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              element.value = text;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()
        `)
      }

      // 等待输入完成
      if (waitAfterInput && waitTimeout) {
        console.log(`等待${waitTimeout}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTimeout * 1000))
      }

      console.log('输入操作完成');
    } catch (error: any) {
      const errorMessage = error.message || '未知错误';
      console.error('输入文本失败:', error);
      throw new Error(`输入文本失败: ${errorMessage}`);
    }
  }

  private async executeScrollNode(properties: NodeProperties) {
    if (!this.webContents) return

    const { actionType, selector, selectorType, x, y, smooth, waitForScroll, timeout = 30 } = properties

    try {
      switch (actionType) {
        case 'scrollToElement':
          if (selector) {
            // 根据选择器类型构建实际的选择器
            let actualSelector = selector
            const currentSelectorType = selectorType || 'css'

            // 根据选择器类型构建CSS选择器
            switch (currentSelectorType) {
              case 'id':
                actualSelector = `#${selector}` // 始终添加#前缀
                break
              case 'class':
                actualSelector = `.${selector}` // 始终添加.前缀
                break
              case 'name':
                actualSelector = `[name="${selector}"]` // 始终使用属性选择器格式
                break
              case 'xpath':
                // XPath 选择器保持不变
                break
              case 'css':
                // CSS 选择器保持不变
                break
            }

            console.log(`滚动到元素: 选择器类型=${currentSelectorType}, 原始选择器=${selector}, 实际选择器=${actualSelector}`)
            
            // 执行滚动
            await this.webContents.executeJavaScript(`
              const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
              if (element) {
                element.scrollIntoView({ behavior: '${smooth ? 'smooth' : 'auto'}' })
                return true
              }
              return false
            `)

            // 如果需要等待滚动完成
            if (waitForScroll) {
              await new Promise(resolve => setTimeout(resolve, 1000)) // 给予滚动动画完成的时间
            }
          }
          break

        case 'scrollToPosition':
          if (typeof x === 'number' && typeof y === 'number') {
            // 执行滚动
            await this.webContents.executeJavaScript(`
              window.scrollTo({
                left: ${x},
                top: ${y},
                behavior: '${smooth ? 'smooth' : 'auto'}'
              })
            `)

            // 如果需要等待滚动完成
            if (waitForScroll) {
              await new Promise(resolve => setTimeout(resolve, 1000)) // 给予滚动动画完成的时间
            }
          }
          break

        case 'scrollToTop':
          // 滚动到顶部
          await this.webContents.executeJavaScript(`
            window.scrollTo({
              left: 0,
              top: 0,
              behavior: '${smooth ? 'smooth' : 'auto'}'
            })
          `)

          // 如果需要等待滚动完成
          if (waitForScroll) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          break

        case 'scrollToBottom':
          // 滚动到底部
          await this.webContents.executeJavaScript(`
            window.scrollTo({
              left: 0,
              top: document.documentElement.scrollHeight,
              behavior: '${smooth ? 'smooth' : 'auto'}'
            })
          `)

          // 如果需要等待滚动完成
          if (waitForScroll) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          break
      }
    } catch (error: any) {
      throw new Error(`滚动操作失败: ${error.message}`)
    }
  }

  async previewExtraction(properties: NodeProperties): Promise<string | any[]> {
    if (!this.webContents) throw new Error('浏览器未启动')

    const { 
      selector, 
      extractType, 
      attributeName,
      headerSelector,
      rowSelector,
      cellSelector,
      hasHeader,
      extractInnerHTML,
      trimContent,
      selectorType
    } = properties

    if (!selector) throw new Error('请先选择要提取的元素')

    try {
      let value: any = null
      // 根据选择器类型构建实际的选择器
      let actualSelector = selector
      switch (selectorType) {
        case 'id':
          actualSelector = selector.startsWith('#') ? selector : `#${selector}`
          break
        case 'class':
          actualSelector = selector.startsWith('.') ? selector : `.${selector}`
          break
        case 'name':
          actualSelector = selector.startsWith('[name="') ? selector : `[name="${selector}"]`
          break
        // xpath保持不变
      }

      // 检查元素是否存在
      const elementExists = await this.webContents.executeJavaScript(`
        document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
      `) !== null
      
      if (!elementExists) {
        throw new Error('未找到匹配的元素，请检查选择器是否正确')
      }

      switch (extractType) {
        case 'text':
          // 提取所有匹配元素的文本
          value = await this.webContents.executeJavaScript(`
            Array.from(document.querySelectorAll('${actualSelector.replace(/'/g, "\\'")}')).map(el => el.textContent?.trim() || '')
          `).catch(error => {
            throw new Error(`提取文本失败: ${error.message}`)
          })
          // 如果只有一个元素，返回单个值而不是数组
          if (Array.isArray(value) && value.length === 1) {
            value = value[0]
          }
          break

        case 'list':
          value = await this.webContents.executeJavaScript(`
            Array.from(document.querySelectorAll('${actualSelector.replace(/'/g, "\\'")}')).map(el => 
              ${extractInnerHTML} ? el.innerHTML.trim() : el.textContent?.trim() || ''
            ).filter(text => text !== '') // 过滤掉空字符串
          `).catch(error => {
            throw new Error(`提取列表失败: ${error.message}`)
          })
          break

        case 'attribute':
          if (attributeName) {
            value = await this.webContents.executeJavaScript(`
              const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
              return element ? element.getAttribute('${attributeName}') : null
            `)
            if (trimContent && typeof value === 'string') {
              value = value.trim()
            }
          }
          break

        case 'html':
          value = await this.webContents.executeJavaScript(`
            (() => {
              const element = document.querySelector('${actualSelector.replace(/'/g, "\\'")}')
              return element ? element.innerHTML : null
            })()
          `)
          if (trimContent && typeof value === 'string') {
            value = value.trim()
          }
          break

        case 'table':
          const tableData: string[][] = []
          
          if (hasHeader && headerSelector) {
            const headers = await this.webContents.executeJavaScript(`
              (() => {
                const cells = document.querySelectorAll('${headerSelector.replace(/'/g, "\\'")}')
                return Array.from(cells).map(cell => cell.textContent?.trim() || '')
              })()
            `)
            if (headers && headers.length > 0) {
              tableData.push(headers)
            }
          }

          if (rowSelector) {
            const tableRows = await this.webContents.executeJavaScript(`
              (() => {
                const rows = document.querySelectorAll('${rowSelector.replace(/'/g, "\\'")}')
                const cellSel = '${cellSelector ? cellSelector.replace(/'/g, "\\'"): 'td, th'}'
                return Array.from(rows).map(row => {
                  const cells = row.querySelectorAll(cellSel)
                  return Array.from(cells).map(cell => cell.textContent?.trim() || '')
                })
              })()
            `)
            
            if (tableRows && Array.isArray(tableRows)) {
              tableData.push(...tableRows)
            }
          }
          
          value = tableData
          break

        default:
          throw new Error(`不支持的提取类型: ${extractType}`)
      }

      // 应用过滤
      value = this.filterData(value, properties)

      // 确保返回的数据是可序列化的
      if (Array.isArray(value)) {
        return value.map(item => {
          if (item === null || item === undefined) return ''
          return String(item).trim()
        }).filter(item => item !== '')
      } else if (value === null || value === undefined) {
        return ''
      } else {
        return String(value).trim()
      }
    } catch (error: any) {
      console.error('提取预览失败:', error)
      throw new Error(`提取预览失败: ${error.message}`)
    }
  }

  private async executeExportNode(properties: NodeProperties) {
    const {
      exportType,
      fileName,
      dataSource,
      variableName,
      sheetName,
      delimiter,
      includeHeaders,
      encoding,
      saveMode = 'auto',  // 默认为自动保存
      savePath            // 预设的保存路径
    } = properties

    console.log(`开始执行导出节点, 数据源: ${dataSource}${dataSource === 'variable' ? ', 变量名: ' + variableName : ''}`)
    console.log(`导出模式: ${saveMode}${saveMode === 'select' ? '(手动选择保存位置)' : '(自动保存)'}`)
    if (savePath) {
      console.log(`预设保存路径: ${savePath}`)
    }
    
    // 添加重试逻辑，等待提取数据
    let data;
    let retryCount = 0;
    const maxRetries = 5; // 增加到5次重试
    const retryDelay = 1000; // 增加到1000毫秒

    while (retryCount < maxRetries) {
      // 获取要导出的数据
      if (dataSource === 'variable' && variableName) {
        data = this.variables[variableName];
        console.log(`尝试从变量获取数据 [${retryCount+1}/${maxRetries}]: `, variableName, data ? '找到数据' : '未找到数据')
      } else if (dataSource === 'extract') {
        data = this.lastExtractedData;
        console.log(`尝试获取最后提取的数据 [${retryCount+1}/${maxRetries}]: `, data ? '找到数据' : '未找到数据')
      }

      // 如果找到数据，退出循环
      if (data) {
        console.log('成功获取数据，数据类型: ', typeof data, Array.isArray(data) ? '数组长度: ' + data.length : '')
        break;
      }

      console.log(`未找到数据，等待 ${retryDelay}ms 后重试...`)
      // 等待一段时间再重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retryCount++;
    }

    if (!data) {
      console.log('所有重试均失败，没有找到要导出的数据')
      throw new Error('没有找到要导出的数据');
    }

    // 确保数据是数组
    if (!Array.isArray(data)) {
      data = [data];
    }

    // 执行导出
    try {
      console.log('准备导出数据，通过IPC发送到渲染进程...');
      
      // 检查我们是否有可用的WebContents来发送IPC消息
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      
      if (!win) {
        throw new Error('找不到有效的浏览器窗口来执行导出');
      }
      
      // 记录完整的导出选项
      console.log(`完整导出选项: saveMode=${saveMode}, savePath=${savePath || '未设置'}, exportType=${exportType}, fileName=${fileName || 'export'}`);
      
      // 使用IPC向渲染进程发送导出请求
      win.webContents.send('automation:export-data', {
        data,
        options: {
          type: exportType,
          fileName: fileName || 'export',
          sheetName,
          delimiter,
          includeHeaders,
          encoding,
          saveMode: saveMode,        // 直接使用传入的saveMode
          savePath: savePath         // 传递预设的保存路径
        }
      });
      
      console.log('导出请求已发送到渲染进程');
    } catch (error) {
      console.error('导出过程中出错:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行验证码识别节点
   */
  private async executeCaptchaNode(properties: NodeProperties) {
    if (!this.webContents) throw new Error('浏览器未启动')

    const {
      provider = 'baidu',
      apiKey,
      secretKey,
      apiUrl,
      captchaSource = 'element',
      captchaSelector,
      screenshotType = 'viewport',
      x = 0,
      y = 0,
      width = 300,
      height = 100,
      captchaType = 'normal',
      resultVariable = 'captcha_result',
      inputSelector,
      autoInput = true,
      timeout = 30,
      retryCount = 2,
      onFailure = 'manual',
      saveImage = false,
      imagePath = './captcha_images/'
    } = properties

    if (!apiKey) {
      throw new Error('验证码识别需要配置API Key')
    }

    console.log(`开始验证码识别: 服务商=${provider}, 获取方式=${captchaSource}, 类型=${captchaType}`)

    try {
      // 动态导入验证码服务
      const { CaptchaService } = await import('../src/services/captcha-service')
      
      const captchaService = new CaptchaService({
        provider: provider as any,
        apiKey,
        secretKey,
        apiUrl,
        timeout: timeout * 1000
      })

      let imageData: Buffer | null = null
      let attempts = 0
      let recognitionResult: any = null

      // 重试机制
      while (attempts <= retryCount && !recognitionResult?.success) {
        attempts++
        console.log(`验证码识别尝试 ${attempts}/${retryCount + 1}`)

        try {
          // 获取验证码图片
          switch (captchaSource) {
            case 'element':
              if (!captchaSelector) {
                throw new Error('元素截图需要提供验证码选择器')
              }
              
              // 等待验证码元素出现并截图
              const elementExists = await this.webContents.executeJavaScript(`
                (() => {
                  const element = document.querySelector('${captchaSelector.replace(/'/g, "\\'")}');
                  return element && element.offsetParent !== null;
                })()
              `);
              
              if (!elementExists) {
                throw new Error('验证码元素不存在或不可见');
              }
              
              // 使用 webContents.capturePage 截取整个页面，然后裁剪元素区域
              const rect = await this.webContents.executeJavaScript(`
                (() => {
                  const element = document.querySelector('${captchaSelector.replace(/'/g, "\\'")}');
                  if (!element) return null;
                  const rect = element.getBoundingClientRect();
                  return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                  };
                })()
              `);
              
              if (rect) {
                const fullImage = await this.webContents.capturePage();
                // 这里需要裁剪图片，但 Electron 的 capturePage 返回的是 NativeImage
                // 暂时使用全页面截图
                imageData = fullImage.toPNG();
              }
              break

            case 'screenshot':
              // 全页面截图
              const fullImage = await this.webContents.capturePage();
              imageData = fullImage.toPNG();
              break

            case 'upload':
              throw new Error('上传图片模式需要在前端实现')

            default:
              throw new Error(`不支持的验证码获取方式: ${captchaSource}`)
          }

          if (!imageData) {
            throw new Error('获取验证码图片失败')
          }

          // 保存图片（如果需要）
          if (saveImage) {
            const fs = require('fs')
            const path = require('path')
            
            // 确保目录存在
            const saveDir = path.resolve(imagePath)
            if (!fs.existsSync(saveDir)) {
              fs.mkdirSync(saveDir, { recursive: true })
            }
            
            const fileName = `captcha_${Date.now()}.png`
            const filePath = path.join(saveDir, fileName)
            fs.writeFileSync(filePath, imageData)
            console.log(`验证码图片已保存: ${filePath}`)
          }

          // 调用识别服务
          recognitionResult = await captchaService.recognize(imageData, captchaType)
          
          if (recognitionResult.success && recognitionResult.text) {
            console.log(`验证码识别成功: ${recognitionResult.text}`)
            
            // 存储结果到变量
            if (!this.variables) {
              this.variables = new Map()
            }
            this.variables.set(resultVariable, recognitionResult.text)
            
            // 自动输入（如果配置了）
            if (autoInput && inputSelector && captchaType === 'normal') {
              try {
                const inputSuccess = await this.webContents.executeJavaScript(`
                  (() => {
                    const input = document.querySelector('${inputSelector.replace(/'/g, "\\'")}');
                    if (!input) return false;
                    
                    input.focus();
                    input.value = '${recognitionResult.text.replace(/'/g, "\\'")}' ;
                    
                    // 触发输入事件
                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    input.dispatchEvent(inputEvent);
                    input.dispatchEvent(changeEvent);
                    
                    return true;
                  })()
                `);
                
                if (inputSuccess) {
                  console.log(`验证码已自动输入到: ${inputSelector}`);
                } else {
                  throw new Error('输入元素不存在');
                }
              } catch (inputError) {
                console.warn(`自动输入验证码失败: ${inputError}`);
                // 输入失败不影响识别结果
              }
            }
            
            break // 识别成功，退出重试循环
          } else {
            console.warn(`验证码识别失败 (尝试 ${attempts}): ${recognitionResult.error || '未知错误'}`)
            
            // 如果不是最后一次尝试，等待一段时间再重试
            if (attempts <= retryCount) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (attemptError: any) {
          console.error(`验证码识别尝试 ${attempts} 出错:`, attemptError)
          
          // 如果不是最后一次尝试，等待一段时间再重试
          if (attempts <= retryCount) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // 处理最终结果
      if (!recognitionResult?.success) {
        const errorMsg = `验证码识别失败，已尝试 ${attempts} 次`
        
        switch (onFailure) {
          case 'stop':
            throw new Error(errorMsg)
          
          case 'continue':
            console.warn(`${errorMsg}，继续执行流程`)
            // 设置空结果
            if (!this.variables) {
              this.variables = new Map()
            }
            this.variables.set(resultVariable, '')
            break
          
          case 'manual':
            console.log(`${errorMsg}，等待人工处理`)
            
            // 通知前端显示人工处理界面
            const { BrowserWindow } = require('electron')
            const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
            
            if (win) {
              win.webContents.send('automation:manual-captcha', {
                message: '验证码识别失败，请人工处理',
                imageData: imageData?.toString('base64'),
                resultVariable,
                inputSelector
              })
              
              // 等待人工处理完成的信号
              // 这里可以实现一个等待机制
              console.log('等待人工处理验证码...')
            }
            break
        }
      }

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('验证码识别节点执行失败:', errorMessage)
      throw new Error(`验证码识别失败: ${errorMessage}`)
    }
  }



  /**
   * 获取变量值
   */
  getVariable(name: string): any {
    return this.variables?.[name]
  }

  /**
   * 设置变量值
   */
  setVariable(name: string, value: any): void {
    if (!this.variables) {
      this.variables = new Map()
    }
    this.variables.set(name, value)
  }

  /**
   * 删除变量
   */
  deleteVariable(name: string): boolean {
    if (!this.variables) {
      return false
    }
    return this.variables.delete(name)
  }

  /**
   * 清空所有变量
   */
  clearVariables(): void {
    if (this.variables) {
      this.variables.clear()
    }
  }
}   

// 扩展 window 接口
declare global {
  interface Window {
    _elementPicker: {
      enabled: boolean
      hoveredElement: HTMLElement | null
      originalOutline: string
      originalCursor: string
      enable(): void
      disable(): void
      handleMouseOver(event: MouseEvent): void
      handleMouseOut(event: MouseEvent): void
      handleClick(event: MouseEvent): void
      generateSelector(element: HTMLElement): { selector: string, selectorType: string }
      getFullPath(element: HTMLElement): string
    }
  }
}
