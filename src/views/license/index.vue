<template>
  <div class="license-manager">
    <div class="header">
      <h1>许可证管理</h1>
      <p class="subtitle">管理您的软件许可证和订阅</p>
    </div>

    <!-- 当前许可证状态 -->
    <el-card class="status-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Key /></el-icon>
          <span>当前许可证状态</span>
        </div>
      </template>
      
      <div class="status-content">
        <div class="status-item">
          <span class="label">许可证类型：</span>
          <el-tag :type="getTypeTagType(licenseStatus.type)" size="large">
            {{ licenseStatus.type }}
          </el-tag>
        </div>
        
        <div class="status-item">
          <span class="label">状态：</span>
          <el-tag :type="getStatusTagType(licenseStatus.status)" size="large">
            {{ licenseStatus.status }}
          </el-tag>
        </div>
        
        <div class="status-item" v-if="licenseStatus.expiresAt">
          <span class="label">到期时间：</span>
          <span class="value">{{ formatDate(licenseStatus.expiresAt) }}</span>
        </div>
        
        <div class="status-item">
          <span class="label">本月已执行：</span>
          <span class="value">{{ licenseStatus.monthlyExecutions }} / {{ licenseStatus.monthlyLimit === -1 ? '无限制' : licenseStatus.monthlyLimit }}</span>
        </div>
        
        <div class="status-item">
          <span class="label">节点限制：</span>
          <span class="value">{{ licenseStatus.nodeLimit === -1 ? '无限制' : licenseStatus.nodeLimit }} 个</span>
        </div>
      </div>
    </el-card>

    <!-- 许可证激活 -->
    <el-card class="activation-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Unlock /></el-icon>
          <span>激活许可证</span>
        </div>
      </template>
      
      <div class="activation-content">
        <el-input
          v-model="licenseKey"
          placeholder="请输入许可证密钥"
          size="large"
          class="license-input"
        >
          <template #prepend>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
        
        <div class="activation-buttons">
          <el-button 
            type="primary" 
            size="large"
            :loading="activating"
            @click="activateLicense"
          >
            激活许可证
          </el-button>
          
          <el-button 
            type="info" 
            size="large"
            @click="startTrial"
            v-if="licenseStatus.type === '未激活' && !licenseStatus.hasStartedTrial"
          >
            开始7天试用
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 版本对比 -->
    <el-card class="comparison-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Grid /></el-icon>
          <span>版本功能对比</span>
        </div>
      </template>
      
      <div class="comparison-table">
        <el-table :data="featureComparison" style="width: 100%">
          <el-table-column prop="feature" label="功能" width="200" />
          <el-table-column prop="trial" label="试用版(7天)" align="center">
            <template #default="{ row }">
              <span v-if="typeof row.trial === 'string'">{{ row.trial }}</span>
              <el-icon v-else-if="row.trial" color="#67c23a"><Check /></el-icon>
              <el-icon v-else color="#f56c6c"><Close /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="professional" label="专业版" align="center">
            <template #default="{ row }">
              <span v-if="typeof row.professional === 'string'">{{ row.professional }}</span>
              <el-icon v-else-if="row.professional" color="#67c23a"><Check /></el-icon>
              <el-icon v-else color="#f56c6c"><Close /></el-icon>
            </template>
          </el-table-column>
          <el-table-column prop="enterprise" label="企业版" align="center">
            <template #default="{ row }">
              <span v-if="typeof row.enterprise === 'string'">{{ row.enterprise }}</span>
              <el-icon v-else-if="row.enterprise" color="#67c23a"><Check /></el-icon>
              <el-icon v-else color="#f56c6c"><Close /></el-icon>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 购买选项 -->
    <el-card class="purchase-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><ShoppingCart /></el-icon>
          <span>购买许可证</span>
        </div>
      </template>
      
      <div class="purchase-options">
        <div class="option-card professional">
          <h3>专业版</h3>
          <div class="price">¥199<span>/年</span></div>
          <ul class="features">
            <li>无限制任务执行</li>
            <li>AI 脚本生成</li>
            <li>验证码识别</li>
            <li>定时任务</li>
            <li>高级数据提取</li>
            <li>云端同步</li>
            <li>邮件技术支持</li>
          </ul>
          <el-button type="primary" size="large" @click="openPurchaseLink('professional')">
            立即购买
          </el-button>
        </div>
        
        <div class="option-card enterprise">
          <h3>企业版</h3>
          <div class="price">¥999<span>/年</span></div>
          <ul class="features">
            <li>专业版所有功能</li>
            <li>团队协作管理</li>
            <li>API 接口调用</li>
            <li>批量部署</li>
            <li>定制开发服务</li>
            <li>专属客服支持</li>
            <li>现场培训</li>
          </ul>
          <el-button type="success" size="large" @click="openPurchaseLink('enterprise')">
            立即购买
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 操作按钮 -->
    <div class="actions" v-if="licenseStatus.type !== '未激活'">
      <el-button type="info" @click="refreshLicenseStatus">
        刷新许可证状态
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Key, Unlock, Grid, Check, Close, ShoppingCart } from '@element-plus/icons-vue'
import { licenseService } from '@/services/license-service'

// 响应式数据
const licenseKey = ref('')
const activating = ref(false)
const licenseStatus = ref(licenseService.getLicenseStatus())

// 功能对比数据 - 基于 Auto RAP 项目实际功能
const featureComparison = ref([
  { feature: '基础录制回放', trial: true, professional: true, enterprise: true },
  { feature: '任务执行次数', trial: '无限制(7天)', professional: '无限制', enterprise: '无限制' },
  { feature: '流程节点数量', trial: '50个', professional: '50个', enterprise: '无限制' },
  { feature: '浏览器自动化', trial: true, professional: true, enterprise: true },
  { feature: '元素识别录制', trial: true, professional: true, enterprise: true },
  { feature: 'AI 脚本生成', trial: true, professional: true, enterprise: true },
  { feature: '验证码识别', trial: true, professional: true, enterprise: true },
  { feature: '定时任务执行', trial: true, professional: true, enterprise: true },
  { feature: '数据提取导出', trial: '高级', professional: '高级', enterprise: '高级' },
  { feature: '截图功能', trial: true, professional: true, enterprise: true },
  { feature: '键盘鼠标模拟', trial: true, professional: true, enterprise: true },
  { feature: '循环控制', trial: true, professional: true, enterprise: true },
  { feature: '条件分支', trial: true, professional: true, enterprise: true },
  { feature: '云端同步', trial: true, professional: true, enterprise: true },
  { feature: '团队协作', trial: false, professional: false, enterprise: true },
  { feature: 'API 接口', trial: false, professional: false, enterprise: true },
  { feature: '技术支持', trial: false, professional: true, enterprise: true }
])

// 激活许可证
const activateLicense = async () => {
  if (!licenseKey.value.trim()) {
    ElMessage.error('请输入许可证密钥')
    return
  }
  
  activating.value = true
  try {
    const result = await licenseService.validateLicenseKey(licenseKey.value.trim())
    if (result.success) {
      licenseStatus.value = licenseService.getLicenseStatus()
      licenseKey.value = ''
    }
  } catch (error) {
    console.error('激活许可证失败:', error)
  } finally {
    activating.value = false
  }
}

// 开始试用
const startTrial = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要开始7天专业版试用吗？试用期间您可以使用所有专业版功能，包括AI脚本生成、验证码识别等。',
      '开始试用',
      {
        confirmButtonText: '开始试用',
        cancelButtonText: '取消',
        type: 'info',
      }
    )
    
    // 导入 LicenseManager
    const LicenseManager = (await import('@/utils/licenseManager')).default
    
    // 开始试用
    LicenseManager.startTrial()
    
    // 重新初始化许可证状态
    await licenseService.initializeLicense()
    licenseStatus.value = licenseService.getLicenseStatus()
    
    ElMessage.success('试用已开始，享受7天专业版功能！')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始试用失败:', error)
    }
  }
}

// 刷新许可证状态
const refreshLicenseStatus = async () => {
  try {
    // 重新初始化许可证状态
    await licenseService.initializeLicense()
    licenseStatus.value = licenseService.getLicenseStatus()
    ElMessage.success('许可证状态已刷新')
  } catch (error) {
    console.error('刷新许可证状态失败:', error)
    ElMessage.error('刷新失败，请检查网络连接')
  }
}

// 打开购买链接
const openPurchaseLink = (type: string) => {
  const urls = {
    professional: 'https://your-website.com/purchase/professional',
    enterprise: 'https://your-website.com/purchase/enterprise'
  }
  
  ElMessage.info(`请访问 ${urls[type as keyof typeof urls]} 购买许可证`)
}

// 获取类型标签类型
const getTypeTagType = (type: string) => {
  switch (type) {
    case '未激活': return 'danger'
    case '试用版': return 'warning'
    case '专业版': return 'success'
    case '企业版': return 'primary'
    default: return 'info'
  }
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  switch (status) {
    case '激活': return 'success'
    case '试用': return 'warning'
    case '已过期': return 'danger'
    case '无效': return 'danger'
    default: return 'info'
  }
}

// 格式化日期
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 组件挂载时刷新状态
onMounted(() => {
  licenseStatus.value = licenseService.getLicenseStatus()
})
</script>

<style lang="postcss" scoped>
.license-manager {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.status-card {
  margin-bottom: 2rem;
}

.status-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-item .label {
  font-weight: 500;
  color: #606266;
}

.status-item .value {
  font-weight: 600;
  color: #303133;
}

.activation-card {
  margin-bottom: 2rem;
}

.activation-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.license-input {
  max-width: 400px;
}

.activation-buttons {
  display: flex;
  gap: 1rem;
}

.comparison-card {
  margin-bottom: 2rem;
}

.purchase-card {
  margin-bottom: 2rem;
}

.purchase-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.option-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
}

.option-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.option-card.professional {
  border-color: #409eff;
}

.option-card.enterprise {
  border-color: #67c23a;
}

.option-card h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.price {
  font-size: 2rem;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 1.5rem;
}

.price span {
  font-size: 1rem;
  color: #909399;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
}

.features li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
  color: #606266;
}

.features li:last-child {
  border-bottom: none;
}

.actions {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #e4e7ed;
}

/* 深色模式支持 */
.dark .header h1 {
  color: #e5e7eb;
}

.dark .subtitle {
  color: #9ca3af;
}

.dark .status-item .label {
  color: #d1d5db;
}

.dark .status-item .value {
  color: #f3f4f6;
}

.dark .option-card {
  background-color: #374151;
  border-color: #4b5563;
}

.dark .option-card h3 {
  color: #f3f4f6;
}

.dark .features li {
  color: #d1d5db;
  border-bottom-color: #4b5563;
}
</style>