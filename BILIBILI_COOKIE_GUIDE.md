# Bilibili Cookie 获取教程

## 错误 352 原因分析

您遇到的错误 `Request is rejected by server (352)` 是 Bilibili 的服务器拒绝请求错误，通常由以下原因导致：

1. **缺少有效的 Cookie**：Bilibili 要求登录状态才能下载高清视频
2. **Cookie 过期**：SESSDATA 等关键 Cookie 已过期
3. **IP 限制**：当前 IP 被 Bilibili 限制
4. **请求频率过高**：短时间内请求过多被服务器拒绝

## 获取 Bilibili Cookie 的方法

### 方法一：浏览器开发者工具获取（推荐）

1. **登录 Bilibili**
   - 打开浏览器，访问 https://www.bilibili.com
   - 确保已登录您的账号（会员账号可下载更高画质）

2. **打开开发者工具**
   - 按 `F12` 或右键点击页面选择"检查"
   - 切换到 "Application"（应用）或 "存储" 标签页

3. **查找 Cookie**
   - 在左侧选择 "Cookies" -> "https://www.bilibili.com"
   - 找到以下关键 Cookie：
     - `SESSDATA` - 最重要的登录凭证
     - `bili_jct` - CSRF 令牌
     - `DedeUserID` - 用户 ID
     - `DedeUserID__ckMd5` - 用户 ID 校验

4. **复制 Cookie 格式**
   - 将 Cookie 格式化为：`SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx`
   - 或直接复制所有 Cookie 的完整字符串

### 方法二：使用 Cookie 导出插件

1. 安装浏览器插件：
   - Chrome："EditThisCookie" 或 "Cookie-Editor"
   - Firefox："Cookie-Editor"

2. 导出 Cookie：
   - 登录 Bilibili 后点击插件图标
   - 选择导出为 Netscape 格式或 JSON 格式
   - 复制 SESSDATA 值

### 方法三：使用浏览器 Cookie 文件

1. **找到浏览器 Cookie 文件**：
   - Chrome：`C:\Users\用户名\AppData\Local\Google\Chrome\User Data\Default\Network\Cookies`
   - Edge：`C:\Users\用户名\AppData\Local\Microsoft\Edge\User Data\Default\Network\Cookies`

2. **在应用中设置**：
   - 在 VideoDownloadConfig.vue 的 Cookie 输入框中粘贴 Cookie 字符串
   - 格式示例：`SESSDATA=abcd1234efgh5678; bili_jct=xyz789`

## Cookie 格式说明

### 简化格式（推荐）
```
SESSDATA=你的SESSDATA值; bili_jct=你的bili_jct值
```

### 完整格式
```
SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx; DedeUserID__ckMd5=xxx; sid=xxx
```

## 常见问题解决

### 1. Cookie 无效
- **检查是否登录**：确保获取 Cookie 时已经登录
- **检查 Cookie 完整性**：确保包含 SESSDATA
- **重新获取**：Cookie 可能已过期，重新登录获取

### 2. 仍然提示 352 错误
- **降低画质**：先尝试下载 720P 或更低画质
- **更换 IP**：使用 VPN 或更换网络环境
- **等待一段时间**：可能是请求频率限制

### 3. 高清格式缺失
- **确认会员状态**：只有大会员才能下载 1080P+ 和 4K
- **检查视频权限**：部分视频有版权限制

## 测试步骤

1. 在应用中输入 Cookie
2. 选择一个测试视频（如：https://www.bilibili.com/video/BV16dPJznEEp/）
3. 点击"测试下载"按钮
4. 观察控制台输出

## 备用方案

如果 Cookie 方法仍然无效，可以尝试：

1. **使用代理/VPN**：更换网络环境
2. **降低请求频率**：增加下载间隔
3. **使用其他工具**：如 you-get、annie 等
4. **手动下载**：在浏览器中手动下载视频

## 注意事项

- Cookie 包含登录信息，请勿分享给他人
- SESSDATA 是关键 Cookie，必须包含
- 会员账号可以下载更高画质，但非会员也能下载 480P/720P
- 部分视频可能有地区限制或版权保护