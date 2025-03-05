import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { RecorderManager } from './RecorderManager'

let mainWindow: BrowserWindow | null = null
const recorderManager = RecorderManager.getInstance()

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 设置主窗口
  recorderManager.setMainWindow(mainWindow)

  if (process.env.NODE_ENV === 'development') {
    // 开发环境下加载本地服务
    await mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境下加载打包后的文件
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
}) 