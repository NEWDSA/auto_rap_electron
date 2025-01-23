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
    initNodeData(data: any): void
    setProperties(properties: Record<string, any>): void
    getProperties(): Record<string, any>
  }

  export class RectNodeModel extends NodeModel {
    initNodeData(data: any): void
    setProperties(properties: Record<string, any>): void
    getProperties(): Record<string, any>
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

  export class GraphModel {
    nodes: NodeModel[]
    edges: any[]
  }

  export interface GraphConfigData {
    nodes: any[]
    edges: any[]
  }
} 