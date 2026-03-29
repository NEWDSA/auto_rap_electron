import type { Component, DefineComponent } from 'vue'
import type * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { RectNodeModel } from '@logicflow/core'

// 扩展 RectNodeModel 的类型定义
declare module '@logicflow/core' {
  interface RectNodeModel {
    width: number;
    height: number;
    radius: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    text: {
      value: string;
      x: number;
      y: number;
      fontSize: number;
      color: string;
      textAlign: string;
      textBaseline: string;
    };
    getNodeStyle(): Record<string, any>;
  }

  interface BezierEdgeModel {
    strokeWidth: number;
    getEdgeStyle(): Record<string, any>;
  }
}

// 扩展 RectNodeModel 的属性
export interface CustomNodeModelProperties extends RectNodeModel {
  width: number
  height: number
  radius: number
  fill: string
  stroke: string
  strokeWidth: number
  text: {
    value: string
    x: number
    y: number
    fontSize: number
    color: string
    textAlign: string
    textBaseline: string
  }
}

export interface NodeConfig {
  type: string
  name: string
  icon: string
}

export interface NodeProperties {
  name?: string
  nodeType?: string
  parentId?: string
  branchType?: 'true' | 'false'

  // 浏览器节点属性
  browserActionType?: 'goto' | 'back' | 'forward' | 'reload' | 'close' | 'maximize' | 'minimize'
  url?: string
  waitForLoad?: boolean
  timeout?: number
  width?: number
  height?: number
  headless?: boolean
  incognito?: boolean
  userAgent?: string

  // 鼠标和滚动节点属性
  mouseActionType?: 'moveToElement' | 'moveToPosition' | 'scrollToElement' | 'scrollToPosition' | 'scrollToTop' | 'scrollToBottom'
  x?: number
  y?: number

  // 点击节点属性
  selector?: string
  selectorType?: 'css' | 'xpath' | 'id' | 'class' | 'name'
  waitAfterClick?: boolean
  clickTimeout?: number

  // 滚动节点属性
  smooth?: boolean
  waitForScroll?: boolean

  // 输入节点属性
  text?: string
  clearFirst?: boolean
  simulateTyping?: boolean
  typingDelay?: number
  waitAfterInput?: boolean
  waitTimeout?: number

  // 键盘节点属性
  keyboardActionType?: 'press' | 'combination' | 'type'
  key?: string
  modifiers?: string[]

  // 提取节点属性
  extractType?: 'text' | 'attribute' | 'html' | 'table' | 'list'
  attributeName?: string
  variableName?: string
  headerSelector?: string
  rowSelector?: string
  cellSelector?: string
  hasHeader?: boolean
  extractInnerHTML?: boolean
  trimContent?: boolean
  waitForVisible?: boolean

  description?: string

  // 导出相关属性
  exportType?: 'excel' | 'csv' | 'json'
  fileName?: string
  dataSource?: 'variable' | 'extract'
  sheetName?: string
  delimiter?: string
  includeHeaders?: boolean
  exportEncoding?: string
  saveMode?: 'auto' | 'select'

  // 电源控制相关属性
  action?: 'lock' | 'sleep' | 'restart' | 'shutdown'
  force?: boolean

  // 文件读取相关属性
  filePath?: string
  fileType?: 'pdf' | 'txt' | 'doc' | 'docx' | 'auto'
  fileEncoding?: 'utf8' | 'gbk' | 'gb2312' | 'auto'
  outputVariable?: string
  includeMetadata?: boolean
  extractImages?: boolean
  extractTables?: boolean

  // 语音合成相关属性
  voiceText?: string
  voice?: string
  speed?: number
  pitch?: number
  volume?: number
  language?: string
  voiceType?: 'system' | 'online' | 'custom'
  outputFile?: string
  playImmediately?: boolean

  [key: string]: any
}

export interface FlowNode {
  id: string
  type: 'start' | 'end' | 'browser' | 'click' | 'input' | 'extract' | 'keyboard' | 'mouse' | 'wait' | 'screenshot' | 'switch' | 'loop' | 'scroll' | 'export' | 'captcha' | 'power' | 'fileReader' | 'voice' | 'video-download' | 'video-convert' | 'email'
  x: number
  y: number
  text: string
  properties: NodeProperties
}

export interface NodeConfigProps {
  node: FlowNode
  onUpdate?: (key: string) => void
}

export type NodeConfigComponent = DefineComponent<NodeConfigProps>

export interface LogicFlowEvents {
  'element:click': (data: { data: FlowNode }) => void
  'blank:click': () => void
  'history:change': (data: { undoAble: boolean; redoAble: boolean }) => void
}

export interface LogicFlowApi {
  render: () => void
  destroy: () => void
  dispose: () => void
  on: (event: string, callback: Function) => void
  off: (event: string) => void
  register: (config: any) => void
  setProperties: (id: string, properties: any) => void
  addNode: (config: any) => any
  addEdge: (config: any) => any
  getGraphData: () => any
  extension: {
    miniMap: {
      init: (config: any) => void
    }
  }
}

export interface BaseNodeData {
  id: string
  type: string
  x: number
  y: number
  properties: NodeProperties
}

export interface BaseEdgeData {
  id: string
  type: string
  sourceNodeId: string
  targetNodeId: string
  text?: string
  properties: Record<string, any>
}

export interface EdgeProperties {
  name?: string
  description?: string
  text?: string
}

export class CustomNodeModel extends RectNodeModel {
  getNodeStyle() {
    const style = super.getNodeStyle()
    return {
      ...style,
      strokeWidth: 1
    }
  }
} 
