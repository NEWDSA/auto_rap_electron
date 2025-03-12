import { BrowserWindow, ipcMain, WebContents } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface RecorderServiceOptions {
  injectScript?: string;
  screenshotDir?: string;
  takeScreenshots?: boolean;
}

export class RecorderService {
  private recorderWindow: BrowserWindow | null = null;
  private mainWindow: BrowserWindow;
  private isRecording: boolean = false;
  private options: RecorderServiceOptions;
  private recordingData: any[] = [];

  constructor(mainWindow: BrowserWindow, options: RecorderServiceOptions = {}) {
    this.mainWindow = mainWindow;
    this.options = {
      injectScript: path.join(__dirname, 'recorder-inject.js'),
      screenshotDir: path.join(process.cwd(), 'screenshots'),
      takeScreenshots: false,
      ...options
    };

    // 注意：不要在这里调用registerIPCHandlers()，避免与main.ts中的注册冲突
  }

  /**
   * 注册IPC处理程序
   */
  private registerIPCHandlers(): void {
    ipcMain.handle('recorder:start', async (event, url: string) => {
      try {
        return await this.startRecording(url);
      } catch (error) {
        console.error('启动录制失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('recorder:stop', async (event) => {
      try {
        return await this.stopRecording();
      } catch (error) {
        console.error('停止录制失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('recorder:capture-action', async (event, action: any) => {
      try {
        return await this.captureAction(action);
      } catch (error) {
        console.error('捕获动作失败:', error);
        return { success: false, error: (error as Error).message };
      }
    });
  }

  /**
   * 开始录制
   */
  public async startRecording(url: string): Promise<{ success: boolean; data?: any }> {
    if (this.isRecording) {
      return { success: false, data: { error: '已经在录制中' } };
    }

    try {
      // 获取应用程序根目录
      const { app } = require('electron');
      const appPath = app.getAppPath();
      console.log('应用根目录路径:', appPath);
      
      // 构建预加载脚本的绝对路径
      const preloadPath = path.join(appPath, 'electron', 'recorder-preload.js');
      console.log('预加载脚本路径:', preloadPath);
      
      // 检查文件是否存在，如果不存在则尝试替代位置
      let finalPreloadPath = preloadPath;
      if (!fs.existsSync(preloadPath)) {
        console.error('预加载脚本不存在:', preloadPath);
        // 尝试查找可能的位置
        const possibleLocations = [
          path.join(appPath, 'dist-electron', 'recorder-preload.js'),
          path.join(process.cwd(), 'electron', 'recorder-preload.js'),
          path.join(process.cwd(), 'dist-electron', 'recorder-preload.js')
        ];
        
        console.log('尝试在以下位置查找预加载脚本:');
        let found = false;
        for (const location of possibleLocations) {
          const exists = fs.existsSync(location);
          console.log(`- ${location} (${exists ? '存在' : '不存在'})`);
          if (exists) {
            finalPreloadPath = location;
            found = true;
            console.log('使用找到的预加载脚本:', finalPreloadPath);
            break;
          }
        }
        
        // 如果所有位置都没找到，创建一个临时预加载脚本
        if (!found) {
          console.warn('未找到预加载脚本，将创建临时预加载脚本');
          const tempDir = path.join(process.cwd(), 'temp');
          
          // 确保临时目录存在
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempPreloadPath = path.join(tempDir, 'recorder-preload.js');
          // 基本的预加载脚本内容
          const preloadContent = `
            const { contextBridge, ipcRenderer } = require('electron');
            
            // 暴露给录制窗口的 API
            contextBridge.exposeInMainWorld('electronAPI', {
              // 调用主进程方法
              invoke: (channel, ...args) => {
                // 白名单安全检查
                const validChannels = ['recorder:start', 'recorder:stop', 'recorder:capture-action'];
                if (validChannels.includes(channel)) {
                  return ipcRenderer.invoke(channel, ...args);
                }
                
                console.error('无效的IPC通道:', channel);
                return Promise.reject(new Error(\`无效的 IPC 通道: \${channel}\`));
              },
              
              // 接收主进程事件
              on: (channel, callback) => {
                const validChannels = ['recorder:recording-completed', 'recorder:action-captured'];
                if (validChannels.includes(channel)) {
                  const subscription = (event, ...args) => callback(...args);
                  ipcRenderer.on(channel, subscription);
                  
                  return () => {
                    ipcRenderer.removeListener(channel, subscription);
                  };
                }
              }
            });
          `;
          
          try {
            fs.writeFileSync(tempPreloadPath, preloadContent, 'utf8');
            console.log('临时预加载脚本已创建:', tempPreloadPath);
            finalPreloadPath = tempPreloadPath;
          } catch (error) {
            console.error('创建临时预加载脚本失败:', error);
          }
        }
      }
      
      // 创建录制窗口
      this.recorderWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          // 使用绝对路径指向预加载脚本
          preload: finalPreloadPath,
          devTools: true
        },
        show: true
      });

      // 打开开发者工具（用于调试）
      if (process.env.NODE_ENV === 'development') {
        this.recorderWindow.webContents.openDevTools({ mode: 'detach' });
      }

      // 在窗口加载完成后注入录制脚本
      this.recorderWindow.webContents.on('did-finish-load', () => {
        this.injectRecorderScript(this.recorderWindow!.webContents);
      });

      // 导航到目标URL
      await this.recorderWindow.loadURL(url);

      // 清空之前的录制数据
      this.recordingData = [];
      this.isRecording = true;

      return { success: true };
    } catch (error) {
      console.error('启动录制失败:', error);
      if (this.recorderWindow) {
        this.recorderWindow.close();
        this.recorderWindow = null;
      }
      this.isRecording = false;
      return { success: false, data: { error: (error as Error).message } };
    }
  }

  /**
   * 停止录制
   */
  public async stopRecording(): Promise<{ success: boolean; data?: any }> {
    if (!this.isRecording || !this.recorderWindow) {
      return { success: false, data: { error: '没有正在进行的录制' } };
    }

    try {
      // 发送停止录制消息到录制窗口
      await this.recorderWindow.webContents.executeJavaScript(`
        window.__autoRapRecorder?.cleanup();
      `);

      // 关闭录制窗口
      this.recorderWindow.close();
      this.recorderWindow = null;
      this.isRecording = false;

      // 发送录制数据到主窗口
      this.mainWindow.webContents.send('recorder:recording-completed', this.recordingData);

      return { success: true, data: { actions: this.recordingData } };
    } catch (error) {
      console.error('停止录制失败:', error);
      if (this.recorderWindow) {
        this.recorderWindow.close();
        this.recorderWindow = null;
      }
      this.isRecording = false;
      return { success: false, data: { error: (error as Error).message } };
    }
  }

  /**
   * 捕获动作
   */
  public async captureAction(action: any): Promise<{ success: boolean; data?: any }> {
    if (!this.isRecording) {
      return { success: false, data: { error: '没有正在进行的录制' } };
    }

    // 添加截图（如果开启）
    if (this.options.takeScreenshots && this.recorderWindow) {
      try {
        const screenshotPath = path.join(
          this.options.screenshotDir!,
          `screenshot_${Date.now()}.png`
        );

        // 确保目录存在
        if (!fs.existsSync(this.options.screenshotDir!)) {
          fs.mkdirSync(this.options.screenshotDir!, { recursive: true });
        }

        // 捕获屏幕截图
        const image = await this.recorderWindow.capturePage();
        const buffer = image.toPNG();
        
        // 修复类型错误
        const uint8Array = new Uint8Array(buffer);
        fs.writeFileSync(screenshotPath, uint8Array);

        // 添加截图路径到动作数据
        action.screenshot = screenshotPath;
      } catch (error) {
        console.error('捕获截图失败:', error);
      }
    }

    // 保存动作数据
    this.recordingData.push(action);

    // 发送动作到主窗口
    this.mainWindow.webContents.send('recorder:action-captured', action);

    return { success: true, data: { action } };
  }

  /**
   * 注入录制脚本
   */
  private async injectRecorderScript(webContents: WebContents): Promise<void> {
    // 检查注入脚本是否存在
    if (this.options.injectScript && fs.existsSync(this.options.injectScript)) {
      const scriptContent = fs.readFileSync(this.options.injectScript, 'utf8');
      await webContents.executeJavaScript(scriptContent);
    } else {
      console.warn('未找到录制注入脚本');

      // 注入默认的录制脚本
      await webContents.executeJavaScript(`
        // 默认录制脚本
        (function() {
          if (window.__autoRapRecorder) return;

          window.__autoRapRecorder = {
            isRecording: true,
            
            init: function() {
              const recorder = this;
              
              // 监听点击事件
              document.addEventListener('click', function(e) {
                if (!recorder.isRecording) return;
                
                // 获取元素信息
                const target = e.target;
                const attributes = {};
                
                // 收集属性
                for (const attr of target.attributes) {
                  attributes[attr.name] = attr.value;
                }
                
                // 创建选择器
                let selector = '';
                let selectorType = 'css';
                
                if (target.id) {
                  selector = '#' + target.id;
                  selectorType = 'id';
                } else if (target.className) {
                  selector = '.' + target.className.split(' ')[0];
                  selectorType = 'class';
                } else {
                  // 简单的 XPath 选择器
                  let path = '';
                  let element = target;
                  
                  while (element && element.nodeType === Node.ELEMENT_NODE) {
                    let name = element.nodeName.toLowerCase();
                    let siblings = element.parentNode.querySelectorAll(name);
                    
                    if (siblings.length > 1) {
                      let index = Array.from(siblings).indexOf(element) + 1;
                      name += '[' + index + ']';
                    }
                    
                    path = '/' + name + path;
                    element = element.parentNode;
                  }
                  
                  selector = path;
                  selectorType = 'xpath';
                }
                
                // 捕获动作
                window.electronAPI.invoke('recorder:capture-action', {
                  type: 'click',
                  timestamp: Date.now(),
                  target: {
                    selector,
                    selectorType,
                    innerText: target.innerText,
                    attributes,
                    tagName: target.tagName,
                    x: e.clientX,
                    y: e.clientY
                  },
                });
              });
              
              // 监听输入事件
              document.addEventListener('change', function(e) {
                if (!recorder.isRecording) return;
                
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                  const attributes = {};
                  
                  // 收集属性
                  for (const attr of target.attributes) {
                    attributes[attr.name] = attr.value;
                  }
                  
                  // 创建选择器
                  let selector = '';
                  let selectorType = 'css';
                  
                  if (target.id) {
                    selector = '#' + target.id;
                    selectorType = 'id';
                  } else if (target.className) {
                    selector = '.' + target.className.split(' ')[0];
                    selectorType = 'class';
                  } else if (target.name) {
                    selector = '[name="' + target.name + '"]';
                    selectorType = 'name';
                  } else {
                    // 简单的 XPath 选择器
                    let path = '';
                    let element = target;
                    
                    while (element && element.nodeType === Node.ELEMENT_NODE) {
                      let name = element.nodeName.toLowerCase();
                      let siblings = element.parentNode.querySelectorAll(name);
                      
                      if (siblings.length > 1) {
                        let index = Array.from(siblings).indexOf(element) + 1;
                        name += '[' + index + ']';
                      }
                      
                      path = '/' + name + path;
                      element = element.parentNode;
                    }
                    
                    selector = path;
                    selectorType = 'xpath';
                  }
                  
                  // 捕获动作
                  window.electronAPI.invoke('recorder:capture-action', {
                    type: 'input',
                    timestamp: Date.now(),
                    target: {
                      selector,
                      selectorType,
                      innerText: target.innerText,
                      attributes,
                      tagName: target.tagName
                    },
                    data: {
                      text: target.value
                    }
                  });
                }
              });
              
              // 监听导航事件
              const originalPushState = history.pushState;
              history.pushState = function() {
                const result = originalPushState.apply(this, arguments);
                
                if (recorder.isRecording) {
                  window.electronAPI.invoke('recorder:capture-action', {
                    type: 'navigate',
                    timestamp: Date.now(),
                    data: {
                      url: window.location.href
                    }
                  });
                }
                
                return result;
              };
              
              // 监听浏览器导航事件
              window.addEventListener('popstate', function() {
                if (!recorder.isRecording) return;
                
                window.electronAPI.invoke('recorder:capture-action', {
                  type: 'navigate',
                  timestamp: Date.now(),
                  data: {
                    url: window.location.href
                  }
                });
              });
            },
            
            // 清理方法
            cleanup: function() {
              this.isRecording = false;
            }
          };
          
          // 初始化录制
          window.__autoRapRecorder.init();
        })();
      `);
    }
  }
} 