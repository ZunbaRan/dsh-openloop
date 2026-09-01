# Handoff: dsh-openloop 插件生态开发

> 生成时间：2026-09-01  
> 仓库：`/Users/loloru/Documents/data/project/openChamber/dsh-visual-plugins`  
> Git remote：`https://github.com/ZunbaRan/dsh-openloop.git`  
> 最新 commit：`5dc4d1b`（main）  
> 下一会话用途：**在 `dsh-visual-plugins/` 目录下启动 Agent，继续开发与 bug 修复**

---

## 项目是什么

DSH（DeepSeek Harness）插件 monorepo，pnpm workspace，11 个 `@openloop/dsh-*` 包 + 1 个 fixture。目标是把 DSH 改造成 **Agent Native 产品底座**——插件是 Agent 可读写的对象，不是静态资产。

## 环境与命令速查

| 项 | 值 |
|---|---|
| 仓库根 | `/Users/loloru/Documents/data/project/openChamber/dsh-visual-plugins` |
| DSH_HOME（lab） | `/Users/loloru/Documents/data/project/openChamber/deepseek-harness-lab/.dsh` |
| 双 profile | `profiles/web`（桌面 web，端口 3080）+ `profiles/headless`（命令行） |
| 全局 dsh 版本 | `0.1.1-rc.2`（`npm i -g @deepseek-ai/dsh@0.1.1-rc.2`） |
| 宿主 React | 19.x |
| 启动 web | `cd /Users/loloru/Documents/data/project/dsh && npx @deepseek-ai/dsh web`（端口 3080） |
| 启动 headless | `cd /tmp/<dir> && dsh --profile headless "prompt"` |
| 全仓检查 | `pnpm check`（scripts/check-all.mjs，串行，exit 0 = 全绿） |
| 打包 | `node scripts/pack-all.mjs` → tarball 写到 `dist/` |
| 双 profile 安装 | `pnpm remove @openloop/dsh-<pkg> && pnpm add file:<绝对路径>/dist/openloop-dsh-<pkg>-<ver>.tgz` |
| pnpm 缓存坑 | 同版本迭代必须 remove 再 add；`pnpm install --filter` 会扰动类型解析 |
| Git | 仓库根 `git add -A && git commit -F <file> && git push` |
| agent-browser | **未安装**（`command -v agent-browser` = NOT_FOUND）——当前无截图能力 |

## 当前包版本矩阵

| 包 | 版本 | 角色 |
|---|---|---|
| `@openloop/dsh-base` | 0.4.5 | 底座：token/设置页/runtime 资产/fetch 代理 |
| `@openloop/dsh-panels` | 0.5.1 | 38 预设组件 + panelFile + codegen + 数据驱动 + 自管理四件套 |
| `@openloop/dsh-html-artifact` | 0.5.0 | 三档沙箱 runtime + fetch bridge + 4 个 few-shot 范例 |
| `@openloop/dsh-dock` | 0.9.4 | 三列 APP tab + 看板 + artifact/panel/mcp-app tile |
| `@openloop/dsh-app` | 0.5.3 | PocketBase 后端 + connect/disconnect/reconnect + 事件/usage 持久化 |
| `@openloop/dsh-mcp` | 0.2.7 | MCP bundle 安装入口（client re-export McpAppResourceView） |
| `@openloop/dsh-mcp-runtime` | 0.3.1 | 共享连接 runtime + admin 路由 + gateway + 热加载 + callTool 埋点 |
| `@openloop/dsh-mcp-tools` | 0.1.5 | MCP 工具投影 + 动态订阅 + 启动容错 |
| `@openloop/dsh-mcp-apps` | 0.1.14 | MCP Apps 客户端：沙箱 + AppBridge + McpAppResourceView |
| `@openloop/dsh-show-widget` | 0.2.5 | 流内可视化讲解（独立设计系统） |
| `@openloop/dsh-visual-declarative` | 0.2.5 | 已退役（Deprecated 自声明） |

## 已完成的主要工作（按时间倒序，细节见 MEMORY.md / git log）

### 1. 自管理四件套 + 持久化 + few-shot 库（commits 333f7a5 → 5dc4d1b）

- **5 个预设 + 1 artifact**：`system-overview` / `app-manager`（首个带写操作的预设）/ `event-log` / `api-usage-monitor` / `agent-activity`（Agent Native 旗舰）+ `system-map`（artifact 拓扑范例）
- **4 个 few-shot artifact 范例**注册为 `openloop` APP 的 artifact 组件（`openloop:example-*`，HTML 内联进 entry，seed 从 artifact 包 assets 启动时读取）
- **PB 持久化**：新集合 `app_events` / `api_usage`（initCollections 逐个幂等，存量库自动补建）
- **写路径分叉**：浏览器侧 panels POST 端点（30s 去重）；服务端 mcp-runtime 保持 globalThis 单例（reader 合并读取）
- **dock col3 管理入口**：第三方 app 详情页内联断开/删除按钮

### 2. 方向 1 v2：MCP Apps 2.0 作第三方包协议底座（commits 1255eee → 8898a63）

- connect_server action：写 mcp.json → 热激活 runtime → listTools → 引用组件落库
- disconnect_server / reconnect_server action：热移除 + 保留条目 / 复用条目重连
- mcp-app tile kind：引用形态 pin + 渲染时取数
- **协议文档**：`docs/DIRECTION1_PACK_PROTOCOL_V2.md`

### 3. dock 0.8–0.9 三列重构 + UX 修复轮（commits 04d3004 → 5dc4d1b）

- 三列 APP tab（col1 富状态列表 / col2 资源列表 / col3 详情预览）
- 顶栏收起按钮 + 进入默认不展开（localStorage 持久化）
- 列缩略模式（拖到 <120px 即时缩略）
- DockToggle 垂直居中 + 四宫格 icon
- DockHost 左缘拖宽把手常驻可见
- tile 拖拽上限改为视口全宽（去掉 12 列硬限制）

### 4. 可视化工具路由层修复（commit db7d8a0）

- `docs/VISUAL_ROUTING.md` 路由矩阵（唯一事实源）
- 四个工具 description 重写 + routing-contract 测试锁对称性
- 维护纪律扩为五件套（入口文本进同步清单）

### 5. mcp-tools 启动容错 + mcp-runtime 热加载（commits e5b33a4, 1255eee）

- 启动注册 best-effort，连接失败停在 server 粒度不拖死 web
- addServer / removeServer / onServersChanged + mcp-tools 动态订阅

## 当前未解决的问题（优先级从高到低）

### P0：backend-console 范例「TypeError: Failed to fetch」未修复

- **数据层已生效**：curl 确认 registry 返回 `runtime: network`（PATCH seed 的 total-upsert 路径写了新值）
- **用户报**：重启 + 硬刷后仍报错
- **怀疑**：`openloop.fetch` 桥在 artifact 沙箱内可能未注入（需查 `packages/artifact/src/client/` 的 sandbox shell——`openloop.fetch` 只在 network 档注入，但 backend-console 范例的 HTML 里用的是 `openloop.fetch`——如果 ArtifactMeta 的 runtime 仍是旧值 `scripts`（PB 里缓存的旧 entry 没被 PATCH 覆盖？），沙箱 CSP 会拦 fetch）
- **下一步**：① 查 3080 实际渲染的 artifact iframe CSP（`document.querySelector('iframe[data-openloop-mcp-call]')` → 看 srcdoc 或 src 的 CSP header）② 确认 PATCH seed 的 upsert 是否真的覆盖了 PB 里的旧 entry（可能 PB PATCH 路径只更新部分字段，没覆盖 `entry` JSON）③ 如果 entry 确实已更新，查 `openloop.fetch` 注入逻辑（`packages/artifact/src/client/` 里 sandbox shell 对 network 档的注入代码）

### P1：artifact「已固定」徽章不显示

- **已修代码**：seed 写 `rid` 进 ArtifactMeta + `sourceIdOf` artifact 优先取 `meta.rid`
- **用户报**：pin 后不显示已固定
- **怀疑**：同 P0——如果 PB 里 entry 没被 PATCH 覆盖，旧 entry 里没有 `rid` 字段，`sourceIdOf` 退化到 path 文件名（与 c.id 命名空间不匹配）
- **下一步**：先确认 P0 的 PB entry 覆盖问题——如果 entry 确实已更新（含 rid），这个应该自动修复

### P2：agent-dashboard / usage-report 范例未验证

- agent-dashboard 用 `scripts` 档 + 原生 `fetch`（应该改 network + openloop.fetch，同 backend-console 的问题）
- usage-report 用 `network` 档 + `openloop.fetch` + Chart.js 预置库——可能也有类似问题
- **下一步**：统一审查 4 个范例的 runtime 档与 fetch 用法

### P3：左列 APP 行卡片化（A 方案，未做）

- 用户反馈「左列看不出内容」——只有 rid + kind 徽标
- 方案：显示 description 副文本 + artifact/panel 小标签
- 用户已认可方案但未开工

### P4：dsh-task-board 启动报错（第三方插件，非我们 bug）

- `session/list` 端点在宿主 0.1.1-rc.2 无导出 → 降级日志（不致命）
- 可忽略或等第三方更新

## 关键架构事实（踩坑沉淀，勿再犯）

1. **cordis inject 服务属性只能在回调参数 ctx 上读**——外层 ctx 访问会 throw "cannot get property without inject"，错误被 fiber 吞掉（`app/tests/inject-wiring.spec.ts` 锁定了这个模式）
2. **mergeApps 同 id APP 要组件级合并**——builtin（panels 预设）和 remote（PB registry）的 openloop 同时存在，旧「同 id 整 APP 去重」会吞掉 remote 的 artifact 范例
3. **「数据在端点里」≠「数据在 UI 里」**——UI 侧合并/去重层是独立故障面；用户拿 fetch 证据时应立刻查客户端逻辑
4. **mcp-runtime bump 必须全仓 grep 四处精确 pin**（app/mcp/mcp-apps/mcp-tools）
5. **pnpm add file:tarball 必须绝对路径**；同版本迭代必须 remove 再 add 绕缓存
6. **块注释里不能写 `*/`**（如 `session-*/` 会提前闭合 `/** */`）
7. **profile 单 client 模块原则**：mcp-apps 内联在 mcp bundle，dock 桥走 `@openloop/dsh-mcp/client`（不能直接 require mcp-apps）
8. **seed 幂等是「APP 存在即全跳过」**——升级路径需定向 PATCH（只 upsert 自己拥有的 rid，不动用户组件）
9. **panels 零依赖 app**——跨包通信用 window 直通桥或 globalThis 单例，不引入包间依赖
10. **cordis apply 必须同步**；启动为 void 异步

## 发布纪律

```
pnpm check          # 全仓 typecheck + test + build（exit 0 才继续）
bump 版本            # 改动包 + peer 声明它的 bundle 包
node scripts/pack-all.mjs
双 profile remove+add（绝对路径 tarball）
重启 web 实例验证
git add -A && git commit -F <msg-file> && git push
```

## 关键文件索引

| 文件 | 用途 |
|---|---|
| `AGENTS.md`（workspace 根上层） | 项目路线图 + 架构原则 + 维护纪律 |
| `.workbuddy/memory/MEMORY.md` | 长期记忆（每轮事故根因 + 教训） |
| `docs/DIRECTION1_PACK_PROTOCOL_V2.md` | 方向 1 协议文档 |
| `docs/VISUAL_ROUTING.md` | 可视化工具路由矩阵（唯一事实源） |
| `docs/DOCK_DESIGN.md` | dock 布局设计 |
| `docs/PANELS_CODEGEN_DESIGN.md` | Python codegen 设计 |
| `packages/app/src/seed.ts` | 内置 APP + few-shot 范例 seed（含 PATCH 升级路径） |
| `packages/app/src/connect.ts` | connect/disconnect/reconnect 逻辑 |
| `packages/dock/src/client/app-registry.ts` | mergeApps + entryArtifactOf + buildTileSourceForComponent |
| `packages/dock/src/client/AppListPanel.tsx` | 三列结构（col1/col2/col3 + 预览） |
| `packages/panels/src/presets/` | 38 预设 + 5 自管理 = 43 个预设组件 |
| `packages/artifact/assets/` | 4 个 few-shot 范例 HTML |
| `packages/mcp-runtime/src/index.ts` | McpRuntime + addServer/removeServer + callTool 埋点 |

## Suggested Skills

- **baoyu-design**：UI 原型设计（`designs/dock-app-redesign/` 已有批准的原型）
- **skill-creator**：如需创建新 skill

## 下一步建议

1. **先修 P0**（backend-console fetch 报错）——查 PB entry 是否被 PATCH 覆盖 + openloop.fetch 注入逻辑
2. P0 修好后 P1 应自动修复（rid 字段同步更新）
3. 统一审查 4 个范例的 runtime/fetch 一致性
4. 做左列卡片化（A 方案）
5. 完成后做一轮完整真机验收（叙事弧：system-overview → app-manager → event-log → agent-activity → system-map）
