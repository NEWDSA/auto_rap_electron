<!-- RecorderControl.vue -->
<template>
  <div class="recorder-control">
    <div class="flex items-center space-x-4">
      <el-button
        :type="isRecording ? 'danger' : 'primary'"
        :icon="isRecording ? 'VideoPlay' : 'VideoPause'"
        @click="toggleRecording"
      >
        {{ isRecording ? '停止录制' : '开始录制' }}
      </el-button>

      <el-tag v-if="isRecording" type="danger" effect="dark">
        正在录制 {{ recordingTime }}
      </el-tag>
    </div>

    <!-- 录制结果预览 -->
    <el-dialog
      v-model="showPreview"
      title="录制结果预览"
      width="80%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="space-y-4">
        <div class="text-sm text-gray-500">
          共录制 {{ recordedActions.length }} 个动作
        </div>

        <el-table :data="recordedActions" style="width: 100%">
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getActionTypeTag(row.type)">
                {{ getActionTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="selector" label="选择器" width="200">
            <template #default="{ row }">
              <span v-if="row.selector">{{ row.selector }}</span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="value" label="值" width="200">
            <template #default="{ row }">
              <span v-if="row.value">{{ row.value }}</span>
              <span v-else-if="row.x !== undefined && row.y !== undefined">
                x: {{ row.x }}, y: {{ row.y }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showPreview = false">取消</el-button>
          <el-button type="primary" @click="generateWorkflow">
            生成工作流
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { RecorderService, type RecordedAction } from '@/services/RecorderService'
import dayjs from 'dayjs'

const props = defineProps<{
  onWorkflowGenerated?: (nodes: any[]) => void
}>()

const isRecording = ref(false)
const startTime = ref(0)
const currentTime = ref(0)
const recordedActions = ref<RecordedAction[]>([])
const showPreview = ref(false)
const recorder = RecorderService.getInstance()

// 计算录制时间
const recordingTime = computed(() => {
  if (!isRecording.value) return '00:00:00'
  const duration = Math.floor((currentTime.value - startTime.value) / 1000)
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// 更新计时器
let timer: number | null = null
const updateTimer = () => {
  if (isRecording.value) {
    currentTime.value = Date.now()
    timer = window.requestAnimationFrame(updateTimer)
  }
}

// 切换录制状态
const toggleRecording = async () => {
  try {
    if (!isRecording.value) {
      // 开始录制
      await recorder.startRecording()
      isRecording.value = true
      startTime.value = Date.now()
      currentTime.value = startTime.value
      updateTimer()
    } else {
      // 停止录制
      const nodes = await recorder.stopRecording()
      isRecording.value = false
      if (timer) {
        window.cancelAnimationFrame(timer)
        timer = null
      }
      recordedActions.value = recorder.getRecordedActions()
      showPreview.value = true

      // 如果有工作流生成回调，则调用
      if (nodes && nodes.length > 0 && props.onWorkflowGenerated) {
        props.onWorkflowGenerated(nodes)
      }
    }
  } catch (error) {
    console.error('录制操作失败:', error)
    ElMessage.error('录制操作失败')
  }
}

// 生成工作流
const generateWorkflow = () => {
  showPreview.value = false
  ElMessage.success('工作流生成成功')
}

// 获取动作类型标签
const getActionTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    click: '点击',
    input: '输入',
    scroll: '滚动',
    keypress: '按键',
    mouseMove: '移动'
  }
  return typeMap[type] || type
}

// 获取动作类型标签样式
const getActionTypeTag = (type: string): string => {
  const typeMap: Record<string, string> = {
    click: 'primary',
    input: 'success',
    scroll: 'warning',
    keypress: 'info',
    mouseMove: ''
  }
  return typeMap[type] || ''
}

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.recorder-control {
  padding: 1rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style> 