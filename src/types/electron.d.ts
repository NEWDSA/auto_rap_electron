interface ElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
} 