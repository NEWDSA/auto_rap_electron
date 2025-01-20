import type { Component, DefineComponent } from 'vue'

export interface NodeProperties {
  name: string
  description?: string
  // 浏览器节点
  url?: string
  wait?: number
  // 点击节点
  selector?: string
  waitForSelector?: boolean
  // 输入节点
  value?: string
  // 条件节点
  condition?: string
  // 循环节点
  loopType?: 'count' | 'condition' | 'elements'
  count?: number
  // 数据提取节点
  extractType?: 'text' | 'attribute' | 'html'
  attributeName?: string
  variableName?: string
  // 键盘操作节点
  actionType?: 'press' | 'combination' | 'type'
  key?: string
  modifiers?: string[]
  text?: string
  // 鼠标操作节点
  actionType?: 'moveToElement' | 'moveToPosition' | 'scrollToElement' | 'scrollToPosition'
  x?: number
  y?: number
  smooth?: boolean
  // 等待节点
  waitType?: 'timeout' | 'visible' | 'hidden' | 'exists' | 'clickable'
  timeout?: number
  reverse?: boolean
  // 截图节点
  screenshotType?: 'fullPage' | 'viewport' | 'element'
  path?: string
  omitBackground?: boolean
  quality?: number
}

export interface FlowNode {
  id: string
  type: string
  properties: NodeProperties
}

export interface NodeConfigProps {
  node: FlowNode
}

export interface NodeConfigEmits {
  (e: 'update', key: string): void
}

export type NodeConfigComponent = DefineComponent<NodeConfigProps, {}, any> 