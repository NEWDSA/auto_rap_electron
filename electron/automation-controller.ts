import { chromium, Browser, Page } from 'playwright'
import type { FlowNode, NodeProperties } from '../src/types/node-config'

export class AutomationController {
  private browser: Browser | null = null
  private page: Page | null = null
  private variables: Record<string, any> = {}
  private isRunning: boolean = false

  async initBrowser(options: {
    url?: string
    width?: number
    height?: number
    headless?: boolean
    incognito?: boolean
    userAgent?: string
  }) {
    // 如果已有浏览器实例，先关闭
    if (this.browser) {
      try {
        await this.browser.close()
      } catch (e) {
        // 忽略关闭错误
      }
    }

    // 创建新的浏览器实例
    this.browser = await chromium.launch({
      headless: options.headless ?? false
    })

    // 创建新的上下文
    const context = await this.browser.newContext({
      viewport: options.width && options.height ? {
        width: options.width,
        height: options.height
      } : undefined,
      userAgent: options.userAgent
    })

    // 创建新的页面
    this.page = await context.newPage()

    // 如果提供了URL，则导航到该页面
    if (options.url) {
      await this.page.goto(options.url)
    }
  }

  async start(nodes: FlowNode[]) {
    if (this.isRunning) return
    this.isRunning = true

    try {
      // 检查并确保浏览器正常运行
      if (!this.browser || !this.browser.isConnected()) {
        if (this.browser) {
          try {
            await this.browser.close()
          } catch (e) {
            // 忽略关闭错误
          }
        }
        this.browser = await chromium.launch({
          headless: false
        })
      }

      // 检查并确保页面正常运行
      if (!this.page || this.page.isClosed()) {
        if (this.page) {
          try {
            await this.page.close()
          } catch (e) {
            // 忽略关闭错误
          }
        }
        this.page = await this.browser.newPage()
      }

      // 执行根节点
      const rootNodes = nodes.filter(node => !node.properties.parentId)
      for (const node of rootNodes) {
        if (!this.isRunning) break
        await this.executeNode(node, nodes)
      }

      // 执行完成后设置状态
      this.isRunning = false
    } catch (error) {
      console.error('执行流程出错:', error)
      // 出错时才关闭浏览器
      await this.stop()
      throw error
    }
  }

  async stop() {
    this.isRunning = false
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private async executeNode(node: FlowNode, nodes: FlowNode[] = []) {
    if (!this.page) throw new Error('浏览器未启动')

    const { type, properties } = node
    
    switch (type) {
      case 'start':
      case 'end':
        // 控制节点，不需要执行具体操作
        break
      case 'browser':
        await this.executeBrowserNode(properties)
        break
      case 'extract':
        await this.executeExtractNode(properties)
        break
      case 'keyboard':
        await this.executeKeyboardNode(properties)
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
      default:
        throw new Error(`未知的节点类型: ${type}`)
    }
  }

  private async executeBrowserNode(properties: NodeProperties) {
    if (!this.page) return

    const { 
      actionType, 
      url, 
      waitForLoad, 
      timeout,
      width, 
      height, 
      headless, 
      incognito, 
      userAgent,
      clickSelector,
      waitAfterClick,
      clickTimeout
    } = properties
    
    // 设置浏览器窗口大小
    if (width && height) {
      await this.page.setViewportSize({ width, height })
    }

    // 设置用户代理
    if (userAgent) {
      await this.page.setExtraHTTPHeaders({ 'User-Agent': userAgent })
    }

    switch (actionType) {
      case 'goto':
        if (url) {
          await this.page.goto(url)
          if (waitForLoad && timeout) {
            await this.page.waitForLoadState('networkidle', { timeout: timeout * 1000 })
          }
        }
        break
      case 'click':
        if (clickSelector) {
          // 等待元素可见
          await this.page.waitForSelector(clickSelector, { state: 'visible' })
          // 执行点击
          await this.page.click(clickSelector)
          // 如果需要等待加载
          if (waitAfterClick && clickTimeout) {
            await this.page.waitForLoadState('networkidle', { timeout: clickTimeout * 1000 })
          }
        }
        break
      case 'back':
        await this.page.goBack()
        if (waitForLoad && timeout) {
          await this.page.waitForLoadState('networkidle', { timeout: timeout * 1000 })
        }
        break
      case 'forward':
        await this.page.goForward()
        if (waitForLoad && timeout) {
          await this.page.waitForLoadState('networkidle', { timeout: timeout * 1000 })
        }
        break
      case 'reload':
        await this.page.reload()
        if (waitForLoad && timeout) {
          await this.page.waitForLoadState('networkidle', { timeout: timeout * 1000 })
        }
        break
      case 'close':
        await this.page.close()
        this.page = null
        break
      case 'maximize':
        await this.page.setViewportSize({ width: 1920, height: 1080 })
        break
      case 'minimize':
        await this.page.setViewportSize({ width: 800, height: 600 })
        break
    }
  }

  private async executeExtractNode(properties: NodeProperties) {
    if (!this.page) return

    const { selector, extractType, attributeName, variableName } = properties
    if (!selector || !variableName) return

    let value: string | null = null
    switch (extractType) {
      case 'text':
        value = await this.page.textContent(selector)
        break
      case 'attribute':
        if (attributeName) {
          value = await this.page.getAttribute(selector, attributeName)
        }
        break
      case 'html':
        value = await this.page.innerHTML(selector)
        break
    }

    if (value !== null) {
      this.variables[variableName] = value
    }
  }

  private async executeKeyboardNode(properties: NodeProperties) {
    if (!this.page) return

    const { key, modifiers = [], text } = properties
    if (key) {
      await this.page.keyboard.press(key)
    } else if (text) {
      await this.page.keyboard.type(text)
    }
  }

  private async executeMouseNode(properties: NodeProperties) {
    if (!this.page) return

    const { actionType, selector, x, y, smooth } = properties
    switch (actionType) {
      case 'moveToElement':
        if (selector) {
          await this.page.hover(selector)
        }
        break
      case 'moveToPosition':
        if (typeof x === 'number' && typeof y === 'number') {
          await this.page.mouse.move(x, y)
        }
        break
      case 'scrollToElement':
        if (selector) {
          await this.page.$eval(selector, (el: HTMLElement) => {
            el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
          })
        }
        break
      case 'scrollToPosition':
        if (typeof x === 'number' && typeof y === 'number') {
          await this.page.evaluate(({ x, y, smooth }: { x: number, y: number, smooth?: boolean }) => {
            window.scrollTo({ left: x, top: y, behavior: smooth ? 'smooth' : 'auto' })
          }, { x, y, smooth })
        }
        break
    }
  }

  private async executeWaitNode(properties: NodeProperties) {
    if (!this.page) return

    const { waitType, timeout = 30, selector, reverse } = properties
    switch (waitType) {
      case 'timeout':
        await this.page.waitForTimeout(timeout * 1000)
        break
      case 'visible':
        if (selector) {
          if (reverse) {
            await this.page.waitForSelector(selector, { state: 'hidden', timeout: timeout * 1000 })
          } else {
            await this.page.waitForSelector(selector, { state: 'visible', timeout: timeout * 1000 })
          }
        }
        break
      case 'exists':
        if (selector) {
          if (reverse) {
            await this.page.waitForSelector(selector, { state: 'detached', timeout: timeout * 1000 })
          } else {
            await this.page.waitForSelector(selector, { timeout: timeout * 1000 })
          }
        }
        break
    }
  }

  private async executeScreenshotNode(properties: NodeProperties) {
    if (!this.page) return

    const { screenshotType, selector, path, omitBackground, quality } = properties
    if (!path) return

    const options: any = {
      path,
      omitBackground: omitBackground || false,
    }

    // 只有 jpg/jpeg 格式支持 quality 选项
    if (path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg')) {
      options.quality = quality || 100
    }

    switch (screenshotType) {
      case 'fullPage':
        await this.page.screenshot({ ...options, fullPage: true })
        break
      case 'viewport':
        await this.page.screenshot(options)
        break
      case 'element':
        if (selector) {
          const element = await this.page.$(selector)
          if (element) {
            await element.screenshot(options)
          }
        }
        break
    }
  }

  private async executeSwitchNode(properties: NodeProperties, node: FlowNode, nodes: FlowNode[]) {
    if (!this.page) return

    const { condition, selector, value } = properties
    if (!selector) return

    let result = false
    switch (condition) {
      case 'exists':
        result = await this.page.$(selector) !== null
        break
      case 'notExists':
        result = await this.page.$(selector) === null
        break
      case 'visible':
        result = await this.page.isVisible(selector)
        break
      case 'notVisible':
        result = !await this.page.isVisible(selector)
        break
      case 'clickable':
        const element = await this.page.$(selector)
        result = element ? await element.isEnabled() : false
        break
      case 'notClickable':
        const el = await this.page.$(selector)
        result = el ? !await el.isEnabled() : true
        break
      case 'textContains':
        if (value) {
          const text = await this.page.textContent(selector)
          result = text?.includes(value) || false
        }
        break
      case 'textNotContains':
        if (value) {
          const text = await this.page.textContent(selector)
          result = !text?.includes(value)
        }
        break
      case 'textEquals':
        if (value) {
          const text = await this.page.textContent(selector)
          result = text === value
        }
        break
      case 'textNotEquals':
        if (value) {
          const text = await this.page.textContent(selector)
          result = text !== value
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
    if (!this.page) return

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
          const elements = await this.page.$$(selector)
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
    if (!this.page) return false

    switch (condition) {
      case 'exists':
        return await this.page.$(selector) !== null
      case 'visible':
        return await this.page.isVisible(selector)
      case 'hidden':
        return !(await this.page.isVisible(selector))
      case 'clickable':
        const element = await this.page.$(selector)
        if (!element) return false
        return await element.isEnabled()
      default:
        return false
    }
  }

  async startElementPicker(): Promise<string> {
    if (!this.page) throw new Error('浏览器未启动')

    // 注入选择器脚本
    await this.page.evaluate(() => {
      if (window._elementPicker) return
      
      window._elementPicker = {
        enabled: false,
        hoveredElement: null,
        originalOutline: '',
        
        enable() {
          this.enabled = true
          document.addEventListener('mouseover', this.handleMouseOver)
          document.addEventListener('mouseout', this.handleMouseOut)
          document.addEventListener('click', this.handleClick)
        },
        
        disable() {
          this.enabled = false
          document.removeEventListener('mouseover', this.handleMouseOver)
          document.removeEventListener('mouseout', this.handleMouseOut)
          document.removeEventListener('click', this.handleClick)
          if (this.hoveredElement) {
            this.hoveredElement.style.outline = this.originalOutline
          }
        },
        
        handleMouseOver(event: MouseEvent) {
          const element = event.target as HTMLElement
          if (window._elementPicker.hoveredElement) {
            window._elementPicker.hoveredElement.style.outline = window._elementPicker.originalOutline
          }
          window._elementPicker.hoveredElement = element
          window._elementPicker.originalOutline = element.style.outline
          element.style.outline = '2px solid #409eff'
        },
        
        handleMouseOut(event: MouseEvent) {
          const element = event.target as HTMLElement
          element.style.outline = window._elementPicker.originalOutline
          window._elementPicker.hoveredElement = null
        },
        
        handleClick(event: MouseEvent) {
          event.preventDefault()
          event.stopPropagation()
          const element = event.target as HTMLElement
          window._elementPicker.disable()
          window._elementPicker.generateSelector(element)
        },
        
        generateSelector(element: HTMLElement) {
          let selector = ''
          
          // 尝试使用 id
          if (element.id) {
            selector = `#${element.id}`
          }
          // 尝试使用 class
          else if (element.className && typeof element.className === 'string') {
            selector = `.${element.className.split(' ')[0]}`
          }
          // 使用标签名和属性
          else {
            selector = element.tagName.toLowerCase()
            if (element.getAttribute('name')) {
              selector += `[name="${element.getAttribute('name')}"]`
            }
          }
          
          window.postMessage({ type: 'ELEMENT_SELECTED', selector }, '*')
        }
      }
      
      window._elementPicker.enable()
    })

    // 等待元素选择
    const selector = await this.page.evaluate(() => {
      return new Promise<string>((resolve) => {
        window.addEventListener('message', (event) => {
          if (event.data.type === 'ELEMENT_SELECTED') {
            resolve(event.data.selector)
          }
        })
      })
    })

    return selector
  }

  private async executeInputNode(properties: NodeProperties) {
    if (!this.page) return

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

    if (!selector || !text) return

    try {
      // 根据选择器类型构建实际的选择器
      let actualSelector = selector
      switch (selectorType) {
        case 'id':
          actualSelector = `#${selector}`
          break
        case 'class':
          actualSelector = `.${selector}`
          break
        case 'name':
          actualSelector = `[name="${selector}"]`
          break
        case 'xpath':
          // 使用 XPath
          const elements = await this.page.$x(selector)
          if (elements.length > 0) {
            const element = elements[0]
            // 如果需要清除原有内容
            if (clearFirst) {
              await element.evaluate((el: HTMLInputElement) => el.value = '')
            }
            // 输入文本
            if (simulateTyping) {
              await element.type(text, { delay: typingDelay })
            } else {
              await element.fill(text)
            }
            // 等待
            if (waitAfterInput && waitTimeout) {
              await this.page.waitForTimeout(waitTimeout * 1000)
            }
            return
          }
          throw new Error('未找到匹配的元素')
      }

      // 等待元素出现
      await this.page.waitForSelector(actualSelector)

      // 如果需要清除原有内容
      if (clearFirst) {
        await this.page.$eval(actualSelector, (el: HTMLInputElement) => el.value = '')
      }

      // 输入文本
      if (simulateTyping) {
        await this.page.type(actualSelector, text, { delay: typingDelay })
      } else {
        await this.page.fill(actualSelector, text)
      }

      // 等待
      if (waitAfterInput && waitTimeout) {
        await this.page.waitForTimeout(waitTimeout * 1000)
      }
    } catch (error) {
      throw new Error(`输入文本失败: ${error.message}`)
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
      enable(): void
      disable(): void
      handleMouseOver(event: MouseEvent): void
      handleMouseOut(event: MouseEvent): void
      handleClick(event: MouseEvent): void
      generateSelector(element: HTMLElement): void
    }
  }
} 