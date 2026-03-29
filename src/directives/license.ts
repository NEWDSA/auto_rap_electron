import { Directive } from 'vue'
import { ElMessage } from 'element-plus'
import { licenseService } from '@/services/license-service'

// 许可证检查指令
export const vLicense: Directive = {
  mounted(el, binding) {
    const { value } = binding

    // 如果没有许可证，禁用元素
    const checkLicense = () => {
      const licenseStatus = licenseService.getLicenseStatus()
      const hasValidLicense = licenseStatus.type !== '未激活'

      if (!hasValidLicense) {
        el.disabled = true
        el.style.opacity = '0.5'
        el.style.cursor = 'not-allowed'
        el.title = '需要有效许可证'

        // 添加点击事件提示
        el.addEventListener(
          'click',
          (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            ElMessage.error('请先激活许可证或开始试用')
          },
          true
        )
      } else {
        el.disabled = false
        el.style.opacity = '1'
        el.style.cursor = 'pointer'
        el.title = ''
      }
    }

    // 初始检查
    checkLicense()

    // 监听许可证状态变化
    const interval = setInterval(checkLicense, 1000)
    el._licenseCheckInterval = interval
  },

  unmounted(el) {
    if (el._licenseCheckInterval) {
      clearInterval(el._licenseCheckInterval)
    }
  },
}

// 功能权限检查指令
export const vFeature: Directive = {
  mounted(el, binding) {
    const { value: feature } = binding

    const checkFeature = () => {
      const hasFeature = licenseService.hasFeature(feature)

      if (!hasFeature) {
        el.disabled = true
        el.style.opacity = '0.5'
        el.style.cursor = 'not-allowed'
        el.title = `此功能需要更高级的许可证`

        el.addEventListener(
          'click',
          (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            ElMessage.error(`此功能需要更高级的许可证`)
          },
          true
        )
      } else {
        el.disabled = false
        el.style.opacity = '1'
        el.style.cursor = 'pointer'
        el.title = ''
      }
    }

    checkFeature()

    const interval = setInterval(checkFeature, 1000)
    el._featureCheckInterval = interval
  },

  unmounted(el) {
    if (el._featureCheckInterval) {
      clearInterval(el._featureCheckInterval)
    }
  },
}
