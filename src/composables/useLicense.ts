import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { licenseService } from '@/services/license-service'

export function useLicense() {
  const licenseStatus = ref(licenseService.getLicenseStatus())
  const licenseKey = ref('')
  const activating = ref(false)

  const refreshLicenseStatus = async () => {
    try {
      await licenseService.initializeLicense()
    } finally {
      licenseStatus.value = licenseService.getLicenseStatus()
    }
  }

  const hasValidLicense = computed(() => {
    return licenseStatus.value.type !== '未激活'
  })

  const canExecuteTask = computed(() => {
    return licenseService.canExecuteTask().allowed
  })

  const hasFeature = (feature: string) => {
    return licenseService.hasFeature(feature)
  }

  const activateLicense = async () => {
    if (!licenseKey.value.trim()) {
      ElMessage.warning('请输入许可证密钥')
      return
    }
    activating.value = true
    try {
      const res = await licenseService.validateLicenseKey(licenseKey.value.trim())
      if (!res.success) {
        ElMessage.error(res.message || '激活失败')
        return
      }
      licenseKey.value = ''
      await refreshLicenseStatus()
    } finally {
      activating.value = false
    }
  }

  const startTrial = async () => {
    const res = licenseService.startTrial(7)
    if (res.success) {
      ElMessage.success(res.message)
      await refreshLicenseStatus()
    } else {
      ElMessage.warning(res.message)
    }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const getTypeTagType = (type: string) => {
    if (type.includes('企业')) return 'success'
    if (type.includes('专业')) return 'success'
    if (type.includes('试用')) return 'warning'
    if (type.includes('未激活')) return 'info'
    return 'info'
  }

  const getStatusTagType = (status: string) => {
    if (status.includes('激活')) return 'success'
    if (status.includes('试用')) return 'warning'
    if (status.includes('过期')) return 'danger'
    if (status.includes('无效')) return 'danger'
    return 'info'
  }

  return {
    licenseStatus,
    licenseKey,
    activating,
    activateLicense,
    startTrial,
    formatDate,
    getTypeTagType,
    getStatusTagType,
    refreshLicenseStatus,
    hasValidLicense,
    canExecuteTask,
    hasFeature,
  }
}

