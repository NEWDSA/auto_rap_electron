# Auto RAP

基于 Vue3 + Electron + Element Plus 开发的自动化 RPA 工具，支持浏览器自动化、数据提取、流程编排等功能。

## 功能特性

- 🎯 可视化流程编排
- 🌐 浏览器自动化操作
- 📊 数据提取与处理
- 📝 多种数据导出格式（Excel、CSV、PDF、Word）
- 🔄 定时任务调度
- 🎨 美观的用户界面
- 🔍 智能元素选择器
- 📸 截图功能
- ⌨️ 键盘和鼠标操作模拟
- 🔄 循环和条件控制

## 开发环境要求

- Node.js >= 20.11.0
- pnpm >= 8.15.0
- Windows 10/11 或 macOS 10.15+

## 安装依赖

```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install

# 安装 Electron 依赖
pnpm postinstall
```

## 开发

```bash
# 启动开发服务器
pnpm dev

# 启动 electron 开发环境
pnpm electron:dev
```

## 构建

```bash
# 构建前端
pnpm build

# 构建桌面应用（包含类型检查）
pnpm build:with-types

# 构建桌面应用（不包含类型检查）
pnpm build
```

## 测试

```bash
# 单元测试
pnpm test:unit

# E2E测试
pnpm test:e2e
```

## 代码规范

```bash
# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

## 目录结构

```
auto_rap/
├── electron/           # Electron 主进程
│   ├── main.ts        # 主进程入口
│   └── automation-controller.ts  # 自动化控制器
├── src/               # 前端源码
│   ├── components/    # 公共组件
│   ├── views/         # 页面视图
│   ├── store/         # 状态管理
│   ├── router/        # 路由配置
│   ├── utils/         # 工具函数
│   ├── api/           # API 接口
│   └── assets/        # 静态资源
├── core/              # 核心功能模块
├── config/            # 配置文件
└── tests/             # 测试用例
```

## 技术栈

- Vue 3.4.0
- Electron 28.0.0
- Element Plus 2.5.0
- Playwright 1.41.0
- TypeScript 5.3.3
- Vite 5.0.12
- Pinia 2.1.0
- TailwindCSS 3.4.1

## 打包说明

项目使用 electron-builder 进行打包，支持以下平台：

- Windows (x64)
- macOS (x64, arm64)

打包配置位于 `electron-builder.json`。

## 许可证

ISC 