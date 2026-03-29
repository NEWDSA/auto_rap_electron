/**
 * 验证码识别服务
 * 支持多种第三方验证码识别API
 */

export interface CaptchaConfig {
  provider: 'baidu' | 'tencent' | 'aliyun' | 'youdao' | 'jfbym' | 'ttshitu' | 'custom'
  apiKey: string
  secretKey?: string
  apiUrl?: string
  timeout?: number
}

export interface CaptchaResult {
  success: boolean
  text?: string
  confidence?: number
  error?: string
  taskId?: string
}

export class CaptchaService {
  private config: CaptchaConfig

  constructor(config: CaptchaConfig) {
    this.config = config
  }

  /**
   * 识别验证码
   * @param imageData 图片数据 (base64 或 Buffer)
   * @param captchaType 验证码类型
   */
  async recognize(
    imageData: string | Buffer,
    captchaType: string = 'normal'
  ): Promise<CaptchaResult> {
    try {
      switch (this.config.provider) {
        case 'baidu':
          return await this.recognizeWithBaidu(imageData, captchaType)
        case 'tencent':
          return await this.recognizeWithTencent(imageData, captchaType)
        case 'aliyun':
          return await this.recognizeWithAliyun(imageData, captchaType)
        case 'youdao':
          return await this.recognizeWithYoudao(imageData, captchaType)
        case 'jfbym':
          return await this.recognizeWithJfbym(imageData, captchaType)
        case 'ttshitu':
          return await this.recognizeWithTtshitu(imageData, captchaType)
        case 'custom':
          return await this.recognizeWithCustom(imageData, captchaType)
        default:
          throw new Error('不支持的验证码识别服务商')
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '验证码识别失败',
      }
    }
  }

  /**
   * 百度OCR识别
   */
  private async recognizeWithBaidu(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    const apiUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'

    // 获取access_token
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.config.apiKey}&client_secret=${this.config.secretKey}`

    const tokenResponse = await fetch(tokenUrl)
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error('获取百度API访问令牌失败')
    }

    // 准备图片数据
    const imageBase64 = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData.replace(/^data:image\/[a-z]+;base64,/, '')

    const response = await fetch(`${apiUrl}?access_token=${tokenData.access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `image=${encodeURIComponent(imageBase64)}`,
    })

    const result = await response.json()

    if (result.error_code) {
      throw new Error(`百度OCR错误: ${result.error_msg}`)
    }

    const text = result.words_result?.map((item: any) => item.words).join('') || ''

    return {
      success: true,
      text,
      confidence: result.words_result?.[0]?.probability?.average || 0,
    }
  }

  /**
   * 腾讯OCR识别
   */
  private async recognizeWithTencent(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    // 腾讯云OCR API实现
    const apiUrl = 'https://ocr.tencentcloudapi.com/'

    // 这里需要实现腾讯云的签名算法和API调用
    // 由于腾讯云API较为复杂，建议使用官方SDK

    throw new Error('腾讯OCR识别功能待实现，请使用官方SDK')
  }

  /**
   * 阿里云OCR识别
   */
  private async recognizeWithAliyun(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    // 阿里云OCR API实现
    throw new Error('阿里云OCR识别功能待实现，请使用官方SDK')
  }

  /**
   * 有道智云OCR识别
   */
  private async recognizeWithYoudao(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    const apiUrl = 'https://openapi.youdao.com/ocrapi'

    // 准备参数
    const salt = Date.now().toString()
    const curtime = Math.round(Date.now() / 1000).toString()

    // 图片数据处理
    const imageBase64 = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData.replace(/^data:image\/[a-z]+;base64,/, '')

    const params = new URLSearchParams({
      img: imageBase64,
      langType: 'auto',
      detectType: '10012',
      imageType: '1',
      appKey: this.config.apiKey,
      salt,
      curtime,
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const result = await response.json()

    if (result.errorCode !== '0') {
      throw new Error(`有道OCR错误: ${result.errorCode}`)
    }

    const text =
      result.Result?.regions
        ?.map((region: any) => region.lines?.map((line: any) => line.text).join(''))
        .join('') || ''

    return {
      success: true,
      text,
    }
  }

  /**
   * 京峰验证码识别
   */
  private async recognizeWithJfbym(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    const apiUrl = 'http://api.jfbym.com/api/YmServer/customApi'

    // 准备图片数据
    const imageBase64 = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData.replace(/^data:image\/[a-z]+;base64,/, '')

    const params = {
      image: imageBase64,
      token: this.config.apiKey,
      type: this.getCaptchaTypeCode(captchaType),
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const result = await response.json()

    if (result.code !== 10000) {
      throw new Error(`京峰识别错误: ${result.message}`)
    }

    return {
      success: true,
      text: result.data.data,
      taskId: result.data.id,
    }
  }

  /**
   * 图图识别
   */
  private async recognizeWithTtshitu(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    const apiUrl = 'http://api.ttshitu.com/predict'

    // 准备图片数据
    const imageBase64 = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData.replace(/^data:image\/[a-z]+;base64,/, '')

    const params = {
      username: this.config.apiKey,
      password: this.config.secretKey,
      image: imageBase64,
      typeid: this.getCaptchaTypeCode(captchaType),
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(`图图识别错误: ${result.message}`)
    }

    return {
      success: true,
      text: result.data.result,
      taskId: result.data.id,
    }
  }

  /**
   * 自定义API识别
   */
  private async recognizeWithCustom(
    imageData: string | Buffer,
    captchaType: string
  ): Promise<CaptchaResult> {
    if (!this.config.apiUrl) {
      throw new Error('自定义API需要提供apiUrl')
    }

    // 准备图片数据
    const imageBase64 = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData.replace(/^data:image\/[a-z]+;base64,/, '')

    const params = {
      image: imageBase64,
      type: captchaType,
      apiKey: this.config.apiKey,
    }

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    })

    const result = await response.json()

    return {
      success: result.success || false,
      text: result.text || result.data,
      confidence: result.confidence,
      error: result.error,
    }
  }

  /**
   * 获取验证码类型代码
   */
  private getCaptchaTypeCode(captchaType: string): string {
    const typeMap: Record<string, string> = {
      normal: '1', // 普通验证码
      click: '2', // 点击验证码
      slide: '3', // 滑块验证码
      select: '4', // 选择验证码
      rotate: '5', // 旋转验证码
      puzzle: '6', // 拼图验证码
      math: '7', // 数学运算
      chinese: '8', // 中文验证码
    }

    return typeMap[captchaType] || '1'
  }

  /**
   * 错误报告（用于人工打码平台）
   */
  async reportError(taskId: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'jfbym':
          return await this.reportErrorToJfbym(taskId)
        case 'ttshitu':
          return await this.reportErrorToTtshitu(taskId)
        default:
          return false
      }
    } catch (error) {
      console.error('报告错误失败:', error)
      return false
    }
  }

  private async reportErrorToJfbym(taskId: string): Promise<boolean> {
    const apiUrl = 'http://api.jfbym.com/api/YmServer/reportError'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: this.config.apiKey,
        id: taskId,
      }),
    })

    const result = await response.json()
    return result.code === 10000
  }

  private async reportErrorToTtshitu(taskId: string): Promise<boolean> {
    const apiUrl = 'http://api.ttshitu.com/reporterror.json'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.config.apiKey,
        password: this.config.secretKey,
        id: taskId,
      }),
    })

    const result = await response.json()
    return result.success
  }
}

// 导出默认配置
export const defaultCaptchaConfigs = {
  baidu: {
    name: '百度OCR',
    description: '百度智能云OCR服务，支持通用文字识别',
    website: 'https://cloud.baidu.com/product/ocr',
  },
  tencent: {
    name: '腾讯OCR',
    description: '腾讯云OCR服务，高精度文字识别',
    website: 'https://cloud.tencent.com/product/ocr',
  },
  aliyun: {
    name: '阿里云OCR',
    description: '阿里云OCR服务，智能文字识别',
    website: 'https://www.aliyun.com/product/ocr',
  },
  youdao: {
    name: '有道智云',
    description: '有道智云OCR服务，多语言识别',
    website: 'https://ai.youdao.com/',
  },
  jfbym: {
    name: '京峰验证码',
    description: '专业验证码识别平台，支持多种验证码类型',
    website: 'http://www.jfbym.com/',
  },
  ttshitu: {
    name: '图图识别',
    description: '图图验证码识别平台，高准确率',
    website: 'http://www.ttshitu.com/',
  },
}
