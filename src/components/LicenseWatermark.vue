<template>
  <div v-if="showWatermark" class="license-watermark">
    <div class="watermark-content">
      {{ watermarkText }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import LicenseManager from '@/utils/licenseManager'

  const showWatermark = ref(false)
  const licenseStatus = ref<any>(null)

  const watermarkText = computed(() => {
    if (!licenseStatus.value) return '授权已到期'

    if (licenseStatus.value.isExpired) {
      return '授权已到期'
    }

    if (!licenseStatus.value.valid) {
      return '未授权使用'
    }

    return ''
  })

  let checkInterval: NodeJS.Timeout | null = null

  const checkLicenseStatus = async () => {
    try {
      const manager = LicenseManager
      const result = await manager.validateLicense()

      licenseStatus.value = result

      // 显示水印的条件：
      // 1. 许可证无效
      // 2. 许可证已过期
      // 3. 无许可证
      showWatermark.value =
        !result.valid || !!result.isExpired || (result.error?.includes('过期') ?? false)
    } catch (error) {
      console.error('License check failed:', error)
      showWatermark.value = true
      licenseStatus.value = { valid: false, error: '许可证检查失败' }
    }
  }

  onMounted(() => {
    // 立即检查
    checkLicenseStatus()

    // 每30秒检查一次许可证状态
    checkInterval = setInterval(checkLicenseStatus, 30000)
  })

  onUnmounted(() => {
    if (checkInterval) {
      clearInterval(checkInterval)
    }
  })
</script>

<style scoped>
  .license-watermark {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .watermark-content {
    font-size: 48px;
    font-weight: bold;
    color: rgba(255, 0, 0, 0.3);
    transform: rotate(-45deg);
    user-select: none;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .watermark-content {
      font-size: 32px;
    }
  }

  @media (max-width: 480px) {
    .watermark-content {
      font-size: 24px;
    }
  }
</style>
