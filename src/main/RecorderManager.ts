import { BrowserWindow, ipcMain } from 'electron'
import puppeteer from 'puppeteer-core'

export class RecorderManager {
  private static instance: RecorderManager
  private isRecording: boolean = false
  private browser: puppeteer.Browser | null = null
  private page: puppeteer.Page | null = null
  private mainWindow: BrowserWindow | null = null

  private constructor() {
    this.setupIPC()
  }

  public static getInstance(): RecorderManager {
    if (!RecorderManager.instance) {
      RecorderManager.instance = new RecorderManager()
    }
    return RecorderManager.instance
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private setupIPC(): void {
    // 处理开始录制请求
    ipcMain.handle('recorder:start', async () => {
      await this.startRecording()
    })

    // 处理停止录制请求
    ipcMain.handle('recorder:stop', async () => {
      await this.stopRecording()
    })
  }

  private async startRecording(): Promise<void> {
    if (this.isRecording) return

    try {
      // 启动浏览器
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--start-maximized']
      })

      // 创建新页面
      this.page = await this.browser.newPage()

      // 设置页面事件监听
      await this.setupPageListeners()

      this.isRecording = true
    } catch (error) {
      console.error('启动录制失败:', error)
      throw error
    }
  }

  private async stopRecording(): Promise<void> {
    if (!this.isRecording) return

    try {
      // 关闭浏览器
      if (this.browser) {
        await this.browser.close()
        this.browser = null
        this.page = null
      }

      this.isRecording = false
    } catch (error) {
      console.error('停止录制失败:', error)
      throw error
    }
  }

  private async setupPageListeners(): Promise<void> {
    if (!this.page || !this.mainWindow) return

    // 监听点击事件
    await this.page.exposeFunction('onMouseClick', (event: any) => {
      this.mainWindow?.webContents.send('recorder:action', {
        type: 'click',
        selector: this.getSelector(event.target),
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      })
    })

    // 监听输入事件
    await this.page.exposeFunction('onInput', (event: any) => {
      this.mainWindow?.webContents.send('recorder:action', {
        type: 'input',
        selector: this.getSelector(event.target),
        value: event.value,
        timestamp: Date.now()
      })
    })

    // 监听滚动事件
    await this.page.exposeFunction('onScroll', (event: any) => {
      this.mainWindow?.webContents.send('recorder:action', {
        type: 'scroll',
        x: event.scrollX,
        y: event.scrollY,
        timestamp: Date.now()
      })
    })

    // 监听键盘事件
    await this.page.exposeFunction('onKeyPress', (event: any) => {
      this.mainWindow?.webContents.send('recorder:action', {
        type: 'keypress',
        value: event.key,
        timestamp: Date.now()
      })
    })

    // 注入事件监听脚本
    await this.page.evaluate(() => {
      document.addEventListener('click', (event) => {
        // @ts-ignore
        window.onMouseClick({
          target: event.target,
          clientX: event.clientX,
          clientY: event.clientY
        })
      })

      document.addEventListener('input', (event) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          // @ts-ignore
          window.onInput({
            target: event.target,
            value: event.target.value
          })
        }
      })

      document.addEventListener('scroll', () => {
        // @ts-ignore
        window.onScroll({
          scrollX: window.scrollX,
          scrollY: window.scrollY
        })
      })

      document.addEventListener('keypress', (event) => {
        // @ts-ignore
        window.onKeyPress({
          key: event.key
        })
      })
    })
  }

  private getSelector(element: Element): string {
    // 尝试使用 ID
    if (element.id) {
      return `#${element.id}`
    }

    // 尝试使用类名
    if (element.className && typeof element.className === 'string') {
      return `.${element.className.split(' ').join('.')}`
    }

    // 尝试使用标签名和属性
    const tagName = element.tagName.toLowerCase()
    const attributes = Array.from(element.attributes)
      .filter(attr => ['id', 'class', 'style'].indexOf(attr.name) === -1)
      .map(attr => `[${attr.name}="${attr.value}"]`)
      .join('')

    return `${tagName}${attributes}`
  }
} 