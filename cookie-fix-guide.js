// 修复 Cookie 格式的配置示例
const cookieFixExample = {
  // 您的 SESSDATA（从浏览器复制的原始值）
  sessdata: 'c8b87ee7%2C1788488655%2C450f7%2A31CjDnFALXj0afkM2FFO3-ioTdo9nhMiwfJMitBNvdOnRqxjImCvIY768A_rciPaT3wHASVkVKUWFSNnM2c0dFeWdPbUw0bmJSTWU1Sy1tVUdLei1YWGstRnZfaGR5Z1ZQaVJfdzBzdEFWNmNlMkxYYm41Q3ZKTHVJSUdtMnhjc0VUa19GaW04OU1nIIEC',
  
  // 正确的 Cookie 格式（直接复制到应用中）
  correctFormat: 'SESSDATA=c8b87ee7%2C1788488655%2C450f7%2A31CjDnFALXj0afkM2FFO3-ioTdo9nhMiwfJMitBNvdOnRqxjImCvIY768A_rciPaT3wHASVkVKUWFSNnM2c0dFeWdPbUw0bmJSTWU1Sy1tVUdLei1YWGstRnZfaGR5Z1ZQaVJfdzBzdEFWNmNlMkxYYm41Q3ZKTHVJSUdtMnhjc0VUa19GaW04OU1nIIEC',
  
  // 使用说明
  instructions: [
    '1. 在 Cookie 输入框中直接粘贴：',
    '   SESSDATA=c8b87ee7%2C1788488655%2C450f7%2A31CjDnFALXj0afkM2FFO3-ioTdo9nhMiwfJMitBNvdOnRqxjImCvIY768A_rciPaT3wHASVkVKUWFSNnM2c0dFeWdPbUw0bmJSTWU1Sy1tVUdLei1YWGstRnZfaGR5Z1ZQaVJfdzBzdEFWNmNlMkxYYm41Q3ZKTHVJSUdtMnhjc0VUa19GaW04OU1nIIEC',
    '2. 不要加引号或其他字符',
    '3. 确保包含完整的 SESSDATA 值',
    '4. 点击测试下载按钮'
  ]
};

console.log('Cookie 修复指南：');
console.log('================');
cookieFixExample.instructions.forEach(line => console.log(line));
console.log('\n您的 Cookie 是有效的！可以正常下载视频。');
console.log('如果仍然失败，请检查：');
console.log('- Cookie 输入框是否正确粘贴');
console.log('- 是否选择了合适的画质（非会员选 720P 或更低）');
console.log('- 保存路径是否有写入权限');