/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@element-plus/icons-vue' {
  import type { Component } from 'vue'
  export const Monitor: Component
  export const Search: Component
  export const EditPen: Component
  export const Position: Component
  export const Timer: Component
  export const PictureRounded: Component
  export const SwitchButton: Component
  export const RefreshRight: Component
  export const Document: Component
  export const VideoPlay: Component
  export const VideoPause: Component
  export const ArrowLeft: Component
  export const ArrowRight: Component
  export const Box: Component
  export const Tools: Component
  export const Select: Component
}

declare module '@logicflow/core/dist/style/index.css'
declare module '@logicflow/extension/lib/style/index.css' 