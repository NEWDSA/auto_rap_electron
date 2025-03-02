declare global {
  interface Window {
    electronAPI: {
      // ... existing declarations ...
      invoke(channel: 'dialog:showSaveDialog', options: { 
        fileName: string, 
        exportType?: 'excel' | 'csv' | 'json' | 'docx' | 'pdf' | 'image' | 'txt',
        imageFormat?: 'png' | 'jpeg'
      }): Promise<string | null>
      invoke(channel: 'fs:writeFile', path: string, data: Buffer | string, options?: { encoding?: string }): Promise<void>
    }
  }
} 