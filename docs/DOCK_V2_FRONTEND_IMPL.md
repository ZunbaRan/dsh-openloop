# Dock 2.0 前端实现说明

> **状态**：实现基线（2026-08-25 原型定稿后落笔）  
> **设计输入**：交互原型 `designs/dock-v2/`（方向 A 为主体 + 融入 B，用户已逐轮验收）  
> **关联文档**：`APP_PLATFORM_DESIGN.md`（概念与协议基线）· `DOCK_DESIGN.md`（dock 0.3.x 现状与 push 机制）· 本文只讲**前端落地**，后端门面见 APP_PLATFORM_DESIGN §4

---

## 1. 定稿交互规格（以原型为准，不再另起设计）

方向 **A 为主体**：窄 icon 轨 + 右侧内容区；B 的能力以「拖宽升级」融入，**不存在两个方向的代码分支**。

### 1.1 左侧导航轨 RailNav（两态一轨）

| 态 | 宽度 | 内容 |
|---|---|---|
| 图标态 | 52px | 看板 icon + 每个看板页的 mini icon（页名首字）→ 分隔线 → APP icon + 每个 APP 的 mini icon |
| 中枢态 | 216px（拖宽 ≥100px 进入，松手吸附 52/216） | 「工作台 + ⊕」分组：看板页行（图标+名称+计数，双击重命名，悬停 × 删除）；「APP」分组：APP 行（图标+名称+API 状态点） |

- 右缘 8px 拖拽把手（`col-resize`），实时改宽；双击把手在 52↔216 间快捷切换
- 点击看板页 → 切到看板 tab 并激活该页；点击 APP → 切到 APP tab 并选中该 APP
- rail 纵向超出可滚动，隐藏滚动条

### 1.2 APP 侧栏 AppListPanel（APP tab 内）

- 默认宽 230px，右缘把手拖宽（190–420px）
- 头部：搜索框 + **列表/卡片视图切换** + 收起按钮「‹」
- 卡片视图 = 富行（28px 图标 + 名称 + `N 组件 · N API` + kind 徽章）；列表视图 = 紧凑单行（20px 图标 + 名称）
- 收起后为 48px 图标条：APP mini icon 纵向排列（点击选中并自动展开），顶部「›」展开

### 1.3 看板多页 + tile 别名

- **多看板页**：每页独立 tiles；新增/重命名/删除全部收口在 rail（§1.1），主区顶部只显示当前页名（双击重命名）+ tile 计数 + 整理/清空
- **tile 别名**：双击 tile 标题内联编辑；Enter/失焦提交，Esc 取消，置空恢复原名；有别名的 tile 带 ✎ 标记（title 显示原名）；右下角恒显 `包名:组件名` 来源 ID
- 空页空态：引导文案（去 APP 页固定 / 让 Agent 生成）

### 1.4 导航收口原则

看板页与 APP 在信息架构上同级，导航**只有 rail 一处**。主区不再有页签条——这是本轮定稿与旧稿的最大差异，实现时不要保留双导航。

---

## 2. 组件树映射（原型 → packages/dock）

原型文件（`designs/dock-v2/`）按 babel 多文件组织，落地时合并为 dock 包内的单文件组件：

| 原型 | dock 包落点 | 复用方式 |
|---|---|---|
| `app.jsx` App | `src/client/index.tsx` 根组件 | 状态结构照搬（见 §3） |
| `direction-a.jsx` RailNav | **新增** `src/client/RailNav.tsx` | JSX 几乎直搬，去掉 B 分支 |
| `direction-a.jsx` AppListPanel 段 | **新增** `src/client/AppListPanel.tsx` | 直搬 |
| `direction-a.jsx` 看板段 | `DockBoardView.tsx` 改造 | 头部换页名+双击改名；canvas 保留 react-grid-layout |
| `components.jsx` Tile | `DockBoardView.tsx` 内 tile 渲染 | **外壳交互直搬**（别名编辑、grip、来源 ID）；**body 换真实渲染器**（panel/artifact），原型 mock body 全部丢弃 |
| `components.jsx` dragResize | `src/shared/drag-resize.ts` | 原样直搬（纯 DOM 逻辑，无 React 依赖，放 shared 与 dock-width.ts 同级） |
| `components.jsx` KindBadge/TypeBadge/AppIcon | **新增** `src/client/badges.tsx` | 直搬 |
| `data.jsx` | **删除** | 真实数据来自 APP 注册表（§5） |
| `icons.jsx` | `src/client/icons.tsx` | 直搬（含新增 chevronL/list/x） |
| `direction-b.jsx` | **删除，不落地** | 其 CSS 中 `.hub*` / `.app-dash*` 也不进包 |
| HTML `<style>` | `src/client/dock-v2.css`（或续写现有样式注入处） | 只搬组件样式；**token 定义块丢弃**（见 §4） |

原型的 `.proto-bar`（方向/主题切换）是演示设施，不进包。

---

## 3. 状态模型与持久化（store v1 → v2）

### 3.1 新模型

```ts
// store v2（STORAGE_KEY 沿用 'openloop.dock.board'，version 升 2）
interface DockBoardState {
  version: 2
  boards: Array<{ id: string; name: string; tiles: DockTile[] }>
  activeBoardId: string
}
interface DockTile {           // 在 v1 基础上加一个字段
  // ...v1 字段不变
  alias?: string               // 用户别名；undefined = 用 title
}
```

- 读取迁移：读到 `version: 1` 时直接包成 `{ boards: [{ id:'b-default', name:'默认看板', tiles }], activeBoardId:'b-default' }` 写回 v2，**不做双版本兼容层**（工程原则：废弃路径直接移除）
- 容错语义沿用 v1：逐 tile 校验 + `clampLayout`，非法剔除（错误边界原则不变）
- store 实现沿用现有手写 `useSyncExternalStore` 风格（不引 zustand），`DockStore` 由「单 board」扩为「boards 集合 + activeBoardId」，方法新增：`addBoard / renameBoard / removeBoard / setActiveBoard / setTileAlias`，现有 tile 方法全部改为作用于 activeBoard

### 3.2 UI 态（不进 store，独立 localStorage key）

| key | 内容 | 默认 |
|---|---|---|
| `openloop.dock.rail-width.v1` | rail 宽度（52 或 216 吸附值） | 52 |
| `openloop.dock.app-panel.v1` | `{ width: number; collapsed: boolean; view: 'card'\|'list' }` | `{230, false, 'card'}` |
| `openloop.dock.tab.v1` | `'board'\|'apps'` + `selectedAppId` | board / 第一个 APP |

拖宽交互期间**只写 state，松手才持久化**（沿用 DockHost 0.3.4 的手感纪律：拖动中禁用过渡动画）。

---

## 4. token 策略：原型变量 = DSH 真实变量，落地零映射

原型 `:root` 的 `--ds-*` 变量就是 2026-08-24 从 3080 实例 computed style 提取的真值。**落地时整个 token 定义块删除**，组件样式直接引用 DSH 宿主已有变量。命名对应关系已在原型中对齐（`--ds-bg-layer-1`、`--ds-label-1/2/3/caption`、`--ds-border-1/2/3`、`--ds-interactive-hover/active`、`--ds-business`、`--ds-chart-*` 等）——实现前先核对宿主实际变量名，有一致就直接用，不一致只改 CSS 引用名，**组件不消费任何原型私有变量**。明暗双板由宿主 `data-theme` 自动生效，dock 不做主题切换。

## 5. 数据源：mock → APP 注册表

原型 `data.jsx` 的 `APPS` 是 mock。落地分两步：

1. **M2 阶段**：dock 包内建一个 `AppRegistry` 接口（`listApps(): AppDescriptor[]`，含 components/apis/kind/version），先由「内置 APP（panels 预设清单）+ 本地 mock」实现；
2. **M3 阶段**：实现切换到 `@openloop/dsh-app` 门面（APP_PLATFORM_DESIGN §4），registry 只换实现，UI 零改动。

tile 渲染 body 同理：现有 panels/artifact 渲染器已是生产实现，直接嵌入 tile 外壳；`source` 记录 `包名:组件名` 唯一 ID（命名即寻址，APP_PLATFORM_DESIGN §2）。

---

## 6. 既有集成约束（0.3.4 踩坑沉淀，逐条不可违反）

1. **DockHost 三件套不动**：host div 挂 body + MutationObserver 保活；push 用 `margin-right + width: calc(100% - W)`（padding 方案已证伪，DOCK_DESIGN §1.1）；空间探测读 `--dsh-sidebar-width`，不读 computed margin（反馈回路）
2. dock 在右、better-sidebar 在左/右共存时，rail 出现在 **dock 面板内部左侧**，与 bsb 互不感知；dock 总宽 = rail + 内容区，纳入 `clampDockWidth` 上下限（必要时把上限 min(1200px, 70vw) 重新评估）
3. tile 渲染必须包 `TileErrorBoundary`——坏 tile 数据 + 持久化 = 永久崩溃循环（沉淀 #5）
4. 跨插件通信（如 APP 注册表在别的插件）走 **window 直通桥**，不用 cordis client inject（沉淀 #1）
5. cordis apply 保持同步；新增 localStorage key 不进 cordis.patch.yml
6. 新依赖零引入：grid 继续用 react-grid-layout v2；改完跑 `scripts/verify-client-bundle.mjs`（白名单机制）
7. 排查顺序纪律：「页面没变化」先 curl `/plugins/<pkg>/client.js` grep 特征，再无缓存浏览器，再指引硬刷新（沉淀 #7）

---

## 7. 实施分期与验收

| 期 | 内容 | 验收点（agent-browser 真机） |
|---|---|---|
| **M1** | store v2 + RailNav 两态 + 看板多页 CRUD/重命名 + tile 别名 | rail 拖宽吸附手感；mini icon 导航；刷新后多页/别名/激活页都在；v1 旧数据自动迁移 |
| **M2** | APP tab：AppListPanel（拖宽/收起/视图切换）+ APP 详情 + pin 流程（固定到当前页） | 侧栏三交互；pin 后跳回看板且 tile 出现；APP 状态点与 API 配置状态一致 |
| **M3** | AppRegistry 接 dsh-app 门面；boards/tiles 持久化从 localStorage 切到门面 | 重启 DSH 后数据在；门面不可用时降级回 localStorage 并出提示条（不炸页，沉淀 #2 同款降级） |

每期完成按发布纪律执行：`pnpm check` → bump → `pack-all.mjs` → 双 profile remove+add（绝对路径全家 tarball）→ 重启验证。

### 通用验收 checklist

- [ ] 52px / 216px 两态渲染与截图基线一致（对照 `designs/dock-v2` 原型）
- [ ] 所有拖拽把手：拖动中无过渡滞后，松手吸附/持久化
- [ ] 重命名交互统一：双击进入、Enter/失焦提交、Esc 取消、置空不改名
- [ ] 明暗主题随宿主切换，无写死色值
- [ ] 坏 tile 被错误边界兜住，其余 tile 正常
- [ ] bsb 开合时 dock 布局无抖动、无反馈回路
