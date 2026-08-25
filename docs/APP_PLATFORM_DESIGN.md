# OpenLoop 应用平台设计（APP Platform）v1 草案

> **状态**：设计基线（2026-08-24 用户拍板方向的技术化落笔），供「Dock 改造原型设计」参考  
> **阶段定位**：当前整套 openloop 体系处于 **demo 验证期**——本文记录的是设计思路与技术栈基线，不是成品规格；PocketBase 等选型均为验证车  
> **关联文档**：`DOCK_DESIGN.md`（现有 dock 全量设计，含 §1.1 push 机制更正）· `PANELS_CODEGEN_DESIGN.md` · `ARTIFACT_V2_DESIGN.md` · 旧轨道参考 `openchamber/docs/OCIX_*.md`

---

## 1. 愿景与两条主轴

**产品定位**：把 DSH 改造成 Agent Native 产品底座——不是「SaaS 先建好、再融入 Agent」，而是**产品本身就是 Agent**。用户提需求，Agent 生成界面、连接数据、组装成品。

两条主轴（互为表里）：

| 主轴 | 一句话 | 本质 |
|---|---|---|
| **方向 1 · 第三方生态** | 第三方按我们的规范开发「包」，通过协议接入 | 生态供给 |
| **方向 2 · 本地开发** | 用户用 Agent 开发自己的组件，插件提供后端（框架 + 存储） | 自给自足 |

北极星 demo **推迟**：待方向 2 后端落地后，以「内置 APP」形态呈现（见 §6）。

---

## 2. 统一概念：APP

**APP = 资源集合**，由三要素构成：

```
APP（包） = 组件资源（前端） + API 资源（后端） + skill（唤起规则：什么情况下唤起什么面板）
```

三种实例，同一概念：

| 实例 | 来源 | 说明 |
|---|---|---|
| **第三方包** | 方向 1，外部按规范开发 | 双形态（见 §3） |
| **本地自研 APP** | 方向 2，Agent 现场开发 | 数据落本地后端 |
| **内置 APP** | openloop 自带 | 北极星载体（见 §6） |

**命名即寻址（核心设计决策）**：

- `包名:组件名` 构成**全局唯一 ID**（例：`acme-crm:dashboard`、`openloop:metric-card`）
- 唯一性 ⇒ 无冲突 ⇒ **不存在召回混乱，也不需要任何 priority/消解机制**（原 OCIX 的 `agentRouting{intents,priority,operation}` 结构化路由整体取消）
- 这个 ID 一根线贯穿三处：
  1. **skill 唤起规则**引用它（"何时唤起 `acme-crm:dashboard`"）
  2. **dock tile 溯源**记录它（pin 来源可刷新、可重建）
  3. **APP 资源列表**里每项就是它

**安全模型收敛为两件事**：`key + 域名`。每个 API 资源的凭据 = 一把 key 绑一个域名白名单。其余信任由既有机制承担：panels 预设（构造即安全）、artifact 三档沙箱（opt-in）、fetch 桥（域名校验）。原 OCIX 的签名 / 发布者指纹 / 市场目录 / Connector Auth 协议 **v1 全部不做**。

---

## 3. 方向 1：第三方包协议（简化版）

### 3.1 双形态包结构

**全包**（交付前端）：

```
package/
├── manifest.json          # 包名、版本、资源列表
├── skill.md               # 唤起规则（何时唤起哪个面板）
├── components/            # 前端资源（多个面板集合）
│   ├── dashboard.panel.json / .artifact.html
│   └── detail.panel.json
└── apis/
    └── api.json           # 后端 API 清单（端点、参数、返回描述）
```

**纯 API 包**（不交付前端）：

```
package/
├── manifest.json          # 包名、版本、API 资源列表
└── skill.md               # 唤起规则（Agent 依据 API 现场生成前端）
```

### 3.2 资源清单 schema 草案

```jsonc
// manifest.json
{
  "id": "acme-crm",              // 包名（全局唯一命名空间）
  "name": "Acme CRM",
  "version": "0.1.0",
  "kind": "thirdparty",          // thirdparty | local | builtin
  "components": [                 // 前端资源列表（纯 API 包此数组为空）
    { "id": "acme-crm:dashboard", "kind": "panel", "title": "客户看板", "entry": "components/dashboard.panel.json" }
  ],
  "apis": [                       // 后端 API 列表
    { "id": "acme-crm:customers", "domain": "api.acme.com", "path": "/v1/customers", "auth": "key", "summary": "客户列表，支持分页" }
  ]
}
```

### 3.3 与原 OCIX 协议的差异（砍了什么、为什么能砍）

| 原 OCIX | 本协议 | 能砍的原因 |
|---|---|---|
| Ed25519 签名包 + 发布者指纹 + 验签 | 无 | 第三方前端不再进宿主执行；面板走预设白名单、artifact 走沙箱，信任由运行时边界承担 |
| `agentRouting{intents,priority,operation}` | skill 文本 + 唯一 ID | 命名唯一消灭冲突；skill 即机器可读契约 |
| Business Gateway + Connector Auth 签发协议 | key + 域名 | 本地单用户场景，settings 配置即可 |
| Hosted 薄包 + 远程签名清单 | 不做（后续可加） | v1 用本地包验证形态 |
| Marketplace 目录 | 不做 | 生态冷启动后置 |

---

## 4. 方向 2：本地开发后端插件

### 4.1 定位与选型

- **PocketBase（MVP，验证车）**：单 Go 二进制、SQLite 底座、REST + realtime、自带 admin UI、auth、文件存储。选它只为**快速验证设计思路**，后续会做深度选型研究。
- **硬约束——门面层隔离**：新增插件（建议名 `@openloop/dsh-app`，承载 APP 注册 + 后端）对外只暴露**受控 API 门面**；Agent / panels / artifacts / dock 只跟门面说话，PocketBase 藏在门面后。将来换任何存储（如 better-sqlite3 + Hono），上层零改动。**SQLite 底座保证迁移路径是平的**（同库文件可直接换引擎）。

### 4.2 架构

```
Agent ─┐
panels ─┼─→  @openloop/dsh-app 门面（skill 即 API 文档、错误面向 Agent 可自修正）
artifact┤        │
dock  ─┘        ▼
           PocketBase（本地进程，插件起停，数据落 DSH_HOME）
           ├─ REST（collections CRUD）
           ├─ auth（本地 token）
           └─ SQLite 文件
```

继承旧轨道 LDR（`openchamber/docs/OCIX_LOCAL_DATA_RUNTIME_PLAN.md`）的设计结论：
1. **Agent 不直连 PocketBase admin**——只走门面，错误消息面向 Agent
2. **数据面按 APP 隔离**（collection 命名空间），一个坏 APP 读不到另一个的数据
3. **凭据不回显**：key 存后端，门面只返回 `configured: true/false`，永不把 key 本身给到 Agent 或前端（OCIX Connector Auth 的教训）

### 4.3 数据模型（PocketBase collections 草案）

| collection | 内容 | 说明 |
|---|---|---|
| `apps` | id(包名)、name、kind、version、skill | APP 注册表 |
| `components` | id(包名:组件名)、appId、kind、title、entry/内容 | 组件资源 |
| `apis` | id、appId、domain、path、authType、keySecret、summary | API 资源 + 凭据 |
| `boards` | id、title、createdAt | 看板（自 localStorage 迁入） |
| `tiles` | boardId、sourceId(包名:组件名)、layout、snapshot | tile + 溯源 |

### 4.4 迁移

现有 JSON 存储（`openloop.dock.board.v1` / `openloop.dock.width.v1` 等 localStorage 键）→ 后端插件首次启动时一次性导入 SQLite；迁移后 localStorage 仅作缓存。

---

## 5. Dock 2.0：体系中枢（原型设计的需求基线）

### 5.1 信息架构

```
┌─────────────┬────────────────────────────────────┐
│  左侧 tabs   │  右侧详情                            │
│ ─────────── │ ────────────────────────────────── │
│  📌 看板     │  【看板 tab】现有 DockBoardView 原样迁入 │
│             │   （RGL v2 可拖拽组件集合，行为不变）      │
│  🧩 APP      │  【APP tab】主从结构：                  │
│             │   左列 = APP 列表（第三方 + 自研 + 内置）  │
│             │   右区 = 选中 APP 的资源列表              │
│             │    ├─ 组件资源（含状态、可 pin）           │
│             │    └─ API 资源（含域名、凭据配置状态）      │
└─────────────┴────────────────────────────────────┘
```

- Dock 的角色从「pin 面板的画板」升级为**整套插件的中心**：看板 = 消费/组装视图，APP = 能力/注册视图
- **布局机制不变**：margin + width calc push（DOCK_DESIGN §1.1）、与 bsb 共存、宽度拖拽钳制
- 左侧 tab 集为可扩展结构（v2 起码：看板、APP；预留模板/历史等扩展位）

### 5.2 APP tab 交互要点（原型需覆盖）

- APP 列表项：图标、名称、kind 徽标（第三方/自研/内置）、版本
- 资源列表分两组展示：**组件**（`包名:组件名`、标题、kind、来源）与 **API**（名称、域名、auth 状态点、summary）
- 从资源列表唤起组件 → 进入对话流生成 / 直接打开到看板（交互细节开放，见 §7）
- API 凭据配置入口（key + 域名，配置状态可视化）

---

## 6. 内置 APP（北极星载体）

**内置一个 APP 作为整个体系的第一个实例**：

- **组件资源** = 现有的 app 组件（26 个 panels 预设等，即 `openloop:*`）
- **API 资源** = 所有的 api 组件（本地后端 API；范围见开放问题 §7-Q1）

双重意义：
1. **自证**——APP 体系（注册表 / 资源列表 / skill / 唯一命名）靠自家 APP 先跑通，不依赖任何第三方
2. **目录**——用户在 APP tab 第一眼看到「这套系统现在有什么能用」

---

## 7. 开放问题（原型设计阶段回答）

- **Q1**：「所有的 api 组件」的范围——仅本地后端 API，还是含 mcp/fetch 已配置的外部端点？
- **Q2**：APP 资源列表是纯浏览，还是可操作（直接从列表把组件添加/拖到看板）？
- **Q3**：左侧 tabs 的形态——图标窄轨 vs 文字宽轨？扩展位如何预留？
- **Q4**：第三方 APP 接入时点——APP tab v1 只承载内置 + 自研，第三方等协议草案稳定后再接？
- **Q5**：多 APP 的看板混排策略——tile 来自不同 APP 时，刷新/权限失败如何降级展示？

---

## 8. 技术栈总览

| 层 | 现有 | 新增/演进 |
|---|---|---|
| 宿主 | DSH 0.1.0-rc.x + cordis 4.0.1 插件体系（同步 apply、window 直通桥、懒 require base-bridge） | 不变 |
| 客户端 | React 18、react-grid-layout v2、`--dsw-*` token、`window.__ModuleLoader__` CJS bundle（tsdown） | Dock 左 tab 框架（复用现有 push/挂载机制） |
| 展示 | panels 26 预设 + Python codegen（`openloop_panels`：contracts.py/widgets.py）；artifact 三档（static/scripts/network）+ pico/chartjs/react18 预置 | 组件资源化（注册进 APP 体系） |
| 连接 | mcp 多作用域 + base fetch 代理 | API 资源化（key + 域名凭据） |
| 存储 | localStorage（dock board / width / panels） | **PocketBase（验证车）→ SQLite，经 `@openloop/dsh-app` 门面** |
| 发布 | pnpm / tsdown / pack-all.mjs / 双 profile remove+add | 不变 |

---

## 9. 里程碑概要（详细实施计划另行输出）

| 阶段 | 内容 | 出口 |
|---|---|---|
| M0 | dock 0.3.4 真机验收 + 提交 | 用户确认 |
| M1 | **Dock hub 框架**：左 tabs（看板/APP）+ 右详情容器，现有看板迁入 tab 内 | 原型确认后实施 |
| M2 | **本地后端插件** `@openloop/dsh-app`：PocketBase 门面 + collections + localStorage 迁移 | Agent 可经门面 CRUD |
| M3 | **内置 APP**：openloop 自家注册进 APP tab（组件 + API 资源） | APP tab 可用 |
| M4 | **第三方包协议草案落地**：manifest/skill/资源列表的最小宿主 | 纯 API 包可接入演示 |
