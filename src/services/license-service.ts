import { ElMessage } from 'element-plus'
import LicenseManager from '@/utils/licenseManager'

// 许可证类型
export enum LicenseType {
  TRIAL = 'trial',
  PROFESSIONAL = 'professional', 
  ENTERPRISE = 'enterprise'
}

// 许可证状态
export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  TRIAL = 'trial'
}

// 许可证信息接口
export interface LicenseInfo {
  type: LicenseType
  status: LicenseStatus
  expiryDate?: Date
  maxExecutions?: number
  maxNodes?: number
  features: string[]
  licenseKey?: string
  userId?: string
  companyName?: string
}

// 功能限制配置
const FEATURE_LIMITS = {
  [LicenseType.TRIAL]: {
    maxExecutions: -1, // 试用期无限制
    maxNodes: 50,
    maxFlows: 50,
    features: [
      'basic_automation',
      'simple_recording', 
      'basic_export',
      'advanced_recording',
      'ai_generation',
      'captcha_recognition',
      'schedule_tasks',
      'advanced_export',
      'loop_control',
      'condition_branch'
    ]
  },
  [LicenseType.PROFESSIONAL]: {
    maxExecutions: -1, // 无限制
    maxNodes: 50,
    maxFlows: 50,
    features: [
      'basic_automation',
      'simple_recording', 
      'basic_export',
      'advanced_recording',
      'ai_generation',
      'captcha_recognition',
      'schedule_tasks',
      'advanced_export',
      'loop_control',
      'condition_branch',
      'cloud_sync'
    ]
  },
  [LicenseType.ENTERPRISE]: {
    maxExecutions: -1,
    maxNodes: -1, // 无限制
    maxFlows: -1,
    features: [
      'basic_automation',
      'simple_recording',
      'basic_export', 
      'advanced_recording',
      'ai_generation',
      'captcha_recognition',
      'schedule_tasks',
      'advanced_export',
      'loop_control',
      'condition_branch',
      'cloud_sync',
      'team_collaboration',
      'api_access',
      'batch_deployment',
      'custom_development',
      'priority_support'
    ]
  }
}

class LicenseService {
  private currentLicense: LicenseInfo | null = null
  private executionCount = 0
  private lastResetDate = new Date()

  constructor() {
    this.loadLicense()
    this.loadExecutionStats()
    // 异步初始化许可证状态
    this.initializeLicense().catch(console.error)
  }

  // 加载许可证信息
  private loadLicense(): void {
    try {
      const stored = localStorage.getItem('license_info')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.currentLicense = {
          ...parsed,
          expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : undefined
        }
      } else {
        // 没有许可证信息，清除状态
        this.currentLicense = null
      }
    } catch (error) {
      console.error('加载许可证失败:', error)
      this.setDefaultFreeLicense()
    }
  }

  // 保存许可证信息
  private saveLicense(): void {
    if (this.currentLicense) {
      localStorage.setItem('license_info', JSON.stringify(this.currentLicense))
    }
  }

  // 加载执行统计
  private loadExecutionStats(): void {
    try {
      const stats = localStorage.getItem('execution_stats')
      if (stats) {
        const parsed = JSON.parse(stats)
        this.executionCount = parsed.count || 0
        this.lastResetDate = new Date(parsed.lastResetDate || Date.now())
        
        // 检查是否需要重置月度计数
        const now = new Date()
        if (now.getMonth() !== this.lastResetDate.getMonth() || 
            now.getFullYear() !== this.lastResetDate.getFullYear()) {
          this.executionCount = 0
          this.lastResetDate = now
          this.saveExecutionStats()
        }
      }
    } catch (error) {
      console.error('加载执行统计失败:', error)
    }
  }

  // 保存执行统计
  private saveExecutionStats(): void {
    const stats = {
      count: this.executionCount,
      lastResetDate: this.lastResetDate.toISOString()
    }
    localStorage.setItem('execution_stats', JSON.stringify(stats))
  }

  // 清除许可证信息
  private clearLicense(): void {
    this.currentLicense = null
    localStorage.removeItem('license_info')
  }

  // 获取当前许可证信息
  getCurrentLicense(): LicenseInfo | null {
    return this.currentLicense
  }

  // 验证许可证密钥
  async validateLicenseKey(licenseKey: string): Promise<{ success: boolean; license?: LicenseInfo; message: string }> {
    try {
      // 使用新的许可证管理器验证
      const result = await LicenseManager.activateLicense(licenseKey)
      
      if (result.valid && result.license) {
        // 转换为本地格式
        const licenseType = this.mapLicenseType(result.license.type)
        const licenseStatus = result.license.type === 'TRIAL' ? LicenseStatus.TRIAL : LicenseStatus.ACTIVE
        
        this.currentLicense = {
          type: licenseType,
          status: licenseStatus,
          expiryDate: new Date(result.license.expiresAt),
          licenseKey: result.license.key,
          features: FEATURE_LIMITS[licenseType].features
        }
        
        this.saveLicense()
        ElMessage.success('许可证激活成功！')
        
        return {
          success: true,
          license: this.currentLicense,
          message: '许可证激活成功'
        }
      } else {
        ElMessage.error(result.error || '许可证验证失败')
        return { 
          success: false, 
          message: result.error || '许可证验证失败' 
        }
      }
    } catch (error) {
      const message = '许可证验证失败，请检查网络连接'
      ElMessage.error(message)
      return { success: false, message }
    }
  }

  // 映射许可证类型
  private mapLicenseType(serverType: string): LicenseType {
    switch (serverType) {
      case 'PRO1': return LicenseType.PROFESSIONAL
      case 'ENT1': return LicenseType.ENTERPRISE
      case 'TRIAL': return LicenseType.TRIAL
      default: return LicenseType.TRIAL // 默认为试用版
    }
  }

  // 初始化许可证状态
  async initializeLicense(): Promise<void> {
    try {
      const result = await LicenseManager.validateLicense()
      
      if (result.valid && result.license) {
        const licenseType = this.mapLicenseType(result.license.type)
        let licenseStatus = LicenseStatus.ACTIVE
        
        if (result.license.type === 'TRIAL') {
          licenseStatus = LicenseStatus.TRIAL
        } else if (result.license.type === 'FREE') {
          licenseStatus = LicenseStatus.ACTIVE
        }
        
        this.currentLicense = {
          type: licenseType,
          status: licenseStatus,
          expiryDate: result.license.expiresAt ? new Date(result.license.expiresAt) : undefined,
          licenseKey: result.license.key,
          features: FEATURE_LIMITS[licenseType].features
        }
        
        this.saveLicense()
      } else if (result.isTrialExpired) {
        // 试用期过期，清除许可证
        this.clearLicense()
      } else {
        // 其他情况也清除许可证
        this.clearLicense()
      }
    } catch (error) {
      console.error('初始化许可证失败:', error)
      this.clearLicense()
    }
  }

  // 检查功能是否可用
  hasFeature(feature: string): boolean {
    if (!this.currentLicense) return false
    
    // 检查许可证是否过期
    if (this.isLicenseExpired()) {
      return false // 过期后不允许使用任何功能
    }
    
    return this.currentLicense.features.includes(feature)
  }

  // 检查是否可以执行任务
  canExecuteTask(): { allowed: boolean; message?: string } {
    if (!this.currentLicense) {
      return { allowed: false, message: '请先开始试用或输入许可证密钥' }
    }
    
    // 检查许可证是否过期
    if (this.isLicenseExpired()) {
      return { allowed: false, message: '许可证已过期，请续费或重新购买许可证' }
    }
    
    const limits = FEATURE_LIMITS[this.currentLicense.type]
    
    // 检查月度执行次数限制
    if (limits.maxExecutions > 0 && this.executionCount >= limits.maxExecutions) {
      return { 
        allowed: false, 
        message: `已达到本月最大执行次数限制（${limits.maxExecutions}次），请升级到专业版获得无限制执行` 
      }
    }
    
    return { allowed: true }
  }

  // 记录任务执行
  recordExecution(): void {
    this.executionCount++
    this.saveExecutionStats()
  }

  // 校验节点数量是否在当前许可证限制内
  canUseNodes(nodeCount: number): { allowed: boolean; message?: string } {
    if (!this.currentLicense) {
      return { allowed: false, message: '请先开始试用或输入许可证密钥' }
    }

    if (this.isLicenseExpired()) {
      return { allowed: false, message: '许可证已过期，请续费或重新购买许可证' }
    }

    const limits = FEATURE_LIMITS[this.currentLicense.type]
    const maxNodes = limits.maxNodes
    if (typeof nodeCount !== 'number' || nodeCount < 0) {
      return { allowed: false, message: '无效的节点数量' }
    }

    if (maxNodes > -1 && nodeCount > maxNodes) {
      return {
        allowed: false,
        message: `节点数量超出限制（当前 ${nodeCount} 个，最大 ${maxNodes} 个）。如需更多节点，请升级版本。`
      }
    }

    return { allowed: true }
  }

  // 检查许可证是否过期
  isLicenseExpired(): boolean {
    if (!this.currentLicense || !this.currentLicense.expiryDate) {
      return false
    }
    return new Date() > this.currentLicense.expiryDate
  }

  // 获取许可证状态信息
  getLicenseStatus(): {
    type: string
    status: string
    expiresAt?: Date
    monthlyExecutions: number
    monthlyLimit: number
    nodeLimit: number
    remainingDays?: number
    hasStartedTrial?: boolean
  } {
    if (!this.currentLicense) {
      // 检查是否已开始试用
      const trialStartDate = localStorage.getItem('trial_start_date')
      
      return {
        type: '未激活',
        status: '需要许可证',
        monthlyExecutions: 0,
        monthlyLimit: 0,
        nodeLimit: 0,
        hasStartedTrial: !!trialStartDate
      }
    }
    
    const limits = FEATURE_LIMITS[this.currentLicense.type]
    const result: any = {
      type: this.getLicenseTypeName(this.currentLicense.type),
      status: this.getLicenseStatusName(this.currentLicense.status),
      monthlyExecutions: this.executionCount,
      monthlyLimit: limits.maxExecutions,
      nodeLimit: limits.maxNodes
    }
    
    if (this.currentLicense.expiryDate) {
      result.expiresAt = this.currentLicense.expiryDate
      const remainingTime = this.currentLicense.expiryDate.getTime() - Date.now()
      result.remainingDays = Math.max(0, Math.ceil(remainingTime / (24 * 60 * 60 * 1000)))
    }
    
    return result
  }

  // 获取许可证类型名称
  private getLicenseTypeName(type: LicenseType): string {
    switch (type) {
      case LicenseType.TRIAL: return '试用版'
      case LicenseType.PROFESSIONAL: return '专业版'
      case LicenseType.ENTERPRISE: return '企业版'
      default: return '未知'
    }
  }

  // 获取许可证状态名称
  private getLicenseStatusName(status: LicenseStatus): string {
    switch (status) {
      case LicenseStatus.ACTIVE: return '激活'
      case LicenseStatus.EXPIRED: return '已过期'
      case LicenseStatus.INVALID: return '无效'
      case LicenseStatus.TRIAL: return '试用'
      default: return '未知'
    }
  }

  // 重置为免费版
  resetToFree(): void {
    this.setDefaultFreeLicense()
    ElMessage.success('已重置为免费版')
  }

  // 获取功能限制信息
  getFeatureLimits() {
    return FEATURE_LIMITS
  }
}

// 导出单例实例
export const licenseService = new LicenseService()
export default licenseService