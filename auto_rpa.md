# RPA 付费下载接口系统开发文档

## 📌 项目背景

开发一个用于 **收费下载 RPA 工具** 的 API 接口服务，用户需要付费后才能下载该工具，整个流程包括账户注册、登录、支付、授权下载、支付记录保存、过期判断等完整的业务闭环。

## ✅ 支持平台

- **.NET 8（当前 LTS 稳定版）**
- **.NET Framework 4.8**（如需部署于传统 Windows 环境）

> 推荐以 `.NET 8 Web API` 为主开发，.NET Framework 可作为后备选择。

---

## 📐 模块设计

### 1. 用户模块

- 用户注册
- 用户登录（JWT）
- 用户信息查询（是否已购买/过期）

### 2. 支付模块

- 创建支付订单
- 支付回调接口
- 保存支付记录
- 设置下载授权有效期（如1年）

### 3. 下载模块

- 付费校验接口（校验 Token + 是否支付 + 是否在授权期内）
- 下载链接获取
- 下载次数限制（可选）

---

## 🧩 接口设计

### `POST /api/auth/register`

- 注册用户（用户名、邮箱、密码）
- 返回 JWT Token

---

### `POST /api/auth/login`

- 登录接口
- 返回 JWT Token

---

### `GET /api/payment/create`

- 创建支付订单
- 返回支付二维码/支付跳转链接（如微信、支付宝、Stripe）

---

### `POST /api/payment/notify`

- 支付平台回调
- 验证签名，更新用户购买状态、有效期等

---

### `GET /api/download/authorize`

- 检查当前用户是否有下载权限（已付费、未过期）

---

### `GET /api/download/file`

- 返回真实下载链接（加密或一次性有效）
- 必须验证 Token 和权限

---

## 🗃️ 数据模型设计

### User

| 字段 | 类型 | 描述 |
|------|------|------|
| Id | Guid | 主键 |
| Email | string | 邮箱 |
| PasswordHash | string | 密码 |
| Role | string | 默认 user |
| CreatedAt | DateTime | 注册时间 |

---

### PaymentRecord

| 字段 | 类型 | 描述 |
|------|------|------|
| Id | Guid | 主键 |
| UserId | Guid | 外键 |
| PaymentStatus | string | 支付状态 |
| PaymentPlatform | string | 支付平台 |
| Amount | decimal | 支付金额 |
| ExpireAt | DateTime | 下载授权到期时间 |
| CreatedAt | DateTime | 支付时间 |

---

## 🔐 技术要点

- 身份认证：JWT
- 支付集成：支付宝、微信支付、Stripe（根据目标用户地区选择）
- 文件防盗链处理：可通过签名 URL 或 CDN + 授权中间层处理
- 日志系统：记录用户行为、下载情况

---

## 🧪 测试建议

- 使用 Postman 完成接口联调
- 模拟支付回调进行测试
- 检查过期逻辑是否生效
- 文件下载权限逻辑验证

---

## 🚀 部署建议

- 后端部署于 Linux / Windows Server（Kestrel + Nginx / IIS）
- 数据库：SQL Server / PostgreSQL
- 文件下载服务：本地或云存储（如阿里 OSS、Azure Blob）

---

## 📄 License 管理建议

- 可以采用一次购买永久授权（有版本限制）
- 或设置时间限制（例如购买后一年内可下载）
- 可通过机器码绑定限制多次下载（可选功能）

---

## 🔄 后续扩展方向

- 支持订阅制（月付、年付）
- 下载记录统计报表
- 后台管理系统（用户列表、订单管理）

