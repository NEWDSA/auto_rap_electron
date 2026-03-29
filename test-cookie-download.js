const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testDownload() {
  console.log('测试 Bilibili 视频下载...');
  
  // 测试 URL
  const url = 'https://www.bilibili.com/video/BV16dPJznEEp/';
  
  // 构建命令
  const command = `resources\\bin\\yt-dlp.exe -v "${url}" --cookies-from-browser chrome -o "test_%(title)s.%(ext)s" --write-info-json`;
  
  console.log('执行命令:', command);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('成功输出:', stdout);
    if (stderr) {
      console.log('错误输出:', stderr);
    }
  } catch (error) {
    console.error('下载失败:', error.message);
    if (error.stderr) {
      console.error('错误详情:', error.stderr);
    }
    if (error.stdout) {
      console.error('标准输出:', error.stdout);
    }
  }
}

testDownload();