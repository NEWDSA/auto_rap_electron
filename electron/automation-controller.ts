import { chromium, Browser, Page } from 'playwright'
import type { FlowNode, NodeProperties } from '../src/types/node-config'

export class AutomationController {
  private browser: Browser | null = null
  private page: Page | null = null
  private variables: Record<string, any> = {}
  private isRunning: boolean = false
  private isPickingElement: boolean = false
  private pickerLock: boolean = false
  private pickerPromiseState: 'pending' | 'resolved' | 'rejected' | null = null

  // 获取当前页面
  getCurrentPage() {
    return this.page
  }

  // 获取当前浏览器
  getCurrentBrowser() {
    return this.browser
  }

  // 设置当前页面
  async setCurrentPage(page: Page) {
    // 如果正在选择元素，不允许更改页面
    if (this.pickerLock) {
      throw new Error('正在选择元素，不能更改页面')
    }
    this.page = page
  }

  // 检查浏览器是否已打开
  isBrowserOpen() {
    return this.browser !== null && this.page !== null && !this.page.isClosed()
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
    if (this.browser && !options.forElementPicker) {
      try {
        await this.browser.close()
      } catch (e) {
        // 忽略关闭错误
      }
      this.browser = null
      this.page = null
    }

    // 如果浏览器已存在且是元素选择器调用，直接返回
    if (this.browser?.isConnected() && options.forElementPicker) {
      return
    }

    // 创建新的浏览器实例
    this.browser = await chromium.launch({
      headless: options.headless ?? false
    })

    // 添加断开连接的监听
    this.browser.on('disconnected', () => {
      // 只有在非选择器模式下才重置状态
      if (!this.pickerLock) {
        this.browser = null
        this.page = null
      }
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

    // 添加页面关闭的监听
    this.page.on('close', () => {
      // 只有在非选择器模式下才重置状态
      if (!this.pickerLock) {
        this.page = null
      }
    })

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
      case 'click':
        await this.executeClickNode(properties)
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

  private async executeClickNode(properties: NodeProperties) {
    if (!this.page) throw new Error('浏览器未启动')

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
        properties.selectorType = result.selectorType
      } catch (error: any) {
        throw new Error(`选择点击元素失败: ${error.message}`)
      }
    }

    try {
      // 根据选择器类型构建实际的选择器
      let actualSelector = targetSelector
      const currentSelectorType = selectorType || 'css'

      switch (currentSelectorType) {
        case 'id':
          actualSelector = targetSelector.startsWith('#') ? targetSelector : `#${targetSelector}`
          break
        case 'class':
          actualSelector = targetSelector.startsWith('.') ? targetSelector : `.${targetSelector}`
          break
        case 'name':
          actualSelector = targetSelector.startsWith('[name="') ? targetSelector : `[name="${targetSelector}"]`
          break
        case 'xpath':
          // XPath 选择器保持不变
          break
      }

      // 等待页面加载完成
      await this.page.waitForLoadState('networkidle', { 
        timeout: (clickTimeout || 30) * 1000 
      })

      // 等待元素可见和可交互
      const element = await this.page.waitForSelector(actualSelector, { 
        state: 'visible',
        timeout: (clickTimeout || 30) * 1000 
      })

      if (!element) {
        throw new Error('未找到可点击的元素')
      }

      // 确保元素可交互
      await element.waitForElementState('enabled', { 
        timeout: (clickTimeout || 30) * 1000 
      })

      // 确保元素在视图中
      await element.scrollIntoViewIfNeeded()
      
      // 获取当前URL
      const currentUrl = this.page.url()
      
      // 执行点击
      await element.click({
        timeout: (clickTimeout || 30) * 1000
      })
      
      // 如果需要等待加载
      if (waitAfterClick && clickTimeout) {
        // 等待URL变化（针对分页场景）
        try {
          await this.page.waitForURL(url => url !== currentUrl, { 
            timeout: clickTimeout * 1000,
            waitUntil: 'networkidle'
          })
        } catch (error) {
          // 如果URL没有变化，可能不是分页操作，继续等待页面加载
          await this.page.waitForLoadState('networkidle', { 
            timeout: clickTimeout * 1000 
          })
        }

        // 等待页面完全加载
        await this.page.waitForLoadState('domcontentloaded', { 
          timeout: clickTimeout * 1000 
        })
        
        // 额外等待以确保页面渲染完成
        await this.page.waitForTimeout(1000)
      }
    } catch (error: any) {
      const errorMessage = error.message || '未知错误'
      throw new Error(`点击元素失败: ${errorMessage}`)
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
      userAgent
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

  async startElementPicker(): Promise<{ selector: string; selectorType: string }> {
    if (!this.page) throw new Error('浏览器未启动')
    if (this.page.isClosed()) throw new Error('页面已关闭')
    if (this.pickerPromiseState === 'pending') throw new Error('已有正在进行的元素选择')

    this.pickerPromiseState = 'pending'
    this.isPickingElement = true
    this.pickerLock = true

    try {
      if (!this.page.isClosed()) {
        await this.page.evaluate(() => {
          if (window._elementPicker) {
            window._elementPicker.disable()
          }
        })

        await this.page.evaluate(() => {
          window._elementPicker = {
            enabled: false,
            hoveredElement: null,
            originalOutline: '',
            originalCursor: '',
            
            enable() {
              if (this.enabled) return
              this.enabled = true
              this.originalCursor = document.body.style.cursor
              document.body.style.cursor = 'pointer'
              document.addEventListener('mouseover', this.handleMouseOver.bind(this))
              document.addEventListener('mouseout', this.handleMouseOut.bind(this))
              document.addEventListener('click', this.handleClick.bind(this), true)
            },
            
            disable() {
              if (!this.enabled) return
              this.enabled = false
              document.body.style.cursor = this.originalCursor
              document.removeEventListener('mouseover', this.handleMouseOver.bind(this))
              document.removeEventListener('mouseout', this.handleMouseOut.bind(this))
              document.removeEventListener('click', this.handleClick.bind(this), true)
              if (this.hoveredElement) {
                this.hoveredElement.style.outline = this.originalOutline
                this.hoveredElement = null
              }
            },
            
            handleMouseOver(event: MouseEvent) {
              if (!this.enabled) return
              const element = event.target as HTMLElement
              if (!element) return
              
              if (this.hoveredElement) {
                this.hoveredElement.style.outline = this.originalOutline
              }
              this.hoveredElement = element
              this.originalOutline = element.style.outline
              element.style.outline = '2px solid #409eff'
              element.style.outlineOffset = '1px'
            },
            
            handleMouseOut(event: MouseEvent) {
              if (!this.enabled) return
              const element = event.target as HTMLElement
              if (!element) return
              
              element.style.outline = this.originalOutline
              element.style.outlineOffset = ''
              if (this.hoveredElement === element) {
                this.hoveredElement = null
              }
            },
            
            handleClick(event: MouseEvent) {
              if (!this.enabled) return
              event.preventDefault()
              event.stopPropagation()
              event.stopImmediatePropagation()
              
              const element = event.target as HTMLElement
              if (!element) return
              
              const result = this.generateSelector(element)
              this.disable()
              
              window.postMessage({ 
                type: 'ELEMENT_SELECTED', 
                selector: result.selector,
                selectorType: result.selectorType 
              }, '*')
            },
            
            generateSelector(element: HTMLElement): { selector: string, selectorType: string } {
              let selector = ''
              let selectorType = 'css'
              
              // 尝试使用 id
              if (element.id) {
                selector = element.id
                selectorType = 'id'
                // 验证选择器是否唯一且正确匹配当前元素
                const foundElement = document.getElementById(selector)
                if (foundElement === element) {
                  return { selector, selectorType }
                }
              }
              
              // 尝试使用 name 属性
              const name = element.getAttribute('name')
              if (name) {
                selector = name
                selectorType = 'name'
                // 验证选择器是否唯一且正确匹配当前元素
                const elements = document.getElementsByName(selector)
                if (elements.length === 1 && elements[0] === element) {
                  return { selector, selectorType }
                }
              }

              // 尝试使用精确的 class 组合
              if (element.className && typeof element.className === 'string') {
                const classes = element.className.trim().split(/\s+/).filter(Boolean)
                if (classes.length > 0) {
                  selector = classes.join(' ')
                  selectorType = 'class'
                  // 验证选择器是否唯一且正确匹配当前元素
                  const elements = document.getElementsByClassName(selector)
                  if (elements.length === 1 && elements[0] === element) {
                    return { selector, selectorType }
                  }

                  // 如果类组合不唯一，尝试与标签名组合
                  const tagWithClass = `${element.tagName.toLowerCase()}.${classes.join('.')}`
                  const elementsWithTag = document.querySelectorAll(tagWithClass)
                  if (elementsWithTag.length === 1 && elementsWithTag[0] === element) {
                    return { selector: tagWithClass, selectorType: 'css' }
                  }
                }
              }

              // 如果上述方法都无法唯一定位元素，使用更精确的组合选择器
              const tag = element.tagName.toLowerCase()
              let parent = element.parentElement
              let path = []
              let current = element

              // 构建元素路径
              while (parent) {
                // 获取当前元素在同级中的索引
                const siblings = Array.from(parent.children)
                const index = siblings.indexOf(current) + 1
                
                // 尝试使用 id
                if (current.id) {
                  path.unshift(`#${current.id}`)
                  break
                }
                
                // 尝试使用 class
                if (current.className && typeof current.className === 'string') {
                  const classes = current.className.trim().split(/\s+/).filter(Boolean)
                  if (classes.length > 0) {
                    const classSelector = `${tag}${classes.map(c => `.${c}`).join('')}:nth-child(${index})`
                    const elements = document.querySelectorAll(classSelector)
                    if (elements.length === 1 && elements[0] === current) {
                      path.unshift(classSelector)
                      break
                    }
                  }
                }
                
                // 使用标签名和索引
                path.unshift(`${tag}:nth-child(${index})`)
                
                // 更新循环变量
                current = parent
                parent = parent.parentElement
                
                // 防止无限循环
                if (path.length > 10) break
              }
              
              selector = path.join(' > ')
              selectorType = 'css'
              
              // 验证最终选择器
              const finalElement = document.querySelector(selector)
              if (finalElement !== element) {
                // 如果验证失败，使用完整路径
                const fullPath = this.getFullPath(element)
                return { selector: fullPath, selectorType: 'css' }
              }
              
              return { selector, selectorType }
            },
            
            getFullPath(element: HTMLElement): string {
              const path = []
              let current = element
              
              while (current && current.nodeType === Node.ELEMENT_NODE) {
                let selector = current.tagName.toLowerCase()
                
                if (current.id) {
                  selector = `#${current.id}`
                  path.unshift(selector)
                  break
                } else {
                  let nth = 1
                  let sibling = current
                  
                  while (sibling = sibling.previousElementSibling as HTMLElement) {
                    if (sibling.tagName === current.tagName) nth++
                  }
                  
                  if (nth > 1) selector += `:nth-of-type(${nth})`
                }
                
                path.unshift(selector)
                current = current.parentElement as HTMLElement
              }
              
              return path.join(' > ')
            }
          }
          
          window._elementPicker.enable()
        })

        const result = await this.page.evaluate(() => {
          return new Promise<{ selector: string, selectorType: string }>((resolve, reject) => {
            let timeoutId: number | null = null
            let isResolved = false

            const handler = (event: MessageEvent) => {
              if (event.data?.type === 'ELEMENT_SELECTED') {
                cleanup()
                isResolved = true
                resolve({
                  selector: event.data.selector,
                  selectorType: event.data.selectorType
                })
              }
            }

            const cleanup = () => {
              window.removeEventListener('message', handler)
              if (timeoutId !== null) {
                clearTimeout(timeoutId)
                timeoutId = null
              }
              if (window._elementPicker) {
                window._elementPicker.disable()
              }
            }

            window.addEventListener('message', handler)
            window.addEventListener('unload', cleanup, { once: true })

            timeoutId = window.setTimeout(() => {
              if (!isResolved) {
                cleanup()
                reject(new Error('选择元素超时'))
              }
            }, 300000)
          })
        })

        this.pickerPromiseState = 'resolved'
        return result
      } else {
        this.pickerPromiseState = 'rejected'
        throw new Error('页面已关闭，请重新打开页面')
      }
    } catch (error) {
      this.pickerPromiseState = 'rejected'
      try {
        if (this.page && !this.page.isClosed()) {
          await this.page.evaluate(() => {
            if (window._elementPicker) {
              window._elementPicker.disable()
            }
          })
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
    if (!this.page) throw new Error('浏览器未启动')

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
        case 'xpath':
          // 使用 XPath
          const element = await this.page.locator(selector).first()
          if (element) {
            // 确保元素可见和可交互
            await element.waitFor({ state: 'visible' })
            await element.waitFor({ state: 'attached' })
            // 如果需要清除原有内容
            if (clearFirst) {
              await element.evaluate((el: HTMLInputElement) => {
                el.value = ''
                el.dispatchEvent(new Event('input', { bubbles: true }))
                el.dispatchEvent(new Event('change', { bubbles: true }))
              })
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

      // 等待元素可见和可交互
      await this.page.waitForSelector(actualSelector, { 
        state: 'visible',
        timeout: 30000
      })

      // 获取元素并确保它是输入框
      const element = await this.page.$(actualSelector)
      if (!element) {
        throw new Error('未找到输入元素')
      }

      // 确保元素可交互
      await element.waitForElementState('enabled')

      // 如果需要清除原有内容
      if (clearFirst) {
        await this.page.$eval(actualSelector, (el: HTMLInputElement) => {
          el.value = ''
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        })
      }

      // 确保元素在视图中
      await element.scrollIntoViewIfNeeded()

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

      // 验证输入是否成功
      const inputValue = await element.inputValue()
      if (inputValue !== text) {
        throw new Error('输入验证失败')
      }

    } catch (error: any) {
      const errorMessage = error.message || '未知错误'
      throw new Error(`输入文本失败: ${errorMessage}`)
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