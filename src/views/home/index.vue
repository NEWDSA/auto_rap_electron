<template>
  <div class="home-container">
    <div class="home-head">
      <div>
        <div class="home-title">控制台</div>
        <div class="home-subtitle">一眼掌握流程与任务状态</div>
      </div>
      <div class="home-head-actions">
        <el-button type="primary" @click="router.push('/designer')">新建流程</el-button>
        <el-button @click="router.push('/tasks')">任务管理</el-button>
      </div>
    </div>

    <!-- 数据概览 -->
    <div class="overview-section">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <el-card
          v-for="stat in statistics"
          :key="stat.title"
          class="stat-card"
          :class="stat.bgColor"
          shadow="hover"
        >
          <div class="flex items-center p-4">
            <el-icon class="mr-4 text-3xl" :class="stat.color">
              <component :is="stat.icon" />
            </el-icon>
            <div>
              <div class="text-sm stat-title">{{ stat.title }}</div>
              <div class="mt-1 text-2xl font-bold stat-value">{{ stat.value }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 快速入口 -->
    <div class="mt-6 quick-actions">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <el-card
          v-for="action in quickActions"
          :key="action.title"
          class="action-card"
          shadow="hover"
        >
          <div class="flex items-center p-4 cursor-pointer" @click="router.push(action.path)">
            <el-icon class="mr-6 text-4xl" :class="action.color">
              <component :is="action.icon" />
            </el-icon>
            <div class="flex-1">
              <h3 class="mb-2 text-lg font-medium">{{ action.title }}</h3>
              <p class="text-gray-600 dark:text-gray-400">{{ action.description }}</p>
            </div>
            <el-icon class="ml-4 text-gray-400"><ArrowRight /></el-icon>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import { ref, onMounted, computed } from 'vue'
  import { getStats } from '@/api/stats'

  const router = useRouter()
  const stats = ref({
    totalProcesses: 0,
    runningTasks: 0,
    todayExecutions: 0,
    successRate: 0,
  })

  // 统计数据
  const statistics = computed(() => [
    {
      title: '流程总数',
      value: stats.value.totalProcesses.toString(),
      icon: 'Files',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    },
    {
      title: '运行中任务',
      value: stats.value.runningTasks.toString(),
      icon: 'VideoPlay',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/10',
    },
    {
      title: '今日执行',
      value: stats.value.todayExecutions.toString(),
      icon: 'DataLine',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
    },
    {
      title: '成功率',
      value: `${stats.value.successRate}%`,
      icon: 'CircleCheck',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
    },
  ])

  // 快速入口
  const quickActions = [
    {
      title: '创建流程',
      description: '可视化设计自动化流程',
      icon: 'Edit',
      path: '/designer',
      color: 'text-blue-500',
    },
    {
      title: '任务管理',
      description: '查看和管理自动化任务',
      icon: 'List',
      path: '/tasks',
      color: 'text-green-500',
    },
  ]

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const data = await getStats()
      stats.value = data
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  // 组件挂载时获取数据
  onMounted(() => {
    fetchStats()
    // 每30秒刷新一次数据
    setInterval(fetchStats, 30000)
  })
</script>

<style lang="postcss">
  .home-container {
    @apply w-full;
  }

  .home-head {
    @apply flex items-end justify-between;
    margin-bottom: 14px;
  }

  .home-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.2px;
    color: var(--text-color);
  }

  .home-subtitle {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-color-secondary);
  }

  .home-head-actions {
    @apply flex items-center gap-2;
  }

  .overview-section {
    @apply mb-6;
  }

  .stat-card {
    @apply transition-all duration-300;
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color-light);
    background: var(--surface-color);
    backdrop-filter: blur(12px);
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-tight);
  }

  .stat-title {
    color: var(--text-color-secondary);
  }

  .stat-value {
    color: var(--text-color);
  }

  .stat-card :deep(.el-card__body) {
    @apply p-0;
  }

  .action-card {
    @apply transition-all duration-300;
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color-light);
    background: var(--surface-color);
    backdrop-filter: blur(12px);
  }

  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-tight);
  }

  .action-card :deep(.el-card__body) {
    @apply p-0;
  }

  /* 暗色模式适配 */
  :deep(.el-card) {
    @apply dark:bg-gray-800 dark:border-gray-700;
  }
</style>
