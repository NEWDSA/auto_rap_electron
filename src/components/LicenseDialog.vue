<template>
  <div v-if="showDialog" :class="containerClass">
    <div :class="dialogClass">
      <div class="text-center mb-6">
        <div class="license-icon mb-4">
          <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20" class="text-red-500">
            <path
              fill-rule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">需要许可证授权</h2>
        <p class="text-gray-600 text-sm mb-4">
          此应用需要有效的许可证才能使用，请输入您的许可证密钥。
        </p>
        <div v-if="displayError" class="text-red-600 mb-4 p-3 bg-red-50 rounded-md">
          <p class="font-medium">{{ displayError }}</p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="activateLicense">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2"> 许可证密钥 * </label>
          <input
            v-model="licenseKey"
            type="text"
            placeholder="AR01-2025-PRO1-XXXX-XXXX"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="loading"
            required
          />
          <p class="text-xs text-gray-500 mt-1">请联系管理员获取许可证密钥</p>
        </div>

        <div class="flex space-x-3">
          <button
            type="submit"
            :disabled="loading || !licenseKey.trim()"
            class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="loading">验证中...</span>
            <span v-else>激活许可证</span>
          </button>
        </div>

        <div class="mt-6 text-center text-sm text-gray-600">
          <p>需要获取许可证？</p>
          <p class="text-blue-600">请联系管理员获取授权</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import LicenseManager from '@/utils/licenseManager'

  interface Props {
    showDialog: boolean
    isFullscreen?: boolean
    licenseError?: string
  }

  interface Emits {
    (e: 'license-activated', valid: boolean): void
    (e: 'close'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    isFullscreen: false,
    licenseError: '',
  })

  const emit = defineEmits<Emits>()

  const licenseKey = ref('')
  const loading = ref(false)
  const error = ref('')

  // 计算样式类
  const containerClass = computed(() => {
    if (props.isFullscreen) {
      return 'fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center z-50'
    }
    return 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  })

  const dialogClass = computed(() => {
    if (props.isFullscreen) {
      return 'bg-white rounded-lg p-8 max-w-lg w-full mx-4 shadow-2xl'
    }
    return 'bg-white rounded-lg p-6 max-w-md w-full mx-4'
  })

  // 显示的错误信息（优先显示传入的错误）
  const displayError = computed(() => {
    return props.licenseError || error.value
  })

  const activateLicense = async () => {
    if (!licenseKey.value.trim()) return

    loading.value = true
    error.value = ''

    try {
      const manager = LicenseManager
      const result = await manager.activateLicense(licenseKey.value.trim())

      if (result.valid) {
        emit('license-activated', true)
        emit('close')
        licenseKey.value = '' // 清空输入
      } else {
        error.value = result.error || '许可证激活失败，请检查密钥是否正确'
      }
    } catch (err) {
      console.error('License activation error:', err)
      error.value = '激活过程中发生错误，请检查网络连接'
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  .license-icon {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .transition-colors {
    transition: background-color 0.2s ease-in-out;
  }

  /* 输入框聚焦效果 */
  input:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* 按钮悬停效果 */
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  /* 错误消息动画 */
  .text-red-600 {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 全屏模式样式增强 */
  .bg-gradient-to-br {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  }

  /* 全屏模式下的对话框样式 */
  .shadow-2xl {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  /* 响应式设计 */
  @media (max-width: 640px) {
    .max-w-lg {
      max-width: 90%;
    }
  }
</style>
