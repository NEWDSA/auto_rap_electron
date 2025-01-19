import { defineStore } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'

export const useThemeStore = defineStore('theme', () => {
  // 使用 VueUse 的 useDark 和 useToggle 来管理暗色主题
  const isDark = useDark({
    // 在 html 标签上添加 class="dark"
    selector: 'html',
    // 监听系统主题变化
    onChanged(dark: boolean) {
      // 同步更新 Element Plus 的主题
      const htmlEl = document.querySelector('html')
      if (htmlEl) {
        htmlEl.className = dark ? 'dark' : ''
      }
    }
  })
  const toggleDark = useToggle(isDark)

  return {
    isDark,
    toggleDark
  }
}) 