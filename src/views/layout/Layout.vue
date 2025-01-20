<template>
  <el-container class="h-full">
    <!-- 顶部导航栏 -->
    <el-header class="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
      <div class="flex items-center justify-between h-full">
        <!-- 左侧欢迎信息 -->
        <div class="flex items-center">
          <img src="/logo.png" alt="Logo" class="h-8 w-8" />
          <div class="ml-3">
            <h2 class="text-lg font-medium">欢迎使用 AutoRAP</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">自动化RPA工具，让流程自动化更简单</p>
          </div>
        </div>

        <!-- 右侧工具栏 -->
        <div class="flex items-center space-x-4">
          <!-- 主题切换 -->
          <el-button
            type="text"
            @click="themeStore.toggleDark()"
          >
            <el-icon>
              <component :is="themeStore.isDark ? 'Sunny' : 'Moon'" />
            </el-icon>
          </el-button>
          
          <!-- 用户信息 -->
          <el-dropdown>
            <span class="flex items-center cursor-pointer">
              <el-avatar :size="32" />
              <span class="ml-2">管理员</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人信息</el-dropdown-item>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <!-- 主体部分 -->
    <el-container>
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '200px'" class="transition-all">
        <div class="flex flex-col h-full bg-white dark:bg-gray-800">
          <!-- 菜单 -->
          <el-menu
            :default-active="route.path"
            :collapse="isCollapse"
            class="flex-1 border-0"
            @select="handleSelect"
          >
            <el-menu-item v-for="item in routes" :key="item.path" :index="'/' + item.path">
              <el-icon><component :is="item.meta?.icon" /></el-icon>
              <template #title>{{ item.meta?.title }}</template>
            </el-menu-item>
          </el-menu>

          <!-- 底部折叠按钮 -->
          <div class="flex justify-center items-center h-12 border-t dark:border-gray-700">
            <el-button
              type="link"
              class="!h-full w-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              @click="isCollapse = !isCollapse"
            >
              <el-icon class="text-gray-500">
                <component :is="isCollapse ? 'Expand' : 'Fold'" />
              </el-icon>
            </el-button>
          </div>
        </div>
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="bg-gray-100 dark:bg-gray-900">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/store/theme'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const isCollapse = ref(false)

// 获取路由列表
const routes = computed(() => {
  const mainRoute = router.options.routes.find(route => route.path === '/')
  return mainRoute?.children || []
})

// 获取当前路由
const currentRoute = computed(() => {
  return routes.value.find(item => route.path.startsWith('/' + item.path))
})

// 菜单选择
const handleSelect = (index: string) => {
  router.push(index)
}
</script>

<style lang="postcss" scoped>
.el-container {
  @apply h-full;
}

.el-aside {
  @apply border-r dark:border-gray-700;
}

.el-header {
  @apply h-16 px-4;
}

.el-main {
  @apply p-4 overflow-auto;
}

/* 控制 Logo 尺寸 */
img[src*="logo.svg"] {
  @apply w-6 h-6;
  max-width: 24px;
  max-height: 24px;
}
</style> 