# OpenLoop 插件生态 · 待办路线

> 状态：2026-08-26 起记录。已完成里程碑见 git log（dock 0.3.4→0.6.1 M1/M2/M3+批5、dsh-app 0.1.0→0.2.0、panels 0.4.0）。
> 优先级从上往下；「等用户」= 需要用户输入才能推进。

## 【当前批次】服务接管路线（2026-08-26 用户拍板方向）

**方向定调**：面板/看板/APP 数据由「必须存在的服务」接管 = PocketBase。不再把门面挂掉当降级路径设计，而是把它当**要修的故障**——监控/自愈/Agent 可诊断是 base 能力。具体架构用户还没想好，先按项独立推进、逐项验收。

- [ ] **P1 · Registry 刷新机制**（最痛：agent 注册 APP 后 dock 不显示，须 F5）：
  - dock 侧轮询 `/openloop/app/registry`（30–60s，降级态拉长间隔）+ `POST /openloop/app/invalidate` 端点（agent 操作完主动踢）
  - agent 流程结尾提示调 invalidate（app-backend skill 文档写明）；SSE 作后续优化
- [ ] **P2 · PB 进程守护**（监控 + 重启）：
  - dsh-app 内置 watchdog：健康轮询（/api/health 间隔 15–30s）、异常退出自动重启（指数退避，连续 3 次失败转 failed + 状态上报）
  - backend.status() 扩展 `restarts / lastError / lastRestartAt`
  - 单测：杀进程 → 自动拉起 → 数据仍在（复用 pb.e2e 结构）
- [ ] **P3 · 自愈 skill**（协助 DSH 宿主 agent 发现并修复 PB 故障）：
  - skill `openloop-app-doctor`：症状→诊断→修复决策树（未启动→等/重启；下载失败→网络/手动二进制；端口占用/数据目录权限→提示路径）
  - app_backend 增 action：`backend_health`（详细状态）/ `backend_restart`（手动重启）
  - 错误消息面向 Agent 自修正（既有纪律）
- [ ] **P4 · 存储语义收紧**（写路径 server-first）：
  - dock store 写操作：先推门面（短超时），失败才写 localStorage 镜像 + toast 提示
  - localStorage 定位从「兜底」改为「缓存镜像」（门面恢复后自动对齐——下次启动时门面权威载入已覆盖大半，补一个恢复后的主动回拉）
  - 看板数据读取：启动时门面权威载入逻辑不变
- [ ] **P5 · 面板持久化迁移评估**（workspace 文件 → PB，服务接管方向的自然延伸）：
  - 评估 `openloop-panels/*.json` 是否迁入 PB（agent 读写通道改变、panelFile 调试通道保留与否、与 workspace 文件的双写策略）
  - 结论先写回 TODO 再动手

## 平台里程碑（APP_PLATFORM_DESIGN §9 对应）

- [ ] **内置 APP 注册进后端**：openloop:* 组件（33 预设）与 API 写进 PocketBase registry——北极星载体（「自证 + 目录」双意义）。P1 完成后 agent 注册即可见
- [ ] **北极星 demo**：后端已落地（dsh-app），可开始规划；用户明示「很多还没想清楚」，边做边定
- [ ] **方向 1 · 第三方包协议**（双形态：全包 / 纯 API 包）：**等用户说明协议细节**——协议定了 entry 契约才能最终敲定（「待生成」态的解禁依赖它）

## 低优先 / 观察池

- [ ] MCP 设置页行级「测试」就地结果
- [ ] PocketBase 升级流程（pin v0.39.10；升级需重验 superuser CLI / collections API 形态）
- [ ] dsh-app schema migration 机制（真实演进需求出现再做）

## 已确认事实（实证沉淀，勿再重复排查）

- **DSH agent 读面板三通道**（2026-08-25 实证）：① `openloop-panels/*.json` workspace 文件（agent read 工具直读）② dock 看板+数据快照经 `app_backend load_dock_state`（M3 后权威在 PB）③ 组件源码在 profile node_modules src/ + custom code 内嵌 panel JSON。唯一盲区：未 persist 未 pin 的瞬时面板（但其 meta 在 session 日志）
- **DSH webServer SPA fallback**：未知路径返回 200 + text/html——所有自建路由的消费方必须 content-type 判 JSON（dock backend-sync 已修；panels useAppEndpoint 同款守卫）
- **激活三层存储**：profile `package.json` bundles 只是清单，实际激活看 `cordis.patch.yml`；新装插件必须 bundles 登记（web profile 曾漏 dsh-app 踩过）
- **pnpm 残留**：`_tmp_<pid>_<hash>` 为 pnpm 原子写泄漏（path-temp 库），gitignore 已覆盖，攒多清一次

## 已完成（按时间倒序，详情见 git log）

- 2026-08-25 批 5：本地后端预设族 7 预设 + 5 端点（panels 0.4.0 / app 0.2.0 / dock 0.6.1，`233f376`）
- 2026-08-25 dock M3：后端同步 + registry 合并 + 降级（dock 0.6.0，`560a1b3`）
- 2026-08-25 dsh-app MVP：PocketBase 门面 + tool/skill/路由（`731574d`）
- 2026-08-25 dock M2：APP tab + pin（`c0b3011`）；dock M1：Dock 2.0 shell（`11011a3`）；0.3.4 push 通道（`32d6317`）
- Registry 刷新 / entry 渲染闭环：原「M3+ 补强」条目并入上方 P1 / 方向 1
