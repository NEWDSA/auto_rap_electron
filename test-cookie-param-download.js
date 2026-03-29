const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testCookieDownload() {
  console.log('测试 Bilibili 视频下载（带 Cookie）...');
  
  // 测试 URL
  const url = 'https://www.bilibili.com/video/BV16dPJznEEp/';
  
  // Cookie 示例 - 需要替换为有效的 Cookie
  // 注意：这里使用示例格式，实际使用时需要替换为真实的 SESSDATA
  const cookie = 'SESSDATA=abcd1234efgh5678ijkl9012mnop3456; bili_jct=xyz789abc123def456';
  
  // 构建命令
  const command = `resources\\bin\\yt-dlp.exe -v "${url}" --add-header "Cookie:${cookie}" -o "test_cookie_%(title)s.%(ext)s" --write-info-json`;
  
  console.log('执行命令:', command);
  console.log('注意：如果 Cookie 无效，仍然会报错 352');
  
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

// 如果直接运行此脚本
if (require.main === module) {
  testCookieDownload();
}

module.exports = { testCookieDownload };