/**
 * Web Speech API 工具函数
 * 用于替代 say.js，提供更好的中文语音支持
 */

export interface VoiceOptions {
  rate?: number // 语速 (0.1 - 10)
  pitch?: number // 音调 (0 - 2)
  volume?: number // 音量 (0 - 1)
  lang?: string // 语言代码
  voice?: string // 语音名称
}

export interface SpeechResult {
  success: boolean
  error?: string
  message?: string
}

export class SpeechSynthesisManager {
  private static instance: SpeechSynthesisManager
  private currentUtterance: SpeechSynthesisUtterance | null = null

  static getInstance(): SpeechSynthesisManager {
    if (!SpeechSynthesisManager.instance) {
      SpeechSynthesisManager.instance = new SpeechSynthesisManager()
    }
    return SpeechSynthesisManager.instance
  }

  /**
   * 检查浏览器是否支持语音合成
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window
  }

  /**
   * 获取所有可用的语音
   */
  getVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices()
  }

  /**
   * 获取中文语音列表
   */
  getChineseVoices(): SpeechSynthesisVoice[] {
    const voices = this.getVoices()
    return voices.filter(
      voice =>
        voice.lang.startsWith('zh') ||
        voice.name.toLowerCase().includes('chinese') ||
        voice.name.includes('中文')
    )
  }

  /**
   * 根据语言获取最佳语音
   */
  getBestVoice(lang: string = 'zh-CN'): SpeechSynthesisVoice | null {
    const voices = this.getVoices()

    // 优先选择本地语音
    const localVoices = voices.filter(voice => voice.localService)
    const langVoices = localVoices.filter(voice => voice.lang === lang)

    if (langVoices.length > 0) {
      return langVoices[0]
    }

    // 如果没有本地语音，选择任何匹配语言的语音
    const anyLangVoices = voices.filter(voice => voice.lang === lang)
    if (anyLangVoices.length > 0) {
      return anyLangVoices[0]
    }

    // 最后选择默认语音
    return voices.find(voice => voice.default) || voices[0] || null
  }

  /**
   * 播放语音
   */
  async speak(text: string, options: VoiceOptions = {}): Promise<SpeechResult> {
    return new Promise(resolve => {
      if (!this.isSupported()) {
        resolve({
          success: false,
          error: '浏览器不支持语音合成功能',
        })
        return
      }

      if (!text || text.trim() === '') {
        resolve({
          success: false,
          error: '朗读文本不能为空',
        })
        return
      }

      try {
        // 停止当前播放
        this.stop()

        // 创建语音合成对象
        const utterance = new SpeechSynthesisUtterance(text)

        // 设置语音参数
        utterance.rate = options.rate || 1.0
        utterance.pitch = options.pitch || 1.0
        utterance.volume = options.volume || 1.0
        utterance.lang = options.lang || 'zh-CN'

        // 选择语音
        if (options.voice) {
          const voices = this.getVoices()
          const selectedVoice = voices.find(
            voice => voice.name === options.voice || voice.name.includes(options.voice!)
          )
          if (selectedVoice) {
            utterance.voice = selectedVoice
          }
        } else {
          // 自动选择最佳语音
          const bestVoice = this.getBestVoice(options.lang)
          if (bestVoice) {
            utterance.voice = bestVoice
          }
        }

        // 设置事件监听器
        utterance.onstart = () => {
          console.log('语音播放开始')
        }

        utterance.onend = () => {
          console.log('语音播放结束')
          this.currentUtterance = null
          resolve({
            success: true,
            message: '语音播放完成',
          })
        }

        utterance.onerror = event => {
          console.error('语音播放错误:', event.error)
          this.currentUtterance = null
          resolve({
            success: false,
            error: `语音播放失败: ${event.error}`,
          })
        }

        utterance.onpause = () => {
          console.log('语音播放暂停')
        }

        utterance.onresume = () => {
          console.log('语音播放恢复')
        }

        // 保存当前语音对象
        this.currentUtterance = utterance

        // 开始播放
        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('语音播放异常:', error)
        resolve({
          success: false,
          error: `语音播放异常: ${error}`,
        })
      }
    })
  }

  /**
   * 停止语音播放
   */
  stop(): void {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }
    this.currentUtterance = null
  }

  /**
   * 暂停语音播放
   */
  pause(): void {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause()
    }
  }

  /**
   * 恢复语音播放
   */
  resume(): void {
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }
  }

  /**
   * 检查是否正在播放
   */
  isSpeaking(): boolean {
    return speechSynthesis.speaking
  }

  /**
   * 检查是否暂停
   */
  isPaused(): boolean {
    return speechSynthesis.paused
  }

  /**
   * 获取语音信息
   */
  getSpeechInfo(): {
    supported: boolean
    voicesCount: number
    chineseVoicesCount: number
    currentVoice: string | null
    isSpeaking: boolean
    isPaused: boolean
  } {
    const voices = this.getVoices()
    const chineseVoices = this.getChineseVoices()

    return {
      supported: this.isSupported(),
      voicesCount: voices.length,
      chineseVoicesCount: chineseVoices.length,
      currentVoice: this.currentUtterance?.voice?.name || null,
      isSpeaking: this.isSpeaking(),
      isPaused: this.isPaused(),
    }
  }
}

// 导出单例实例
export const speechManager = SpeechSynthesisManager.getInstance()

// 导出便捷函数
export const speak = (text: string, options?: VoiceOptions) => speechManager.speak(text, options)

export const stopSpeech = () => speechManager.stop()

export const pauseSpeech = () => speechManager.pause()

export const resumeSpeech = () => speechManager.resume()

export const getVoices = () => speechManager.getVoices()

export const getChineseVoices = () => speechManager.getChineseVoices()
