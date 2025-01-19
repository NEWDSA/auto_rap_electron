<template>
  <div class="home-container">
    <!-- 数据概览 -->
    <div class="overview-section">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <el-card 
          v-for="stat in statistics" 
          :key="stat.title" 
          class="stat-card"
          :class="stat.bgColor"
          shadow="hover"
        >
          <div class="flex items-center p-4">
            <el-icon class="text-3xl mr-4" :class="stat.color">
              <component :is="stat.icon" />
            </el-icon>
            <div>
              <div class="text-sm text-gray-600 dark:text-gray-400">{{ stat.title }}</div>
              <div class="text-2xl font-bold mt-1">{{ stat.value }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 快速入口 -->
    <div class="quick-actions mt-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <el-card 
          v-for="action in quickActions" 
          :key="action.title"
          class="action-card"
          shadow="hover"
        >
          <div 
            class="flex items-center p-4 cursor-pointer" 
            @click="router.push(action.path)"
          >
            <el-icon class="text-4xl mr-6" :class="action.color">
              <component :is="action.icon" />
            </el-icon>
            <div class="flex-1">
              <h3 class="text-lg font-medium mb-2">{{ action.title }}</h3>
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

const router = useRouter()

// 统计数据
const statistics = [
  {
    title: '流程总数',
    value: '12',
    icon: 'Files',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/10'
  },
  {
    title: '运行中任务',
    value: '3',
    icon: 'VideoPlay',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/10'
  },
  {
    title: '今日执行',
    value: '128',
    icon: 'DataLine',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/10'
  },
  {
    title: '成功率',
    value: '98%',
    icon: 'CircleCheck',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/10'
  },
]

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
</script>

<style scoped>
.home-container {
  @apply p-6 w-full max-w-7xl mx-auto;
}

.overview-section {
  @apply mb-6;
}

.stat-card {
  @apply transition-all duration-300;
}

.stat-card :deep(.el-card__body) {
  @apply p-0;
}

.action-card {
  @apply transition-all duration-300;
}

.action-card :deep(.el-card__body) {
  @apply p-0;
}

/* 暗色模式适配 */
:deep(.el-card) {
  @apply dark:bg-gray-800 dark:border-gray-700;
}
</style> 