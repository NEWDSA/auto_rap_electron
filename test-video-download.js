const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 模拟 VideoTools 的核心逻辑
class VideoToolsMock {
  constructor() {
    // 假设在项目根目录运行
    this.toolsPath = path.join(process.cwd(), 'resources', 'bin');
    const ext = process.platform === 'win32' ? '.exe' : '';
    this.ytDlpPath = path.join(this.toolsPath, `yt-dlp${ext}`);
    this.ffmpegPath = path.join(this.toolsPath, `ffmpeg${ext}`);
    
    console.log('工具路径:', this.toolsPath);
    console.log('yt-dlp路径:', this.ytDlpPath);
    console.log('ffmpeg路径:', this.ffmpegPath);
  }

  async checkTools() {
    const ytDlpExists = fs.existsSync(this.ytDlpPath);
    const ffmpegExists = fs.existsSync(this.ffmpegPath);
    console.log('yt-dlp存在:', ytDlpExists);
    console.log('ffmpeg存在:', ffmpegExists);
    return { ytDlp: ytDlpExists, ffmpeg: ffmpegExists };
  }

  async downloadVideo(url, options) {
    try {
      const status = await this.checkTools();
      
      let executable = this.ytDlpPath;
      if (!status.ytDlp) {
        try {
            await execAsync('yt-dlp --version');
            executable = 'yt-dlp';
            console.log('使用系统 yt-dlp');
        } catch (e) {
             return { success: false, message: `未找到 yt-dlp 工具` };
        }
      } else {
          console.log('使用本地 yt-dlp');
      }

      const args = [];
      args.push(`"${url}"`);
      
      // 确保保存路径存在
      if (!fs.existsSync(options.savePath)) {
        fs.mkdirSync(options.savePath, { recursive: true });
      }

      const outputPath = path.join(options.savePath, '%(title)s.%(ext)s');
      args.push(`-o "${outputPath}"`);

      // 默认最高画质
      args.push('-f "bestvideo+bestaudio/best"');

      // 忽略错误
      args.push('--ignore-errors');
      
      // 添加详细输出以便调试
      args.push('--verbose');

      if (status.ffmpeg && executable !== 'yt-dlp') {
          args.push(`--ffmpeg-location "${path.dirname(this.ffmpegPath)}"`);
      }

      const command = `"${executable}" ${args.join(' ')}`;
      console.log('执行下载命令:', command);

      const { stdout, stderr } = await execAsync(command);
      
      console.log('标准输出:', stdout);
      if (stderr) console.error('错误输出:', stderr);

      return { 
        success: true, 
        message: '下载完成', 
        output: stdout 
      };

    } catch (error) {
      console.error('下载失败:', error);
      return { 
        success: false, 
        message: `下载出错: ${error.message}`,
        output: error.stderr 
      };
    }
  }
}

// 运行测试
async function runTest() {
  const tools = new VideoToolsMock();
  const url = 'https://www.bilibili.com/video/BV16dPJznEEp/?spm_id_from=333.1007.tianma.1-2-2.click';
  const savePath = path.join(process.cwd(), 'download_test');
  
  console.log('开始测试下载...');
  console.log('URL:', url);
  console.log('保存路径:', savePath);
  
  const result = await tools.downloadVideo(url, { savePath });
  console.log('测试结果:', result);
}

runTest();
