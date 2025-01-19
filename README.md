# Auto RAP

自动化RPA工具，基于Vue3 + Electron + Element Plus开发。

## 开发环境要求

- Node.js >= 20.11.0
- pnpm >= 8.15.0

## 安装依赖

```bash
pnpm install
```

## 开发

```bash
# 启动开发服务器
pnpm dev

# 启动electron开发环境
pnpm electron:dev
```

## 构建

```bash
# 构建前端
pnpm build

# 构建桌面应用
pnpm electron:build
```

## 测试

```bash
# 单元测试
pnpm test

# E2E测试
pnpm test:e2e
```

## 目录结构

```
auto_rap/
├── electron/           # Electron主进程
├── src/               # 前端源码
│   ├── components/    # 公共组件
│   ├── views/         # 页面视图
│   ├── store/         # 状态管理
│   ├── router/        # 路由配置
│   ├── utils/         # 工具函数
│   ├── api/           # API接口
│   └── assets/        # 静态资源
├── core/              # 核心功能模块
├── config/            # 配置文件
└── tests/             # 测试用例
```

## 许可证

MIT 