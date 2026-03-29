/**
 * 流程生成器
 * 将 AI 生成的描述转换为流程节点
 */

import type { FlowNode } from '@/types/node-config'

interface ParsedStep {
  index: number
  nodeType: string
  description: string
  parameters: Record<string, any>
}

export class FlowGenerator {
  private nodeSpacing = 120
  private startX = 400
  private startY = 100

  /**
   * 从描述生成流程节点
   */
  async generateFromDescription(description: string): Promise<FlowNode[]> {
    // 解析步骤
    const steps = this.parseSteps(description)

    // 转换为节点
    const nodes = this.convertToNodes(steps)

    return nodes
  }

  /**
   * 解析 AI 生成的步骤描述
   */
  private parseSteps(description: string): ParsedStep[] {
    const steps: ParsedStep[] = []
    const lines = description.split('\n').filter(line => line.trim())

    for (const line of lines) {
      // 匹配格式: 1. [browser] 打开浏览器并访问 https://example.com
      const match = line.match(/^(\d+)\.\s*\[(\w+)\]\s*(.+)$/)
      if (match) {
        const [, index, nodeType, desc] = match
        const parameters = this.extractParameters(nodeType, desc)

        steps.push({
          index: parseInt(index),
          nodeType: this.normalizeNodeType(nodeType),
          description: desc,
          parameters,
        })
      }
    }

    return steps
  }

  /**
   * 规范化节点类型
   */
  private normalizeNodeType(
    type: string
  ):
    | 'start'
    | 'end'
    | 'browser'
    | 'click'
    | 'input'
    | 'extract'
    | 'keyboard'
    | 'mouse'
    | 'wait'
    | 'screenshot'
    | 'switch'
    | 'loop'
    | 'scroll'
    | 'export'
    | 'captcha' {
    const typeMap: Record<
      string,
      | 'start'
      | 'end'
      | 'browser'
      | 'click'
      | 'input'
      | 'extract'
      | 'keyboard'
      | 'mouse'
      | 'wait'
      | 'screenshot'
      | 'switch'
      | 'loop'
      | 'scroll'
      | 'export'
      | 'captcha'
    > = {
      browser: 'browser',
      click: 'click',
      input: 'input',
      extract: 'extract',
      wait: 'wait',
      screenshot: 'screenshot',
      scroll: 'scroll',
      keyboard: 'keyboard',
      mouse: 'mouse',
      switch: 'switch',
      condition: 'switch',
      loop: 'loop',
      export: 'export',
      captcha: 'captcha',
      验证码: 'captcha',
      识别: 'captcha',
    }

    return typeMap[type.toLowerCase()] || 'browser'
  }

  /**
   * 从描述中提取参数
   */
  private extractParameters(nodeType: string, description: string): Record<string, any> {
    const params: Record<string, any> = {}

    switch (nodeType.toLowerCase()) {
      case 'browser':
        // 提取 URL
        const urlMatch = description.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          params.url = urlMatch[0]
          params.actionType = 'goto'
        } else if (description.includes('关闭')) {
          params.actionType = 'close'
        } else {
          params.actionType = 'open'
        }
        params.waitForLoad = true
        params.timeout = 30
        break

      case 'click':
      case 'input':
      case 'extract':
        // 提取选择器
        const selectorMatch = description.match(/选择器[:：]\s*([^,，]+)/)
        if (selectorMatch) {
          params.selector = selectorMatch[1].trim()
        }

        // 提取输入值
        if (nodeType === 'input') {
          const valueMatch = description.match(/值[:：]\s*([^,，]+)/)
          if (valueMatch) {
            params.value = valueMatch[1].trim()
          }
        }
        break

      case 'wait':
        // 提取等待时间
        const timeMatch = description.match(/(\d+)\s*[秒s]/)
        if (timeMatch) {
          params.duration = parseInt(timeMatch[1])
        } else {
          params.duration = 3
        }
        params.type = 'fixed'
        break

      case 'export':
        // 判断导出类型
        if (description.includes('Excel')) {
          params.format = 'excel'
        } else if (description.includes('CSV')) {
          params.format = 'csv'
        } else if (description.includes('PDF')) {
          params.format = 'pdf'
        } else {
          params.format = 'excel'
        }
        params.fileName = `export_${Date.now()}`
        break

      case 'screenshot':
        params.fullPage = description.includes('全页') || description.includes('full')
        params.fileName = `screenshot_${Date.now()}`
        break

      case 'scroll':
        if (description.includes('底部')) {
          params.direction = 'bottom'
        } else if (description.includes('顶部')) {
          params.direction = 'top'
        } else {
          params.direction = 'down'
          params.distance = 500
        }
        break

      case 'loop':
        const countMatch = description.match(/(\d+)\s*次/)
        if (countMatch) {
          params.loopType = 'count'
          params.count = parseInt(countMatch[1])
        } else {
          params.loopType = 'condition'
        }
        break

      case 'captcha':
        // 提取验证码识别参数

        // 识别服务商
        if (description.includes('百度')) {
          params.provider = 'baidu'
        } else if (description.includes('腾讯')) {
          params.provider = 'tencent'
        } else if (description.includes('阿里')) {
          params.provider = 'aliyun'
        } else {
          params.provider = 'baidu' // 默认使用百度
        }

        // 验证码类型
        if (description.includes('点击') || description.includes('click')) {
          params.captchaType = 'click'
        } else if (description.includes('滑动') || description.includes('slide')) {
          params.captchaType = 'slide'
        } else if (description.includes('旋转') || description.includes('rotate')) {
          params.captchaType = 'rotate'
        } else if (description.includes('选择') || description.includes('select')) {
          params.captchaType = 'select'
        } else {
          params.captchaType = 'normal'
        }

        // 获取方式
        if (description.includes('截图') || description.includes('screenshot')) {
          params.captchaSource = 'screenshot'
        } else if (description.includes('上传') || description.includes('upload')) {
          params.captchaSource = 'upload'
        } else {
          params.captchaSource = 'element'
        }

        // 提取验证码选择器
        const captchaSelectorMatch = description.match(/验证码选择器[:：]\s*([^,，]+)/)
        if (captchaSelectorMatch) {
          params.captchaSelector = captchaSelectorMatch[1].trim()
        }

        // 提取输入框选择器
        const inputSelectorMatch = description.match(/输入框选择器[:：]\s*([^,，]+)/)
        if (inputSelectorMatch) {
          params.inputSelector = inputSelectorMatch[1].trim()
        }

        // 提取结果变量名
        const variableMatch = description.match(/变量[:：]\s*([^,，]+)/)
        if (variableMatch) {
          params.resultVariable = variableMatch[1].trim()
        } else {
          params.resultVariable = 'captcha_result'
        }

        // 是否自动输入
        params.autoInput = !description.includes('不自动输入') && !description.includes('手动输入')

        // 超时时间
        const timeoutMatch = description.match(/(\d+)\s*秒/)
        if (timeoutMatch) {
          params.timeout = parseInt(timeoutMatch[1])
        } else {
          params.timeout = 30
        }

        // 重试次数
        const retryMatch = description.match(/重试\s*(\d+)\s*次/)
        if (retryMatch) {
          params.retryCount = parseInt(retryMatch[1])
        } else {
          params.retryCount = 2
        }

        // 失败处理方式
        if (description.includes('停止') || description.includes('stop')) {
          params.onFailure = 'stop'
        } else if (description.includes('继续') || description.includes('continue')) {
          params.onFailure = 'continue'
        } else {
          params.onFailure = 'manual'
        }

        break
    }

    return params
  }

  /**
   * 转换为流程节点
   */
  private convertToNodes(steps: ParsedStep[]): FlowNode[] {
    const nodes: FlowNode[] = []

    // 添加开始节点
    nodes.push({
      id: `node_${Date.now()}_start`,
      type: 'start',
      x: this.startX,
      y: this.startY,
      text: '开始',
      properties: {
        name: '开始',
        nodeType: 'start',
      },
    })

    // 添加步骤节点
    steps.forEach((step, index) => {
      const nodeId = `node_${Date.now()}_${index}`
      const y = this.startY + (index + 1) * this.nodeSpacing

      nodes.push({
        id: nodeId,
        type: step.nodeType as FlowNode['type'],
        x: this.startX,
        y: y,
        text: this.getNodeText(step),
        properties: {
          name: this.getNodeText(step),
          nodeType: step.nodeType,
          ...this.getNodeProperties(step.nodeType, step.parameters),
        },
      })
    })

    // 添加结束节点
    nodes.push({
      id: `node_${Date.now()}_end`,
      type: 'end',
      x: this.startX,
      y: this.startY + (steps.length + 1) * this.nodeSpacing,
      text: '结束',
      properties: {
        name: '结束',
        nodeType: 'end',
      },
    })

    return nodes
  }

  /**
   * 获取节点文本
   */
  private getNodeText(step: ParsedStep): string {
    const maxLength = 20
    if (step.description.length > maxLength) {
      return step.description.substring(0, maxLength) + '...'
    }
    return step.description
  }

  /**
   * 获取节点属性
   */
  private getNodeProperties(nodeType: string, params: Record<string, any>): Record<string, any> {
    const defaultProps: Record<string, any> = {}

    switch (nodeType) {
      case 'browser':
        return {
          actionType: params.actionType || 'goto',
          url: params.url || '',
          waitForLoad: params.waitForLoad !== false,
          timeout: params.timeout || 30,
          headless: false,
          incognito: false,
          width: 1280,
          height: 800,
        }

      case 'click':
        return {
          selector: params.selector || '',
          multiple: false,
          waitBefore: 0,
          waitAfter: 0,
        }

      case 'input':
        return {
          selector: params.selector || '',
          value: params.value || '',
          clearBefore: true,
          delay: 100,
        }

      case 'extract':
        return {
          selector: params.selector || '',
          attribute: 'text',
          multiple: false,
          variableName: `extract_${Date.now()}`,
        }

      case 'wait':
        return {
          type: params.type || 'fixed',
          duration: params.duration || 3,
          selector: params.selector || '',
        }

      case 'screenshot':
        return {
          fullPage: params.fullPage || false,
          selector: params.selector || '',
          fileName: params.fileName || `screenshot_${Date.now()}`,
        }

      case 'scroll':
        return {
          direction: params.direction || 'down',
          distance: params.distance || 500,
          smooth: true,
        }

      case 'export':
        return {
          format: params.format || 'excel',
          fileName: params.fileName || `export_${Date.now()}`,
          includeHeaders: true,
        }

      case 'loop':
        return {
          loopType: params.loopType || 'count',
          count: params.count || 3,
          condition: params.condition || '',
        }

      case 'switch':
        return {
          condition: params.condition || '',
          operator: '==',
          value: params.value || '',
        }

      case 'captcha':
        return {
          provider: params.provider || 'baidu',
          apiKey: params.apiKey || '',
          secretKey: params.secretKey || '',
          apiUrl: params.apiUrl || '',
          captchaSource: params.captchaSource || 'element',
          captchaSelector: params.captchaSelector || '',
          screenshotType: params.screenshotType || 'viewport',
          x: params.x || 0,
          y: params.y || 0,
          width: params.width || 300,
          height: params.height || 100,
          captchaType: params.captchaType || 'normal',
          resultVariable: params.resultVariable || 'captcha_result',
          inputSelector: params.inputSelector || '',
          autoInput: params.autoInput !== false,
          timeout: params.timeout || 30,
          retryCount: params.retryCount || 2,
          onFailure: params.onFailure || 'manual',
          saveImage: params.saveImage || false,
          imagePath: params.imagePath || './captcha_images/',
        }

      default:
        return defaultProps
    }
  }
}
