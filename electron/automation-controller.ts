import { chromium, Browser, Page, BrowserContext, Locator } from 'playwright'
import type { FlowNode, NodeProperties } from '../src/types/node-config'
import { ExportUtils } from '../src/utils/exportUtils'

export class AutomationController {
  private browser: Browser | null = null
  private page: Page | null = null
  private variables: Record<string, any> = {}
  private isRunning: boolean = false
  private isPickingElement: boolean = false
  private pickerLock: boolean = false
  private pickerPromiseState: 'pending' | 'resolved' | 'rejected' | null = null
  private lastExtractedData: any = null

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

    try {
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
    } catch (error) {
      console.error('初始化浏览器失败:', error)
      throw error
    }
  }

  async start(nodes: FlowNode[]) {
    if (this.isRunning) return
    this.isRunning = true

    try {
      // 始终关闭现有的浏览器实例，确保每次从干净状态开始
      if (this.browser) {
        try {
          console.log('关闭现有浏览器实例，准备重新启动...');
          await this.browser.close();
        } catch (error: unknown) {
          console.warn('关闭浏览器时出错:', error);
          // 忽略关闭错误
        }
        this.browser = null;
        this.page = null;
      }

      // 启动新的浏览器实例
      console.log('启动新的浏览器实例...');
      try {
        const { app } = require('electron');
        const path = require('path');
        const os = require('os');

        // 获取 Chromium 路径
        let chromiumPath: string;
        if (app.isPackaged) {
          // 在打包后的环境中
          chromiumPath = path.join(process.resourcesPath, 'chromium', 'chrome-win', 'chrome.exe');
          console.log('打包环境 Chromium 路径:', chromiumPath);
        } else {
          // 在开发环境中
          chromiumPath = path.join(
            os.homedir(),
            'AppData',
            'Local',
            'ms-playwright',
            'chromium-1097',
            'chrome.exe'
          );
          console.log('开发环境 Chromium 路径:', chromiumPath);
        }

        console.log('尝试使用 Chromium 路径:', chromiumPath);

        this.browser = await chromium.launch({
          headless: false,
          executablePath: chromiumPath,
          args: ['--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials']
        });
        console.log('浏览器启动成功');
      } catch (error) {
        console.error('使用指定路径启动浏览器失败:', error);
        console.log('尝试使用默认配置启动浏览器...');
        this.browser = await chromium.launch({
          headless: false,
          args: ['--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials']
        });
      }

      // 创建新的页面
      console.log('创建新的页面...');
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true
      });
      this.page = await context.newPage();

      // 配置页面
      await this.page.setDefaultTimeout(30000); // 设置默认超时为30秒
      
      // 设置浏览器关闭事件处理
      this.browser.on('disconnected', () => {
        console.log('浏览器已断开连接');
        this.browser = null;
        this.page = null;
        this.isRunning = false;
      });

      // 执行根节点
      console.log('开始执行流程节点...');
      const rootNodes = nodes.filter(node => !node.properties.parentId)
      for (const node of rootNodes) {
        if (!this.isRunning) break
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
      case 'scroll':
        await this.executeScrollNode(properties)
        break
      case 'export':
        await this.executeExportNode(properties)
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

      console.log(`点击元素: 选择器类型=${currentSelectorType}, 原始选择器=${targetSelector}, 实际选择器=${actualSelector}`)

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
          await this.page.waitForURL((url: URL) => url.toString() !== currentUrl, { 
            timeout: clickTimeout * 1000,
            waitUntil: 'networkidle'
          })
        } catch (error: unknown) {
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
      const errorMessage = error instanceof Error ? error.message : '未知错误'
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
    
    try {
      console.log(`执行浏览器操作: ${actionType}, 目标: ${url || '当前页面'}`);
      
      // 设置浏览器窗口大小
      if (width && height) {
        console.log(`设置视窗大小: ${width}x${height}`);
        await this.page.setViewportSize({ width, height });
      }
  
      // 设置用户代理
      if (userAgent) {
        console.log(`设置用户代理: ${userAgent}`);
        await this.page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
      }
  
      switch (actionType) {
        case 'goto':
          if (url) {
            console.log(`导航到URL: ${url}`);
            
            // 尝试导航，添加重试机制
            let success = false;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!success && attempts < maxAttempts) {
              try {
                attempts++;
                const response = await this.page.goto(url, {
                  timeout: timeout ? timeout * 1000 : 30000,
                  waitUntil: 'domcontentloaded'
                });
                
                if (!response) {
                  console.warn(`导航没有返回响应，URL: ${url}`);
                  if (attempts < maxAttempts) continue;
                }
                
                success = true;
                console.log(`成功导航到: ${this.page.url()}`);
                
                // 等待页面加载完成
                if (waitForLoad) {
                  try {
                    console.log('等待网络活动完成...');
                    await this.page.waitForLoadState('networkidle', { 
                      timeout: timeout ? timeout * 1000 : 30000 
                    });
                  } catch (e) {
                    console.warn('等待网络活动超时，继续执行', e);
                  }
                }
              } catch (error) {
                console.error(`导航失败(尝试 ${attempts}/${maxAttempts}):`, error);
                if (attempts >= maxAttempts) throw error;
                
                // 短暂等待后重试
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          break;
        case 'back':
          console.log('返回上一页');
          await this.page.goBack();
          if (waitForLoad) {
            await this.page.waitForLoadState('networkidle', { 
              timeout: timeout ? timeout * 1000 : 30000 
            }).catch(e => console.warn('等待网络活动超时', e));
          }
          break;
        case 'forward':
          console.log('前往下一页');
          await this.page.goForward();
          if (waitForLoad) {
            await this.page.waitForLoadState('networkidle', { 
              timeout: timeout ? timeout * 1000 : 30000 
            }).catch(e => console.warn('等待网络活动超时', e));
          }
          break;
        case 'reload':
          console.log('刷新页面');
          await this.page.reload();
          if (waitForLoad) {
            await this.page.waitForLoadState('networkidle', { 
              timeout: timeout ? timeout * 1000 : 30000 
            }).catch(e => console.warn('等待网络活动超时', e));
          }
          break;
        case 'close':
          console.log('关闭页面');
          await this.page.close();
          this.page = null;
          break;
        case 'maximize':
          console.log('最大化窗口');
          await this.page.setViewportSize({ width: 1920, height: 1080 });
          break;
        case 'minimize':
          console.log('最小化窗口');
          await this.page.setViewportSize({ width: 800, height: 600 });
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
    if (!this.page) throw new Error('浏览器未启动')

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
      await this.page.waitForSelector(actualSelector, waitOptions as any)
      console.log(`选择器 ${actualSelector} 已找到`)

      switch (extractType) {
        case 'text':
          value = await this.page.textContent(actualSelector)
          if (trimContent && typeof value === 'string') {
            value = value.trim()
          }
          break

        case 'attribute':
          if (attributeName) {
            value = await this.page.getAttribute(actualSelector, attributeName)
            if (trimContent && typeof value === 'string') {
              value = value.trim()
            }
          }
          break

        case 'html':
          value = await this.page.innerHTML(actualSelector)
          if (trimContent && typeof value === 'string') {
            value = value.trim()
          }
          break

        case 'table':
          // 提取表格数据
          const tableData = []
          
          // 如果有表头
          if (hasHeader && headerSelector) {
            const headers = await this.page.$$eval(headerSelector, cells => 
              cells.map(cell => cell.textContent?.trim() || '')
            )
            if (headers.length > 0) {
              tableData.push(headers)
            }
          }

          // 提取数据行
          if (rowSelector) {
            const rows = await this.page.$$(rowSelector)
            for (const row of rows) {
              const cells = cellSelector 
                ? await row.$$(cellSelector)
                : await row.$$('td, th')
              
              const rowData = await Promise.all(
                cells.map(cell => 
                  cell.evaluate(node => node.textContent?.trim() || '')
                )
              )
              
              tableData.push(rowData)
            }
          }
          
          value = tableData
          break

        case 'list':
          // 提取列表数据
          value = await this.page.$$eval(actualSelector, (elements, extractHTML) => {
            return elements.map(el => 
              extractHTML ? el.innerHTML : el.textContent?.trim()
            )
          }, extractInnerHTML)
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
    if (!this.page) throw new Error('页面未打开')

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
      let element = null
      if (selector) {
        element = await this.page.locator(selector).first()
        await element.waitFor({ state: 'visible', timeout: 30000 })
        await element.scrollIntoViewIfNeeded()
        await element.focus()
      }

      switch (keyboardActionType) {
        case 'press':
          if (key) {
            if (modifiers && modifiers.length > 0) {
              // 使用组合键语法 (例如: 'Control+A', 'Shift+Tab')
              const modifierKey = modifiers.map(mod => this.normalizeModifierKey(mod)).join('+')
              const combinedKey = `${modifierKey}+${key}`
              await this.page.keyboard.press(combinedKey)
            } else {
              // 处理特殊键 (例如: 'Enter', 'F11', 'Tab')
              await this.page.keyboard.press(key)
            }

            // 特殊处理：如果是 Enter 键，等待页面变化
            if (key.toLowerCase() === 'enter') {
              await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
            }
          }
          break

        case 'type':
          if (text) {
            if (element) {
              if (simulateTyping) {
                // 使用 pressSequentially 进行逐字符输入，模拟人工输入
                await element.pressSequentially(text, { delay: typingDelay || 100 })
              } else {
                // 使用 fill 进行快速输入
                await element.fill(text)
              }
            } else {
              // 如果没有目标元素，使用 keyboard.type
              await this.page.keyboard.type(text, { delay: simulateTyping ? (typingDelay || 100) : 0 })
            }
          }
          break
      }

      // 处理等待时间
      if (waitAfterInput && waitTimeout) {
        await this.page.waitForTimeout(waitTimeout)
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

  private async executeMouseNode(properties: NodeProperties) {
    if (!this.page) return

    const { actionType, selector, x, y } = properties
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
    }
  }

  private async executeWaitNode(properties: NodeProperties) {
    if (!this.page) return

    const { waitType, timeout = 30, selector, selectorType, reverse } = properties
    
    switch (waitType) {
      case 'timeout':
        await this.page.waitForTimeout(timeout * 1000)
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

          if (waitType === 'visible') {
            if (reverse) {
              await this.page.waitForSelector(actualSelector, { state: 'hidden', timeout: timeout * 1000 })
            } else {
              await this.page.waitForSelector(actualSelector, { state: 'visible', timeout: timeout * 1000 })
            }
          } else if (waitType === 'exists') {
            if (reverse) {
              await this.page.waitForSelector(actualSelector, { state: 'detached', timeout: timeout * 1000 })
            } else {
              await this.page.waitForSelector(actualSelector, { timeout: timeout * 1000 })
            }
          } else if (waitType === 'clickable') {
            const element = await this.page.waitForSelector(actualSelector, { 
              state: 'visible', 
              timeout: timeout * 1000 
            })
            await element.waitForElementState('enabled', { timeout: timeout * 1000 })
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
              
              // 使用事件委托，将事件监听器绑定到document上
              document.addEventListener('mouseover', this.handleMouseOver.bind(this))
              document.addEventListener('mouseout', this.handleMouseOut.bind(this))
              document.addEventListener('click', this.handleClick.bind(this), true)
            },
            
            disable() {
              if (!this.enabled) return
              this.enabled = false
              document.body.style.cursor = this.originalCursor
              
              // 移除事件监听器
              document.removeEventListener('mouseover', this.handleMouseOver.bind(this))
              document.removeEventListener('mouseout', this.handleMouseOut.bind(this))
              document.removeEventListener('click', this.handleClick.bind(this), true)
              
              // 清理高亮效果
              if (this.hoveredElement) {
                this.hoveredElement.style.outline = this.originalOutline
                this.hoveredElement = null
              }
            },
            
            handleMouseOver(event: MouseEvent) {
              if (!this.enabled) return
              const element = event.target as HTMLElement
              if (!element || element === document.body || element === document.documentElement) return
              
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
              
              if (this.hoveredElement === element) {
                element.style.outline = this.originalOutline
                element.style.outlineOffset = ''
                this.hoveredElement = null
              }
            },
            
            handleClick(event: MouseEvent) {
              if (!this.enabled) return
              event.preventDefault()
              event.stopPropagation()
              event.stopImmediatePropagation()
              
              const element = event.target as HTMLElement
              if (!element || element === document.body || element === document.documentElement) return
              
              const result = this.generateSelector(element)
              
              // 清理高亮效果
              if (this.hoveredElement) {
                this.hoveredElement.style.outline = this.originalOutline
                this.hoveredElement = null
              }
              
              this.disable()
              
              // 发送选择结果
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

          // 添加键盘事件监听，按ESC键取消选择
          document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && window._elementPicker) {
              window._elementPicker.disable()
              window.postMessage({ 
                type: 'ELEMENT_SELECTED_CANCELLED'
              }, '*')
            }
          })
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
              } else if (event.data?.type === 'ELEMENT_SELECTED_CANCELLED') {
                cleanup()
                reject(new Error('已取消选择'))
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
      console.log(`执行输入操作: 选择器=${selector}, 类型=${selectorType}, 文本=${text}`);

      // 根据选择器类型构建实际的选择器
      let actualSelector = selector;
      let locator: Locator;

      switch (selectorType) {
        case 'id':
          actualSelector = `#${selector}`; // 始终添加#前缀
          locator = this.page.locator(actualSelector);
          break;
        case 'class':
          actualSelector = `.${selector}`; // 始终添加.前缀
          locator = this.page.locator(actualSelector);
          break;
        case 'name':
          actualSelector = `[name="${selector}"]`; // 始终使用属性选择器格式
          locator = this.page.locator(actualSelector);
          break;
        case 'xpath':
          locator = this.page.locator(selector);
          break;
        default:
          // CSS选择器
          locator = this.page.locator(selector);
      }
      
      console.log(`输入文本: 选择器类型=${selectorType}, 原始选择器=${selector}, 实际选择器=${actualSelector}`)

      // 尝试多种定位策略
      if (await locator.count() === 0) {
        console.log('未找到元素，尝试使用备用选择器');
        
        // 如果有元素ID，尝试使用ID
        if (selector.includes('id=') || selector.includes('#')) {
          const idSelector = selector.includes('#') ? selector : `#${selector.replace('id=', '')}`;
          locator = this.page.locator(idSelector);
        }
        
        // 检查是否找到元素
        if (await locator.count() === 0) {
          // 最后尝试使用input标签
          locator = this.page.locator('input');
          console.log(`尝试定位任何输入框，找到 ${await locator.count()} 个元素`);
        }
      }
      
      // 等待元素可见
      console.log('等待元素可见...');
      await locator.first().waitFor({ state: 'visible', timeout: 5000 }).catch(e => {
        console.warn('等待元素可见超时，尝试继续操作', e);
      });

      // 确保元素在视图中
      console.log('将元素滚动到视图中...');
      await locator.first().scrollIntoViewIfNeeded().catch(e => {
        console.warn('滚动元素到视图失败，尝试继续操作', e);
      });

      // 如果需要清除原有内容
      if (clearFirst) {
        console.log('清除输入框现有内容...');
        await locator.first().click({ timeout: 5000 }).catch(() => {}); // 点击元素激活
        await locator.first().clear({ timeout: 5000 }).catch(() => {}); // 清除内容
      }

      // 输入文本
      console.log(`使用${simulateTyping ? '模拟输入' : '直接填充'}方式输入文本...`);
      if (simulateTyping) {
        // 添加重试机制
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            await locator.first().type(text, { 
              delay: typingDelay, 
              timeout: 10000 
            });
            success = true;
          } catch (e) {
            console.warn(`第${4-retries}次输入尝试失败:`, e);
            retries--;
            if (retries > 0) {
              await this.page.waitForTimeout(1000); // 等待一秒再试
            }
          }
        }
        
        if (!success) {
          throw new Error('多次尝试输入文本失败');
        }
      } else {
        await locator.first().fill(text, { timeout: 10000 }).catch(async e => {
          console.warn('直接填充失败，尝试模拟输入:', e);
          await locator.first().type(text, { delay: 50, timeout: 10000 });
        });
      }

      // 等待输入完成
      if (waitAfterInput && waitTimeout) {
        console.log(`等待${waitTimeout}秒...`);
        await this.page.waitForTimeout(waitTimeout * 1000);
      }

      console.log('输入操作完成');
    } catch (error: any) {
      const errorMessage = error.message || '未知错误';
      console.error('输入文本失败:', error);
      throw new Error(`输入文本失败: ${errorMessage}`);
    }
  }

  private async executeScrollNode(properties: NodeProperties) {
    if (!this.page) return

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
            
            // 等待元素存在
            await this.page.waitForSelector(actualSelector, { timeout: timeout * 1000 })
            
            // 执行滚动
            await this.page.$eval(actualSelector, (el: HTMLElement, smooth: boolean) => {
              el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
            }, smooth || false)

            // 如果需要等待滚动完成
            if (waitForScroll) {
              await this.page.waitForTimeout(1000) // 给予滚动动画完成的时间
            }
          }
          break

        case 'scrollToPosition':
          if (typeof x === 'number' && typeof y === 'number') {
            // 执行滚动
            await this.page.evaluate(
              ({ x, y, smooth }: { x: number; y: number; smooth?: boolean }) => {
                window.scrollTo({
                  left: x,
                  top: y,
                  behavior: smooth ? 'smooth' : 'auto'
                })
              },
              { x, y, smooth }
            )

            // 如果需要等待滚动完成
            if (waitForScroll) {
              await this.page.waitForTimeout(1000) // 给予滚动动画完成的时间
            }
          }
          break

        case 'scrollToTop':
          // 滚动到顶部
          await this.page.evaluate((smooth: boolean) => {
            window.scrollTo({
              left: 0,
              top: 0,
              behavior: smooth ? 'smooth' : 'auto'
            })
          }, smooth || false)

          // 如果需要等待滚动完成
          if (waitForScroll) {
            await this.page.waitForTimeout(1000)
          }
          break

        case 'scrollToBottom':
          // 滚动到底部
          await this.page.evaluate((smooth: boolean) => {
            window.scrollTo({
              left: 0,
              top: document.documentElement.scrollHeight,
              behavior: smooth ? 'smooth' : 'auto'
            })
          }, smooth || false)

          // 如果需要等待滚动完成
          if (waitForScroll) {
            await this.page.waitForTimeout(1000)
          }
          break
      }
    } catch (error: any) {
      throw new Error(`滚动操作失败: ${error.message}`)
    }
  }

  async previewExtraction(properties: NodeProperties): Promise<string | any[]> {
    if (!this.page) throw new Error('浏览器未启动')

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

      // 等待元素出现，增加超时时间到30秒，并添加更好的错误处理
      try {
        await this.page.waitForSelector(actualSelector, { 
          timeout: 30000,
          state: 'attached'
        })
      } catch (error: any) {
        if (error.name === 'TimeoutError') {
          throw new Error('未找到匹配的元素，请检查选择器是否正确')
        }
        throw error
      }

      // 确保页面已加载完成
      await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})

      switch (extractType) {
        case 'text':
          // 使用 $$eval 来提取所有匹配元素的文本
          value = await this.page.$$eval(actualSelector, elements => 
            elements.map(el => el.textContent?.trim() || '')
          ).catch(error => {
            throw new Error(`提取文本失败: ${error.message}`)
          })
          // 如果只有一个元素，返回单个值而不是数组
          if (Array.isArray(value) && value.length === 1) {
            value = value[0]
          }
          break

        case 'list':
          value = await this.page.$$eval(actualSelector, (elements, extractHTML) => {
            return elements.map(el => 
              extractHTML ? el.innerHTML.trim() : el.textContent?.trim() || ''
            ).filter(text => text !== '') // 过滤掉空字符串
          }, extractInnerHTML).catch(error => {
            throw new Error(`提取列表失败: ${error.message}`)
          })
          break

        case 'attribute':
          if (attributeName) {
            value = await this.page.getAttribute(actualSelector, attributeName)
            if (trimContent && typeof value === 'string') {
              value = value.trim()
            }
          }
          break

        case 'html':
          value = await this.page.innerHTML(actualSelector)
          if (trimContent && typeof value === 'string') {
            value = value.trim()
          }
          break

        case 'table':
          const tableData: string[][] = []
          
          if (hasHeader && headerSelector) {
            const headers = await this.page.$$eval(headerSelector, cells => 
              cells.map(cell => cell.textContent?.trim() || '')
            )
            if (headers.length > 0) {
              tableData.push(headers)
            }
          }

          if (rowSelector) {
            const rows = await this.page.$$(rowSelector)
            for (const row of rows) {
              const cells = cellSelector 
                ? await row.$$(cellSelector)
                : await row.$$('td, th')
              
              const rowData = await Promise.all(
                cells.map(async cell => {
                  const text = await cell.textContent()
                  return text?.trim() || ''
                })
              )
              
              tableData.push(rowData)
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