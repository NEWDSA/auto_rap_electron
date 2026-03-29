# Windows 终端 UTF-8 编码设置指南

## 问题描述
在 Windows 上运行 Node.js 应用程序时，需要将终端编码设置为 UTF-8 以正确显示和处理中文字符。

## 解决方案

### 1. 设置系统级编码

#### 方法1：通过注册表设置
```bash
# 以管理员身份运行 PowerShell 或 CMD
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Command Processor" /v Autorun /t REG_SZ /d "chcp 65001" /f
```

#### 方法2：设置系统区域设置
1. 打开 **控制面板** → **区域**
2. 点击 **管理** 选项卡
3. 点击 **更改系统区域设置**
4. 勾选 **Beta: 使用 Unicode UTF-8 提供全球语言支持**
5. 重启计算机

### 2. 设置 PowerShell 编码

#### 临时设置（当前会话）
```powershell
# 设置 PowerShell 输出编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 设置环境变量
$env:LANG = "zh_CN.UTF-8"
$env:LC_ALL = "zh_CN.UTF-8"
```

#### 永久设置（PowerShell 配置文件）
```powershell
# 创建 PowerShell 配置文件
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}

# 编辑配置文件
notepad $PROFILE

# 在配置文件中添加以下内容：
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$env:LANG = "zh_CN.UTF-8"
$env:LC_ALL = "zh_CN.UTF-8"
```

### 3. 设置 CMD 编码

#### 临时设置
```cmd
# 设置 CMD 代码页为 UTF-8
chcp 65001

# 设置环境变量
set LANG=zh_CN.UTF-8
set LC_ALL=zh_CN.UTF-8
```

#### 永久设置
```cmd
# 创建批处理文件设置编码
echo @echo off > set-utf8.bat
echo chcp 65001 >> set-utf8.bat
echo set LANG=zh_CN.UTF-8 >> set-utf8.bat
echo set LC_ALL=zh_CN.UTF-8 >> set-utf8.bat
echo cmd /k >> set-utf8.bat
```

### 4. 设置 Windows Terminal

#### 配置文件设置
```json
{
    "profiles": {
        "defaults": {
            "fontFace": "Consolas",
            "fontSize": 12
        },
        "list": [
            {
                "name": "PowerShell",
                "commandline": "powershell.exe -NoExit -Command \"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8; $env:LANG = 'zh_CN.UTF-8'; $env:LC_ALL = 'zh_CN.UTF-8'\"",
                "startingDirectory": "C:\\Users\\%USERNAME%"
            },
            {
                "name": "CMD",
                "commandline": "cmd.exe /k \"chcp 65001 && set LANG=zh_CN.UTF-8 && set LC_ALL=zh_CN.UTF-8\"",
                "startingDirectory": "C:\\Users\\%USERNAME%"
            }
        ]
    }
}
```

### 5. 在 Node.js 应用程序中设置

#### 在 main.ts 中添加编码设置
```typescript
// 设置中文编码环境变量
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';

// 设置控制台编码
if (process.platform === 'win32') {
  // Windows 特定设置
  process.stdout.setEncoding('utf8');
  process.stderr.setEncoding('utf8');
}
```

### 6. 创建启动脚本

#### PowerShell 启动脚本
```powershell
# start-app.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$env:LANG = "zh_CN.UTF-8"
$env:LC_ALL = "zh_CN.UTF-8"

Write-Host "启动应用程序，编码已设置为 UTF-8" -ForegroundColor Green
npm start
```

#### CMD 启动脚本
```cmd
@echo off
chcp 65001
set LANG=zh_CN.UTF-8
set LC_ALL=zh_CN.UTF-8

echo 启动应用程序，编码已设置为 UTF-8
npm start
```

### 7. 验证编码设置

#### 检查当前编码
```javascript
// check-encoding.js
console.log('系统信息:');
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log('Node.js 版本:', process.version);

console.log('\n环境变量:');
console.log('LANG:', process.env.LANG);
console.log('LC_ALL:', process.env.LC_ALL);

console.log('\n编码测试:');
const testText = '你好，世界！';
console.log('中文文本:', testText);
console.log('文本长度:', testText.length);
console.log('字节长度:', Buffer.from(testText, 'utf8').length);
```

### 8. 常见问题解决

#### 问题1：中文显示为问号
**解决方案：**
- 确保终端编码设置为 UTF-8
- 检查系统区域设置
- 重启终端和应用程序

#### 问题2：PowerShell 中文乱码
**解决方案：**
```powershell
# 设置 PowerShell 编码
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

#### 问题3：CMD 中文乱码
**解决方案：**
```cmd
# 设置 CMD 代码页
chcp 65001
```

### 9. 自动化设置脚本

#### 创建设置脚本
```powershell
# setup-utf8.ps1
Write-Host "设置 Windows 终端 UTF-8 编码..." -ForegroundColor Yellow

# 设置 PowerShell 编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 设置环境变量
$env:LANG = "zh_CN.UTF-8"
$env:LC_ALL = "zh_CN.UTF-8"

# 设置 CMD 代码页
cmd /c "chcp 65001"

Write-Host "UTF-8 编码设置完成！" -ForegroundColor Green
Write-Host "LANG: $env:LANG"
Write-Host "LC_ALL: $env:LC_ALL"
```

## 总结

通过以上设置，可以确保：
1. **终端正确显示中文字符**
2. **Node.js 应用程序正确处理中文**
3. **语音播放功能正常工作**
4. **避免编码相关的错误**

建议按照以下顺序进行设置：
1. 系统级编码设置
2. 终端编码设置
3. 应用程序编码设置
4. 验证和测试
