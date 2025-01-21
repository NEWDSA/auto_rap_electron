import type { FlowNode } from '@/types/node-config'

export class FlowExecutor {
  private isRunning: boolean = false

  async start(nodes: FlowNode[]) {
    if (this.isRunning) return
    this.isRunning = true

    try {
      const result = await window.electronAPI.invoke('flow:start', nodes)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('执行流程出错:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  async stop() {
    if (!this.isRunning) return
    
    try {
      const result = await window.electronAPI.invoke('flow:stop')
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('停止流程出错:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }
} 