<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h3 class="text-lg font-semibold mb-3">许可证状态</h3>

    <div v-if="licenseInfo?.valid" class="space-y-2">
      <div class="flex items-center text-green-600">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="font-medium">许可证有效</span>
      </div>

      <div class="text-sm text-gray-600 space-y-1">
        <p><strong>类型:</strong> {{ getLicenseTypeName(licenseInfo.license?.type) }}</p>
        <p><strong>到期时间:</strong> {{ formatDate(licenseInfo.license?.expiresAt) }}</p>
        <p v-if="licenseInfo.license?.type !== 'TRIAL'">
          <strong>设备使用:</strong> {{ licenseInfo.license?.devicesUsed }}/{{
            licenseInfo.license?.maxDevices
          }}
        </p>
        <p v-if="licenseInfo.trialDaysLeft !== undefined" class="text-orange-600">
          <strong>试用剩余:</strong> {{ licenseInfo.trialDaysLeft }} 天
        </p>
      </div>

      <div class="mt-3">
        <h4 class="text-sm font-medium text-gray-700 mb-1">可用功能:</h4>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="feature in licenseInfo.license?.features"
            :key="feature"
            class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
          >
            {{ getFeatureName(feature) }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="space-y-2">
      <div class="flex items-center text-red-600">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="font-medium">许可证无效</span>
      </div>

      <p class="text-sm text-gray-600">{{ licenseInfo?.error }}</p>

      <button
        class="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        @click="$emit('show-license-dialog')"
      >
        输入许可证
      </button>
    </div>

    <div class="mt-4 pt-3 border-t border-gray-200">
      <button
        :disabled="refreshing"
        class="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        @click="refreshLicense"
      >
        <span v-if="refreshing">刷新中...</span>
        <span v-else>🔄 刷新状态</span>
      </button>

      <button
        v-if="licenseInfo?.valid && licenseInfo.license?.type !== 'TRIAL'"
        class="ml-4 text-sm text-red-600 hover:text-red-800"
        @click="clearLicense"
      >
        清除许可证
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import LicenseManager, { type LicenseInfo } from '@/utils/licenseManager'

  interface Emits {
    (e: 'show-license-dialog'): void
  }

  const emit = defineEmits<Emits>()

  const licenseInfo = ref<LicenseInfo | null>(null)
  const refreshing = ref(false)

  onMounted(async () => {
    await refreshLicense()
  })

  const refreshLicense = async () => {
    refreshing.value = true
    try {
      licenseInfo.value = await LicenseManager.validateLicense()
    } catch (error) {
      console.error('Failed to refresh license:', error)
    } finally {
      refreshing.value = false
    }
  }

  const clearLicense = () => {
    if (confirm('确定要清除当前许可证吗？')) {
      LicenseManager.clearLicense()
      refreshLicense()
    }
  }

  const getLicenseTypeName = (type?: string): string => {
    const typeNames: Record<string, string> = {
      TRIAL: '试用版',
      PRO1: '专业版',
      ENT1: '企业版',
    }
    return typeNames[type || ''] || type || '未知'
  }

  const getFeatureName = (feature: string): string => {
    const featureNames: Record<string, string> = {
      basic: '基础功能',
      advanced: '高级功能',
      premium: '专业功能',
      enterprise: '企业功能',
    }
    return featureNames[feature] || feature
  }

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '未知'
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  // 暴露刷新方法给父组件
  defineExpose({
    refreshLicense,
  })
</script>
