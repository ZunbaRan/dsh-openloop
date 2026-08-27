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
- [x] **P4 · 存储语义收紧**（2026-08-26 完成，dock 0.7.0）：写路径 server-first（推送失败 → pendingSync 标记 + localStorage 镜像；连续 2 次失败 → 降级提示条）；启动决策 reconcile 优先于权威载入（镜像含未对齐修改 → 回推门面）；P1 轻探循环兼作恢复探测（门面恢复 → revalidateBackend 对齐 + 撤降级）。localStorage 定位注释全部改为「缓存镜像」
- [x] **P5 · 面板持久化迁移评估**（2026-08-26 结论：**暂不迁移，保持 workspace 文件**）：
  - **现状事实**：panel persist 落 `<workspace>/openloop-panels/*.json`（ctx.fs + sandbox seam，按项目隔离）；agent 可用 read/write 工具直接编辑（用户已在 dsh/ 目录实测 5 个面板 JSON）；panelFile 调试通道（read→改→write→重渲染）依赖此布局
  - **迁移收益**：单一存储（与 boards/tiles 同库）；跨 workspace 可见（「面板库」语义）
  - **迁移代价**：① agent 读写通道从 fs 工具改为 app_backend action（新增 panel CRUD 四个 action + skill 更新）② panelFile 调试闭环重做或废弃 ③ 现有面板文件的一次性迁移脚本 ④ panels 插件对 dsh-app 的反向依赖（现在是零依赖——panels 不该知道 app 存在；需经可选 inject/window 桥，复杂度实打实）⑤ 失去「git 可 diff 的 JSON 文件」调试性
  - **裁定**：当前痛点（用户已满意：agent 能读写、能 pin、dock 有快照）不成立；迁移唯一动机是「跨 workspace 面板库」——等真实需求出现（如多项目复用面板）再做，届时按「新增 PB 通道 + 文件通道并行、skill 指导 agent 按需选择」渐进式迁移，不搞一刀切
  - **重新评估触发条件**：用户提出跨项目共享面板需求 / panels 文件量失控 / 需要面板版本历史

## 平台里程碑（APP_PLATFORM_DESIGN §9 对应）

- [x] **内置 APP 注册进后端**（2026-08-26 完成，app 0.3.1 `e0dc3af`）：seed 33 组件 + 3 API，幂等（用户修改不覆盖），三方 kind 表一致性测试锁定（panels=dock=app）
- [x] **北极星 demo 剧本**（2026-08-26，docs/NORTH_STAR_DEMO_SCRIPT.md）：形态 B 三层递进（内置目录 → agent 生成 → 用户组装）+ 自愈彩蛋；双场景节奏（团队完整版 6min / 社区剪辑版 2min）；验收清单 + 风险规避表已备。**正式录制前置**：真机过一遍验收清单（7 项）
- [ ] **北极星 demo 录制**：按剧本走查 + 录屏（待用户安排）
- [ ] **方向 1 · 第三方包协议**：「刚刚好」版设计已完成（docs/DIRECTION1_PACK_PROTOCOL.md，2026-08-27）——**核心洞察：包是安装时概念**（manifest 引用文件 + agent 即安装器 + 安装后组件与 agent 生成物同形态，零新运行时机制）。实施仅 ~2.5h：dock entryArtifactOf（artifact 形态 entry）+ 安装 skill + 示例包；可选 install_manifest action。**待用户拍板后开工**

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
