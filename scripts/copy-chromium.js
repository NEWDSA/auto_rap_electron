const fs = require('fs-extra');
const path = require('path');

// 源路径和目标路径
const sourcePath = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1097');
const targetPath = path.join(__dirname, '../build/chromium');

// 确保目标目录存在
fs.ensureDirSync(path.dirname(targetPath));

// 复制 Chromium
console.log('正在复制 Chromium...');
console.log('从:', sourcePath);
console.log('到:', targetPath);

try {
  // 如果目标目录已存在，先删除
  if (fs.existsSync(targetPath)) {
    fs.removeSync(targetPath);
  }
  
  // 复制目录
  fs.copySync(sourcePath, targetPath);
  console.log('Chromium 复制成功！');
} catch (err) {
  console.error('复制失败:', err);
  process.exit(1);
} 