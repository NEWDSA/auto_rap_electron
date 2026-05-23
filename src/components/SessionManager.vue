<template>
  <div class="bg-white dark:bg-gray-800 p-6 rounded-lg">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-white">浏览器登录态管理</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cookie 自动持久化到磁盘，重启后无需重新登录
        </p>
      </div>
      <el-button @click="fetchSessions">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 列表 -->
    <div v-if="sessions.length > 0" class="space-y-3 mb-6">
      <div v-for="s in sessions" :key="s.name"
        class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <el-icon class="text-green-500 text-lg"><Monitor /></el-icon>
          </div>
          <div>
            <div class="font-medium text-gray-900 dark:text-white">{{ s.name }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ fmtSize(s.size) }} · {{ fmtDate(s.updatedAt) }}
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <el-button size="small" @click="doLoad(s.name)">加载使用</el-button>
          <el-button size="small" type="danger" plain @click="doDelete(s.name)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无保存的 Session" />

    <el-divider />

    <!-- 保存 -->
    <h3 class="text-base font-medium text-gray-900 dark:text-white mb-3">保存当前登录态</h3>
    <div class="flex gap-3">
      <el-input v-model="newName" placeholder="名称，如 wechat、bilibili" class="flex-1" @keyup.enter="doSave" />
      <el-button type="success" :loading="saving" :disabled="!newName.trim()" @click="doSave">
        <el-icon><Download /></el-icon>
        保存当前 Session
      </el-button>
    </div>
    <p class="text-xs text-gray-400 mt-2">将当前浏览器 Cookie 导出为文件，下次加载后跳过登录。</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Delete, Monitor, Refresh } from '@element-plus/icons-vue'

interface SessionItem { name: string; size: number; updatedAt: string }

const sessions = ref<SessionItem[]>([])
const newName = ref('')
const saving = ref(false)

const fetchSessions = async () => {
  try {
    const r = await (window as any).electronAPI.invoke('session:list')
    if (r.success) sessions.value = r.sessions
  } catch {}
}

const doSave = async () => {
  const n = newName.value.trim(); if (!n) return
  saving.value = true
  try {
    const r = await (window as any).electronAPI.invoke('session:save', n)
    if (r.success) { ElMessage.success(`✅ "${n}" 已保存 (${r.count} 个 Cookie)`); newName.value = ''; await fetchSessions() }
    else ElMessage.error(r.error)
  } catch (e: any) { ElMessage.error(e.message) } finally { saving.value = false }
}

const doDelete = async (n: string) => {
  try {
    await ElMessageBox.confirm(`删除 "${n}"？下次需重新登录。`, '确认', { type: 'warning' })
    const r = await (window as any).electronAPI.invoke('session:delete', n)
    if (r.success) { ElMessage.success(`✅ "${n}" 已删除`); await fetchSessions() }
    else ElMessage.error(r.error)
  } catch {}
}

const doLoad = async (n: string) => {
  try {
    const r = await (window as any).electronAPI.invoke('session:load', n)
    if (r.success) ElMessage.success(`✅ "${n}" 已加载 (${r.count} 个 Cookie)`)
    else ElMessage.error(r.error)
  } catch (e: any) { ElMessage.error(e.message) }
}

const fmtSize = (s: number) => s < 1024 ? `${s} B` : `${(s / 1024).toFixed(1)} KB`
const fmtDate = (d: string) => new Date(d).toLocaleString('zh-CN')

onMounted(() => fetchSessions())
</script>