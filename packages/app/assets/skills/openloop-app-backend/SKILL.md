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
| `register_component` | `appName` + `component` = { rid, kind, title, entry?, description? } | rid 必须以 `<appName>:` 开头；kind: `panel`/`artifact` |
| `remove_component` | `rid` | 移除组件资源 |
| `register_api` | `appName` + `api` = { rid, domain, path, authType, summary? } | 登记 API；authType: `none`/`key` |
| `remove_api` | `rid` | 移除 API 资源 |
| `set_api_key` | `rid` + `apiKey` | 写入凭据（**只写不读**——之后只能看到 configured: true） |
| `save_dock_state` | `dockState` = { version: 2, boards, activeBoardId } | 全量保存看板（原子替换） |
| `load_dock_state` | — | 读取看板（无数据返回 null） |

## 典型流程

注册一个自研 APP 并登记资源：

1. `upsert_app`：`app: { name: "my-sales", displayName: "我的销售看板", kind: "local", version: "0.1.0", description: "…" }`
2. `register_component`：`appName: "my-sales"`, `component: { rid: "my-sales:weekly", kind: "panel", title: "周度业绩" }`
3. `register_api`：`appName: "my-sales"`, `api: { rid: "my-sales:orders", domain: "api.example.com", path: "/v1/orders", authType: "key" }`
4. `set_api_key`：`rid: "my-sales:orders"`, `apiKey: "<用户提供的 key>"`
5. `get_app`：`appName: "my-sales"` 验收（components/apis 各就位，orders configured: true）

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
