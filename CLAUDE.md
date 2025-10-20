# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `pnpm dev` - Start development server for the Vue frontend
- `pnpm build` - Build desktop application without type checking
- `pnpm build:with-types` - Build desktop application with type checking (recommended)
- `pnpm preview` - Preview the built application

### Testing
- `pnpm test:unit` - Run unit tests with Vitest
- `pnpm test:e2e` - Run end-to-end tests with Playwright

### Code Quality
- `pnpm lint` - Lint and fix code with ESLint
- `pnpm format` - Format code with Prettier

### Dependencies
- `pnpm postinstall` - Install Electron app dependencies

## Architecture Overview

This is an Electron-based RPA (Robotic Process Automation) application built with Vue 3, TypeScript, and Playwright for browser automation.

### Key Architecture Components

#### Main Process (Electron)
- **Main entry**: `electron/main.ts` - Creates browser windows, handles IPC, manages application lifecycle
- **Automation Controller**: `electron/automation-controller.ts` - Core browser automation using Playwright
- **Database Service**: `electron/database.ts` - SQLite database for storing flow configurations
- **Task Scheduler**: `electron/scheduler.ts` - Manages scheduled task execution
- **Recorder Service**: Core recording functionality for capturing user interactions

#### Renderer Process (Vue 3)
- **Flow Designer**: `src/views/designer/index.vue` - Visual flow editor using LogicFlow library
- **Node Configuration Components**: `src/components/node-configs/` - UI for configuring different node types
- **Task Management**: `src/views/tasks/` - Task scheduling and management interface
- **Home Dashboard**: Statistics and overview of automation processes

#### Core Node Types
The application supports various automation node types:
- **Browser**: Navigate, open/close browser instances
- **Click**: Element clicking with selector support
- **Input**: Text input and form filling
- **Extract**: Data extraction from web pages
- **Keyboard/Mouse**: Keyboard shortcuts and mouse operations
- **Screenshot**: Capture screenshots
- **Export**: Export data to various formats (Excel, CSV, PDF, Word)
- **Control Flow**: Conditions, loops for complex automation logic

#### Database Schema
Uses SQLite for storing:
- Flow configurations (JSON format)
- Task schedules and execution history
- User settings and preferences

#### IPC Communication
Extensive IPC handlers in `electron/main.ts` for:
- Flow execution (`flow:start`, `flow:stop`)
- Database operations (`save-configuration`, `get-all-configurations`)
- File system operations (`fs:writeFile`, `dialog:showSaveDialog`)
- Browser automation (`open-browser`, `element:startPicker`)
- Task scheduling (`scheduler:*`)

### Technology Stack
- **Frontend**: Vue 3.4.0, Element Plus 2.5.0, TailwindCSS 3.4.1
- **Backend**: Electron 28.0.0, Playwright 1.41.0 (browser automation)
- **Database**: SQLite with Better-SQLite3
- **Flow Editor**: LogicFlow for visual flow design
- **State Management**: Pinia 2.1.0
- **Build Tool**: Vite 5.0.12
- **Language**: TypeScript 5.3.3

## Development Notes

### Browser Automation
The application uses Playwright for browser automation. The automation controller manages browser instances and supports both headless and headed modes. Element selection is handled through a custom element picker that injects scripts into web pages.

### Flow Execution
Flows are executed by the FlowExecutor which processes nodes sequentially, handling control flow (conditions, loops) and maintaining execution context between nodes.

### Database Management
Database path can be configured by users. The application handles database migrations and provides data import/export functionality.

### Intelligent Recording
The application features an intelligent recording system that can capture user interactions and automatically generate automation flows.

## File Structure Significance
- `src/types/node-config.ts` - Central type definitions for all node configurations
- `src/utils/flow-executor.ts` - Core flow execution engine
- `electron/automation-controller.ts` - Browser automation implementation
- `src/components/node-configs/` - Individual node configuration UI components