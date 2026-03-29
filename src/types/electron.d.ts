import { IpcRendererEvent } from 'electron'

export interface IElectronAPI {
  invoke(channel: string, ...args: any[]): Promise<any>
  on(channel: string, callback: (event: IpcRendererEvent, message: any) => void): void

  // 数据库操作
  saveConfiguration: (
    name: string,
    content: string
  ) => Promise<{
    success: boolean
    id?: number
    error?: string
  }>

  getAllConfigurations: () => Promise<{
    success: boolean
    data?: Array<{
      id: number
      name: string
      content: string
      created_at: string
      updated_at: string
    }>
    error?: string
  }>

  getConfiguration: (id: number) => Promise<{
    success: boolean
    data?: {
      id: number
      name: string
      content: string
      created_at: string
      updated_at: string
    }
    error?: string
  }>

  updateConfiguration: (
    id: number,
    name: string,
    content: string
  ) => Promise<{
    success: boolean
    error?: string
  }>

  deleteConfiguration: (id: number) => Promise<{
    success: boolean
    error?: string
  }>
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
