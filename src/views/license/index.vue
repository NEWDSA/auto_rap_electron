<template>
  <div class="license-manager">
    <div class="header">
      <h1>许可证管理</h1>
      <p class="subtitle">管理您的软件许可证和订阅</p>
    </div>

    <el-card class="account-card" shadow="hover" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>账户信息</span>
        </div>
      </template>

      <div class="account-content">
        <div v-if="!isLoggedIn" class="login-section">
          <p>登录账户以同步您的许可状态</p>
          <el-button type="primary" @click="showLoginDialog = true">登录 / 注册</el-button>
        </div>

        <div v-else class="user-info">
          <div class="info-row">
            <span class="label">当前用户：</span>
            <span class="value">{{ currentUser.email }}</span>
          </div>
          <div class="info-row">
            <span class="label">许可状态：</span>
            <el-tag :type="currentUser.isPaid ? 'success' : 'warning'">
              {{ currentUser.isPaid ? '已激活 (专业版)' : '未激活' }}
            </el-tag>
          </div>
          <div v-if="currentUser.isPaid" class="info-row">
            <span class="label">有效期至：</span>
            <span class="value">{{ formatDate(currentUser.expireAt) }}</span>
          </div>

          <div class="actions" style="margin-top: 15px">
            <el-button v-if="!currentUser.isPaid" type="success" @click="handlePurchase"
              >购买专业版</el-button
            >
            <el-button type="info" plain @click="handleLogout">退出登录</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 登录对话框 -->
    <el-dialog v-model="showLoginDialog" title="登录 / 注册" width="400px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" label-width="60px">
            <el-form-item label="邮箱">
              <el-input v-model="loginForm.email"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password"></el-input>
            </el-form-item>
          </el-form>
          <div style="text-align: right; margin-top: 20px">
            <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" label-width="60px">
            <el-form-item label="邮箱">
              <el-input v-model="registerForm.email"></el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="registerForm.password" type="password"></el-input>
            </el-form-item>
          </el-form>
          <div style="text-align: right; margin-top: 20px">
            <el-button type="primary" :loading="loading" @click="handleRegister">注册</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

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

        <div v-if="licenseStatus.expiresAt" class="status-item">
          <span class="label">到期时间：</span>
          <span class="value">{{ formatDate(licenseStatus.expiresAt) }}</span>
        </div>

        <div class="status-item">
          <span class="label">本月已执行：</span>
          <span class="value"
            >{{ licenseStatus.monthlyExecutions }} /
            {{ licenseStatus.monthlyLimit === -1 ? '无限制' : licenseStatus.monthlyLimit }}</span
          >
        </div>

        <div class="status-item">
          <span class="label">节点限制：</span>
          <span class="value"
            >{{ licenseStatus.nodeLimit === -1 ? '无限制' : licenseStatus.nodeLimit }} 个</span
          >
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
          <el-button type="primary" size="large" :loading="activating" @click="activateLicense">
            激活许可证
          </el-button>

          <el-button
            v-if="licenseStatus.type === '未激活' && !licenseStatus.hasStartedTrial"
            type="info"
            size="large"
            @click="startTrial"
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
    <div v-if="licenseStatus.type !== '未激活'" class="actions">
      <el-button type="info" @click="refreshLicenseStatus"> 刷新许可证状态 </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, reactive } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Key, Unlock, Grid, User, ShoppingCart, Check, Close } from '@element-plus/icons-vue'
  import { useLicense } from '@/composables/useLicense'
  import { PaymentApi } from '@/api/payment'
  import supabase from '@/utils/supabase'

  const showLoginDialog = ref(false)
  const activeTab = ref('login')
  const loading = ref(false)
  const isLoggedIn = ref(false)
  const currentUser = reactive({
    email: '',
    isPaid: false,
    expireAt: '',
  })

  const loginForm = reactive({ email: '', password: '' })
  const registerForm = reactive({ email: '', password: '' })

  const {
    licenseStatus,
    licenseKey,
    activating,
    activateLicense,
    startTrial,
    formatDate,
    getTypeTagType,
    getStatusTagType,
  } = useLicense()

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
    { feature: '技术支持', trial: false, professional: true, enterprise: true },
  ])

  const fetchUserInfo = async () => {
    try {
      const res = await PaymentApi.getUserInfo()
      if (res.data.code === 200) {
        const user = res.data.data
        isLoggedIn.value = true
        currentUser.email = user.email
        currentUser.isPaid = user.isPaid
        currentUser.expireAt = user.expireAt
      } else {
        handleLogout()
      }
    } catch (e) {
      handleLogout()
    }
  }

  const handleLogin = async () => {
    loading.value = true
    try {
      if (!supabase) {
        ElMessage.error('Supabase 未配置，请联系管理员')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      })
      if (error) throw error
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.access_token) throw new Error('无法获取 Supabase 会话')
      const ex = await PaymentApi.supabaseExchange(session.access_token)
      if (ex.data.code === 200) {
        localStorage.setItem('auth_token', ex.data.data.token)
        ElMessage.success('登录成功')
        showLoginDialog.value = false
        await fetchUserInfo()
      } else {
        ElMessage.error(ex.data.msg || '登录失败')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '登录失败')
    } finally {
      loading.value = false
    }
  }

  const handleRegister = async () => {
    loading.value = true
    try {
      if (!supabase) {
        ElMessage.error('Supabase 未配置，请联系管理员')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
      })
      if (error) throw error

      // Check if email confirmation is required
      if (!data.session && data.user) {
        ElMessage.success('注册成功！请检查您的邮箱并点击激活链接')
        activeTab.value = 'login'
        return
      }

      // If session exists, proceed to login flow
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.access_token) throw new Error('无法获取 Supabase 会话')
      const ex = await PaymentApi.supabaseExchange(session.access_token)
      if (ex.data.code === 200) {
        localStorage.setItem('auth_token', ex.data.data.token)
        ElMessage.success('注册成功')
        showLoginDialog.value = false
        await fetchUserInfo()
      } else {
        ElMessage.error(ex.data.msg || '注册失败')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '注册失败')
    } finally {
      loading.value = false
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    isLoggedIn.value = false
    currentUser.email = ''
    currentUser.isPaid = false
  }

  const handlePurchase = async () => {
    try {
      const res = await PaymentApi.createOrder()
      if (res.data.code === 200) {
        const { payUrl } = res.data.data
        // Open payment URL in browser
        window.electronAPI?.invoke('open-external', payUrl) || window.open(payUrl, '_blank')

        ElMessageBox.confirm('支付完成后，请点击确认刷新状态', '支付提示', {
          confirmButtonText: '支付已完成',
          cancelButtonText: '稍后支付',
          type: 'info',
        })
          .then(() => {
            fetchUserInfo()
          })
          .catch(() => {})
      } else {
        ElMessage.error(res.data.msg || '创建订单失败')
      }
    } catch (e) {
      ElMessage.error('创建订单失败')
    }
  }

  // 刷新许可证状态
  const refreshLicenseStatus = async () => {
    await fetchUserInfo()
    ElMessage.success('状态已刷新')
  }

  // 打开购买链接
  const openPurchaseLink = (type: string) => {
    const urls = {
      professional: 'https://your-website.com/purchase/professional',
      enterprise: 'https://your-website.com/purchase/enterprise',
    }

    ElMessage.info(`请访问 ${urls[type as keyof typeof urls]} 购买许可证`)
  }

  onMounted(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      fetchUserInfo()
    }
  })
</script>

<style lang="postcss" scoped>
  .license-manager {
    padding: 18px;
    color: var(--text-color);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2rem;
    font-weight: bold;
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--text-color-secondary);
    font-size: 1.1rem;
  }

  :deep(.el-card) {
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color-light);
    background: var(--surface-color);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-tight);
  }

  :deep(.el-card__header) {
    border-bottom-color: var(--border-color-light);
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
