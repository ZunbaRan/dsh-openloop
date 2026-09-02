# OpenLoop App Backend（本地应用后端门面）

> 工具：`app_backend` · 后端：PocketBase（插件管理生命周期，藏在门面后——**不要试图直连它**）

## 何时使用

- 用户想注册/管理一个「APP」（第三方包、自研应用、内置应用）
- 用户想登记组件资源（面板/交互件）或 API 资源（外部接口 + 凭据）
- 用户想保存/迁移看板数据（boards/tiles，dock v2 state）
- 任何「本地存点什么、以后再取」的应用数据需求（经 APP 命名空间）

## 核心概念：命名即寻址

- 资源 ID 一律 `包名:组件名`（如 `acme-crm:dashboard`、`openloop:metric-grid`）
- `包名` 是全局唯一命名空间（kebab-case）；一个 APP 只能注册自己命名空间下的资源
- 这个 ID 贯穿三处：skill 唤起规则、dock tile 溯源、资源列表——不存在冲突消解

## Action 速查

| action | 关键参数 | 说明 |
|---|---|---|
| `list_apps` | — | 列出全部注册 APP |
| `upsert_app` | `app` = { name, displayName, kind, version, description?, skill? } | 注册/更新 APP（同名幂等）。kind: `builtin`/`local`/`thirdparty` |
| `get_app` | `appName` | APP 详情：组件清单 + API 清单（含 configured 状态点） |
| `delete_app` | `appName` | 删 APP 并级联清其全部组件/API 资源 |
| `register_component` | `appName` + `component` = { rid, kind, title, entry?, description? } | rid 必须以 `<appName>:` 开头；kind: `panel`/`artifact`/`mcp-app`；**entry 契约见下** |
| `remove_component` | `rid` | 移除组件资源 |
| `register_api` | `appName` + `api` = { rid, domain, path, authType, summary? } | 登记 API；authType: `none`/`key` |
| `remove_api` | `rid` | 移除 API 资源 |
| `set_api_key` | `rid` + `apiKey` | 写入凭据（**只写不读**——之后只能看到 configured: true） |
| `save_dock_state` | `dockState` = { version: 2, boards, activeBoardId } | 全量保存看板（原子替换） |
| `load_dock_state` | — | 读取看板（无数据返回 null） |
| `invalidate` | — | 手动通知 UI 重拉 registry（一般不用——所有写操作已自动通知；仅直改数据后用） |
| `connect_server` | `serverId` + `server` = mcp.json 条目 | **接入第三方 MCP Apps 2.0 包**（方向 1 v2，见下节） |

## 典型流程

接入一个第三方 MCP Apps 2.0 包（方向 1 v2——connect 流程）：

1. `connect_server`：`serverId: "tldraw"`, `server: { type: "http", url: "http://127.0.0.1:39512/mcp" }`
   —— 自动完成：写 user 作用域 mcp.json + 热激活 runtime（web 不重启）+ 注册 app 壳（kind: thirdparty）+ 有 ui binding 的工具落 `mcp-app` 引用组件（kind: `mcp-app`，entry = { serverId, toolName, resourceUri }——**不复制 HTML，渲染时取数**）
2. server 暂时不可达时 connect 仍成功（state: disconnected）——惰性重连自愈，别反复重试
3. 工具调用走普通 MCP 工具（`mcp__<serverId>__<toolName>`，由 mcp-tools 自动注册）；沙箱内交互经 gateway 回环 callTool，凭据归 server 自管、**不经本后端**

> 第三方包的凭据**不走** `register_api`/`set_api_key`——那两个 action 只服务方向 2 本地后端 API 资源。

注册一个自研 APP 并登记资源：

1. `upsert_app`：`app: { name: "my-sales", displayName: "我的销售看板", kind: "local", version: "0.1.0", description: "…" }`
2. `register_component`：`appName: "my-sales"`, `component: { rid: "my-sales:weekly", kind: "panel", title: "周度业绩" }`
3. `register_api`：`appName: "my-sales"`, `api: { rid: "my-sales:orders", domain: "api.example.com", path: "/v1/orders", authType: "key" }`
4. `set_api_key`：`rid: "my-sales:orders"`, `apiKey: "<用户提供的 key>"`
5. `get_app`：`appName: "my-sales"` 验收（components/apis 各就位，orders configured: true）

## entry 契约（组件的可渲染内容——决定 dock 里「待生成」还是可「固定」）

**`entry` 直接放 PanelDefinition 即可**（v1.1 放宽——之前要求 `{ panel: ... }` 包装层，实战表明平铺更直觉、agent 一写就过）：

```jsonc
// register_component 的 component 参数（推荐形态）
{
  "rid": "my-sales:my-sales-weekly",
  "kind": "panel",
  "title": "周度业绩",
  "entry": {
    "$schema": "openloop.panel/v1",
    "id": "my-sales-weekly",
    "title": "周度业绩",
    "widgets": [ /* 与 panel 工具的 panel 参数同构 */ ]
  }
}

// 兼容形态：entry: { panel: <PanelDefinition> } —— 老的双层包装也能识别
```

**识别规则（dock 端 `entryPanelOf`）**：entry 本身**或** entry.panel 含 PanelDefinition 形状（有 id/title/widgets[] 即过）→ 当作面板定义；否则（文件路径 / 字符串 / 缺字段）→ 「待生成」。

**生成 entry 的标准流程**（agent 操作）：
1. 用 `panel` 工具生成面板（可加 `persist: true` 落盘调试）
2. `register_component` 时把 `panel` 工具返回的 widgets/title 等**原样**作为 `entry` 传入——**不要**写文件路径（浏览器读不到 workspace 文件）

要点：
- `panel.id` 建议 = rid 的组件名段（如 `my-sales-weekly`）——tile 溯源 ID 才能对上资源 ID
- api 数据绑定的 widget 可正常工作：pin 后面板打开时 panels 的 onLoad 刷新自动拉数据
- entry 缺失/畸形 → dock 显示「待生成」（用户看到的提示会引导重新注册）

## 页面关联（relations，联动 v1）——列表/详情成对声明

一个列表页（如线索列表）点击行 → 详情页即时打开（对话流卡片下方 / Board 悬浮窗），全程**不经 Agent**。要启用，成对声明 `relations`（放进 PanelDefinition 顶层字段，随 entry 一起注册）：

```jsonc
// 列表页（emits 可触发）：payload 值支持 $row.<字段> 引用被点行数据
{
  "$schema": "openloop.panel/v1",
  "id": "lead-list",
  "title": "线索列表",
  "relations": {
    "emits": [{
      "event": "my-crm:lead:selected",        // 命名空间 {app}:{entity}:{action}
      "payload": { "leadId": "$row.id" },     // $row = 被点击的行
      "target": { "rid": "my-crm:lead-detail" } // 可选：显式指向详情 rid
    }]
  },
  "widgets": [ /* data-table，rows 来自 api 数据 */ ]
}

// 详情页（consumes 可响应）：事件参数 → 本页数据参数
{
  "$schema": "openloop.panel/v1",
  "id": "lead-detail",
  "title": "线索详情",
  "relations": {
    "consumes": [{ "event": "my-crm:lead:selected", "param": "leadId" }]
  },
  "widgets": [{
    "id": "detail",
    "source": { "type": "preset", "kind": "data-table", "props": {} },
    "data": {
      "source": { "type": "api", "url": "https://api.example.com/leads/{{leadId}}" },
      "params": { "leadId": "" }               // 声明模板变量（缺省空串）
    }
  }]
}
```

要点：
- **成对注册**：emits 方（列表）与 consumes 方（详情）都要注册，事件名逐字一致
- `{{leadId}}` 模板可出现在 url / query 值 / body；参数来自事件 payload（consumes.param 指定取哪个字段）
- 详情页可再声明自己的 emits（如 `my-crm:lead:advanced`）——多级级联自然成立
- 资源列表会显示 ⚡ 可触发 / ⇄ 可响应 chip；详情页展示页面关系表（emits 可触发 / consumes 可响应，双语）
- 列表页行点击由系统自动处理（data-table 行级事件委托），无需为点击写任何 widget 代码

> **UI 可见性**：全部写操作（upsert_app / register_* / set_api_key / save_dock_state 等）完成后端会自动通知 dock 工作台刷新（约 15 秒内生效，无需用户刷新页面）。注册完成后可以告诉用户「到 APP 页看一眼」。
> 仅当你绕过本工具直接改了数据（如外部脚本）才需要显式调用 `invalidate`。

## 错误自修正

门面错误消息包含「期望形态 + 实际值」——照着改即可：

- `invalid app.name: expected a kebab-case name…` → 包名只允许小写字母/数字/连字符
- `component.rid: expected to start with the owning app's namespace "my-sales:"` → rid 的包名段必须与 appName 一致（隔离约束）
- `app "x" is not registered. Register it first…` → 先 `upsert_app` 再登记资源
- backend 未就绪（首次启动要下载 ~12MB 的 PocketBase 二进制）→ 片刻后重试；持续失败让用户检查网络或设 `OPENLOOP_PB_BIN`

## 硬规则

- **凭据只写不读**：set_api_key 之后任何途径都取不回 key 本身，只有 configured 状态
- **不直连 PocketBase**：没有直连通道；admin 端口只绑 127.0.0.1 且 token 只在插件进程内
- **数据按 APP 隔离**：删除 APP 级联清资源；资源只能注册在归属命名空间下
