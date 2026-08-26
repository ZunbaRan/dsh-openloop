# OpenLoop App Doctor（本地后端自愈）

> 工具：`app_backend`（actions: `backend_health` / `backend_restart`）· 目标：PocketBase 门面是必须存在的服务——挂了要修，不是绕过

## 何时使用

- 任何 app_backend 调用报「backend is not running / failed / did not become ready」
- 用户报告：dock 降级提示条（「应用后端暂不可用」）、APP 页空白、看板数据不同步
- 例行健康检查（用户问「后端状态如何」）

## 诊断流程（按序执行）

1. **先问状态**：`{action: "backend_health"}`——返回 state / restarts / lastError / hint
2. **按 state 分诊**：

| state | 含义 | 动作 |
|---|---|---|
| `running` | 健康 | 无需处理；restarts>0 说明 watchdog 自动修过（可告知用户） |
| `starting` | 启动中（首启要下载 ~12MB 二进制） | 等 30s 再查一次；仍 starting → backend_restart |
| `failed` | 启动失败或熔断（连续 3 次重启失败） | 读 lastError 按下表对因；处理后 `backend_restart` |
| `stopped` | 被手动停止 | `backend_restart` 直接拉起 |

## failed 的对因表（读 lastError 关键词）

| lastError 关键词 | 根因 | 修复 |
|---|---|---|
| `failed to download` / `network` | 首启下载二进制失败 | 检查网络（需访问 github.com）；或让用户手动放二进制并设 `OPENLOOP_PB_BIN=<路径>` 后 backend_restart |
| `no prebuilt PocketBase asset` | 平台无预编译包 | 用户手动下载对应平台二进制 → `OPENLOOP_PB_BIN` |
| `superuser upsert failed` | PB 数据目录损坏/权限 | 检查 `$DSH_HOME/data/openloop-app/` 权限；极端情况备份 `pb_data` 后删除再 restart（数据会重建为空——先向用户确认） |
| `did not become healthy` | serve 起了但 health 不通 | 多为端口被占/防火墙——`lsof -ti tcp:<端口>` 查占用；或直接 backend_restart（换随机端口） |
| `giving up after N consecutive` | watchdog 熔断 | 对因修复后 `backend_restart`（restart 会重置计数） |
| `unzip` | 系统缺 unzip | 用户手动解压 zip 到 `$DSH_HOME/cache/pocketbase/<version>/` 确保 `pocketbase` 可执行 |

## 修复后验收

1. `backend_health` → `state: running`
2. `list_apps` 能应答
3. 若之前 dock 有降级提示条：约 60s 内自动恢复（dock 轻探 60s 间隔），或让用户刷新页面立即恢复

## 硬规则

- **不要绕过门面直连 PocketBase 端口**（token 只在插件进程内；直连无凭据也无意义）
- **不要删 pb_data 目录**除非用户明确确认可以丢弃数据（SQLite 就是全部业务数据）
- watchdog 已经在自动重启（2s→4s→8s 退避，3 次熔断）——你处理的一般是熔断后的残余或首次启动失败
