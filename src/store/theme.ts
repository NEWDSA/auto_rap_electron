import { defineStore } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'

// 扩展Element类型，增加__vue__属性访问
declare global {
  interface Element {
    __vue__?: {
      doLayout?: () => void
      [key: string]: any
    }
  }
}

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

          // 应用额外的深色模式CSS变量 - 简化为只设置基本变量
          document.documentElement.style.setProperty('--el-bg-color', '#121212')
          document.documentElement.style.setProperty('--el-bg-color-overlay', '#1d1d1d')
          document.documentElement.style.setProperty('--el-text-color-primary', '#ffffff')
          document.documentElement.style.setProperty('--el-fill-color-blank', '#121212')
          document.documentElement.style.setProperty('--el-border-color', '#333333')
          document.documentElement.style.setProperty('--el-border-color-light', '#444444')

          // 添加更精细的深色模式样式 - 使用类选择器而不是直接操作DOM
          const styleId = 'dark-mode-style'
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = `
              /* 基础深色样式 */
              .dark { background-color: #121212; color: #ffffff; }
              
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
              
              /* 任务页面表格样式 */
              .dark .el-table {
                background-color: #1a1a1a;
                color: #e0e0e0;
              }
              
              .dark .el-table tr,
              .dark .el-table th,
              .dark .el-table td {
                background-color: #1a1a1a;
                border-color: #333333;
              }
              
              .dark .el-table--border,
              .dark .el-table--group {
                border-color: #333333;
              }
              
              .dark .el-table th.is-leaf,
              .dark .el-table td {
                border-color: #333333;
              }
              
              .dark .el-table--striped .el-table__body tr.el-table__row--striped td {
                background-color: #222222;
              }
              
              .dark .el-table__body tr.hover-row > td {
                background-color: #2a2a2a;
              }
              
              /* 路由过渡 */
              .fade-enter-active,
              .fade-leave-active {
                transition: opacity 0.15s;
              }
              
              .fade-enter-from,
              .fade-leave-to {
                opacity: 0;
              }
              
              /* 通用页面容器样式 */
              .dark .page-container {
                background-color: #121212;
                color: #ffffff;
              }
              
              /* 表单相关深色样式 */
              .dark .el-input__inner, 
              .dark .el-textarea__inner,
              .dark .el-input input {
                background-color: #1a1a1a;
                border-color: #333333;
                color: #ffffff;
              }
              
              /* 下拉菜单和选择器 */
              .dark .el-select-dropdown,
              .dark .el-dropdown-menu {
                background-color: #1a1a1a;
                border-color: #333333;
              }
              
              .dark .el-select-dropdown__item {
                color: #e0e0e0;
              }
              
              .dark .el-select-dropdown__item.selected {
                color: #409eff;
              }
              
              /* 弹出框 */
              .dark .el-dialog,
              .dark .el-message-box {
                background-color: #1a1a1a;
                border-color: #333333;
              }
              
              .dark .el-dialog__title,
              .dark .el-message-box__title {
                color: #ffffff;
              }
              
              /* 标签页 */
              .dark .el-tabs__item {
                color: #a0a0a0;
              }
              
              .dark .el-tabs__item.is-active {
                color: #409eff;
              }
              
              /* 分页 */
              .dark .el-pagination {
                color: #ffffff;
                background-color: transparent;
              }
              
              .dark .el-pagination button {
                background-color: #1a1a1a;
                color: #ffffff;
              }
              
              /* 其他常用组件 */
              .dark .el-drawer {
                background-color: #1a1a1a;
              }
              
              .dark .el-drawer__header {
                color: #ffffff;
              }
              
              /* 数字输入框相关样式 - 针对设置页面特别处理 */
              .dark .el-input-number {
                background-color: #1a1a1a !important;
                border-color: #333333 !important;
              }
              
              .dark .el-input-number__decrease,
              .dark .el-input-number__increase {
                background-color: #333333 !important;
                color: #e0e0e0 !important;
                border-color: #444444 !important;
              }
              
              .dark .el-input-number__decrease:hover,
              .dark .el-input-number__increase:hover {
                background-color: #444444 !important;
                color: #ffffff !important;
              }
              
              .dark .el-input-number .el-input__inner {
                background-color: #1a1a1a !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              /* 特别为设置页面添加的样式 */
              .dark .w-32 {
                background-color: #1a1a1a !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .w-32 .el-input__inner {
                background-color: #1a1a1a !important;
                color: #e0e0e0 !important;
              }
              
              .dark .w-32 .el-input-number__decrease,
              .dark .w-32 .el-input-number__increase {
                background-color: #333333 !important;
                color: #e0e0e0 !important;
              }
              
              /* 修复复选框在暗黑模式下的颜色 */
              .dark .el-checkbox {
                color: #e0e0e0 !important;
              }
              
              .dark .el-checkbox__input {
                border-color: #444444 !important;
              }
              
              .dark .el-checkbox__inner {
                background-color: #333333 !important;
                border-color: #444444 !important;
              }
              
              .dark .el-checkbox__input.is-checked .el-checkbox__inner {
                background-color: #409eff !important;
                border-color: #409eff !important;
              }
              
              .dark .el-checkbox__label {
                color: #e0e0e0 !important;
              }
              
              /* 设置页面特定样式 */
              .dark .setting-section {
                background-color: #1a1a1a !important;
                border-color: #333333 !important;
              }
              
              .dark .setting-section-title {
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .setting-item-label {
                color: #e0e0e0 !important;
              }
              
              /* 确保下拉选择器在暗黑模式下清晰可见 */
              .dark .el-select .el-input__inner {
                background-color: #1a1a1a !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .el-select-dropdown__item {
                color: #e0e0e0 !important;
              }
              
              .dark .el-select-dropdown__item.hover,
              .dark .el-select-dropdown__item:hover {
                background-color: #333333 !important;
              }
              
              /* 确保按钮在设置页面中清晰可见 */
              .dark .el-button--default {
                background-color: #333333 !important;
                border-color: #444444 !important;
                color: #e0e0e0 !important;
              }
              
              .dark .el-button--primary {
                background-color: #409eff !important;
                border-color: #409eff !important;
                color: #ffffff !important;
              }
              
              .dark .el-button--default:hover {
                background-color: #444444 !important;
                border-color: #555555 !important;
              }
              
              /* 表单控件容器 */
              .dark .el-form-item__label {
                color: #e0e0e0 !important;
              }
              
              .dark .el-form-item__content {
                color: #e0e0e0 !important;
              }
              
              /* 系统设置页面的标签页样式 */
              .dark .el-tabs__nav-wrap::after {
                background-color: #333333 !important;
              }
              
              .dark .el-tabs__item {
                color: #aaaaaa !important;
              }
              
              .dark .el-tabs__item.is-active {
                color: #409eff !important;
              }
              
              .dark .el-tabs__active-bar {
                background-color: #409eff !important;
              }
              
              /* 流程设计页面样式 */
              .dark .lf-canvas-overlay {
                background-color: #121212 !important;
              }
              
              .dark .lf-background, 
              .dark .lf-canvas {
                background-color: #1e1e1e !important;
                background-image: radial-gradient(#555 1px, #1e1e1e 1px) !important;
              }
              
              /* 流程设计左侧工具栏 */
              .dark .left-toolbox {
                background-color: #1e1e1e !important;
                border-color: #333333 !important;
              }
              
              .dark .toolbox-header,
              .dark .panel-header {
                background-color: #282828 !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .toolbox-content,
              .dark .panel-content {
                background-color: #1e1e1e !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .component-item {
                background-color: #282828 !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .component-item:hover {
                background-color: #333333 !important;
              }
              
              /* 设计器顶部工具栏 */
              .dark .bg-\\[\\#fafafa\\] {
                background-color: #1a1a1a !important;
              }
              
              .dark .bg-opacity-80 {
                background-opacity: 1 !important;
              }
              
              .dark .bg-grid {
                opacity: 0.05 !important;
              }
              
              /* 设计器底部状态栏 */
              .dark .bg-gray-50 {
                background-color: #1a1a1a !important;
                color: #aaaaaa !important;
                border-color: #333333 !important;
              }
              
              .dark .text-gray-500 {
                color: #aaaaaa !important;
              }
              
              /* 折叠面板样式 */
              .dark .el-collapse {
                background-color: #1e1e1e !important;
                border-color: #333333 !important;
              }
              
              .dark .el-collapse-item__header {
                background-color: #282828 !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .el-collapse-item__content {
                background-color: #1e1e1e !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              /* 流程节点样式 */
              .dark .lf-node {
                background-color: #282828 !important;
                color: #ffffff !important;
                border-color: #444444 !important;
              }
              
              /* 开始节点和结束节点特殊处理 */
              .dark .lf-node[data-type="start"] {
                background-color: #224422 !important;
                color: #4ade80 !important;
                border-color: #166534 !important;
              }
              
              .dark .lf-node[data-type="end"] {
                background-color: #442222 !important;
                color: #f87171 !important;
                border-color: #991b1b !important;
              }
              
              .dark .lf-node-text {
                color: #e0e0e0 !important;
                fill: #e0e0e0 !important;
              }
              
              .dark .lf-node-content {
                background-color: #333333 !important;
                color: #e0e0e0 !important;
              }
              
              /* 流程图连线样式 */
              .dark .lf-edge {
                stroke: #aaaaaa !important;
              }
              
              .dark .lf-edge-text {
                fill: #e0e0e0 !important;
              }
              
              /* 选中状态 */
              .dark .lf-node-selected,
              .dark .lf-node.selected {
                box-shadow: 0 0 0 2px #409eff !important;
              }
              
              .dark .lf-edge.selected {
                stroke: #409eff !important;
              }
              
              .dark .lf-anchor {
                stroke: #e0e0e0 !important;
                fill: #333333 !important;
              }
              
              .dark .lf-anchor:hover,
              .dark .lf-anchor.hover {
                fill: #409eff !important;
              }
              
              /* 右侧属性面板 */
              .dark .properties-panel {
                background-color: #1e1e1e !important;
                border-color: #333333 !important;
              }
              
              /* 自定义组件与节点 */
              .dark .designer-canvas {
                background-color: #1e1e1e !important;
              }
              
              .dark .canvas-container {
                background-color: #1e1e1e !important;
              }
              
              /* LogicFlow特有的控件样式 */
              .dark .lf-control {
                background-color: #282828 !important;
                border-color: #333333 !important;
              }
              
              .dark .lf-control-item {
                background-color: #282828 !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .lf-control-item:hover {
                background-color: #333333 !important;
              }
              
              .dark .lf-minimap {
                background-color: #282828 !important;
                border-color: #333333 !important;
              }
              
              .dark .lf-dnd-panel {
                background-color: #1e1e1e !important;
                border-color: #333333 !important;
              }
              
              .dark .lf-dnd-item {
                background-color: #282828 !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              .dark .lf-dnd-item:hover {
                background-color: #333333 !important;
              }
              
              /* 图表指示器和提示 */
              .dark .lf-tooltip {
                background-color: #282828 !important;
                color: #e0e0e0 !important;
                border-color: #333333 !important;
              }
              
              /* 设置页面特定样式 */
              .dark .settings-tabs .el-tabs__item {
                color: #a0a0a0 !important;
              }
              
              .dark .settings-tabs .el-tabs__item.is-active {
                color: #409eff !important;
              }
              
              .dark .settings-tabs .el-tabs__nav {
                background-color: #1a1a1a !important;
                border-color: #333333 !important;
              }
              
              .dark .settings-tabs .el-tabs__nav-wrap::after {
                background-color: #333333 !important;
              }
              
              .dark .settings-tabs .el-tabs__active-bar {
                background-color: #409eff !important;
              }
              
              /* 选择器样式 */
              .dark .el-select .el-input__wrapper {
                background-color: #1a1a1a !important;
                box-shadow: 0 0 0 1px #333333 inset !important;
              }
              
              .dark .el-select .el-input__inner {
                color: #e0e0e0 !important;
              }
              
              .dark .el-select-dropdown {
                background-color: #1a1a1a !important;
                border-color: #333333 !important;
              }
              
              .dark .el-select-dropdown__item {
                color: #e0e0e0 !important;
              }
              
              .dark .el-select-dropdown__item.hover,
              .dark .el-select-dropdown__item:hover {
                background-color: #333333 !important;
              }
              
              .dark .el-select-dropdown__item.selected {
                color: #409eff !important;
              }
              
              /* 普通输入框样式 */
              .dark .el-input__wrapper {
                background-color: #1a1a1a !important;
                box-shadow: 0 0 0 1px #333333 inset !important;
              }
              
              .dark .el-input__inner {
                color: #e0e0e0 !important;
              }
              
              /* textarea样式 */
              .dark .el-textarea__inner {
                background-color: #1a1a1a !important;
                border-color: #333333 !important;
                color: #e0e0e0 !important;
              }
              
              /* 按钮样式修正 */
              .dark .el-button {
                background-color: #1a1a1a !important;
                border-color: #333333 !important;
                color: #e0e0e0 !important;
              }
              
              .dark .el-button:hover {
                background-color: #333333 !important;
                border-color: #444444 !important;
                color: #ffffff !important;
              }
              
              .dark .el-button--primary {
                background-color: #409eff !important;
                border-color: #409eff !important;
                color: #ffffff !important;
              }
              
              .dark .el-button--primary:hover {
                background-color: #66b1ff !important;
                border-color: #66b1ff !important;
              }
              
              .dark .el-button--danger {
                background-color: #f56c6c !important;
                border-color: #f56c6c !important;
                color: #ffffff !important;
              }
              
              .dark .el-button--danger:hover {
                background-color: #f78989 !important;
                border-color: #f78989 !important;
              }
            `
            document.head.appendChild(style)
          }
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

        // 简单触发窗口resize事件
        window.dispatchEvent(new Event('resize'))
      }
    },
  })

  const toggleDark = useToggle(isDark)

  // 简化后的切换函数
  const toggleDarkEnhanced = () => {
    toggleDark()

    // 多次触发resize事件，确保UI组件都能完全响应主题变化
    // 延迟不同时间点触发，确保覆盖所有可能的组件初始化或更新时机
    const delays = [50, 200, 500]
    delays.forEach((delay: number) => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))

        // 强制刷新可能存在的表格组件
        document.querySelectorAll('.el-table').forEach((table: Element) => {
          if (table instanceof HTMLElement && table.classList.contains('el-table')) {
            // 尝试更安全的方法触发表格布局刷新
            const event = new Event('resize', { bubbles: true })
            table.dispatchEvent(event)
          }
        })
      }, delay)
    })
  }

  return {
    isDark,
    toggleDark: toggleDarkEnhanced,
  }
})
