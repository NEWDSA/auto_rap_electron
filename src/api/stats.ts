export interface StatsData {
  totalProcesses: number
  runningTasks: number
  todayExecutions: number
  successRate: number
}

declare global {
  interface Window {
    electronAPI: {
      invoke(channel: string, ...args: any[]): Promise<any>
    }
  }
}

export async function getStats(): Promise<StatsData> {
  return await window.electronAPI.invoke('get-stats')
}
