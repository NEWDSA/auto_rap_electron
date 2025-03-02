import { defineStore } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'

export const useThemeStore = defineStore('theme', () => {
  // 使用 VueUse 的 useDark 和 useToggle 来管理暗色主题
  const isDark = useDark({
    // 在 html 标签上添加 class="dark"
    selector: 'html',
    // 监听系统主题变化
    onChanged(dark: boolean) {
      // 同步更新 Element Plus 的主题和背景颜色
      const htmlEl = document.querySelector('html')
      if (htmlEl) {
        htmlEl.className = dark ? 'dark' : ''
        
        // 设置背景颜色
        if (dark) {
          // 黑夜模式 - 设置深灰背景
          document.body.style.backgroundColor = '#121212'
          document.body.style.color = '#ffffff'

          // 确保所有主要容器也应用深色背景（除了流程设计页面）
          const containers = document.querySelectorAll('.el-container, .el-header, .el-footer')
          containers.forEach(container => {
            if (container instanceof HTMLElement) {
              container.style.backgroundColor = '#121212'
            }
          })

          // 应用额外的深色模式CSS变量
          document.documentElement.style.setProperty('--el-bg-color', '#121212')
          document.documentElement.style.setProperty('--el-bg-color-overlay', '#1d1d1d')
          document.documentElement.style.setProperty('--el-text-color-primary', '#ffffff')
          document.documentElement.style.setProperty('--el-fill-color-blank', '#121212')
          document.documentElement.style.setProperty('--el-border-color', '#333333')
          document.documentElement.style.setProperty('--el-border-color-light', '#444444')
          
          // 添加更精细的深色模式样式
          const style = document.createElement('style')
          style.id = 'dark-mode-style'
          style.textContent = `
            /* 基础UI组件 */
            .dark .el-card, 
            .dark .el-dialog, 
            .dark .el-dropdown-menu {
              background-color: #121212;
            }
            
            /* 左侧菜单深色 */
            .dark .el-menu {
              background-color: #1e1e1e;
            }
            
            /* 确保左侧菜单项文字可见 */
            .dark .el-menu-item,
            .dark .el-submenu__title {
              color: #ffffff !important;
            }
            
            /* 组件项和图标颜色 */
            .dark .el-menu-item i,
            .dark .el-submenu__title i,
            .dark .el-icon {
              color: #ffffff !important;
            }
            
            /* 白色背景区域变为深色 */
            .dark .bg-white {
              background-color: #121212 !important;
            }
            
            /* 确保按钮文字可见 */
            .dark .el-button {
              color: #ffffff;
              border-color: #444444;
            }
            
            /* 流程设计页面保持原样 - 不做特殊处理 */
          `
          document.head.appendChild(style)
        } else {
          // 白天模式 - 重置样式
          document.body.style.backgroundColor = ''
          document.body.style.color = ''

          // 重置容器样式
          const containers = document.querySelectorAll('.el-container, .el-header, .el-footer')
          containers.forEach(container => {
            if (container instanceof HTMLElement) {
              container.style.backgroundColor = ''
            }
          })

          // 重置CSS变量
          document.documentElement.style.removeProperty('--el-bg-color')
          document.documentElement.style.removeProperty('--el-bg-color-overlay')
          document.documentElement.style.removeProperty('--el-text-color-primary')
          document.documentElement.style.removeProperty('--el-fill-color-blank')
          document.documentElement.style.removeProperty('--el-border-color')
          document.documentElement.style.removeProperty('--el-border-color-light')
          
          // 移除暗色模式的全局样式
          const darkModeStyle = document.getElementById('dark-mode-style')
          if (darkModeStyle) {
            darkModeStyle.remove()
          }
        }
      }
    }
  })

  const toggleDark = useToggle(isDark)

  return {
    isDark,
    toggleDark
  }
}) 