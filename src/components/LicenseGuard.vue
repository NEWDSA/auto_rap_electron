<template>
  <div class="license-guard-container">
    <!-- 主要内容 - 只有在许可证有效时才显示 -->
    <div v-if="licenseValid" class="app-content">
      <slot />
    </div>

    <!-- 无许可证时直接显示激活页面 -->
    <div v-else class="license-activation-screen">
      <LicenseDialog
        :show-dialog="true"
        :is-fullscreen="true"
        :license-error="licenseError"
        @license-activated="onLicenseActivated"
        @close="handleDialogClose"
      />
    </div>

    <!-- 水印组件 -->
    <LicenseWatermark />

    <!-- 即将过期提醒 -->
    <div v-if="showExpiryWarning" class="expiry-warning">
      <div class="warning-content">
        <svg class="warning-icon" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="warning-text">
          <p class="warning-title">许可证即将过期</p>
          <p class="warning-message">剩余 {{ daysUntilExpiry }} 天，请及时续费</p>
        </div>
        <button class="warning-close" @click="showExpiryWarning = false">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import LicenseDialog from './LicenseDialog.vue'
  import LicenseWatermark from './LicenseWatermark.vue'
  import LicenseManager from '@/utils/licenseManager'

  const licenseValid = ref(true) // 默认通过
  const showExpiryWarning = ref(false)
  const licenseError = ref('')
  const daysUntilExpiry = ref(0)

  let checkInterval: NodeJS.Timeout | null = null

  const checkLicense = async () => {
    // 暂时跳过验证
    licenseValid.value = true
    return

    /* 原有验证逻辑
  try {
    const manager = LicenseManager
    const result = await manager.validateLicense()
    
    if (result.valid && result.license) {
      licenseValid.value = true
      licenseError.value = ''
      
      // 检查是否即将过期（3天内）
      const expiresAt = new Date(result.license.expiresAt)
      const now = new Date()
      const timeDiff = expiresAt.getTime() - now.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
      
      if (daysDiff <= 3 && daysDiff > 0) {
        daysUntilExpiry.value = daysDiff
        showExpiryWarning.value = true
      }
      
    } else {
      // 许可证无效，显示激活页面
      licenseValid.value = false
      licenseError.value = result.error || '请输入有效的许可证密钥'
      
      // 如果是过期，显示特殊消息
      if (result.isExpired || (result.error?.includes('过期') ?? false)) {
        licenseError.value = '许可证已过期，请重新激活'
      }
    }
  } catch (error) {
    console.error('License check failed:', error)
    licenseValid.value = false
    licenseError.value = '无法连接到授权服务器，请检查网络连接'
  }
  */
  }

  const onLicenseActivated = (valid: boolean) => {
    if (valid) {
      // 重新检查许可证状态
      checkLicense()
    }
  }

  const handleDialogClose = () => {
    // 在严格模式下，不允许关闭对话框
    // 用户必须输入有效的许可证才能使用应用
    console.log('许可证激活是必需的，无法关闭')
  }

  onMounted(() => {
    // 立即检查许可证
    checkLicense()

    // 每分钟检查一次许可证状态
    checkInterval = setInterval(checkLicense, 60000)
  })

  onUnmounted(() => {
    if (checkInterval) {
      clearInterval(checkInterval)
    }
  })

  // 暴露方法给父组件
  defineExpose({
    checkLicense,
  })
</script>

<style scoped>
  .license-guard-container {
    width: 100%;
    height: 100vh;
    position: relative;
  }

  .app-content {
    width: 100%;
    height: 100%;
  }

  /* 许可证激活界面 */
  .license-activation-screen {
    width: 100%;
    height: 100vh;
  }

  /* 即将过期警告 */
  .expiry-warning {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-width: 350px;
  }

  .warning-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .warning-icon {
    width: 20px;
    height: 20px;
    color: #f39c12;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .warning-text {
    flex: 1;
  }

  .warning-title {
    font-weight: 600;
    color: #8b4513;
    margin-bottom: 4px;
  }

  .warning-message {
    font-size: 14px;
    color: #8b4513;
  }

  .warning-close {
    background: none;
    border: none;
    font-size: 20px;
    color: #8b4513;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .warning-close:hover {
    background: rgba(139, 69, 19, 0.1);
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .blocked-content {
      margin: 20px;
      padding: 30px 20px;
    }

    .blocked-title {
      font-size: 24px;
    }

    .blocked-actions {
      flex-direction: column;
    }

    .expiry-warning {
      left: 20px;
      right: 20px;
      max-width: none;
    }
  }
</style>
