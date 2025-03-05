import { ipcRenderer } from '@/utils/electron'
import { ElMessage } from 'element-plus'
import type { FlowNode, NodeProperties } from '@/types/node-config'

export interface RecordedAction {
  type: string
  selector?: string
  value?: string
  x?: number
  y?: number
  timestamp: number
}

interface RecorderEventData {
  selector?: string
  selectorType?: 'css' | 'xpath' | 'id' | 'class' | 'name'
  value?: string
  key?: string
  x?: number
  y?: number
}

export class RecorderService {
  private static instance: RecorderService
  private isRecording: boolean = false
  private recordedActions: RecordedAction[] = []
  private startTime: number = 0
  private lastActionTime: number = 0
  private readonly minActionInterval: number = 100 // 最小动作间隔（毫秒）

  private constructor() {
    this.setupEventListeners()
  }

  public static getInstance(): RecorderService {
    if (!RecorderService.instance) {
      RecorderService.instance = new RecorderService()
    }
    return RecorderService.instance
  }

  private setupEventListeners() {
    // 监听来自主进程的录制事件
    ipcRenderer.on('recorder:click', (_event: Electron.IpcRendererEvent, data: RecorderEventData) => {
      if (this.isRecording) {
        this.recordAction({
          type: 'click',
          selector: data.selector,
          selectorType: data.selectorType,
          timestamp: Date.now()
        })
      }
    })

    ipcRenderer.on('recorder:input', (_event: Electron.IpcRendererEvent, data: RecorderEventData) => {
      if (this.isRecording) {
        this.recordAction({
          type: 'input',
          selector: data.selector,
          selectorType: data.selectorType,
          value: data.value,
          timestamp: Date.now()
        })
      }
    })

    ipcRenderer.on('recorder:scroll', (_event: Electron.IpcRendererEvent, data: RecorderEventData) => {
      if (this.isRecording) {
        this.recordAction({
          type: 'scroll',
          x: data.x,
          y: data.y,
          timestamp: Date.now()
        })
      }
    })

    ipcRenderer.on('recorder:keypress', (_event: Electron.IpcRendererEvent, data: RecorderEventData) => {
      if (this.isRecording) {
        this.recordAction({
          type: 'keypress',
          value: data.key,
          timestamp: Date.now()
        })
      }
    })

    ipcRenderer.on('recorder:mouseMove', (_event: Electron.IpcRendererEvent, data: RecorderEventData) => {
      if (this.isRecording) {
        this.recordAction({
          type: 'mouseMove',
          x: data.x,
          y: data.y,
          timestamp: Date.now()
        })
      }
    })

    ipcRenderer.on('recorder:action', this.handleRecordedAction.bind(this))
  }

  private recordAction(action: RecordedAction) {
    const now = Date.now()
    // 检查动作间隔
    if (now - this.lastActionTime >= this.minActionInterval) {
      this.recordedActions.push(action)
      this.lastActionTime = now
    }
  }

  public async startRecording(): Promise<void> {
    if (this.isRecording) return

    this.isRecording = true
    this.recordedActions = []

    // 通知主进程开始录制
    await ipcRenderer.invoke('recorder:start')

    // 监听录制事件
    ipcRenderer.on('recorder:action', this.handleRecordedAction.bind(this))
  }

  public async stopRecording(): Promise<FlowNode[]> {
    if (!this.isRecording) return []

    this.isRecording = false

    // 通知主进程停止录制
    await ipcRenderer.invoke('recorder:stop')

    // 移除事件监听
    ipcRenderer.removeAllListeners('recorder:action')

    // 生成工作流节点
    return this.generateWorkflowNodes()
  }

  public getRecordedActions(): RecordedAction[] {
    return this.recordedActions
  }

  private handleRecordedAction(_event: any, action: RecordedAction): void {
    this.recordedActions.push({
      ...action,
      timestamp: Date.now()
    })
  }

  private generateWorkflowNodes(): FlowNode[] {
    const nodes: FlowNode[] = []
    let currentX = 200
    let currentY = 200

    this.recordedActions.forEach((action, index) => {
      const node: FlowNode = {
        id: `node_${index}`,
        type: this.getNodeType(action),
        x: currentX,
        y: currentY,
        properties: {
          name: this.getNodeName(action),
          ...this.getNodeProperties(action)
        }
      }

      nodes.push(node)
      currentX += 150 // 水平间距
    })

    return nodes
  }

  private getNodeType(action: RecordedAction): string {
    switch (action.type) {
      case 'click':
        return 'click'
      case 'input':
        return 'input'
      case 'scroll':
        return 'scroll'
      case 'keypress':
        return 'keyboard'
      case 'mouseMove':
        return 'mouse'
      default:
        return 'click'
    }
  }

  private getNodeName(action: RecordedAction): string {
    switch (action.type) {
      case 'click':
        return '点击元素'
      case 'input':
        return '输入文本'
      case 'scroll':
        return '滚动页面'
      case 'keypress':
        return '按键操作'
      case 'mouseMove':
        return '鼠标移动'
      default:
        return '未知操作'
    }
  }

  private getNodeProperties(action: RecordedAction): Record<string, any> {
    const baseProps = {
      selector: action.selector,
      timestamp: action.timestamp
    }

    switch (action.type) {
      case 'click':
        return {
          ...baseProps,
          clickType: 'left',
          waitForNavigation: true
        }
      case 'input':
        return {
          ...baseProps,
          value: action.value,
          clearFirst: true
        }
      case 'scroll':
        return {
          ...baseProps,
          x: action.x,
          y: action.y,
          behavior: 'smooth'
        }
      case 'keypress':
        return {
          ...baseProps,
          key: action.value
        }
      case 'mouseMove':
        return {
          ...baseProps,
          x: action.x,
          y: action.y
        }
      default:
        return baseProps
    }
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording
  }
} 