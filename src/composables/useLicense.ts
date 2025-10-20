import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { licenseService } from '@/services/license-service'
import LicenseManager from '@/utils/licenseManager'

export function useLicense() {
  const licenseStatus = ref(licenseService.getLicenseStatus())

  // 检查是否有有效许可证
  const hasValidLicense = computed(() => {
    return licenseStatus.value.type !== '未激活'
  })

  // 检查是否可以执行任务
  const canExecuteTask = computed(() => {
    const result = licenseService.canExecuteTask()
    return result.allowed
  })

  // 检查功能权限
  const hasFeature = (feature: string) => {
    return licenseService.hasFeature(feature)
  }

  // 刷新许可证状态
  const refreshLicenseStatus = async () => {
    try {
      await licenseService.initializeLicense()
      licenseStatus.value = licenseService.getLicenseStatus()
    } catch (error) {
      console.error('刷新许可证状态失败:', error)
    }
  }

  // 检查并提示许可证
  const checkLicenseWithPrompt = async (action: string = '执行此操作') => {
    if (!hasValidLicense.value) {
      ElMessage.error('请先激活许可证或开始试用')
      return false
    }

    const taskCheck = licenseService.canExecuteTask()
    if (!taskCheck.allowed) {
      ElMessage.error(taskCheck.message || '无法执行操作')
      return false
    }

    return true
  }

  // 检查节点操作权限
  const checkNodePermission = async (action: 'add' | 'edit' | 'delete' | 'save' | 'run') => {
    const actionNames = {
      add: '添加节点',
      edit: '编辑节点', 
      delete: '删除节点',
      save: '保存流程',
      run: '运行流程'
    }

    if (!hasValidLicense.value) {
      await ElMessageBox.alert(
        `需要有效的许可证才能${actionNames[action]}。请激活许可证或开始7天免费试用。`,
        '需要许可证',
        {
          confirmButtonText: '去激活',
          type: 'warning'
        }
      )
      return false
    }

    const taskCheck = licenseService.canExecuteTask()
    if (!taskCheck.allowed) {
      ElMessage.error(taskCheck.message || `无法${actionNames[action]}`)
      return false
    }

    return true
  }

  // 记录使用情况
  const recordUsage = async (action: string) => {
    try {
      licenseService.recordExecution()
      await LicenseManager.recordUsage(action)
    } catch (error) {
      console.error('记录使用失败:', error)
    }
  }

  return {
    licenseStatus,
    hasValidLicense,
    canExecuteTask,
    hasFeature,
    refreshLicenseStatus,
    checkLicenseWithPrompt,
    checkNodePermission,
    recordUsage
  }
}