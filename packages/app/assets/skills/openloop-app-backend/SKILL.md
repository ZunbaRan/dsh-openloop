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
| `register_component` | `appName` + `component` = { rid, kind, title, entry?, description? } | rid 必须以 `<appName>:` 开头；kind: `panel`/`artifact`；**entry 契约见下** |
| `remove_component` | `rid` | 移除组件资源 |
| `register_api` | `appName` + `api` = { rid, domain, path, authType, summary? } | 登记 API；authType: `none`/`key` |
| `remove_api` | `rid` | 移除 API 资源 |
| `set_api_key` | `rid` + `apiKey` | 写入凭据（**只写不读**——之后只能看到 configured: true） |
| `save_dock_state` | `dockState` = { version: 2, boards, activeBoardId } | 全量保存看板（原子替换） |
| `load_dock_state` | — | 读取看板（无数据返回 null） |
| `invalidate` | — | 手动通知 UI 重拉 registry（一般不用——所有写操作已自动通知；仅直改数据后用） |

## 典型流程

注册一个自研 APP 并登记资源：

1. `upsert_app`：`app: { name: "my-sales", displayName: "我的销售看板", kind: "local", version: "0.1.0", description: "…" }`
2. `register_component`：`appName: "my-sales"`, `component: { rid: "my-sales:weekly", kind: "panel", title: "周度业绩" }`
3. `register_api`：`appName: "my-sales"`, `api: { rid: "my-sales:orders", domain: "api.example.com", path: "/v1/orders", authType: "key" }`
4. `set_api_key`：`rid: "my-sales:orders"`, `apiKey: "<用户提供的 key>"`
5. `get_app`：`appName: "my-sales"` 验收（components/apis 各就位，orders configured: true）

## entry 契约（组件的可渲染内容——决定 dock 里「待生成」还是可「固定」）

**`entry: { panel: <完整 PanelDefinition> }`**——内联整个面板定义 JSON：

```jsonc
// register_component 的 component 参数
{
  "rid": "my-sales:my-sales-weekly",
  "kind": "panel",
  "title": "周度业绩",
  "entry": {
    "panel": {
      "$schema": "openloop.panel/v1",
      "id": "my-sales-weekly",
      "title": "周度业绩",
      "widgets": [ /* PanelDefinition 的 widgets，与 panel 工具的 panel 参数同构 */ ]
    }
  }
}
```

**生成 entry 的标准流程**（agent 操作）：
1. 用 `panel` 工具生成面板（可加 `persist: true` 落盘调试）
2. 若已 persist：`read` `openloop-panels/<panel-id>.json`，取其 `panel` 字段内容
3. `register_component` 时把该定义**原样内联**进 `entry.panel`（不要写文件路径！浏览器读不到 workspace 文件——路径字符串的 entry 一律显示「待生成」）

要点：
- `panel.id` 建议 = rid 的组件名段（如 `my-sales-weekly`）——tile 溯源 ID 才能对上资源 ID
- api 数据绑定的 widget 可正常工作：pin 后面板打开时 panels 的 onLoad 刷新自动拉数据
- entry 缺失/畸形 → dock 显示「待生成」（用户看到的提示会引导重新注册）

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
