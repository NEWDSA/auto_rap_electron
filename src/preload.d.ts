declare global {
  interface Window {
    electronAPI: {
      // ... existing declarations ...
      invoke(channel: 'dialog:showSaveDialog', options: { fileName: string }): Promise<string | null>
      invoke(channel: 'fs:writeFile', path: string, data: Buffer | string): Promise<void>
    }
  }
} 