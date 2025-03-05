import { BrowserWindow, ipcMain } from 'electron'
import puppeteer from 'puppeteer-core'

// 扩展 Window 接口
declare global {
  interface Window {
    _recordClick: (event: MouseEvent) => void
    _recordInput: (event: Event) => void
    _recordScroll: () => void
    _recordKeypress: (event: KeyboardEvent) => void
    _recordMouseMove: (event: MouseEvent) => void
    sendToMain: (type: string, data: any) => void
  }
}

export class RecorderService {
  private static instance: RecorderService
  private isRecording: boolean = false
  private browser: puppeteer.Browser | null = null
  private page: puppeteer.Page | null = null
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  public static getInstance(): RecorderService {
    if (!RecorderService.instance) {
      RecorderService.instance = new RecorderService()
    }
    return RecorderService.instance
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  public async startRecording() {
    if (this.isRecording) {
      return
    }

    try {
      // 启动浏览器
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
      })

      // 获取页面
      this.page = await this.browser.newPage()

      // 注入事件监听脚本
      await this.injectEventListeners()

      this.isRecording = true
    } catch (error) {
      console.error('启动录制失败:', error)
      throw error
    }
  }

  public async stopRecording() {
    if (!this.isRecording) {
      return
    }

    try {
      // 移除事件监听
      if (this.page) {
        await this.page.evaluate(() => {
          window.removeEventListener('click', window._recordClick)
          window.removeEventListener('input', window._recordInput)
          window.removeEventListener('scroll', window._recordScroll)
          window.removeEventListener('keypress', window._recordKeypress)
          window.removeEventListener('mousemove', window._recordMouseMove)
        })
      }

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

  private async injectEventListeners() {
    if (!this.page || !this.mainWindow) {
      throw new Error('页面或主窗口未初始化')
    }

    await this.page.evaluate(() => {
      // 定义事件处理函数
      window._recordClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        if (!target) return

        // 获取选择器
        const selector = generateSelector(target)
        if (!selector) return

        // 发送事件到主进程
        window.postMessage({
          type: 'recorder:click',
          data: {
            selector: selector.selector,
            selectorType: selector.type
          }
        }, '*')
      }

      window._recordInput = (event: Event) => {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement
        if (!target) return

        // 获取选择器
        const selector = generateSelector(target)
        if (!selector) return

        // 发送事件到主进程
        window.postMessage({
          type: 'recorder:input',
          data: {
            selector: selector.selector,
            selectorType: selector.type,
            value: target.value
          }
        }, '*')
      }

      window._recordScroll = () => {
        // 发送事件到主进程
        window.postMessage({
          type: 'recorder:scroll',
          data: {
            x: window.scrollX,
            y: window.scrollY
          }
        }, '*')
      }

      window._recordKeypress = (event: KeyboardEvent) => {
        // 发送事件到主进程
        window.postMessage({
          type: 'recorder:keypress',
          data: {
            key: event.key
          }
        }, '*')
      }

      window._recordMouseMove = (event: MouseEvent) => {
        // 发送事件到主进程
        window.postMessage({
          type: 'recorder:mouseMove',
          data: {
            x: event.clientX,
            y: event.clientY
          }
        }, '*')
      }

      // 生成选择器函数
      function generateSelector(element: HTMLElement) {
        // 尝试使用 ID
        if (element.id) {
          return { selector: `#${element.id}`, type: 'id' as const }
        }

        // 尝试使用 name 属性
        if (element.getAttribute('name')) {
          return { selector: `[name="${element.getAttribute('name')}"]`, type: 'name' as const }
        }

        // 尝试使用 class
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c)
          if (classes.length > 0) {
            return { selector: `.${classes.join('.')}`, type: 'class' as const }
          }
        }

        // 生成 CSS 选择器路径
        let path = []
        let current = element
        while (current && current !== document.body) {
          let selector = current.tagName.toLowerCase()
          if (current.className) {
            selector += `.${current.className.split(' ').join('.')}`
          }
          path.unshift(selector)
          current = current.parentElement as HTMLElement
        }
        return { selector: path.join(' > '), type: 'css' as const }
      }

      // 添加事件监听
      window.addEventListener('click', window._recordClick, true)
      window.addEventListener('input', window._recordInput, true)
      window.addEventListener('scroll', window._recordScroll, true)
      window.addEventListener('keypress', window._recordKeypress, true)
      window.addEventListener('mousemove', window._recordMouseMove, true)
    })

    // 监听页面消息
    await this.page.exposeFunction('sendToMain', (type: string, data: any) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send(type, data)
      }
    })

    // 设置消息监听
    await this.page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type && event.data.type.startsWith('recorder:')) {
          window.sendToMain(event.data.type, event.data.data)
        }
      })
    })
  }
}

// 设置 IPC 事件处理
export function setupRecorderIPC() {
  const recorder = RecorderService.getInstance()

  ipcMain.handle('recorder:start', async () => {
    await recorder.startRecording()
  })

  ipcMain.handle('recorder:stop', async () => {
    await recorder.stopRecording()
  })
} 