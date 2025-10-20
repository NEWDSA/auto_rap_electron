<template>
  <div class="tasks-wrapper">
    <!-- 搜索和操作栏 -->
    <div class="action-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索任务名称"
        class="search-input"
        clearable
        @clear="filterTasks"
        @input="filterTasks"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="button-group">
        <el-button type="primary" @click="handleRefresh">
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
        <el-button type="success" @click="handleBatchStart" :disabled="!selectedTasks.length">
          <el-icon><VideoPlay /></el-icon>
          批量启动
        </el-button>
        <el-button type="warning" @click="handleBatchStop" :disabled="!selectedTasks.length">
          <el-icon><VideoPause /></el-icon>
          批量停止
        </el-button>
        <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedTasks.length">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 表格容器 -->
    <div class="table-wrapper">
      <!-- 表格区域 - 使用自适应高度 -->
      <el-table
        ref="multipleTable"
        :data="filteredTasks"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        height="100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="任务名称" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="dark">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="scope">
            {{ new Date(scope.row.createTime).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="lastRunTime" label="上次运行时间" width="180">
          <template #default="scope">
            {{ scope.row.lastRunTime ? new Date(scope.row.lastRunTime).toLocaleString() : '从未运行' }}
          </template>
        </el-table-column>
        <el-table-column prop="executionCount" label="执行次数" width="100" />
        
        <el-table-column prop="nextRunTime" label="下次执行时间" width="180">
          <template #default="scope">
            {{ scope.row.scheduleConfig?.nextRunTime 
              ? new Date(scope.row.scheduleConfig.nextRunTime).toLocaleString() 
              : '未调度' }}
          </template>
        </el-table-column>
        
        <el-table-column fixed="right" label="操作" width="300">
          <template #default="scope">
            <div class="operation-buttons">
              <el-button 
                size="small" 
                :type="scope.row.status === 'running' ? 'warning' : 'success'"
                @click="handleTaskAction(scope.row)"
              >
                {{ scope.row.status === 'running' ? '停止' : '启动' }}
              </el-button>
              <el-button
                size="small"
                type="primary"
                @click="handleEdit(scope.row)"
              >
                编辑
              </el-button>
              
              <el-button
                size="small"
                type="info"
                @click="handleSchedule(scope.row)"
              >
                调度
              </el-button>
              
              <el-button
                size="small"
                type="danger"
                @click="handleDelete(scope.row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页区域 - 固定在底部 -->
      <div class="pagination-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredTasks.length"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增：任务调度对话框 -->
    <el-dialog
      v-model="scheduleDialogVisible"
      title="任务调度设置"
      width="700px"
      destroy-on-close
    >
      <ScheduleComponent
        v-if="scheduleDialogVisible"
        :task-id="currentTaskId"
        @schedule-saved="handleScheduleSaved"
        @schedule-canceled="scheduleDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { Search, RefreshRight, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import ScheduleComponent from './schedule.vue'

const router = useRouter()

// 搜索
const searchQuery = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 加载状态
const loading = ref(false)

// 选中的任务
const selectedTasks = ref<any[]>([])

// 任务数据
const tasks = ref<any[]>([])

// 调度对话框相关
const scheduleDialogVisible = ref(false)
const currentTaskId = ref(0)

// 深度清理对象，确保可序列化
const deepCleanObject = (obj: any): any => {
  // 如果不是对象或为null，直接返回
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // 如果是数组，递归清理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => deepCleanObject(item));
  }
  
  // 如果是普通对象，递归清理每个属性
  const cleanObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // 跳过函数和特殊对象
      const value = obj[key];
      if (typeof value !== 'function' && 
          !(value instanceof Element) && 
          !(typeof value === 'symbol')) {
        try {
          // 尝试序列化和反序列化，确保可以克隆
          JSON.parse(JSON.stringify(value));
          cleanObj[key] = deepCleanObject(value);
        } catch (e) {
          // 如果无法序列化，跳过该属性
          console.warn(`属性 ${key} 无法序列化，已跳过`);
        }
      }
    }
  }
  return cleanObj;
};

// 从数据库加载任务
const loadTasksFromDatabase = async () => {
  loading.value = true;
  try {
    // 先尝试从调度器API获取任务
    const schedulerResult = await window.electronAPI.invoke('scheduler:get-all-tasks');
    if (schedulerResult.success && schedulerResult.data && schedulerResult.data.length > 0) {
      // 过滤掉名为"test_connection"的测试任务
      const filteredTasks = schedulerResult.data.filter(task => task.name !== 'test_connection');
      tasks.value = filteredTasks;
      console.log('从调度器获取到任务数据(过滤后):', tasks.value.length);
      console.log('任务ID列表:', tasks.value.map(t => t.id));
    } else {
      // 如果调度器没有任务数据，从配置数据库加载并转换
      console.log('调度器无任务数据，尝试从配置数据库加载');
      const configResult = await window.electronAPI.invoke('get-all-configurations');
      if (configResult.success) {
        console.log('从配置数据库获取到数据:', configResult.data.length);
        console.log('配置ID列表:', configResult.data.map(c => c.id));
        
        // 将配置数据转换为任务格式（过滤掉测试任务）
        const configTasks = configResult.data
          .filter(config => config.name !== 'test_connection')
          .map((config: any) => {
            // 尝试解析存储的内容
            let content = null;
            try {
              content = JSON.parse(config.content);
            } catch (e) {
              console.error('解析任务内容失败:', e);
              content = { error: '无效的任务内容', nodes: [] };
            }
            
            // 创建任务对象
            const task = {
              id: config.id, // 使用配置的ID作为任务ID
              name: config.name,
              status: 'stopped',
              nodes: content.nodes || [],
              createTime: new Date(config.created_at).getTime(),
              lastRunTime: config.updated_at ? new Date(config.updated_at).getTime() : undefined,
              executionCount: content.executionCount !== undefined ? content.executionCount : 0
            };
            console.log(`配置 ${config.name} (ID: ${config.id}) 转换为任务，执行次数: ${task.executionCount}`);
            return task;
          });
        
        // 将转换后的任务保存到调度器
        for (const task of configTasks) {
          try {
            const result = await window.electronAPI.invoke('scheduler:add-task', task);
            console.log(`已将配置 ${task.name} (ID: ${task.id}) 转换为任务，结果:`, result.data.id);
            if (task.id !== result.data.id) {
              console.warn(`警告: 任务ID不匹配! 配置ID: ${task.id}, 任务ID: ${result.data.id}`);
            }
          } catch (error) {
            console.error(`转换配置 ${task.name} (ID: ${task.id}) 失败:`, error);
          }
        }
        
        // 重新从调度器获取任务
        const updatedResult = await window.electronAPI.invoke('scheduler:get-all-tasks');
        if (updatedResult.success) {
          tasks.value = updatedResult.data;
          console.log('更新后从调度器获取到任务数据:', tasks.value.length);
          console.log('更新后任务ID列表:', tasks.value.map(t => t.id));
        }
      } else {
        ElMessage.error('加载任务失败: ' + configResult.error);
      }
    }
  } catch (error) {
    console.error('加载任务列表出错:', error);
    ElMessage.error('加载任务列表出错');
  } finally {
    loading.value = false;
  }
}

// 根据搜索过滤任务
const filteredTasks = computed(() => {
  if (!searchQuery.value) return tasks.value
  const query = searchQuery.value.toLowerCase()
  return tasks.value.filter(task => 
    task.name.toLowerCase().includes(query)
  )
})

// 分页后的任务数据
const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTasks.value.slice(start, end)
})

// 分页大小变化处理
const handleSizeChange = (newSize: number) => {
  pageSize.value = newSize
  // 如果当前页没有数据，回到第一页
  if (currentPage.value > Math.ceil(filteredTasks.value.length / pageSize.value)) {
    currentPage.value = 1
  }
}

// 当前页变化处理
const handleCurrentChange = (newPage: number) => {
  currentPage.value = newPage
}

// 获取状态样式
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    running: 'success',
    stopped: 'danger',
    pending: 'warning',
    completed: 'info',
    failed: 'danger',
    scheduled: 'primary'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    running: '运行中',
    stopped: '已停止',
    pending: '等待中',
    completed: '已完成',
    failed: '失败',
    scheduled: '已调度'
  }
  return texts[status] || status
}

// 表格选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedTasks.value = selection
}

// 刷新列表
const handleRefresh = () => {
  loadTasksFromDatabase()
  ElMessage.success('刷新成功')
}

// 启动任务
const startTask = async (task: any) => {
  try {
    // 检查许可证是否允许执行任务
    const { licenseService } = await import('@/services/license-service')
    const canExecute = licenseService.canExecuteTask()
    
    if (!canExecute.allowed) {
      ElMessage.error(canExecute.message || '无法执行任务')
      return
    }
    
    // 使用调度器API启动任务
    const result = await window.electronAPI.invoke('scheduler:start-task', task.id);
    if (result.success) {
      // 记录任务执行
      licenseService.recordExecution()
      ElMessage.success('任务启动成功')
      // 刷新任务列表
      loadTasksFromDatabase()
    } else {
      ElMessage.error('任务启动失败: ' + result.error)
    }
  } catch (error) {
    console.error('启动任务出错:', error)
    ElMessage.error('启动任务出错')
  }
}

// 停止任务
const stopTask = async (task: any) => {
  try {
    // 使用调度器API停止任务
    const result = await window.electronAPI.invoke('scheduler:stop-task', task.id)
    if (result.success) {
      ElMessage.success('任务停止成功')
      // 刷新任务列表
      loadTasksFromDatabase()
    } else {
      ElMessage.error('任务停止失败: ' + result.error)
    }
  } catch (error) {
    console.error('停止任务出错:', error)
    ElMessage.error('停止任务出错')
  }
}

// 批量启动
const handleBatchStart = async () => {
  if (!selectedTasks.value.length) {
    ElMessage.warning('请选择要启动的任务')
    return
  }
  
  try {
    let successCount = 0
    let failCount = 0
    
    for (const task of selectedTasks.value) {
      try {
        // 启动任务
        await startTask(task)
        successCount++
      } catch (error) {
        console.error('启动任务出错:', error)
        failCount++
      }
    }
    
    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`成功启动 ${successCount} 个任务`)
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功启动 ${successCount} 个任务，${failCount} 个任务启动失败`)
    } else {
      ElMessage.error('所有任务启动失败')
    }
  } catch (error) {
    console.error('批量启动任务出错:', error)
    ElMessage.error('批量启动任务出错')
  }
}

// 批量停止
const handleBatchStop = async () => {
  if (!selectedTasks.value.length) {
    ElMessage.warning('请选择要停止的任务')
    return
  }
  
  try {
    for (const task of selectedTasks.value) {
      if (task.status === 'running') {
        await stopTask(task)
      }
    }
    ElMessage.success('批量停止任务成功')
  } catch (error) {
    console.error('批量停止任务出错:', error)
    ElMessage.error('批量停止任务出错')
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (!selectedTasks.value.length) {
    ElMessage.warning('请选择要删除的任务')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedTasks.value.length} 个任务吗？`,
    '批量删除警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      let successCount = 0
      let failCount = 0
      
      for (const task of selectedTasks.value) {
        try {
          // 直接调用API删除任务，而不是调用handleDelete函数
          const result = await window.electronAPI.invoke('scheduler:delete-task', task.id)
          if (result.success) {
            // 主进程已经处理数据库删除，这里不需要重复操作
            successCount++
          } else {
            console.error('删除任务失败:', result.error)
            failCount++
          }
        } catch (error) {
          console.error('删除任务出错:', error)
          failCount++
        }
      }
      
      // 重新加载任务列表以确保UI和数据库同步
      await loadTasksFromDatabase()
      
      // 清空选中项
      selectedTasks.value = []
      
      if (successCount > 0 && failCount === 0) {
        ElMessage.success(`成功删除 ${successCount} 个任务`)
      } else if (successCount > 0 && failCount > 0) {
        ElMessage.warning(`成功删除 ${successCount} 个任务，${failCount} 个任务删除失败`)
      } else {
        ElMessage.error('所有任务删除失败')
      }
    } catch (error) {
      console.error('批量删除任务出错:', error)
      ElMessage.error('批量删除任务出错')
    }
  }).catch(() => {})
}

// 单个任务操作
const handleTaskAction = async (task: any) => {
  if (task.status === 'running') {
    await stopTask(task)
  } else {
    await startTask(task)
  }
}

// 编辑任务
const handleEdit = async (task: any) => {
  try {
    // 获取完整的任务配置
    const result = await window.electronAPI.invoke('get-configuration', task.id)
    if (result.success) {
      // 导航到流程设计器页面，并传递任务ID
      router.push({
        path: '/designer',
        query: { id: task.id }
      })
    } else {
      ElMessage.error('获取任务配置失败: ' + result.error)
    }
  } catch (error) {
    console.error('编辑任务出错:', error)
    ElMessage.error('编辑任务出错')
  }
}

// 打开调度设置对话框
const handleSchedule = (task: any) => {
  currentTaskId.value = task.id
  scheduleDialogVisible.value = true
}

// 调度设置保存回调
const handleScheduleSaved = (updatedTask: any) => {
  scheduleDialogVisible.value = false
  // 刷新任务列表
  loadTasksFromDatabase()
  ElMessage.success('任务调度设置已更新')
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
  ).then(async () => {
    try {
      // 使用调度器API删除任务
      const result = await window.electronAPI.invoke('scheduler:delete-task', task.id)
      if (result.success) {
        // 主进程已经处理数据库删除，这里不需要重复操作
        
        // 重新加载任务列表以确保UI和数据库同步
        await loadTasksFromDatabase()
        
        ElMessage.success('删除成功')
      } else {
        ElMessage.error('删除失败: ' + result.error)
      }
    } catch (error) {
      console.error('删除任务出错:', error)
      ElMessage.error('删除任务出错')
    }
  }).catch(() => {})
}

// 根据搜索过滤任务
const filterTasks = () => {
  currentPage.value = 1 // 重置到第一页
}

// 组件挂载时加载任务
onMounted(() => {
  loadTasksFromDatabase()
})
</script>

<style lang="postcss" scoped>
/* 整体容器 - 使用flex布局填充主内容区域 */
.tasks-wrapper {
  display: flex;
  flex-direction: column;
  background-color: white;
  height: 100%; /* 占满主内容区域高度 */
  width: 100%;
  padding: 1.5rem; /* 等同于 p-6 */
  overflow: hidden; /* 严格防止整体溢出 */
  box-sizing: border-box; /* 确保padding不会增加总尺寸 */
  position: relative; /* 改为相对定位 */
}

.dark .tasks-wrapper {
  background-color: #111827; /* dark:bg-gray-900 */
}

/* 操作栏固定高度 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem; /* 等同于 mb-6 */
  flex-shrink: 0; /* 确保高度不会被压缩 */
}

/* 限制搜索框宽度 */
.search-input {
  max-width: 250px; /* 限制搜索框最大宽度 */
  width: 250px; /* 固定宽度 */
}

/* 操作按钮组样式 */
.operation-buttons {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  white-space: nowrap;
}

/* 表格和分页的包装容器 - 占据所有剩余空间 */
.table-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* 关键设置，允许flex子项收缩 */
  overflow: hidden; /* 确保容器不会产生滚动条 */
}

/* 表格自适应高度，但不超过容器 */
:deep(.el-table) {
  width: 100%;
  flex: 1; /* 占据table-wrapper中的可用空间 */
  height: 0; /* 关键设置，与flex: 1结合使表格能正确自适应 */
  min-height: 200px; /* 设置最小高度，确保表格不会过小 */
}

/* 表格体可在内容超出时滚动 */
:deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

/* 表头固定 */
:deep(.el-table__header-wrapper) {
  overflow: hidden;
}

/* 分页区域固定高度 */
.pagination-footer {
  flex-shrink: 0; /* 确保高度不会被压缩 */
  padding: 0.75rem 1rem;
  background-color: white;
  border-top: 1px solid #EBEEF5;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 60px; /* 固定高度 */
  margin-top: 0.5rem; /* 轻微间距 */
}

.dark .pagination-footer {
  background-color: #111827; /* dark:bg-gray-800 */
  border-top: 1px solid #374151; /* dark:border-gray-700 */
}

/* 确保表头不换行 */
:deep(.el-table__header-wrapper th) {
  word-break: keep-all;
  white-space: nowrap;
}

/* 深色模式下的表格单元格文本颜色 */
:deep(.dark .el-table .cell) {
  @apply text-gray-300;
}
</style>