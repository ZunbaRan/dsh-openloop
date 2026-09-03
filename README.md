# dsh-openloop

OpenLoop 插件家族 —— 把 [DeepSeek Harness](https://www.npmjs.com/package/@deepseek-ai/dsh)（DSH）改造成 **Agent Native 产品底座**的实验场。

> 北极星（用户愿景）：不是「传统 SaaS 先建好、再融入 Agent 能力」，而是**产品本身就是 Agent**。DSH 对插件有**解读、调用、改动**权——插件是 Agent 可读写的对象，不是静态资产。

## 它是什么

一组可独立安装的 DSH 插件（pnpm monorepo），围绕三条能力主线演进：

1. **可视化输出**（panels / artifact / dock）——Agent 把任意数据变成任意展示，用户把任意展示组装成自己的工作台
2. **MCP 生态对接**（mcp 家族）——第三方包 = 一个实现 MCP Apps 2.0 的 server，DSH 是它的 client + 容器
3. **本地应用后端**（app）——PocketBase 底座的受控门面，支撑「用户用 Agent 开发自己的组件」

## 包矩阵

| 包 | 版本 | 说明 |
|---|---|---|
| `@openloop/dsh-base` | 0.4.7 | 底座：design token、设置页、runtime 资产、fetch 代理 |
| `@openloop/dsh-panels` | 0.5.5 | 26 预设组件 + panelFile + **Python codegen**（Agent 写代码生成 UI）+ 数据驱动模式 |
| `@openloop/dsh-html-artifact` | 0.5.3 | 三档沙箱 runtime（static / scripts / network）+ fetch bridge + 预置库（pico / chartjs / react18） |
| `@openloop/dsh-dock` | 0.9.12 | OCIX Workbench 复刻：react-grid-layout 引擎、嵌入式面板、与 better-sidebar 共存 |
| `@openloop/dsh-app` | 0.5.10 | 本地应用后端：PocketBase 子进程生命周期 + 受控 facade + `app_backend` 工具 |
| `@openloop/dsh-mcp` | 0.2.9 | MCP bundle 安装入口（多作用域 mcp.json + 设置页） |
| `@openloop/dsh-mcp-runtime` | 0.3.3 | 每 server 一条共享连接的 runtime + admin 路由 + App 资源网关（authority token 签发） |
| `@openloop/dsh-mcp-tools` | 0.1.7 | MCP 工具到 DSH 工具表的投影（含 Code Mode presentation 桥） |
| `@openloop/dsh-mcp-apps` | 0.1.16 | MCP Apps 客户端：沙箱 iframe + 官方 AppBridge（size / displayMode / readResource / callTool） |
| `@openloop/dsh-show-widget` | 0.2.5 | 流内超轻量可视化讲解卡（独立设计系统，刻意不迁移 OCIX token） |
| `@openloop/dsh-visual-declarative` | 0.2.5 | 早期声明式可视化实验（**待退役**） |
| `fixtures/mcp-app-server` | — | 本地测试 fixture（不发布） |

## 架构原则（踩坑沉淀）

- **插件是 Agent 可读写的对象**：①源码 / skill 可读性优先 ②skill 即 API 文档 ③错误消息面向 Agent（可自修正闭环）④能力分层 opt-in（static / scripts / network 三档）
- **MCP server 是可选外设，DSH 是宿主**：某个 server 连不上只表示那一组工具暂时没有，绝不拖死 `dsh web` 进程（启动容错贯穿 runtime → tools 两层）
- **沙箱是第三方代码的唯一 surface**：opaque-origin iframe + host 生成的 CSP；凭据归 server 自管，永不过 DSH
- **cordis apply 必须同步**；跨插件通信用 window 直通桥（client 侧动态 inject 回调真机不触发）
- **每包 client 入口懒 require 外部依赖** + `DependencyMissing` 降级条（依赖包被禁用不炸整页）
- **持久化数据驱动组件必须有错误边界**（TileErrorBoundary）——坏 tile 数据会复现成永久崩溃循环

## 开发

```bash
pnpm install          # 安装 workspace 依赖
pnpm check            # 全部包：typecheck + vitest + build
node scripts/pack-all.mjs   # 打包全部 tarball 到 dist/
```

单包检查：

```bash
cd packages/<name> && pnpm check
```

## 发布纪律

1. `pnpm check`（**必须含 build**——历史事故：跳过 check 直接 pack 发出过旧 bundle）
2. bump 版本（改动包 + peer 声明它的 bundle 包）
3. `node scripts/pack-all.mjs`
4. 双 profile 安装（**绝对路径 tarball**；同版本迭代必须先 remove 再 add 绕 pnpm 缓存；要覆盖包 + 全部 workspace 依赖的 tarball）
5. 重启 web 实例真机验证

```bash
pnpm remove @openloop/dsh-<pkg> && pnpm add file:/abs/path/dist/openloop-dsh-<pkg>-<ver>.tgz
```

## 安装到 DSH

以 web profile 为例（tarball 来自 `dist/`）：

```bash
cd $DSH_HOME/profiles/web
pnpm add file:<repo>/dist/openloop-dsh-base-0.4.4.tgz \
         file:<repo>/dist/openloop-dsh-panels-0.4.0.tgz \
         # ... 其余同家族 tarball
```

然后 profile 的 `package.json` → `dsh.profile.bundles` 数组里加包名，重启 `dsh web`。

## 测试

- 每包 vitest 单测（假 runtime / 假 factory，无真网络）
- `packages/panels/python/`：codegen Python 库的契约单测（contracts.py / widgets.py）
- 真机验收：web 实例 + agent-browser 覆盖 client bundle 激活路径（headless 覆盖不了）

## 路线图（2026-08 拍板）

**当前主线 = DSH 插件生态（openloop 家族）+ OCIX 设计迁移**。进行中：

- **方向 1 · 第三方包协议 v2**：复用 MCP Apps 2.0 作协议底座。connect = initialize 握手 + listTools；render = `readResource` 渲染时取资源（refresh 端点 + authority token 已就绪）；API = 沙箱内 AppBridge 回环 callTool。第三方唯一 surface = HTML 沙箱；panel-widget（预设拼接）退出第三方协议、保留为内部 codegen 体系
- **方向 2 · 本地开发后端**：`@openloop/dsh-app`（PocketBase MVP 已落地），既有 JSON 资源（dock board / panels localStorage）迁移插件 SQLite

历史轨道（openchamber / opencode fork）已暂停归档，OCIX 设计资产（Style v2、构图纪律）作为本仓库视觉体系的迁移来源。

## 目录结构

```
packages/          # 11 个插件包（见包矩阵）
fixtures/          # 本地测试 fixture（mcp-app-server）
scripts/pack-all.mjs
docs/              # 设计文档（DOCK_DESIGN / PANELS_CODEGEN_DESIGN / ARTIFACT_V2_DESIGN / APP_PLATFORM_DESIGN / DIRECTION1_PACK_PROTOCOL）
dist/              # 打包产物（gitignore）
```

## 设计文档索引

- `docs/DOCK_DESIGN.md` — dock 布局引擎与 better-sidebar 共存方案
- `docs/PANELS_CODEGEN_DESIGN.md` — Python codegen 通道设计
- `docs/ARTIFACT_V2_DESIGN.md` — artifact 三档 runtime 设计
- `docs/APP_PLATFORM_DESIGN.md` — 应用平台设计基线（方向 1/2 + Dock 2.0 中枢）
- `docs/DIRECTION1_PACK_PROTOCOL.md` — 第三方包协议（v1 草案，v2 重写中）
