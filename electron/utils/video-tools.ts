import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class VideoTools {
  private static instance: VideoTools
  private toolsPath: string
  private ytDlpPath: string
  private ffmpegPath: string

  private constructor() {
    // 在开发环境和生产环境中，工具路径可能不同
    // 开发环境：项目根目录/resources/bin
    // 生产环境：安装目录/resources/bin
    const isDev = process.env.NODE_ENV === 'development'

    // 使用 app.getAppPath() 更稳健
    const appPath = app.getAppPath()
    // 在开发环境中 app.getAppPath() 指向 dist-electron，需要向上两级回到根目录
    // 但 process.cwd() 通常是根目录，这里保留 process.cwd() 但增加日志

    console.log('[VideoTools] 初始化')
    console.log('[VideoTools] 环境变量 NODE_ENV:', process.env.NODE_ENV)
    console.log('[VideoTools] process.cwd():', process.cwd())
    console.log('[VideoTools] process.resourcesPath:', process.resourcesPath)
    console.log('[VideoTools] app.getAppPath():', appPath)

    this.toolsPath = isDev
      ? path.join(process.cwd(), 'resources', 'bin')
      : path.join(process.resourcesPath, 'bin')

    console.log('[VideoTools] 工具目录:', this.toolsPath)

    // Windows 下添加 .exe 后缀
    const ext = process.platform === 'win32' ? '.exe' : ''
    this.ytDlpPath = path.join(this.toolsPath, `yt-dlp${ext}`)
    this.ffmpegPath = path.join(this.toolsPath, `ffmpeg${ext}`)

    console.log('[VideoTools] yt-dlp 路径:', this.ytDlpPath)
    console.log('[VideoTools] ffmpeg 路径:', this.ffmpegPath)
  }

  public static getInstance(): VideoTools {
    if (!VideoTools.instance) {
      VideoTools.instance = new VideoTools()
    }
    return VideoTools.instance
  }

  /**
   * 检查工具是否存在
   */
  public async checkTools(): Promise<{ ytDlp: boolean; ffmpeg: boolean }> {
    const ytDlpExists = fs.existsSync(this.ytDlpPath)
    const ffmpegExists = fs.existsSync(this.ffmpegPath)
    return { ytDlp: ytDlpExists, ffmpeg: ffmpegExists }
  }

  /**
   * 下载视频
   * @param url 视频链接
   * @param options 下载选项
   */
  public async downloadVideo(
    url: string,
    options: {
      savePath: string
      quality?: string // best, 1080, 720, audio
      downloadDanmaku?: boolean
      downloadSubtitle?: boolean
      downloadThumbnail?: boolean
      cookie?: string
      onProgress?: (progress: number, status: string) => void
    }
  ): Promise<{ success: boolean; message: string; output?: string }> {
    try {
      // 检查工具是否存在
      const status = await this.checkTools()

      // 如果本地没有 yt-dlp，尝试使用系统全局安装的 yt-dlp
      // 注意：这里为了简化逻辑，如果本地没找到，就假设系统环境变量里有
      let executable = this.ytDlpPath
      if (!status.ytDlp) {
        try {
          await execAsync('yt-dlp --version')
          executable = 'yt-dlp'
        } catch (e) {
          return {
            success: false,
            message: `未找到 yt-dlp 工具，请确保 resources/bin 目录下存在 yt-dlp${process.platform === 'win32' ? '.exe' : ''} 或已添加到系统环境变量`,
          }
        }
      }

      // 构建命令参数 - spawn 需要单独的参数数组，不需要引号包裹
      const args: string[] = []

      // 1. URL
      args.push(url)

      // 2. 输出路径模板
      // %(title)s.%(ext)s 自动命名
      const outputPath = path.join(options.savePath, '%(title)s.%(ext)s')
      args.push('-o', outputPath)

      // 3. 画质选择
      if (options.quality === 'audio') {
        args.push('-x') // 提取音频
        args.push('--audio-format', 'mp3')
      } else if (options.quality === '1080') {
        args.push('-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]')
      } else if (options.quality === '720') {
        args.push('-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]')
      } else {
        // 默认最高画质
        args.push('-f', 'bestvideo+bestaudio/best')
      }

      // 4. 其他选项
      if (options.downloadDanmaku) args.push('--write-subs', '--sub-langs', 'all') // B站弹幕常作为字幕处理
      if (options.downloadSubtitle) args.push('--write-auto-subs')
      if (options.downloadThumbnail) args.push('--write-thumbnail')

      // 5. Cookie
      if (options.cookie) {
        // 注意：Cookie 传递比较敏感，最好是写入临时文件传给 --cookies 选项，这里为了演示直接通过 header 传递（yt-dlp 支持 --add-header）
        // 或者使用 --cookies-from-browser chrome
        args.push('--add-header', `Cookie:${options.cookie}`)
      }

      // 6. 指定 ffmpeg 位置 (如果使用的是本地路径)
      if (status.ffmpeg && executable !== 'yt-dlp') {
        args.push('--ffmpeg-location', path.dirname(this.ffmpegPath))
      }

      // 7. 忽略错误继续下载（针对列表）
      args.push('--ignore-errors')

      // 8. 进度输出格式（可选，为了更好解析进度）
      // args.push('--newline') // 这一行被注释掉了，但对于 spawn 解析进度很有用，不过默认流式输出也行
      // 实际上 spawn 会按块输出，不一定按行。还是加上 --newline 比较稳妥
      // 但是 yt-dlp 默认输出包含进度条，如果不加 --newline，会用 \r 刷新行。
      // 我们需要解析 \r 刷新的行。或者加上 --newline 变成多行输出。
      // 加 --newline 会产生很多行日志，但容易解析。
      // 不加 --newline 需要处理 \r。
      // 建议不加，通过监听 data 事件解析最后一行。
      // 或者加上 --progress-template

      console.log('执行下载命令:', executable, args.join(' '))

      return new Promise(resolve => {
        const child = spawn(executable, args)

        let stdout = ''
        let stderr = ''
        let buffer = ''

        child.stdout.on('data', data => {
          const text = data.toString()
          stdout += text
          buffer += text

          // 处理 yt-dlp 的输出，它可能包含 \n 或 \r
          const lines = buffer.split(/[\r\n]+/)
          // 保留最后一段可能不完整的行
          buffer = lines.pop() || ''

          for (const line of lines) {
            // 解析进度
            // [download]  12.3% of 100.00MiB at  2.00MiB/s ETA 00:45
            const progressMatch = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/)
            if (progressMatch && options.onProgress) {
              const progress = parseFloat(progressMatch[1])
              options.onProgress(progress, '下载中...')
            }

            // 解析合并状态
            if (line.includes('[Merger]') && options.onProgress) {
              options.onProgress(99, '合并中...')
            }

            // 解析已下载完成但正在处理的状态
            if (line.includes('[download] 100%') || line.includes('[download] 100.0%')) {
              if (options.onProgress) options.onProgress(100, '下载完成，处理中...')
            }
          }
        })

        child.stderr.on('data', data => {
          const text = data.toString()
          stderr += text
          console.error('[yt-dlp stderr]:', text)
        })

        child.on('close', code => {
          if (code === 0) {
            if (options.onProgress) options.onProgress(100, '下载完成')
            resolve({
              success: true,
              message: '下载完成',
              output: stdout,
            })
          } else {
            resolve({
              success: false,
              message: `下载出错 (退出码: ${code})`,
              output: stderr || stdout,
            })
          }
        })

        child.on('error', err => {
          resolve({
            success: false,
            message: `启动进程失败: ${err.message}`,
            output: err.message,
          })
        })
      })
    } catch (error: any) {
      console.error('下载失败:', error)
      return {
        success: false,
        message: `下载出错: ${error.message}`,
        output: error.stderr,
      }
    }
  }

  private async resolveFfmpegExecutable(): Promise<string> {
    const status = await this.checkTools()
    if (status.ffmpeg) return this.ffmpegPath
    try {
      await execAsync('ffmpeg -version')
      return 'ffmpeg'
    } catch (e) {
      throw new Error(
        `未找到 ffmpeg 工具，请确保 resources/bin 目录下存在 ffmpeg${process.platform === 'win32' ? '.exe' : ''} 或已添加到系统环境变量`
      )
    }
  }

  private parseDurationSecondsFromFfmpegOutput(output: string): number | null {
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
    if (!match) return null
    const h = Number(match[1])
    const m = Number(match[2])
    const s = Number(match[3])
    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null
    return h * 3600 + m * 60 + s
  }

  private async getMediaDurationSeconds(
    inputPath: string,
    ffmpegExecutable: string
  ): Promise<number | null> {
    return new Promise(resolve => {
      const child = spawn(ffmpegExecutable, ['-hide_banner', '-i', inputPath], {
        stdio: ['ignore', 'ignore', 'pipe'],
      })
      let stderr = ''
      child.stderr.on('data', d => {
        stderr += d.toString()
      })
      child.on('close', () => {
        resolve(this.parseDurationSecondsFromFfmpegOutput(stderr))
      })
      child.on('error', () => resolve(null))
    })
  }

  public async convertVideo(
    inputPath: string,
    options: {
      outputPath?: string
      outputDir?: string
      outputFormat: 'mp4' | 'mkv' | 'mov' | 'avi' | 'mp3' | 'wav'
      overwrite?: boolean
      onProgress?: (progress: number, status: string) => void
    }
  ): Promise<{ success: boolean; message: string; output?: string }> {
    try {
      if (!inputPath) {
        return { success: false, message: '输入文件路径不能为空' }
      }
      if (!fs.existsSync(inputPath)) {
        return { success: false, message: `输入文件不存在: ${inputPath}` }
      }

      const ffmpegExecutable = await this.resolveFfmpegExecutable()
      const inputDir = path.dirname(inputPath)
      const inputBase = path.basename(inputPath, path.extname(inputPath))
      const outputDir = options.outputDir || inputDir
      const outputPath =
        options.outputPath || path.join(outputDir, `${inputBase}.${options.outputFormat}`)

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      const durationSeconds = await this.getMediaDurationSeconds(inputPath, ffmpegExecutable)
      const args: string[] = []
      args.push(options.overwrite === false ? '-n' : '-y')
      args.push('-hide_banner')
      args.push('-i', inputPath)

      if (options.outputFormat === 'mp3') {
        args.push('-vn')
        args.push('-c:a', 'libmp3lame')
      } else if (options.outputFormat === 'wav') {
        args.push('-vn')
        args.push('-c:a', 'pcm_s16le')
      } else {
        args.push('-c:v', 'libx264')
        args.push('-preset', 'veryfast')
        args.push('-crf', '23')
        args.push('-c:a', 'aac')
      }

      args.push('-progress', 'pipe:1')
      args.push('-nostats')
      args.push(outputPath)

      if (options.onProgress) options.onProgress(0, '准备转换...')

      return await new Promise(resolve => {
        const child = spawn(ffmpegExecutable, args, {
          windowsHide: true,
        })

        let stdout = ''
        let stderr = ''
        let buffer = ''
        let lastProgress = -1

        const emitProgress = (p: number, status: string) => {
          if (!options.onProgress) return
          const clamped = Math.max(0, Math.min(100, p))
          const rounded = Math.floor(clamped)
          if (rounded === lastProgress && status === '转换中...') return
          lastProgress = rounded
          options.onProgress(rounded, status)
        }

        child.stdout.on('data', data => {
          const text = data.toString()
          stdout += text
          buffer += text
          const lines = buffer.split(/[\r\n]+/)
          buffer = lines.pop() || ''

          for (const line of lines) {
            const [key, value] = line.split('=')
            if (!key) continue
            if (key === 'out_time_ms') {
              if (!durationSeconds || durationSeconds <= 0) continue
              const outMs = Number(value)
              if (!Number.isFinite(outMs) || outMs < 0) continue
              const outSeconds = outMs / 1_000_000
              emitProgress((outSeconds / durationSeconds) * 100, '转换中...')
            } else if (key === 'progress' && value === 'end') {
              emitProgress(100, '转换完成')
            }
          }
        })

        child.stderr.on('data', data => {
          stderr += data.toString()
        })

        child.on('close', code => {
          if (code === 0) {
            emitProgress(100, '转换完成')
            resolve({ success: true, message: '转换完成', output: stdout })
          } else {
            resolve({
              success: false,
              message: `转换失败 (退出码: ${code})`,
              output: stderr || stdout,
            })
          }
        })

        child.on('error', err => {
          resolve({ success: false, message: `启动进程失败: ${err.message}`, output: err.message })
        })
      })
    } catch (error: any) {
      return { success: false, message: `转换出错: ${error.message}`, output: error?.stderr }
    }
  }
}
