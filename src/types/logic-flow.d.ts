declare module '@logicflow/core' {
  export default class LogicFlow {
    constructor(options: {
      container: HTMLElement;
      grid?: boolean;
      plugins?: any[];
      nodeTextEdit?: boolean;
      edgeTextEdit?: boolean;
      nodeTextDraggable?: boolean;
      edgeTextDraggable?: boolean;
      adjustNodePosition?: boolean;
      snapline?: boolean;
      style?: Record<string, any>;
    })
    render(): void
    destroy(): void
    on(event: string, callback: Function): void
    off(event: string): void
    register(config: any): void
    setProperties(id: string, properties: any): void
    undo(): void
    redo(): void
    getGraphData(): any
    addNode(nodeConfig: any): any
    addEdge(edgeConfig: any): any
    deleteEdge(edgeId: string): void
    deleteNode(nodeId: string): void
    getTransform(): { scale: number; x: number; y: number }
    setTransform(transform: { scale: number; x: number; y: number }): void
    resetTransform(): void
    focusOn(): void
    updateText(id: string, text: string): void
    extension: {
      miniMap: {
        init(config: { container: HTMLElement, width: number, height: number }): void
      }
    }
  }

  export class NodeModel {
    id: string
    type: string
    properties: Record<string, any>
    text: {
      value: string
      x: number
      y: number
      fontSize: number
      color: string
      textAlign: string
      textBaseline: string
    }
    initNodeData(data: any): void
    setProperties(properties: Record<string, any>): void
    getProperties(): Record<string, any>
    getNodeStyle(): Record<string, any>
  }

  export class RectNodeModel extends NodeModel {
    width: number
    height: number
    radius: number
    initNodeData(data: any): void
    setProperties(properties: Record<string, any>): void
    getProperties(): Record<string, any>
    getNodeStyle(): Record<string, any>
  }

  export class BezierEdgeModel {
    id: string
    type: string
    properties: Record<string, any>
    strokeWidth: number
    initEdgeData(data: any): void
    setProperties(properties: Record<string, any>): void
    getEdgeStyle(): Record<string, any>
    updateStartPoint(point: { x: number; y: number }): void
    updateEndPoint(point: { x: number; y: number }): void
  }

  export class BaseNode {
    props: any
    getShape(): any
    getText(): any
  }

  export class RectNode extends BaseNode {
    props: any
    getShape(): any
    getText(): any
  }

  export class BezierEdge extends BaseNode {
    props: any
    getShape(): any
    getText(): any
  }

  export class GraphModel {
    nodes: NodeModel[]
    edges: any[]
  }

  export interface GraphConfigData {
    nodes: any[]
    edges: any[]
  }
} 