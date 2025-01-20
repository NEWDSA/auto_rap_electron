<template>
  <div class="tasks-container p-6">
    <!-- 搜索和操作栏 -->
    <div class="mb-6 flex justify-between items-center">
      <el-input
        v-model="searchQuery"
        placeholder="搜索任务"
        class="w-64"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-button-group>
        <el-button type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="success" @click="handleBatchStart">
          <el-icon><VideoPlay /></el-icon>
          批量启动
        </el-button>
        <el-button type="danger" @click="handleBatchStop">
          <el-icon><VideoPause /></el-icon>
          批量停止
        </el-button>
      </el-button-group>
    </div>

    <!-- 任务列表 -->
    <el-table
      :data="filteredTasks"
      border
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column label="任务名称" prop="name" min-width="200" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="180" />
      <el-table-column label="最后执行" prop="lastRunTime" width="180" />
      <el-table-column label="执行次数" prop="runCount" width="100" align="center" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              :type="row.status === 'running' ? 'danger' : 'success'"
              size="small"
              @click="handleTaskAction(row)"
            >
              <el-icon>
                <component :is="row.status === 'running' ? 'VideoPause' : 'VideoPlay'" />
              </el-icon>
              {{ row.status === 'running' ? '停止' : '启动' }}
            </el-button>
            <el-button type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="mt-4 flex justify-end">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'

// 搜索
const searchQuery = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(100)

// 选中的任务
const selectedTasks = ref<any[]>([])

// 模拟任务数据
const tasks = ref([
  {
    id: 1,
    name: '自动填表任务',
    status: 'running',
    createTime: '2024-01-20 10:00:00',
    lastRunTime: '2024-01-20 15:30:00',
    runCount: 5
  },
  {
    id: 2,
    name: '数据采集任务',
    status: 'stopped',
    createTime: '2024-01-19 14:00:00',
    lastRunTime: '2024-01-20 09:15:00',
    runCount: 12
  },
  // 更多任务数据...
])

// 根据搜索过滤任务
const filteredTasks = computed(() => {
  if (!searchQuery.value) return tasks.value
  const query = searchQuery.value.toLowerCase()
  return tasks.value.filter(task => 
    task.name.toLowerCase().includes(query)
  )
})

// 获取状态样式
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    running: 'success',
    stopped: 'danger',
    pending: 'warning'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    running: '运行中',
    stopped: '已停止',
    pending: '等待中'
  }
  return texts[status] || status
}

// 表格选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedTasks.value = selection
}

// 刷新列表
const handleRefresh = () => {
  // TODO: 实现刷新逻辑
  console.log('刷新任务列表')
}

// 批量启动
const handleBatchStart = () => {
  if (!selectedTasks.value.length) {
    ElMessage.warning('请选择要启动的任务')
    return
  }
  console.log('批量启动任务:', selectedTasks.value)
}

// 批量停止
const handleBatchStop = () => {
  if (!selectedTasks.value.length) {
    ElMessage.warning('请选择要停止的任务')
    return
  }
  console.log('批量停止任务:', selectedTasks.value)
}

// 单个任务操作
const handleTaskAction = (task: any) => {
  if (task.status === 'running') {
    console.log('停止任务:', task)
  } else {
    console.log('启动任务:', task)
  }
}

// 编辑任务
const handleEdit = (task: any) => {
  console.log('编辑任务:', task)
}

// 删除任务
const handleDelete = (task: any) => {
  ElMessageBox.confirm(
    '确定要删除该任务吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    console.log('删除任务:', task)
    ElMessage.success('删除成功')
  }).catch(() => {})
}
</script>

<style lang="postcss" scoped>
.tasks-container {
  @apply h-full flex flex-col;
}

:deep(.el-table) {
  @apply flex-1;
}
</style> 