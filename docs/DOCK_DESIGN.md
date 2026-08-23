# OpenLoop Dock（@openloop/dsh-dock）设计 v1

> **状态**：方案 A（独立 push 列）已拍板，2026-08-23 开工
> **定位**：OCIX workbench 的 DSH 复刻——panels 面板与 html artifact 可 **pin 到右侧 dock**，12 列网格内自由拖放/缩放/排列，Board 持久化。与 better-sidebar 空间共存、零 API 对接。

## 1. 冲突规避（核心工程决策）

| 冲突点 | 规避手段 |
|---|---|
| `#root` 的右侧挤压 | better-sidebar 用 `margin-right`，**我们用 `padding-right`**——天然叠加互不覆盖（本次调研发现的最干净技巧） |
| 与 better-sidebar 空间错位 | 空间探测（非 API 对接）：`querySelector('[data-dsh-better-sidebar]')` 存在 → dock 定位其左侧（读其 rect 宽度，MutationObserver + resize 跟踪）；不存在 → 贴屏幕右缘。探测失败优雅降级为贴右缘 |
| DOM 挂载 | host div 挂 body（`data-openloop-dock`），各挂各的 |
| z-index | dock 用独立高值段（2147483000+），不与其冲突 |

## 2. 数据模型（移植 OCIX，简化）

```ts
interface DockTile {
  tileId: string
  source: { kind: 'panel'; meta: PanelMeta } | { kind: 'artifact'; meta: ArtifactMeta }
  layout: { column: number; row: number; columns: number; rows: number }  // 12 列网格
  origin: { sessionId?: string; toolCallId?: string } | null              // 溯源
  createdAt: string
}
interface DockBoard { version: 1; tiles: DockTile[] }   // localStorage 持久化（openloop.dock.board.v1）
```

- panel tile 快照语义：pin 时拷贝 PanelMeta（panel + resolved 数据快照）——OCIX 的 snapshot 同款（artifact 本就静态，天然快照）
- 布局引擎：`clamp`（宽 2-12 列 / 高 2-24 行）、`compact`（下落紧凑）、`findNearestSlot`（拖放吸附）、`swap`（同格交换）——移植 OCIX workbench-layout 算法
- 交互：@dnd-kit（Pointer + Touch 传感器，DragOverlay 拖影，拖角手柄 resize）

## 3. 架构（第五个 openloop 包）

```
@openloop/dsh-dock
├── client 半
│   ├── DockHost        body portal + padding-right push（--openloop-dock-width 变量）+ 空间探测
│   ├── BoardView       12 列网格 + dnd-kit + resize
│   ├── TileView        panel tile → PanelCard（external @openloop/dsh-panels/client）
│   │                   artifact tile → ArtifactFrame（external @openloop/dsh-html-artifact/client）
│   ├── dockService     ctx.provide('openloop-dock/client')：pin(tile) / remove(tileId) / toggle()
│   └── 开关            右上角 dock 开关按钮（或设置页 section）
├── server 半           无（v1 全客户端；面板持久化唤起复用 panels store 不引入）
└── pin 入口（改动 panels/artifact 两包，各 ~10 行）
    ├── PanelCard header  Pin 按钮 → 可选 inject openloop-dock/client → pinPanel(meta)
    └── ArtifactCard header 同款 → pinArtifact(meta)
    （dock 未安装时按钮自动隐藏——可选注入天然降级）
```

- external 链：`@openloop/dsh-base/client` + `@openloop/dsh-panels/client` + `@openloop/dsh-html-artifact/client`（跨插件 client 模块引用，base 已验证该机制）
- **panels/artifact 需小改**：client index export PanelCard/ArtifactFrame 组件 + header 注入 Pin 按钮（可选注入 dock service）

## 4. 实施步骤

| 步骤 | 内容 | 依赖 |
|---|---|---|
| D1 | dock 包骨架（package/tsdown/cordis.patch/verify，参照 artifact 包） | — |
| D2 | DockHost 挂载层：portal + padding-right push + better-sidebar 空间探测 | D1 |
| D3 | 布局引擎 + Board store（localStorage）+ 单测 | D1 |
| D4 | BoardView 网格 + dnd-kit 拖放/缩放 + TileView 渲染 | D2 D3 |
| D5 | pin 机制：dock service + panels/artifact 的 PinButton + 组件 export | D4 |
| D6 | 测试 + 打包 + 双 profile + 真机验收（pin/拖/缩/排列/持久化/与 better-sidebar 并存） | 全部 |

## 5. 非目标（v1）

- 不做浮动窗口（方案 C 预留架构，不在 v1）
- 不做 third-party surface 扩展点（OCIX 的 extension catalog，自家两源先跑通）
- 不做 dock 内实时数据刷新（panel tile 是快照；要实时重 pin）
- 不对接 better-sidebar 的 registerTab/registerFileViewer（明确决策：不对接高速发展中的第三方）
