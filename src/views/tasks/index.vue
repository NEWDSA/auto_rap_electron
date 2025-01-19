<template>
  <div class="h-full flex flex-col space-y-4">
    <!-- 搜索工具栏 -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
      <div class="flex items-center space-x-4">
        <el-input
          v-model="searchQuery"
          placeholder="搜索任务名称"
          class="!w-64"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="statusFilter" placeholder="状态" clearable>
          <el-option
            v-for="status in statusOptions"
            :key="status.value"
            :label="status.label"
            :value="status.value"
          />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />

        <el-button type="primary" @click="searchTasks">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="flex-1 bg-white dark:bg-gray-800 p-4 rounded-lg">
      <el-table
        :data="tasks"
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column type="expand">
          <template #default="props">
            <div class="p-4">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="创建时间">
                  {{ props.row.createTime }}
                </el-descriptions-item>
                <el-descriptions-item label="最后执行">
                  {{ props.row.lastRunTime }}
                </el-descriptions-item>
                <el-descriptions-item label="成功次数">
                  {{ props.row.successCount }}
                </el-descriptions-item>
                <el-descriptions-item label="失败次数">
                  {{ props.row.failureCount }}
                </el-descriptions-item>
                <el-descriptions-item label="描述" :span="2">
                  {{ props.row.description }}
                </el-descriptions-item>
              </el-descriptions>

              <div class="mt-4">
                <h4 class="font-medium mb-2">执行日志</h4>
                <el-timeline>
                  <el-timeline-item
                    v-for="log in props.row.logs"
                    :key="log.time"
                    :type="log.status === 'success' ? 'success' : 'danger'"
                    :timestamp="log.time"
                  >
                    {{ log.message }}
                  </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="任务名称" min-width="200" />
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="schedule" label="调度" width="150">
          <template #default="{ row }">
            <el-tag type="info" v-if="row.schedule">
              {{ row.schedule }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="lastRunTime" label="最后执行" width="180" />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                :type="row.status === 'running' ? 'danger' : 'primary'"
                size="small"
                @click="toggleTask(row)"
              >
                <el-icon>
                  <component :is="row.status === 'running' ? 'VideoPause' : 'VideoPlay'" />
                </el-icon>
                {{ row.status === 'running' ? '停止' : '运行' }}
              </el-button>
              <el-button
                type="primary"
                size="small"
                plain
                @click="editTask(row)"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                plain
                @click="deleteTask(row)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'

// 搜索条件
const searchQuery = ref('')
const statusFilter = ref('')
const dateRange = ref()

// 状态选项
const statusOptions = [
  { value: 'running', label: '运行中' },
  { value: 'stopped', label: '已停止' },
  { value: 'error', label: '错误' },
]

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 加载状态
const loading = ref(false)

// 任务数据
const tasks = ref([
  {
    id: 1,
    name: '示例任务1',
    status: 'running',
    schedule: '每天 09:00',
    lastRunTime: '2024-01-19 09:00:00',
    createTime: '2024-01-01 12:00:00',
    successCount: 128,
    failureCount: 2,
    description: '这是一个示例任务，用于演示任务管理功能。',
    logs: [
      {
        time: '2024-01-19 09:00:00',
        status: 'success',
        message: '任务执行成功'
      },
      {
        time: '2024-01-18 09:00:00',
        status: 'success',
        message: '任务执行成功'
      }
    ]
  },
  // 更多示例数据...
])

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    running: 'success',
    stopped: 'info',
    error: 'danger'
  }
  return map[status] || 'info'
}

// 搜索任务
const searchTasks = () => {
  // TODO: 实现任务搜索
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

// 切换任务状态
const toggleTask = (task: any) => {
  // TODO: 实现任务状态切换
}

// 编辑任务
const editTask = (task: any) => {
  // TODO: 实现任务编辑
}

// 删除任务
const deleteTask = (task: any) => {
  ElMessageBox.confirm(
    '确定要删除该任务吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    // TODO: 实现任务删除
  })
}

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val
  searchTasks()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  searchTasks()
}
</script>

<style scoped>
.tasks-container {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 