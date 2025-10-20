<template>
  <div class="settings-wrapper">
    <el-tabs class="settings-tabs" tab-position="left">
      <!-- 基本设置 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><Setting /></el-icon>
            <span>基本设置</span>
          </div>
        </template>

        <div class="tab-content-container">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h2 class="text-lg font-medium mb-6">基本设置</h2>
            
            <el-form label-position="top">
              <el-form-item label="系统名称">
                <el-input v-model="settings.systemName" />
              </el-form-item>

              <el-form-item label="默认浏览器">
                <el-select v-model="settings.defaultBrowser" class="w-full">
                  <el-option label="Chrome" value="chrome" />
                  <el-option label="Edge" value="edge" />
                  <el-option label="Firefox" value="firefox" />
                </el-select>
              </el-form-item>

              <el-form-item label="并发任务数">
                <el-input-number
                  v-model="settings.maxConcurrentTasks"
                  :min="1"
                  :max="10"
                  class="w-32"
                />
              </el-form-item>

              <el-form-item label="自动保存间隔（分钟）">
                <el-input-number
                  v-model="settings.autoSaveInterval"
                  :min="1"
                  :max="60"
                  class="w-32"
                />
              </el-form-item>

              <el-form-item>
                <el-checkbox v-model="settings.autoUpdate">自动检查更新</el-checkbox>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </el-tab-pane>

      <!-- 高级设置 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><SetUp /></el-icon>
            <span>高级设置</span>
          </div>
        </template>

        <div class="tab-content-container">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h2 class="text-lg font-medium mb-6">高级设置</h2>

            <el-form label-position="top">
              <el-form-item label="浏览器启动参数">
                <el-input
                  v-model="settings.browserArgs"
                  type="textarea"
                  rows="3"
                  placeholder="每行一个参数"
                />
              </el-form-item>

              <el-form-item label="超时设置（秒）">
                <el-input-number
                  v-model="settings.timeout"
                  :min="0"
                  :max="300"
                  class="w-32"
                />
              </el-form-item>

              <el-form-item label="代理设置">
                <el-input v-model="settings.proxy" placeholder="http://proxy.example.com:8080" />
              </el-form-item>

              <el-form-item>
                <el-checkbox v-model="settings.headless">启用无头模式</el-checkbox>
              </el-form-item>

              <el-form-item>
                <el-checkbox v-model="settings.debug">启用调试模式</el-checkbox>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </el-tab-pane>

      <!-- 许可证管理 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><Key /></el-icon>
            <span>许可证管理</span>
          </div>
        </template>

        <div class="tab-content-container">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h2 class="text-lg font-medium mb-6">许可证管理</h2>

            <!-- 当前许可证状态 -->
            <div class="mb-8">
              <h3 class="text-base font-medium mb-4">当前许可证状态</h3>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">版本类型:</span>
                    <div class="font-medium" :class="getLicenseTypeColor(licenseStatus.type)">{{ licenseStatus.type }}</div>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">状态:</span>
                    <div class="font-medium" :class="getLicenseStatusColor(licenseStatus.status)">{{ licenseStatus.status }}</div>
                  </div>
                  <div v-if="licenseStatus.expiryDate">
                    <span class="text-sm text-gray-500 dark:text-gray-400">到期时间:</span>
                    <div class="font-medium">{{ licenseStatus.expiryDate }}</div>
                  </div>
                  <div v-if="licenseStatus.remainingDays !== undefined">
                    <span class="text-sm text-gray-500 dark:text-gray-400">剩余天数:</span>
                    <div class="font-medium" :class="licenseStatus.remainingDays < 30 ? 'text-red-500' : 'text-green-500'">
                      {{ licenseStatus.remainingDays }} 天
                    </div>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">本月执行次数:</span>
                    <div class="font-medium">
                      {{ licenseStatus.executionCount }} / {{ licenseStatus.maxExecutions === -1 ? '无限制' : licenseStatus.maxExecutions }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 许可证激活 -->
            <div class="mb-8">
              <h3 class="text-base font-medium mb-4">激活许可证</h3>
              <div class="flex space-x-4">
                <el-input
                  v-model="licenseKey"
                  placeholder="请输入许可证密钥"
                  class="flex-1"
                  :disabled="activating"
                />
                <el-button
                  type="primary"
                  @click="activateLicense"
                  :loading="activating"
                  :disabled="!licenseKey.trim()"
                >
                  激活
                </el-button>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                输入您购买的许可证密钥来激活专业版或企业版功能
              </div>
            </div>

            <!-- 版本对比 -->
            <div class="mb-8">
              <h3 class="text-base font-medium mb-4">版本对比</h3>
              <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-700">
                      <th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">功能</th>
                      <th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">免费版</th>
                      <th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">专业版</th>
                      <th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">企业版</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">每月执行次数</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">100次</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">无限制</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">无限制</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">最大节点数</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">10个</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">50个</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">无限制</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">AI流程生成</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">验证码识别</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">云端同步</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">团队协作</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">API接口</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">❌</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">✅</td>
                    </tr>
                    <tr>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2">技术支持</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">社区</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">邮件</td>
                      <td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">优先</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 购买链接 -->
            <div class="mb-8">
              <h3 class="text-base font-medium mb-4">购买许可证</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <h4 class="font-medium mb-2">专业版</h4>
                  <div class="text-2xl font-bold text-blue-600 mb-2">¥99/月</div>
                  <ul class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <li>• 无限制执行次数</li>
                    <li>• AI流程生成</li>
                    <li>• 验证码识别</li>
                    <li>• 云端同步</li>
                  </ul>
                  <el-button type="primary" class="w-full" @click="openPurchaseLink('professional')">
                    立即购买
                  </el-button>
                </div>
                <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <h4 class="font-medium mb-2">企业版</h4>
                  <div class="text-2xl font-bold text-green-600 mb-2">¥299/月</div>
                  <ul class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <li>• 专业版所有功能</li>
                    <li>• 团队协作</li>
                    <li>• API接口</li>
                    <li>• 优先技术支持</li>
                  </ul>
                  <el-button type="success" class="w-full" @click="openPurchaseLink('enterprise')">
                    立即购买
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 试用和重置 -->
            <div>
              <h3 class="text-base font-medium mb-4">其他操作</h3>
              <div class="flex space-x-4">
                <el-button @click="startTrial" :disabled="licenseStatus.type !== '免费版'">
                  开始30天试用
                </el-button>
                <el-button type="danger" @click="resetLicense">
                  重置为免费版
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 数据管理 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><DataLine /></el-icon>
            <span>数据管理</span>
          </div>
        </template>

        <div class="tab-content-container">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h2 class="text-lg font-medium mb-6">数据管理</h2>

            <div class="space-y-6">
              <div>
                <h3 class="text-base font-medium mb-2">数据库位置</h3>
          <div class="flex items-center space-x-2 mb-2">
                  <el-input v-model="databasePath" readonly placeholder="数据库文件路径" class="flex-1" />
                  <el-button @click="selectDatabasePath">
                    <el-icon><Folder /></el-icon>
                    选择位置
                  </el-button>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  修改数据库位置后，应用程序将使用新位置存储数据。
                </div>
              </div>

              <div>
                <h3 class="text-base font-medium mb-2">数据备份</h3>
                <div class="flex space-x-4">
                  <el-button type="primary" @click="backupData">
                    <el-icon><Download /></el-icon>
                    备份数据
                  </el-button>
                  <el-button @click="restoreData">
                    <el-icon><Upload /></el-icon>
                    恢复数据
                  </el-button>
                </div>
              </div>

              <div>
                <h3 class="text-base font-medium mb-2">清理数据</h3>
                <div class="space-y-2">
                  <div>
                    <el-button type="danger" @click="clearCache">
                      <el-icon><Delete /></el-icon>
                      清理缓存
                    </el-button>
                    <span class="ml-2 text-gray-500 dark:text-gray-400">
                      已使用: {{ formatSize(cacheSize) }}
                    </span>
                  </div>
                  <div>
                    <el-button type="danger" @click="clearLogs">
                      <el-icon><Delete /></el-icon>
                      清理日志
                    </el-button>
                    <span class="ml-2 text-gray-500 dark:text-gray-400">
                      保留最近7天
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 系统电源控制 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><SetUp /></el-icon>
            <span>系统电源</span>
          </div>
        </template>

        <div class="tab-content-container">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h2 class="text-lg font-medium mb-6">系统电源控制（Windows）</h2>

            <el-alert type="warning" show-icon class="mb-4" title="请谨慎操作">
              <template #description>
                这些操作会影响当前计算机：关机、重启、睡眠、锁屏。请确认已保存好正在编辑的数据。
              </template>
            </el-alert>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 class="font-medium mb-3">关机 / 重启</h3>
                <div class="flex space-x-3">
                  <el-button type="danger" @click="confirmShutdown(false)">关机</el-button>
                  <el-button type="danger" plain @click="confirmShutdown(true)">强制关机</el-button>
                  <el-button type="primary" @click="confirmRestart(false)">重启</el-button>
                  <el-button type="primary" plain @click="confirmRestart(true)">强制重启</el-button>
                </div>
              </div>

              <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 class="font-medium mb-3">会话</h3>
                <div class="flex space-x-3">
                  <el-button @click="lockScreen">锁屏</el-button>
                  <el-button @click="sleep">睡眠</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 底部操作栏 -->
    <div class="action-footer">
          <div class="flex justify-end space-x-4">
        <el-button @click="resetSettings">重置设置</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Key } from '@element-plus/icons-vue'
import { licenseService } from '@/services/license-service'
import { systemControl } from '@/services/system-control'

// 设置数据
const settings = ref({
  systemName: 'AutoRAP',
  defaultBrowser: 'chrome',
  maxConcurrentTasks: 3,
  autoSaveInterval: 5,
  autoUpdate: true,
  browserArgs: '',
  timeout: 30,
  proxy: '',
  headless: false,
  debug: false,
})

// 数据库路径
const databasePath = ref('')

// 缓存大小
const cacheSize = ref(1024 * 1024 * 100) // 100MB

// 许可证管理相关
const licenseKey = ref('')
const activating = ref(false)
const licenseStatus = ref(licenseService.getLicenseStatus())

// 格式化文件大小
const formatSize = (size: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }
  return `${size.toFixed(2)} ${units[index]}`
}

// 获取当前数据库路径
const getDatabasePath = async () => {
  try {
    const result = await window.electronAPI.invoke('get-database-path')
    if (result.success) {
      databasePath.value = result.path
    } else {
      ElMessage.error('获取数据库路径失败: ' + result.error)
    }
  } catch (error) {
    console.error('获取数据库路径出错:', error)
    ElMessage.error('获取数据库路径出错')
  }
}

// 选择数据库路径
const selectDatabasePath = async () => {
  try {
    // 调用 Electron 的选择目录对话框
    const dirPath = await window.electronAPI.invoke('dialog:showOpenDirectoryDialog')
    if (!dirPath) return // 用户取消了选择
    
    // 使用 invoke 调用主进程来构建正确的路径
    const newDbPath = await window.electronAPI.invoke('build-database-path', dirPath)
    
    // 确认是否更改
    try {
      await ElMessageBox.confirm(
        `确定要将数据库位置更改为:\n${newDbPath}\n\n更改后应用程序将使用新位置存储数据。`,
        '更改数据库位置',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      // 设置新路径
      const result = await window.electronAPI.invoke('set-database-path', newDbPath)
      if (result.success) {
        databasePath.value = result.path
        ElMessage.success('数据库位置已更改')
      } else {
        ElMessage.error('设置数据库路径失败: ' + result.error)
      }
    } catch {
      // 用户取消了确认
    }
  } catch (error) {
    console.error('选择数据库路径出错:', error)
    ElMessage.error('选择数据库路径出错')
  }
}

// 选择目录
const selectDirectory = async () => {
  // TODO: 调用 Electron 的选择目录对话框
}

// 备份数据
const backupData = async () => {
  // TODO: 实现数据备份
}

// 恢复数据
const restoreData = async () => {
  // TODO: 实现数据恢复
}

// 清理缓存
const clearCache = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理缓存吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    // TODO: 实现缓存清理
  } catch {}
}

// 清理日志
const clearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理7天前的日志吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    // TODO: 实现日志清理
  } catch {}
}

// 电源控制交互
const doPowerAction = async (fn: () => Promise<{ success: boolean; error?: string }>, confirmText: string) => {
  try {
    await ElMessageBox.confirm(confirmText, '请确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  const res = await fn()
  if (!res.success) {
    ElMessage.error(res.error || '操作失败')
  }
}

const confirmShutdown = (force: boolean) => doPowerAction(() => systemControl.shutdown(force), `确定要${force ? '强制' : ''}关机吗？`)
const confirmRestart = (force: boolean) => doPowerAction(() => systemControl.restart(force), `确定要${force ? '强制' : ''}重启吗？`)
const lockScreen = () => doPowerAction(() => systemControl.lock(), '确定要锁定屏幕吗？')
const sleep = () => doPowerAction(() => systemControl.sleep(), '确定要让电脑进入睡眠吗？')

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有设置吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    // TODO: 实现设置重置
  } catch {}
}

// 许可证管理方法
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
      '确定要开始30天专业版试用吗？试用期间您可以使用所有专业版功能。',
      '开始试用',
      {
        confirmButtonText: '开始试用',
        cancelButtonText: '取消',
        type: 'info',
      }
    )
    
    const result = await licenseService.validateLicenseKey('TRIAL-' + Date.now())
    if (result.success) {
      licenseStatus.value = licenseService.getLicenseStatus()
      ElMessage.success('试用已开始，享受30天专业版功能！')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始试用失败:', error)
    }
  }
}

// 重置许可证
const resetLicense = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置为免费版吗？这将清除当前的许可证信息。',
      '重置许可证',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    licenseService.resetToFree()
    licenseStatus.value = licenseService.getLicenseStatus()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置许可证失败:', error)
    }
  }
}

// 打开购买链接
const openPurchaseLink = (type: string) => {
  const urls = {
    professional: 'https://your-website.com/purchase/professional',
    enterprise: 'https://your-website.com/purchase/enterprise'
  }
  
  // 在实际应用中，这里应该打开外部浏览器
  ElMessage.info(`请访问 ${urls[type as keyof typeof urls]} 购买许可证`)
}

// 获取许可证类型颜色
const getLicenseTypeColor = (type: string) => {
  switch (type) {
    case '免费版': return 'text-gray-600'
    case '专业版': return 'text-blue-600'
    case '企业版': return 'text-green-600'
    default: return 'text-gray-600'
  }
}

// 获取许可证状态颜色
const getLicenseStatusColor = (status: string) => {
  switch (status) {
    case '激活': return 'text-green-600'
    case '试用': return 'text-blue-600'
    case '已过期': return 'text-red-600'
    case '无效': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

// 保存设置
const saveSettings = () => {
  // TODO: 实现设置保存
}

// 组件挂载时获取数据库路径
onMounted(() => {
  getDatabasePath()
})
</script>

<style lang="postcss" scoped>
/* 整体容器 - 使用flex布局填充区域 */
.settings-wrapper {
  display: flex;
  flex-direction: column;
  background-color: #f3f4f6; /* 恢复灰色背景 bg-gray-100 */
  height: 100%;
  width: 100%;
  padding: 1.5rem;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.dark .settings-wrapper {
  background-color: #111827; /* dark:bg-gray-900 */
}

/* Tab面板内容区域 */
.tab-content-container {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 80px; /* 给底部操作栏留出空间 */
}

/* 设置标签页样式 */
.settings-tabs {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-tabs :deep(.el-tabs__item) {
  height: 3rem;
}

.settings-tabs :deep(.el-tabs__nav) {
  width: 12rem;
}

.settings-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

/* 底部固定操作栏 */
.action-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #f3f4f6; /* 与主容器背景色一致 */
  padding: 1rem;
  border-top: 1px solid #EBEEF5;
  z-index: 10;
}

.dark .action-footer {
  background-color: #111827; /* dark:bg-gray-900 */
  border-top: 1px solid #374151;
}
</style>