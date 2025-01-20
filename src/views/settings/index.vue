<template>
  <div class="h-full bg-gray-100 dark:bg-gray-900 p-4">
    <el-tabs class="settings-tabs" tab-position="left">
      <!-- 基本设置 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><Setting /></el-icon>
            <span>基本设置</span>
          </div>
        </template>

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
      </el-tab-pane>

      <!-- 高级设置 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><SetUp /></el-icon>
            <span>高级设置</span>
          </div>
        </template>

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
      </el-tab-pane>

      <!-- 数据管理 -->
      <el-tab-pane>
        <template #label>
          <div class="flex items-center space-x-2">
            <el-icon><DataLine /></el-icon>
            <span>数据管理</span>
          </div>
        </template>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-lg font-medium mb-6">数据管理</h2>

          <div class="space-y-6">
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
      </el-tab-pane>
    </el-tabs>

    <!-- 底部操作栏 -->
    <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
      <div class="max-w-7xl mx-auto flex justify-end space-x-4">
        <el-button @click="resetSettings">重置设置</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'

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

// 缓存大小
const cacheSize = ref(1024 * 1024 * 100) // 100MB

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

// 保存设置
const saveSettings = () => {
  // TODO: 实现设置保存
}
</script>

<style lang="postcss" scoped>
.settings-tabs :deep(.el-tabs__item) {
  @apply h-12;
}

.settings-tabs :deep(.el-tabs__nav) {
  @apply w-48;
}
</style> 