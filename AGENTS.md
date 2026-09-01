# AGENTS.md — dsh-visual-plugins 项目协作约定

> 工作区全局背景（路线图、包矩阵、架构踩坑、发布纪律）见上层 `../AGENTS.md`，本文件只写**本仓库的协作模式与环境已知问题**，二者冲突时以本文件为准（更具体）。

## 多 Agent 协作模式（2026-09-02 用户拍板）

### 角色分工

- **主会话（orchestrator）**：负责任务拆解、安排规划、验收把关。不直接写主要实现代码。跑 **codebuddy provider 的 `glm-5.3`**。
- **子 agent（worker）**：通过 subagent / dynamic workflow / swarm 执行具体开发。跑 **codebuddy provider 的 `glm-5.3-flash`**。

> **硬前提**：整套模式建立在 codebuddy provider 上，因此 `patches/agent-sdk-teardown-crash.patch`（见下节）是模式可用的前置条件——不打补丁，provider 每回合结束就崩，orchestrator 与 worker 都活不过一个回合。

### 执行规则

1. **默认走子 agent**：除「极小改动」外，一切开发事项都安排给子 agent 执行。
   - 极小改动的界定：编辑两行已知问题修复、纯文档编辑、单行配置变更。
2. **worker 模型**：统一配置 **codebuddy provider 的 `glm-5.3-flash`**（用户 2026-09-02 拍板；与 orchestrator 的 `glm-5.3` 同走 codebuddy 渠道——这正是必须花大功夫修复 agent-sdk teardown 崩溃的原因）。
   - subagent 调用：`model: "codebuddy/glm-5.3-flash"`（支持 thinking 后缀，如 `:high`）。
   - workflow 子 agent：agent options 里同样传该 model 字符串。
3. **验收责任在主会话**：子 agent 返回后必须实测验收（跑测试 / curl 真机 / bundle grep），不凭子 agent 自述放行。
4. **并行优先**：可拆分、无依赖的子任务并行分发；有依赖的用 pipeline/lanes 串行。
5. **发布纪律不豁免**：子 agent 产出的变更仍走 `pnpm check` → bump → pack-all → 双 profile 重装 → 真机验收 → `git commit -F` 流程（见上层 AGENTS.md）。

### 首次验证

2026-09-02 已跑通该链路：smoke test 子 agent 成功返回并写出验证文件，`patches/` + 本文件即该模式的第一个落地产物。

## 已知问题（环境级）

### pi-messenger-swarm harness server 启动/spawn 两个坑（2026-09-01 实测修复）

**坑 1：包更新后 server 起不来**（报 `server failed to start on http://127.0.0.1:9877`）：`server.js` import `@earendil-works/pi-coding-agent`，但 `~/.pi/agent/npm/node_modules` 下没有该包。修复：

```bash
ln -sfn /Users/loloru/.nvm/versions/node/v22.19.0/lib/node_modules/@earendil-works/pi-coding-agent \
  /Users/loloru/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent
```

**坑 2：spawn 立即 failed**：`dist/swarm/spawn.js` 硬编码 `spawn('pi', ...)`，而 `pi` 二进制在 `~/.nvm/versions/node/v22.19.0/bin/`（默认 PATH 用的是 v22.22.2，没有 pi）。修复：启动 harness server 时把该 bin 前置到 PATH：

```bash
export PATH="/Users/loloru/.nvm/versions/node/v22.19.0/bin:$PATH" && pi-messenger-swarm --start
```

**路由验证结论（2026-09-01）**：subagent（`model: "codebuddy/glm-5.3-flash"`）、dynamic workflow（runs.run options 同字段）、swarm（agent-file frontmatter `model: codebuddy/glm-5.3-flash`，内部转 `--provider codebuddy --model glm-5.3-flash`；spawn 无 `--model` CLI 旗标）三条通道均实测路由成功，子 agent 环境变量均为 `PI_PROVIDER=codebuddy` + `PI_MODEL=glm-5.3-flash`。

### agent-sdk teardown 崩溃（已本地补丁，非本仓库代码问题）

**现象**：使用 codebuddy provider（AskCodebuddy / pi-codebuddy-sdk 扩展）时，回答正常返回，但回合结束后 pi 整个进程退出，报：

```
pi exiting due to uncaughtException: Error: Transport not started
    at ProcessTransport.writeLine (@tencent-ai/agent-sdk/lib/transport/process-transport.js)
    at ProcessTransport.sendControlErrorResponse (...)
    at ProcessTransport.handleMcpMessageRequest (...)
```

**根因**：CodeBuddy CLI 子进程退出后，收尾的 MCP 控制响应仍尝试写 stdin → 同步抛 `Transport not started`（或异步 EPIPE，stdin 无 error 监听）→ 从 catch 块内二次抛出 → uncaughtException 杀死宿主。

**修复**：本地补丁两处——①`sendControlResponse`/`sendControlErrorResponse` 写失败降级为日志（`tryWriteLine`）；②spawn 后给 `process.stdin` 挂 error 监听走优雅关闭。补丁内容见 `patches/agent-sdk-teardown-crash.patch`。

**重打方法**（pi 更新扩展覆盖文件后执行）：

```bash
./patches/apply-agent-sdk-patch.sh
```

脚本幂等（已打则跳过）、自动备份原始文件、应用后 `node --check` 验证。上游若修复（sendControlErrorResponse 内部容错 + stdin error handler），可弃用本补丁。
