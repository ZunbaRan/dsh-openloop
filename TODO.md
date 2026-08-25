# OpenLoop 插件生态 · 待办路线

> 状态：2026-08-25 起记录。已完成里程碑见 git log（dock 0.3.4 → 0.6.0 M1/M2/M3、dsh-app 0.1.0）。
> 优先级从上往下；「等用户」= 需要用户输入才能推进。

## 当前收尾（未提交）

- [ ] **dock M3 commit**：代码完成（66/66 测试绿）+ SPA fallback 判定修复 + web profile bundles 登记，待真机验收（重启后 localStorage.clear() 数据仍在）通过后提交
- [ ] M3 验收剧本：Agent CRUD（Prompt 1/2/3 已过）✓ 2026-08-25 · 持久化切门面验证 · 降级提示条形态验证

## M3+ 补强（用户已点头方向，待选型/排期）

- [ ] **Registry 刷新机制**（agent 注册 APP 后 dock 工作台不自动出现，需刷新页面）：
  - 方案 A：dock 侧轮询 `/openloop/app/registry`（30–60s）
  - 方案 B：agent 调 `POST /openloop/app/invalidate` → dock 刷新（主动语义最精确）
  - 方案 C：SSE 推送（需确认 DSH webServer 支持流式响应）
  - 倾向：A+B 双轨（兼容性最好）；SSE 作后续优化
- [ ] **entry 渲染闭环（半条命）**：门面 `register_component` 的 `entry` 严格接 PanelDefinition schema（fail-closed 校验）+ dock AppDetail 对合法 entry 直接 `PanelSurface` 渲染 + pin 解禁。估时半天。前置：门面 entry 现在是自由 JSON，dock 只显示「待生成」

## ✅ 已完成（2026-08-25 下午批）

- [x] **本地后端预设族（7 个预设 + 5 个端点）**：panels 0.4.0（pb-stats / db-browser / storage-usage / api-credentials / sessions-stats / mcp-status / plugin-registry，批 5）+ dsh-app 0.2.0（pb-stats / collections / collections/:name/records 分页筛选 / storage-usage / credentials / sessions-stats 端点）+ dock 0.6.1（PRESET_INFO 7 条目）+ codegen 四件套同步。弱推的日志尾巴/定时任务跳过（无稳定日志位置 / DSH 无定时任务系统，没数据源）

## 平台里程碑（APP_PLATFORM_DESIGN §9 对应）

- [ ] **内置 APP 注册进后端**：openloop:* 组件（26 预设）与 API 写进 PocketBase registry——北极星载体（「自证 + 目录」双意义）
- [ ] **北极星 demo**：后端已落地（dsh-app），可开始规划；用户明示「很多还没想清楚」，边做边定
- [ ] **方向 1 · 第三方包协议**（双形态：全包 / 纯 API 包）：**等用户说明协议细节**——协议定了 entry 契约才能最终敲定

## 低优先 / 观察池

- [ ] MCP 设置页行级「测试」就地结果
- [ ] panels P1 组合子（flow/timeline/comparison 已进 codegen 库的按需补齐）
- [ ] PocketBase 升级流程（pin v0.39.10；升级需重验 superuser CLI / collections API 形态）
- [ ] dsh-app schema migration 机制（真实演进需求出现再做）

## 已确认事实（2026-08-25 实证，勿再重复排查）

- DSH agent 读面板数据的通道：见 docs/README 或 AGENTS 汇报（PanelsStore 落盘 + app_backend load_dock_state + session 日志）——**agent 可完整读到 PanelDefinition JSON、custom widget 源码、dock 看板数据**；读不到的唯一形态是「未 persist 且未 pin 的瞬时面板」（只存在于浏览器内存）
