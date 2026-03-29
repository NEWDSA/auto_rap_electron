# Windows 10 中文语音配置指南

## 参考文档
基于 [shenfan19/say.js](https://github.com/shenfan19/say.js/blob/master/Win10_PC_desktop_Chinese_reading.md) 的 Windows 10 PC 桌面中文朗读解决方案。

## 中文语音乱码问题解决方案

### 1. 系统级配置

#### 检查 Windows 语音设置
1. 打开 **控制面板** → **语音识别**
2. 点击 **文本到语音转换** 选项卡
3. 在 **语音选择** 下拉菜单中，确保有中文语音选项：
   - Microsoft Huihui Desktop - Chinese (Simplified, PRC)
   - Microsoft Yaoyao Desktop - Chinese (Simplified, PRC)
   - Microsoft Kangkang Desktop - Chinese (Simplified, PRC)

#### 安装中文语音包
1. 打开 **设置** → **时间和语言** → **语言**
2. 点击 **添加语言**，选择 **中文（简体）**
3. 安装完成后，点击 **中文（简体）** → **选项**
4. 确保 **语音** 组件已下载并安装

### 2. 编码问题解决

#### 检查系统编码
```bash
# 检查系统区域设置
chcp
# 应该显示：活动代码页: 936 (简体中文 GBK)
```

#### 设置正确的编码
```javascript
// 在 Node.js 中设置正确的编码
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';
```

### 3. say.js 模块配置

#### 正确的语音参数
```javascript
const say = require('say');

// 中文语音播放配置
const chineseVoiceOptions = {
  voice: 'Microsoft Huihui Desktop - Chinese (Simplified, PRC)',
  speed: 1.0
};

// 播放中文文本
say.speak('你好，世界', chineseVoiceOptions.voice, chineseVoiceOptions.speed, (err) => {
  if (err) {
    console.error('中文语音播放失败:', err);
  } else {
    console.log('中文语音播放成功');
  }
});
```

### 4. 常见问题解决

#### 问题1：中文显示为乱码
**解决方案：**
- 确保系统区域设置为中文
- 检查文件编码为 UTF-8
- 设置正确的环境变量

#### 问题2：找不到中文语音
**解决方案：**
- 安装 Microsoft Speech Platform Runtime
- 下载并安装中文语音包
- 重启应用程序

#### 问题3：语音播放失败
**解决方案：**
- 检查 Windows 语音服务是否运行
- 尝试不同的中文语音选项
- 使用系统默认语音作为回退

### 5. 测试验证

#### 创建测试脚本
```javascript
// test-chinese-encoding.js
const say = require('say');

// 设置正确的编码
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';

// 测试中文语音
const testText = '你好，这是一个中文语音测试';
const chineseVoices = [
  'Microsoft Huihui Desktop - Chinese (Simplified, PRC)',
  'Microsoft Yaoyao Desktop - Chinese (Simplified, PRC)',
  'Microsoft Kangkang Desktop - Chinese (Simplified, PRC)'
];

chineseVoices.forEach((voice, index) => {
  console.log(`测试语音 ${index + 1}: ${voice}`);
  
  say.speak(testText, voice, 1.0, (err) => {
    if (err) {
      console.error(`语音 ${voice} 失败:`, err);
    } else {
      console.log(`语音 ${voice} 成功`);
    }
  });
});
```

### 6. 环境变量配置

#### 在应用程序启动时设置
```javascript
// 在 main.ts 或应用程序入口处添加
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
```

### 7. 系统服务检查

#### 确保语音服务运行
1. 打开 **服务** (services.msc)
2. 检查以下服务是否运行：
   - Windows Audio
   - Windows Audio Endpoint Builder
   - Speech Runtime

### 8. 故障排除步骤

1. **重启语音服务**
   ```bash
   net stop "Windows Audio"
   net start "Windows Audio"
   ```

2. **重新注册语音组件**
   ```bash
   regsvr32 /s sapi.dll
   regsvr32 /s speechux.dll
   ```

3. **清理并重新安装语音包**
   - 卸载现有中文语音包
   - 重新下载并安装
   - 重启系统

## 总结

基于 [shenfan19/say.js](https://github.com/shenfan19/say.js/blob/master/Win10_PC_desktop_Chinese_reading.md) 的解决方案，主要关注：

1. **系统级配置**：确保 Windows 10 正确配置中文语音
2. **编码问题**：解决中文乱码和编码问题
3. **语音包安装**：确保中文语音包正确安装
4. **环境变量**：设置正确的语言环境变量

这些步骤应该能够解决您遇到的中文语音播放问题。
