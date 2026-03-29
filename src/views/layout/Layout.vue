<template>
  <el-container class="h-full app-shell">
    <!-- 顶部导航栏 -->
    <el-header class="app-topbar">
      <div class="flex items-center justify-between h-full">
        <!-- 左侧欢迎信息 -->
        <div class="flex items-center">
          <div class="app-mark">
            <img src="/logo.png" alt="Logo" class="h-8 w-8" />
          </div>
          <div class="ml-3">
            <!-- <h2 class="text-lg font-medium">欢迎使用 AutoRPA</h2> -->
            <p class="text-sm app-subtitle">
              自动化RPA工具，让流程自动化更简单
            </p>
          </div>
        </div>

        <!-- 右侧工具栏 -->
        <div class="flex items-center space-x-3">
          <!-- 主题切换 -->
          <el-button type="text" class="app-icon-btn" @click="toggleTheme">
            <el-icon>
              <component :is="themeStore.isDark ? 'Sunny' : 'Moon'" />
            </el-icon>
          </el-button>

          <!-- 用户信息 -->
          <el-dropdown>
            <span class="flex items-center cursor-pointer app-user">
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
      <el-aside :width="isCollapse ? '64px' : '200px'" class="transition-all app-aside">
        <div class="flex flex-col h-full">
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
          <div class="flex justify-center items-center h-12 app-aside-footer">
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
      <el-main
        ref="mainContent"
        class="app-main overflow-auto"
        :class="{ 'app-main--full': isFullBleed }"
      >
        <div class="app-content" :class="{ 'app-content--full': isFullBleed }">
          <router-view v-slot="{ Component }">
            <component :is="Component" :key="route.fullPath" />
          </router-view>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useThemeStore } from '@/store/theme'

  const route = useRoute()
  const router = useRouter()
  const themeStore = useThemeStore()
  const isCollapse = ref(false)
  const mainContent = ref(null)

  const isFullBleed = computed(() => {
    return route.path === '/designer'
  })

  // 获取路由列表
  const routes = computed(() => {
    const mainRoute = router.options.routes.find(route => route.path === '/')
    return mainRoute?.children || []
  })

  // 处理主题切换
  const toggleTheme = () => {
    // 切换主题，使用store中的切换函数
    themeStore.toggleDark()
  }

  // 菜单选择
  const handleSelect = (index: string) => {
    router.push(index)
  }

  // 监听路由变化
  watch(
    () => route.path,
    async () => {
      // 路由变化时处理
      await nextTick()

      // 等待DOM更新后触发resize事件，确保所有组件正确渲染
      window.dispatchEvent(new Event('resize'))

      // 延迟触发另一次resize事件，确保异步加载组件也能正确显示
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))

        // 如果有主内容区域，强制其更新
        if (mainContent.value) {
          const el = mainContent.value as HTMLElement
          // 临时设置一个样式，然后移除，强制浏览器重新渲染
          if (el && el.style) {
            el.style.opacity = '0.99'
            setTimeout(() => {
              el.style.opacity = ''
            }, 10)
          }
        }
      }, 200)
    }
  )

  // 组件挂载后逻辑
  onMounted(() => {
    // 确保初始状态正确
    window.dispatchEvent(new Event('resize'))

    // 添加全局事件监听器确保视图正确渲染
    window.addEventListener('resize', handleResize)
  })

  // 处理窗口大小变化
  const handleResize = () => {
    // 窗口大小变化时可以添加额外逻辑
    // 例如更新表格或图表尺寸等
  }
</script>

<style lang="postcss" scoped>
  .el-container {
    @apply h-full;
    --header-height: 64px;
    --footer-height: 48px;
    --toolbar-height: 44px;
  }

  .el-aside {
    @apply border-r;
    height: calc(100vh - var(--header-height));
  }

  .el-header {
    @apply h-16 px-4;
    height: var(--header-height);
  }

  .el-main {
    @apply p-0;
    height: calc(100vh - var(--header-height));
  }

  .app-shell {
    background: radial-gradient(1200px 600px at 20% 0%, rgba(64, 158, 255, 0.14), transparent 60%),
      radial-gradient(900px 500px at 100% 10%, rgba(230, 162, 60, 0.10), transparent 55%),
      var(--background-color);
  }

  .app-topbar {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.62));
    border-bottom: 1px solid var(--border-color-light);
    backdrop-filter: blur(12px);
  }

  .dark .app-topbar {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.54));
    border-bottom: 1px solid var(--border-color-light);
  }

  .app-mark {
    @apply flex items-center justify-center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(64, 158, 255, 0.18), rgba(64, 158, 255, 0.06));
    border: 1px solid var(--border-color-light);
    box-shadow: var(--shadow-tight);
  }

  .dark .app-mark {
    background: linear-gradient(180deg, rgba(96, 165, 250, 0.18), rgba(96, 165, 250, 0.06));
  }

  .app-subtitle {
    color: var(--text-color-secondary);
    letter-spacing: 0.2px;
  }

  .app-icon-btn {
    @apply rounded-lg;
    border: 1px solid transparent;
  }

  .app-icon-btn:hover {
    border-color: var(--border-color-light);
    background: rgba(255, 255, 255, 0.22);
  }

  .dark .app-icon-btn:hover {
    background: rgba(15, 23, 42, 0.35);
  }

  .app-user {
    padding: 6px 10px;
    border-radius: 12px;
    border: 1px solid var(--border-color-light);
    background: var(--surface-muted);
  }

  .app-aside {
    background: var(--surface-color);
    border-right: 1px solid var(--border-color-light);
    backdrop-filter: blur(14px);
  }

  .dark .app-aside {
    background: rgba(15, 23, 42, 0.54);
  }

  .app-aside-footer {
    border-top: 1px solid var(--border-color-light);
    background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.02));
  }

  .app-main {
    background: transparent;
    padding: 18px;
    display: flex;
  }

  .app-main--full {
    padding: 0;
  }

  :deep(.el-menu) {
    background: transparent;
  }

  :deep(.el-menu-item) {
    margin: 6px 10px;
    border-radius: 12px;
    height: 42px;
    line-height: 42px;
    transition: transform 0.15s ease, background-color 0.15s ease;
  }

  :deep(.el-menu-item:hover) {
    background: rgba(64, 158, 255, 0.10) !important;
    transform: translateX(1px);
  }

  :deep(.el-menu-item.is-active) {
    background: rgba(64, 158, 255, 0.14) !important;
    color: var(--text-color) !important;
    border: 1px solid rgba(64, 158, 255, 0.22);
  }

  .dark :deep(.el-menu-item:hover) {
    background: rgba(96, 165, 250, 0.12) !important;
  }

  .dark :deep(.el-menu-item.is-active) {
    background: rgba(96, 165, 250, 0.16) !important;
    border-color: rgba(96, 165, 250, 0.28);
  }

  .app-content {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    flex: 1;
    min-height: 0;
  }

  .app-content--full {
    max-width: none;
    margin: 0;
    height: 100%;
  }

  /* 控制 Logo 尺寸 */
  img[src*='logo.svg'] {
    @apply w-6 h-6;
    max-width: 24px;
    max-height: 24px;
  }

  /* 淡入淡出过渡效果 */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  /* 切换状态样式 */
  .switching {
    position: relative;
  }

  .switching::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.05);
    z-index: 10;
  }

  /* 自定义菜单样式 */
  :deep(.el-menu) {
    --el-menu-hover-bg-color: var(--el-color-primary-light-9); /* 浅色主题悬停颜色 */
    --el-menu-active-color: var(--el-color-primary); /* 选中文字颜色 */
  }

  /* 深色主题下的菜单样式 */
  .dark :deep(.el-menu) {
    --el-menu-hover-bg-color: #1f2937; /* 深色主题悬停背景色 - 比主背景稍亮 */
    --el-menu-bg-color: #111827; /* 深色主题背景色 */
    --el-menu-text-color: #e5e7eb; /* 深色主题文字颜色 */
    --el-menu-active-color: #60a5fa; /* 深色主题选中文字颜色 - 亮蓝色 */
  }

  /* 深色主题下的菜单项样式 */
  .dark :deep(.el-menu-item):hover {
    background-color: #1f2937 !important; /* 深色主题悬停背景色 */
  }

  .dark :deep(.el-menu-item.is-active) {
    background-color: #1e3a8a !important; /* 深色主题选中背景色 - 深蓝色 */
    color: #ffffff !important; /* 改为白色，提高对比度 */
    font-weight: 500 !important; /* 加粗文字 */
  }

  /* 浅色主题下的菜单项样式 */
  :deep(.el-menu-item.is-active) {
    color: #1e40af !important; /* 浅色主题选中文字颜色 - 深蓝色 */
    font-weight: 500 !important; /* 加粗文字 */
    background-color: #eff6ff !important; /* 浅蓝色背景 */
  }
</style>
