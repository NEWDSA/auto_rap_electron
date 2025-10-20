# 第三方验证码识别使用指南

本指南介绍如何在Auto Rap中使用第三方验证码识别功能，实现自动化流程中的验证码处理。

## 功能概述

Auto Rap集成了多种第三方验证码识别服务，支持：

- **多种服务商**：百度、腾讯、阿里云、有道、京峰、图图等
- **多种验证码类型**：普通文字、点击验证、滑动验证、旋转验证、选择验证
- **多种获取方式**：元素截图、页面截图、上传图片
- **智能重试机制**：识别失败自动重试，支持人工介入
- **自动输入功能**：识别成功后自动填入验证码输入框

## 支持的服务商

### 1. 百度OCR (推荐)
- **服务商代码**：`baidu`
- **所需参数**：API Key、Secret Key
- **支持类型**：普通文字验证码
- **准确率**：高
- **价格**：相对便宜

### 2. 腾讯云OCR
- **服务商代码**：`tencent`
- **所需参数**：API Key、Secret Key
- **支持类型**：普通文字验证码
- **准确率**：高
- **价格**：中等

### 3. 阿里云OCR
- **服务商代码**：`aliyun`
- **所需参数**：API Key、Secret Key
- **支持类型**：普通文字验证码
- **准确率**：高
- **价格**：中等

### 4. 专业验证码识别服务
- **有道智云**：`youdao`
- **京峰验证码**：`jingfeng`
- **图图验证码**：`tutu`
- **自定义API**：`custom`

## 使用方法

### 方法一：AI助手生成流程

1. **打开AI助手**
   - 在流程设计器中点击"AI助手"按钮
   - 配置AI服务（OpenAI、Claude等）

2. **描述验证码处理需求**
   ```
   请帮我创建一个登录流程：
   1. 打开登录页面 https://example.com/login
   2. 输入用户名和密码
   3. 识别验证码并自动输入
   4. 点击登录按钮
   ```

3. **AI自动生成包含验证码识别的流程**
   - AI会自动添加验证码识别节点
   - 包含合适的参数配置
   - 可以进一步手动调整

### 方法二：手动添加验证码节点

1. **添加验证码识别节点**
   - 在流程设计器中拖拽"验证码识别"节点
   - 放置在需要处理验证码的位置

2. **配置基础参数**
   ```
   服务商：百度OCR
   API Key：your_api_key
   Secret Key：your_secret_key
   ```

3. **配置验证码获取**
   ```
   获取方式：元素截图
   验证码选择器：#captcha-image
   验证码类型：普通文字
   ```

4. **配置结果处理**
   ```
   结果变量：captcha_result
   输入框选择器：#captcha-input
   自动输入：是
   ```

## 配置参数详解

### 基础配置
- **provider**：服务商选择
- **apiKey**：API密钥（必填）
- **secretKey**：API密钥（部分服务商需要）
- **apiUrl**：自定义API地址（custom服务商时使用）

### 验证码获取
- **captchaSource**：获取方式
  - `element`：元素截图（推荐）
  - `screenshot`：页面截图
  - `upload`：上传图片
- **captchaSelector**：验证码元素选择器
- **screenshotType**：截图类型（viewport/fullpage/custom）
- **x, y, width, height**：自定义截图区域

### 验证码类型
- **captchaType**：验证码类型
  - `normal`：普通文字验证码
  - `click`：点击验证码
  - `slide`：滑动验证码
  - `rotate`：旋转验证码
  - `select`：选择验证码

### 结果处理
- **resultVariable**：结果存储变量名
- **inputSelector**：验证码输入框选择器
- **autoInput**：是否自动输入识别结果
- **timeout**：识别超时时间（秒）
- **retryCount**：识别失败重试次数
- **onFailure**：识别失败处理方式
  - `stop`：停止流程
  - `continue`：继续执行
  - `manual`：人工处理

### 高级选项
- **saveImage**：是否保存验证码图片
- **imagePath**：图片保存路径

## 使用示例

### 示例1：简单登录验证码

```javascript
// AI助手描述
"请识别登录页面的验证码，验证码图片选择器是 #captcha-img，输入框选择器是 #captcha-code"

// 生成的节点配置
{
  "type": "captcha",
  "properties": {
    "provider": "baidu",
    "apiKey": "your_api_key",
    "secretKey": "your_secret_key",
    "captchaSource": "element",
    "captchaSelector": "#captcha-img",
    "captchaType": "normal",
    "inputSelector": "#captcha-code",
    "autoInput": true,
    "resultVariable": "captcha_result"
  }
}
```

### 示例2：复杂验证码处理

```javascript
// AI助手描述
"使用腾讯云识别滑动验证码，失败后人工处理，保存验证码图片用于调试"

// 生成的节点配置
{
  "type": "captcha",
  "properties": {
    "provider": "tencent",
    "apiKey": "your_api_key",
    "secretKey": "your_secret_key",
    "captchaSource": "screenshot",
    "captchaType": "slide",
    "timeout": 60,
    "retryCount": 3,
    "onFailure": "manual",
    "saveImage": true,
    "imagePath": "./debug/captcha/"
  }
}
```

## 最佳实践

### 1. 服务商选择
- **普通文字验证码**：推荐百度OCR，性价比高
- **复杂验证码**：推荐专业验证码识别服务
- **高准确率要求**：可配置多个服务商备用

### 2. 参数优化
- **超时时间**：根据验证码复杂度调整（10-60秒）
- **重试次数**：建议2-3次，避免过度消耗
- **失败处理**：重要流程建议使用"manual"人工处理

### 3. 调试技巧
- **开启图片保存**：便于分析识别失败原因
- **使用变量存储**：便于后续流程使用识别结果
- **添加等待节点**：确保验证码图片完全加载

### 4. 成本控制
- **合理设置重试次数**：避免无效重试
- **选择合适的服务商**：根据预算和准确率要求
- **批量处理时注意频率限制**

## 故障排除

### 常见问题

1. **识别失败率高**
   - 检查验证码图片是否清晰
   - 尝试调整截图区域
   - 更换服务商

2. **API调用失败**
   - 检查API密钥是否正确
   - 确认账户余额充足
   - 检查网络连接

3. **自动输入失败**
   - 检查输入框选择器是否正确
   - 确认输入框可见且可交互
   - 添加适当的等待时间

### 调试方法

1. **开启详细日志**
   ```javascript
   console.log('验证码识别开始')
   console.log('识别结果:', result)
   ```

2. **保存调试图片**
   ```javascript
   saveImage: true,
   imagePath: './debug/captcha/'
   ```

3. **使用测试模式**
   - 先在简单页面测试配置
   - 确认参数正确后应用到实际流程

## 安全注意事项

1. **API密钥保护**
   - 不要在代码中硬编码密钥
   - 使用环境变量或配置文件
   - 定期更换密钥

2. **数据隐私**
   - 验证码图片可能包含敏感信息
   - 及时清理保存的图片文件
   - 选择可信的服务商

3. **合规使用**
   - 遵守目标网站的使用条款
   - 避免过于频繁的请求
   - 尊重网站的反爬虫机制

## 总结

第三方验证码识别功能为Auto Rap提供了强大的自动化能力，通过合理配置和使用，可以大大提高自动化流程的成功率和用户体验。建议根据实际需求选择合适的服务商和参数配置，并在使用过程中不断优化和调整。