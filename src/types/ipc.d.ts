import { IpcRendererEvent } from 'electron'

export interface ExportOptions {
  type: string
  fileName: string
  saveMode: 'auto' | 'select'
  savePath?: string
}

export interface ExportMessage {
  options: ExportOptions
  data: any[]
}

export interface IpcAPI {
  on(channel: string, callback: (event: IpcRendererEvent, message: ExportMessage) => void): void
  invoke(channel: string, ...args: any[]): Promise<any>
}

declare global {
  interface Window {
    electronAPI: IpcAPI
  }
}
