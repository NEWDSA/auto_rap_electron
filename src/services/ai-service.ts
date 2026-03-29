/**
 * AI 服务接口
 * 支持多种 AI 提供商
 */

import { NodeRegistryService } from './node-registry.service'

export interface AIConfig {
  provider: 'openai' | 'claude' | 'qwen' | 'wenxin' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  model?: string
  apiUrl?: string
  // 自定义模型配置
  customModel?: {
    id: string
    name: string
    requestFormat: 'openai' | 'claude' | 'custom'
    temperature?: number
    maxTokens?: number
    customHeaders?: string
    requestTemplate?: string
    responsePath?: string
  }
}

export class AIService {
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  /**
   * 生成流程描述
   */
  async generateFlowDescription(userPrompt: string): Promise<string> {
    const systemPrompt = this.getSystemPrompt()

    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(systemPrompt, userPrompt)
      case 'claude':
        return this.callClaude(systemPrompt, userPrompt)
      case 'qwen':
        return this.callQwen(systemPrompt, userPrompt)
      case 'wenxin':
        return this.callWenxin(systemPrompt, userPrompt)
      case 'deepseek':
        return this.callDeepSeek(systemPrompt, userPrompt)
      case 'zhipu':
        return this.callZhipu(systemPrompt, userPrompt)
      case 'custom':
        return this.callCustomModel(systemPrompt, userPrompt)
      default:
        throw new Error('不支持的 AI 提供商')
    }
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(): string {
    // 使用动态节点注册服务生成系统提示词
    const nodeRegistry = NodeRegistryService.getInstance()
    return nodeRegistry.generateSystemPrompt()
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiUrl = this.config.apiUrl || 'https://api.openai.com/v1/chat/completions'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '调用 OpenAI API 失败')
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error: any) {
      console.error('OpenAI API 错误:', error)
      throw new Error(`OpenAI 服务错误: ${error.message}`)
    }
  }

  /**
   * 调用 Claude API
   */
  private async callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiUrl = this.config.apiUrl || 'https://api.anthropic.com/v1/messages'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '调用 Claude API 失败')
      }

      const data = await response.json()
      return data.content[0].text
    } catch (error: any) {
      console.error('Claude API 错误:', error)
      throw new Error(`Claude 服务错误: ${error.message}`)
    }
  }

  /**
   * 调用通义千问 API
   */
  private async callQwen(systemPrompt: string, userPrompt: string): Promise<string> {
    // 通义千问 API 实现
    // 这里需要根据阿里云的具体 API 文档实现
    const apiUrl =
      this.config.apiUrl ||
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          },
        }),
      })

      if (!response.ok) {
        throw new Error('调用通义千问 API 失败')
      }

      const data = await response.json()
      return data.output.text
    } catch (error: any) {
      console.error('通义千问 API 错误:', error)
      throw new Error(`通义千问服务错误: ${error.message}`)
    }
  }

  /**
   * 调用文心一言 API
   */
  private async callWenxin(systemPrompt: string, userPrompt: string): Promise<string> {
    // 文心一言 API 实现
    // 需要先获取 access_token
    throw new Error('文心一言 API 暂未实现，请使用其他提供商')
  }

  /**
   * 调用 DeepSeek API
   */
  private async callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiUrl = this.config.apiUrl || 'https://api.deepseek.com/v1/chat/completions'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '调用 DeepSeek API 失败')
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error: any) {
      console.error('DeepSeek API 错误:', error)
      throw new Error(`DeepSeek 服务错误: ${error.message}`)
    }
  }

  /**
   * 调用智谱 API
   */
  private async callZhipu(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiUrl = this.config.apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'glm-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '调用智谱 API 失败')
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error: any) {
      console.error('智谱 API 错误:', error)
      throw new Error(`智谱服务错误: ${error.message}`)
    }
  }

  /**
   * 调用自定义模型
   */
  private async callCustomModel(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.config.customModel) {
      throw new Error('自定义模型配置缺失')
    }

    const { customModel, apiUrl } = this.config

    try {
      let requestBody: any
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // 添加自定义头部
      if (customModel.customHeaders) {
        try {
          const customHeaders = JSON.parse(customModel.customHeaders)
          headers = { ...headers, ...customHeaders }
        } catch {
          // 如果不是 JSON，尝试作为 Authorization 头
          if (customModel.customHeaders.trim()) {
            headers['Authorization'] = customModel.customHeaders
          }
        }
      }

      // 添加 API Key（如果有）
      if (this.config.apiKey && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }

      // 根据请求格式构建请求体
      if (customModel.requestFormat === 'openai') {
        requestBody = {
          model: this.config.model || 'default',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: customModel.temperature || 0.7,
          max_tokens: customModel.maxTokens || 2000,
        }
      } else if (customModel.requestFormat === 'claude') {
        requestBody = {
          model: this.config.model || 'default',
          messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
          max_tokens: customModel.maxTokens || 2000,
        }
      } else if (customModel.requestFormat === 'custom' && customModel.requestTemplate) {
        // 使用自定义模板
        const template = customModel.requestTemplate
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
        // 替换模板中的占位符
        const templateStr = template
          .replace(/\{\{prompt\}\}/g, fullPrompt)
          .replace(/\{\{system\}\}/g, systemPrompt)
          .replace(/\{\{user\}\}/g, userPrompt)
          .replace(/\{\{model\}\}/g, this.config.model || 'default')

        requestBody = JSON.parse(templateStr)
      } else {
        // 默认 OpenAI 格式
        requestBody = {
          model: this.config.model || 'default',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }
      }

      // 发送请求
      const response = await fetch(apiUrl!, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`API 调用失败: ${response.status} - ${error}`)
      }

      const data = await response.json()

      // 解析响应
      let content: string
      if (customModel.responsePath) {
        // 使用自定义路径提取响应
        content = this.extractValueByPath(data, customModel.responsePath)
      } else if (customModel.requestFormat === 'openai') {
        content = data.choices?.[0]?.message?.content || data.response || ''
      } else if (customModel.requestFormat === 'claude') {
        content = data.content?.[0]?.text || ''
      } else {
        // 尝试常见的响应格式
        content =
          data.choices?.[0]?.message?.content ||
          data.response ||
          data.text ||
          data.content ||
          data.output?.text ||
          JSON.stringify(data)
      }

      return content
    } catch (error: any) {
      console.error('自定义模型 API 错误:', error)
      throw new Error(`自定义模型调用失败: ${error.message}`)
    }
  }

  /**
   * 根据路径提取对象中的值
   * @param obj 对象
   * @param path 路径，如 "data.response.text" 或 "choices[0].message.content"
   */
  private extractValueByPath(obj: any, path: string): string {
    try {
      const keys = path.split(/[\.\[\]]/).filter(k => k)
      let result = obj

      for (const key of keys) {
        if (result === null || result === undefined) {
          return ''
        }
        result = result[key]
      }

      return String(result || '')
    } catch {
      return ''
    }
  }
}
