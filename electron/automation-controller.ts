import { chromium, Browser, Page } from 'playwright'
import type { FlowNode, NodeProperties } from '../src/types/node-config'

export class AutomationController {
  private browser: Browser | null = null
  private page: Page | null = null
  private variables: Record<string, any> = {}
  private isRunning: boolean = false

  async start(nodes: FlowNode[]) {
    if (this.isRunning) return
    this.isRunning = true

    try {
      // 启动浏览器
      this.browser = await chromium.launch({
        headless: false
      })
      this.page = await this.browser.newPage()

      // 执行根节点
      const rootNodes = nodes.filter(node => !node.properties.parentId)
      for (const node of rootNodes) {
        if (!this.isRunning) break
        await this.executeNode(node, nodes)
      }
    } catch (error) {
      console.error('执行流程出错:', error)
      throw error
    } finally {
      await this.stop()
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
        await this.executeSwitchNode(properties)
        break
      case 'loop':
        await this.executeLoopNode(properties, node, nodes)
        break
      default:
        throw new Error(`未知的节点类型: ${type}`)
    }
  }

  private async executeBrowserNode(properties: NodeProperties) {
    if (!this.page) return

    const { actionType, url, wait } = properties
    switch (actionType) {
      case 'goto':
        if (url) {
          await this.page.goto(url)
          if (wait) {
            await this.page.waitForTimeout(wait * 1000)
          }
        }
        break
      case 'back':
        await this.page.goBack()
        break
      case 'forward':
        await this.page.goForward()
        break
      case 'reload':
        await this.page.reload()
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

    const options = {
      path,
      omitBackground: omitBackground || false,
      quality: quality || 100
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

  private async executeSwitchNode(properties: NodeProperties) {
    if (!this.page) return

    const { condition, selector, value } = properties
    if (!selector) return

    let result = false
    switch (condition) {
      case 'exists':
        result = await this.page.$(selector) !== null
        break
      case 'visible':
        result = await this.page.isVisible(selector)
        break
      case 'textContains':
        if (value) {
          const text = await this.page.textContent(selector)
          result = text?.includes(value) || false
        }
        break
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
} 