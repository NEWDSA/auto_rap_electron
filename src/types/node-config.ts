import type { Component, DefineComponent } from 'vue'
import type * as ElementPlusIconsVue from '@element-plus/icons-vue'

export interface NodeConfig {
  type: string
  name: string
  icon: keyof typeof ElementPlusIconsVue
}

export interface NodeProperties {
  name?: string
  description?: string
  actionType?: string
  url?: string
  wait?: number
  selector?: string
  value?: string
  condition?: string
  loopType?: string
  count?: number
  extractType?: string
  attributeName?: string
  variableName?: string
  key?: string
  modifiers?: string[]
  text?: string
  x?: number
  y?: number
  smooth?: boolean
  waitType?: string
  timeout?: number
  reverse?: boolean
  screenshotType?: string
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
  onUpdate?: (key: string) => void
}

export type NodeConfigComponent = DefineComponent<NodeConfigProps>

export interface LogicFlowEvents {
  'element:click': { data: FlowNode }
  'blank:click': void
  'history:change': { undoAble: boolean, redoAble: boolean }
}

export interface LogicFlowApi {
  render: () => void
  destroy: () => void
  on: <K extends keyof LogicFlowEvents>(event: K, callback: (data: LogicFlowEvents[K]) => void) => void
  off: <K extends keyof LogicFlowEvents>(event: K) => void
  register: (config: any) => void
  setProperties: (id: string, properties: NodeProperties) => void
  undo: () => void
  redo: () => void
  getGraphData: () => any
  extension: {
    miniMap: {
      init: (config: { container: HTMLElement, width: number, height: number }) => void
    }
  }
} 