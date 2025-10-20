# Auto RAP Electron 严格许可证系统使用指南

## 🎯 系统概述

这是一个企业级的严格许可证控制系统，确保只有获得授权的用户才能使用 Auto RAP Electron 应用。

### 🔒 严格控制特性

- ✅ **无许可证不能使用** - 应用启动时必须有有效许可证
- ✅ **试用需要授权** - 7天试用也需要管理员手动生成和授权
- ✅ **支持临时授权** - 可以生成1天临时授权
- ✅ **到期显示水印** - 许可证过期时显示"授权已到期"水印
- ✅ **到期后完全锁定** - 过期后应用完全不可用，直接显示激活页面
- ✅ **离线支持** - 缓存有效许可证用于离线验证

## 📋 许可证类型

| 类型 | 代码 | 描述 | 有效期 | 设备限制 | 功能特性 |
|------|------|------|--------|----------|----------|
| **试用版** | TRIAL | 需要管理员授权的试用 | 可配置(默认7天) | 1台 | 专业版所有功能 |
| **临时授权** | TEMP | 短期临时使用 | 1天 | 1台 | 基础功能 |
| **专业版** | PRO1 | 标准商业许可证 | 可配置(默认365天) | 1台 | 完整专业功能 |
| **企业版** | ENT1 | 高级商业许可证 | 可配置(默认365天) | 可配置 | 所有功能+团队协作 |

## 🛠️ 管理员操作指南

### 1. 启动许可证服务器

```bash
# 进入许可证系统目录
cd license-system

# 安装依赖（首次运行）
npm install

# 启动服务器
npm start
```

服务器将在 `http://localhost:3001` 运行。

### 2. 生成许可证

#### 生成试用许可证（需要手动授权）
```bash
# 生成7天试用许可证
node license-generator.js --trial --duration 7

# 生成3天试用许可证
node license-generator.js --trial --duration 3

# 输出示例：
# 许可证密钥: AR01-2025-TRIAL-A7B9-C3D5
```

#### 生成临时授权（1天）
```bash
# 生成1天临时授权
node license-generator.js --temp

# 输出示例：
# 许可证密钥: AR01-2025-TEMP-X1Y2-Z3W4
```

#### 生成专业版许可证
```bash
# 生成1年专业版许可证
node license-generator.js --type PRO1 --duration 365

# 生成6个月专业版许可证
node license-generator.js --type PRO1 --duration 180

# 输出示例：
# 许可证密钥: AR01-2025-PRO1-M5N6-P7Q8
```

#### 生成企业版许可证
```bash
# 生成1年企业版许可证（支持5台设备）
node license-generator.js --type ENT1 --duration 365 --devices 5

# 生成1年企业版许可证（支持10台设备）
node license-generator.js --type ENT1 --duration 365 --devices 10

# 输出示例：
# 许可证密钥: AR01-2025-ENT1-R9S0-T1U2
```

### 3. 同步许可证到服务器

```bash
# 将生成的许可证同步到服务器数据库
node sync-licenses.js

# 输出示例：
# ✅ 同步许可证: AR01-2025-PRO1-XXXX-XXXX
# 🎉 同步完成！同步了 3 个许可证
```

### 4. 验证许可证

```bash
# 验证许可证格式是否正确
node license-generator.js --validate AR01-2025-PRO1-XXXX-XXXX

# 输出示例：
# 许可证验证结果:
# 密钥: AR01-2025-PRO1-XXXX-XXXX
# 有效性: 有效
# 类型: 标准版
# 版本: 专业版
```

### 5. 管理工具

```bash
# 清空所有许可证数据
node clear-data.js --confirm

# 完全重置系统
node reset-system.js --confirm

# 批量生成许可证
node license-generator.js --batch 10 --type PRO1 --duration 365 --output licenses.json
```

## 👥 用户使用流程

### 1. 首次启动应用

1. **用户打开 Auto RAP Electron 应用**
2. **应用检查许可证** - 发现没有有效许可证
3. **显示激活页面** - 直接显示许可证输入界面（不是弹窗）
4. **用户无法使用应用** - 必须输入有效许可证才能继续

### 2. 激活许可证

1. **输入许可证密钥** - 在激活页面输入管理员提供的密钥
2. **系统验证许可证** - 连接服务器验证许可证有效性
3. **激活成功** - 许可证有效，进入应用主界面
4. **激活失败** - 显示错误信息，要求重新输入

### 3. 正常使用

1. **应用正常运行** - 用户可以使用所有授权功能
2. **定期检查** - 应用每分钟检查一次许可证状态
3. **功能控制** - 根据许可证类型启用相应功能
4. **状态显示** - 界面显示当前许可证状态和到期时间

### 4. 许可证过期处理

1. **即将过期提醒** - 过期前3天显示续费提醒
2. **过期后锁定** - 许可证过期后立即锁定应用
3. **显示水印** - 界面显示"授权已到期"水印
4. **要求重新激活** - 用户必须获得新的许可证才能继续使用

## 🌐 部署指南

### 开发环境部署

```bash
# 1. 启动许可证服务器
cd license-system
npm start

# 2. 启动 Electron 应用
cd auto_rap_electron
npm run dev
```

### 生产环境部署

#### 许可证服务器部署

```bash
# 使用 PM2 管理进程
npm install -g pm2
cd license-system
pm2 start license-server.js --name "license-server"
pm2 startup
pm2 save
```

#### Docker 部署

```bash
cd license-system
docker build -t license-system .
docker run -d -p 3001:3001 --name license-server license-system
```

#### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name license.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔧 技术集成

### 在 Vue 组件中使用

```vue
<template>
  <div id="app">
    <!-- 许可证守卫 - 自动处理许可证验证 -->
    <LicenseGuard>
      <!-- 你的应用内容 -->
      <router-view />
    </LicenseGuard>
  </div>
</template>

<script setup lang="ts">
import LicenseGuard from '@/components/LicenseGuard.vue'
</script>
```

### 编程方式检查许可证

```typescript
import LicenseManager from '@/utils/licenseManager'

// 验证许可证
const manager = LicenseManager.getInstance()
const result = await manager.validateLicense()

if (result.valid) {
  console.log('许可证有效')
  console.log('类型:', result.license.type)
  console.log('到期时间:', result.license.expiresAt)
} else {
  console.log('许可证无效:', result.error)
}

// 激活许可证
const activationResult = await manager.activateLicense('AR01-2025-PRO1-XXXX-XXXX')

// 检查功能权限
const hasAdvancedFeatures = manager.hasFeature('advanced_recording')

// 记录使用情况
await manager.recordUsage('task_executed')
```

### 功能权限控制

```vue
<template>
  <div>
    <!-- 基础功能：所有版本可用 -->
    <button @click="basicFunction">基础录制</button>
    
    <!-- 高级功能：需要专业版或企业版 -->
    <button v-if="hasAdvancedFeatures" @click="advancedFunction">
      AI 生成脚本
    </button>
    
    <!-- 企业功能：仅企业版可用 -->
    <button v-if="hasEnterpriseFeatures" @click="enterpriseFunction">
      团队协作
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLicense } from '@/composables/useLicense'

const { hasFeature } = useLicense()

const hasAdvancedFeatures = computed(() => 
  hasFeature('advanced_recording') || hasFeature('ai_generation')
)

const hasEnterpriseFeatures = computed(() => 
  hasFeature('team_collaboration')
)
</script>
```

## 📊 许可证密钥格式

### 标准格式
```
AR01-YYYY-TYPE-XXXX-XXXX
```

- **AR01**: 产品标识（Auto RAP 01）
- **YYYY**: 年份（如 2025）
- **TYPE**: 许可证类型（TRIAL, TEMP, PRO1, ENT1）
- **XXXX-XXXX**: 随机码和校验码

### 示例密钥
```
AR01-2025-TRIAL-A7B9-C3D5  # 试用版
AR01-2025-TEMP-X1Y2-Z3W4   # 临时授权
AR01-2025-PRO1-M5N6-P7Q8   # 专业版
AR01-2025-ENT1-R9S0-T1U2   # 企业版
```

## 🚨 故障排除

### 常见问题

#### Q: 应用启动后直接显示激活页面？
A: 这是正常行为。没有有效许可证时，应用会直接显示激活页面要求输入许可证。

#### Q: 许可证验证失败？
A: 
1. 检查许可证服务器是否运行（`http://localhost:3001`）
2. 确认许可证已同步到服务器（`node sync-licenses.js`）
3. 验证许可证格式（`node license-generator.js --validate <KEY>`）

#### Q: 许可证过期后如何处理？
A: 
1. 生成新的许可证
2. 同步到服务器
3. 用户重新激活

#### Q: 离线模式下如何使用？
A: 应用会缓存有效的许可证信息，在网络断开时使用缓存验证。

### 调试模式

在开发环境中启用调试：

```typescript
// 在 licenseManager.ts 中添加
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log('License validation result:', result)
}
```

### 日志查看

```bash
# 查看服务器日志
pm2 logs license-server

# 查看应用日志
# 在浏览器开发者工具的 Console 中查看
```

## 📈 使用统计

### 服务器 API

```bash
# 获取许可证统计
curl http://localhost:3001/api/license/stats/AR01-2025-PRO1-XXXX-XXXX

# 健康检查
curl http://localhost:3001/api/health
```

### 响应示例

```json
{
  "license": {
    "key": "AR01-2025-PRO1-XXXX-XXXX",
    "type": "专业版",
    "createdAt": "2025-09-13T06:00:00.000Z",
    "expiresAt": "2026-09-13T06:00:00.000Z",
    "maxDevices": 1,
    "devices": ["DEVICE_ID_123"],
    "status": "active"
  },
  "usage": {
    "activations": 5,
    "executions": 150,
    "lastUsed": "2025-09-13T12:00:00.000Z"
  }
}
```

## 🔐 安全考虑

### 服务器安全
1. **HTTPS 部署** - 生产环境使用 HTTPS
2. **防火墙配置** - 限制服务器访问
3. **定期备份** - 备份许可证数据库
4. **监控日志** - 监控异常访问

### 客户端安全
1. **密钥保护** - 不在客户端硬编码密钥
2. **设备绑定** - 许可证与设备ID绑定
3. **缓存加密** - 加密存储缓存的许可证信息
4. **定期验证** - 定期重新验证许可证

## 📞 技术支持

### 管理员操作
- 生成许可证：使用 `license-generator.js`
- 管理服务器：使用 PM2 或 Docker
- 监控系统：查看日志和统计信息

### 用户支持
- 激活问题：检查网络连接和许可证格式
- 功能限制：确认许可证类型和权限
- 过期处理：联系管理员获取新许可证

---

## 🎉 总结

现在你拥有一个企业级的严格许可证控制系统：

✅ **完全控制** - 所有授权都需要管理员操作  
✅ **用户友好** - 直接显示激活页面，无需复杂操作  
✅ **功能完整** - 支持多种许可证类型和灵活配置  
✅ **安全可靠** - 服务器验证，离线缓存，设备绑定  
✅ **易于管理** - 简单的命令行工具和清晰的文档  

用户必须获得你的授权才能使用 Auto RAP Electron 应用！🚀