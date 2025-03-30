declare module '@logicflow/core' {
  interface LogicFlowProperties {
    id: string
    type: string
    properties: Record<string, any>
  }

  interface LogicFlowOptions {
    container: HTMLElement
    grid?: boolean
    plugins?: any[]
    nodeTextEdit?: boolean
    edgeTextEdit?: boolean
    nodeTextDraggable?: boolean
    edgeTextDraggable?: boolean
    adjustNodePosition?: boolean
    snapline?: boolean
    style?: Record<string, any>
  }

  interface LogicFlowEvents {
    'element:click': { data: LogicFlowProperties }
    'blank:click': void
    'history:change': { undoAble: boolean, redoAble: boolean }
  }

  export default class LogicFlow {
    constructor(options: LogicFlowOptions)
    render(): void
    on<K extends keyof LogicFlowEvents>(event: K, callback: (data: LogicFlowEvents[K]) => void): void
    register(config: any): void
    setProperties(id: string, properties: any): void
    getGraphData(): any
    undo(): void
    redo(): void
    destroy(): void
    extension: {
      miniMap: {
        init(options: { container: HTMLElement, width?: number, height?: number }): void
      }
    }
  }

  class RectNodeModel {
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

declare module '@logicflow/extension' {
  export const DndPanel: any
  export const MiniMap: any
  export const Control: any
  export const SelectionSelect: any
}

interface NodeConfig {
  type: string
  name: string
  icon: string
  properties?: Record<string, any>
}

interface FlowNode {
  id: string
  type: string
  properties: Record<string, any>
}

interface DragEvent extends Event {
  dataTransfer?: DataTransfer
} 