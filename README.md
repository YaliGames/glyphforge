<div align="center">

# GlyphForge

<p align="center">
  <img src="public\logo.svg" style="width: 120px" />
</p>

### *AI 赋能的结构化写作工具*

---

**GlyphForge** 是一款专为创作者设计的 AI 辅助创意写作与世界观架构引擎。它通过结构化的数据管理模型与深度集成的 AI 协作链条，协助用户完成从宏观世界观构建到微观角色设定、情节大纲及正文创作的全流程。

项目基于 Electron + Vue 3 架构，旨在提供高性能、离线优先且可扩展的创作辅助环境。

[🚀 立即开始](docs/GETTING_STARTED.md) • [📖 文档](docs/INDEX.md) • [📝 画廊](docs/GALLERY.md)

</div>

## 主要特性

*   **结构化实体建模**：提供大纲、正文、角色、世界观维度及时间线的系统化管理。
*   **智能化 AI 协作面板**：内置高度集成的 AI 指令中心，实现上下文感知的精准生成与修改。
*   **自动化 Agent 工具链**：AI 可在授权下调用内部工具执行跨实体的逻辑检索、一致性检查及数据的自动更新。
*   **可视化关系管理**：集成 Vue Flow 引擎，支持以图形化方式直观构建与呈现复杂的人际关系与世界观架构。
*   **专业创作工作流**：支持 `.gfp` 专属项目文件关联，内置字段变更历史追踪，确保创作过程的安全与可回溯。

## 开发与编译指南

### 环境要求

*   Node.js >= 18.x
*   npm (或 pnpm / yarn)

### 基础开发流程

1.  **安装依赖**：
    ```powershell
    npm install
    ```
2.  **启动开发环境**：
    ```powershell
    npm run dev
    ```
    该命令将启动 Vite 预览并在相应的 Electron 窗口中加载。

### 构建发布

*   **构建 Web 静态资源**：
    ```powershell
    npm run build:web
    ```
*   **构建 Electron 安装包 (Debug)**：
    ```powershell
    npm run electron:build:dev
    ```
*   **构建 Electron 安装包 (Production)**：
    ```powershell
    npm run electron:build:prod
    ```
    构建产物将放置于 `release/` 目录中。

## 项目结构

```text
glyphforge/
├── electron/          # Electron 主进程与预加载脚本
├── src/
│   ├── core/          # 核心业务逻辑
│   ├── store/         # 实体数据管理与状态存储
│   ├── components/    # UI 视图组件
│   ├── composables/   # 通用交互与状态逻辑封装
│   ├── types/         # 类型定义与接口规范
│   └── views/         # 页面路由入口
└── public/            # 静态资源与图标
```
