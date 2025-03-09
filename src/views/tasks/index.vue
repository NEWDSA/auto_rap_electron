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
      v-loading="loading"
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
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()

// 搜索
const searchQuery = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 加载状态
const loading = ref(false)

// 选中的任务
const selectedTasks = ref<any[]>([])

// 任务数据
const tasks = ref<any[]>([])

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
  loading.value = true
  try {
    const result = await window.electronAPI.invoke('get-all-configurations')
    if (result.success) {
      // 将数据库结果转换为任务格式
      tasks.value = result.data.map((config: any) => {
        // 尝试解析存储的内容
        let content = null
        try {
          content = JSON.parse(config.content)
        } catch (e) {
          console.error('解析任务内容失败:', e)
          content = { error: '无效的任务内容' }
        }
        
        return {
          id: config.id,
          name: config.name,
          status: 'stopped', // 默认状态
          createTime: new Date(config.created_at).toLocaleString(),
          lastRunTime: config.updated_at ? new Date(config.updated_at).toLocaleString() : '-',
          runCount: 0, // 默认执行次数
          content: content // 存储完整配置用于启动任务
        }
      })
      total.value = tasks.value.length
    } else {
      ElMessage.error('加载任务失败: ' + result.error)
    }
  } catch (error) {
    console.error('加载任务出错:', error)
    ElMessage.error('加载任务出错')
  } finally {
    loading.value = false
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
  loadTasksFromDatabase()
  ElMessage.success('刷新成功')
}

// 启动任务
const startTask = async (task: any) => {
  try {
    // 确保 task.content 包含 nodes 属性
    if (!task.content || !task.content.nodes) {
      ElMessage.error('任务数据格式不正确')
      return
    }
    
    // 深度克隆并清理节点数据，移除可能导致序列化问题的属性
    const cleanNodes = task.content.nodes.map((node: any) => {
      // 创建一个新对象，只包含必要的属性
      const cleanNode = {
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y,
        text: node.text,
        // 深度清理 properties 对象
        properties: deepCleanObject(node.properties || {})
      };
      
      return cleanNode;
    });
    
    // 确保可以序列化
    const serializedNodes = JSON.parse(JSON.stringify(cleanNodes));
    
    // 传递清理后的节点数组
    const result = await window.electronAPI.invoke('flow:start', serializedNodes);
    if (result.success) {
      // 更新任务状态
      task.status = 'running'
      ElMessage.success('任务启动成功')
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
    const result = await window.electronAPI.invoke('flow:stop')
    if (result.success) {
      // 更新任务状态
      task.status = 'stopped'
      ElMessage.success('任务停止成功')
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
        // 确保 task.content 包含 nodes 属性
        if (!task.content || !task.content.nodes) {
          failCount++
          continue
        }
        
        // 深度克隆并清理节点数据，移除可能导致序列化问题的属性
        const cleanNodes = task.content.nodes.map((node: any) => {
          // 创建一个新对象，只包含必要的属性
          const cleanNode = {
            id: node.id,
            type: node.type,
            x: node.x,
            y: node.y,
            text: node.text,
            // 深度清理 properties 对象
            properties: deepCleanObject(node.properties || {})
          };
          
          return cleanNode;
        });
        
        // 确保可以序列化
        const serializedNodes = JSON.parse(JSON.stringify(cleanNodes));
        
        // 启动任务
        const result = await window.electronAPI.invoke('flow:start', serializedNodes);
        if (result.success) {
          // 更新任务状态
          task.status = 'running'
          successCount++
        } else {
          failCount++
        }
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
      const result = await window.electronAPI.invoke('delete-configuration', task.id)
      if (result.success) {
        // 从列表中移除任务
        tasks.value = tasks.value.filter(t => t.id !== task.id)
        total.value = tasks.value.length
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

// 组件挂载时加载任务
onMounted(() => {
  loadTasksFromDatabase()
})
</script>

<style lang="postcss" scoped>
.tasks-container {
  @apply h-full flex flex-col;
}

:deep(.el-table) {
  @apply flex-1;
}
</style> 