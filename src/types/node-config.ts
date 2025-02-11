import type { Component, DefineComponent } from 'vue'
import type * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { RectNodeModel } from '@logicflow/core'
import type { LogicFlow } from '@logicflow/core'
import type { RectNode } from '@logicflow/core'

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
  icon: keyof typeof ElementPlusIconsVue
}

export interface NodeProperties {
  name: string
  description?: string
  nodeType?: string
  [key: string]: any
}

export interface FlowNode extends BaseNodeData {
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

class CustomNodeModel extends RectNodeModel {
  getNodeStyle() {
    const style = super.getNodeStyle()
    return {
      ...style,
      strokeWidth: 1
    }
  }
} 