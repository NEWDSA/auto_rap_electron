const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testCookieDownload() {
  console.log('测试 Bilibili 视频下载（带正确 Cookie 格式）...');
  
  // 测试 URL
  const url = 'https://www.bilibili.com/video/BV16dPJznEEp/';
  
  // 正确的 Cookie 格式 - 使用用户提供的 SESSDATA
  // 注意：只需要 SESSDATA 值，不需要 URL 编码
  const sessdata = 'c8b87ee7,1788488655,450f7*31CjDnFALXj0afkM2FFO3-ioTdo9nhMiwfJMitBNvdOnRqxjImCvIY768A_rciPaT3wHASVkVKUWFSNnM2c0dFeWdPbUw0bmJSTWU1Sy1tVUdLei1YWGstRnZfaGR5Z1ZQaVJfdzBzdEFWNmNlMkxYYm41Q3ZKTHVJSUdtMnhjc0VUa19GaW04OU1nIIEC';
  const cookie = `SESSDATA=${sessdata}`;
  
  // 构建命令
  const command = `resources\\bin\\yt-dlp.exe -v "${url}" --add-header "Cookie:${cookie}" -o "test_cookie_%(title)s.%(ext)s" --write-info-json`;
  
  console.log('执行命令:', command);
  console.log('使用 Cookie:', cookie);
  
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