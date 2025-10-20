import axios from 'axios'

export interface LicenseInfo {
  valid: boolean
  license?: {
    key: string
    type: string
    expiresAt: string
    features: string[]
    devicesUsed: number
    maxDevices: number
  }
  error?: string
  isTrialExpired?: boolean
  trialDaysLeft?: number
  isExpired?: boolean
}

export class LicenseManager {
  private static instance: LicenseManager
  private licenseServerUrl = 'http://localhost:3001'
  private currentLicense: LicenseInfo | null = null

  private constructor() { }

  static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager()
    }
    return LicenseManager.instance
  }

  // 检查许可证状态（不再支持自动试用）
  async checkLicenseStatus(): Promise<{ hasValidLicense: boolean; licenseInfo?: any; error?: string }> {
    const licenseKey = localStorage.getItem('license_key')

    if (!licenseKey) {
      return {
        hasValidLicense: false,
        error: '未找到许可证，请联系管理员获取授权'
      }
    }

    try {
      const result = await this.validateLicense(licenseKey)
      return {
        hasValidLicense: result.valid,
        licenseInfo: result.license,
        error: result.error
      }
    } catch (error) {
      return {
        hasValidLicense: false,
        error: '许可证验证失败'
      }
    }
  }
  // 验证许可证（严格模式：必须有有效许可证）
  async validateLicense(licenseKey?: string): Promise<LicenseInfo> {
    try {
      if (!licenseKey) {
        licenseKey = localStorage.getItem('license_key') || ''
      }

      if (!licenseKey) {
        return {
          valid: false,
          error: '未找到许可证密钥，请联系管理员获取授权'
        }
      }

      const deviceId = await this.getDeviceId()

      const response = await axios.post(`${this.licenseServerUrl}/api/license/validate`, {
        key: licenseKey,
        deviceId,
        version: '1.0.0'
      }, {
        timeout: 5000
      })

      if (response.data.valid) {
        localStorage.setItem('license_key', licenseKey)
        localStorage.setItem('license_cache', JSON.stringify(response.data.license))
        this.currentLicense = response.data
        return response.data
      } else {
        return {
          valid: false,
          error: response.data.error || '许可证验证失败'
        }
      }
    } catch (error) {
      console.error('License validation error:', error)

      // 离线模式：检查缓存的许可证
      const cachedLicense = localStorage.getItem('license_cache')
      if (cachedLicense) {
        try {
          const parsed = JSON.parse(cachedLicense)
          const now = new Date()
          const expiresAt = new Date(parsed.expiresAt)

          if (expiresAt > now) {
            return {
              valid: true,
              license: parsed,
              error: '离线模式（使用缓存的许可证）'
            }
          } else {
            return {
              valid: false,
              error: '许可证已过期',
              isExpired: true
            }
          }
        } catch (e) {
          console.error('Failed to parse cached license:', e)
        }
      }

      return {
        valid: false,
        error: '无法连接到许可证服务器，且无有效的缓存许可证'
      }
    }
  }

  // 激活许可证
  async activateLicense(licenseKey: string): Promise<LicenseInfo> {
    const result = await this.validateLicense(licenseKey)

    if (result.valid && result.license) {
      localStorage.setItem('license_cache', JSON.stringify(result.license))
      this.recordUsage('license_activated')
    }

    return result
  }

  // 获取当前许可证状态
  getCurrentLicense(): LicenseInfo | null {
    return this.currentLicense
  }

  // 检查功能是否可用
  hasFeature(feature: string): boolean {
    if (!this.currentLicense?.valid) return false
    return this.currentLicense.license?.features.includes(feature) || false
  }

  // 记录使用情况
  async recordUsage(action: string): Promise<void> {
    try {
      const licenseKey = localStorage.getItem('license_key')
      if (!licenseKey) return

      await axios.post(`${this.licenseServerUrl}/api/license/usage`, {
        key: licenseKey,
        action,
        timestamp: new Date().toISOString(),
        deviceId: await this.getDeviceId()
      })
    } catch (error) {
      console.error('Failed to record usage:', error)
    }
  }

  // 获取设备ID
  private async getDeviceId(): Promise<string> {
    try {
      // 简单的设备指纹生成
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Device fingerprint', 2, 2)
        return canvas.toDataURL().slice(-50)
      }
      return 'unknown-device'
    } catch (error) {
      return 'unknown-device'
    }
  }

  // 开始试用
  startTrial(): void {
    // 设置试用开始时间
    localStorage.setItem('trial_start_date', new Date().toISOString())
    console.log('试用期已开始')
  }

  // 清除许可证
  clearLicense(): void {
    localStorage.removeItem('license_key')
    localStorage.removeItem('license_cache')
    localStorage.removeItem('trial_start_date')
    this.currentLicense = null
  }
}

export default LicenseManager.getInstance()