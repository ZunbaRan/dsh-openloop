# AGENTS.md — dsh-visual-plugins 项目协作约定

> 工作区全局背景（路线图、包矩阵、架构踩坑、发布纪律）见上层 `../AGENTS.md`，本文件只写**本仓库的协作模式与环境已知问题**，二者冲突时以本文件为准（更具体）。

## 多 Agent 协作模式（2026-09-02 用户拍板；2026-09-02 移除 codebuddy 后换渠道）

### 角色分工

- **主会话（orchestrator）**：负责任务拆解、安排规划、验收把关。不直接写主要实现代码。跑 **tokenhub provider 的 `glm-5.2`**。
- **子 agent（worker）**：通过 subagent / dynamic workflow / swarm 执行具体开发。跑 **tokenhub provider 的 `glm-5.3-flash`**。

### 执行规则

1. **默认走子 agent**：除「极小改动」外，一切开发事项都安排给子 agent 执行。
   - 极小改动的界定：编辑两行已知问题修复、纯文档编辑、单行配置变更。
2. **worker 模型**：统一配置 **tokenhub provider 的 `glm-5.3-flash`**（用户 2026-09-02 拍板；与 orchestrator 的 `glm-5.2` 同走 tokenhub 渠道）。
   - subagent 调用：`model: "tokenhub/glm-5.3-flash"`（支持 thinking 后缀，如 `:low`）。
   - workflow 子 agent：agent options 里同样传该 model 字符串。
3. **验收责任在主会话**：子 agent 返回后必须实测验收（跑测试 / curl 真机 / bundle grep），不凭子 agent 自述放行。
4. **并行优先**：可拆分、无依赖的子任务并行分发；有依赖的用 pipeline/lanes 串行。
5. **发布纪律不豁免**：子 agent 产出的变更仍走 `pnpm check` → bump → pack-all → 双 profile 重装 → 真机验收 → `git commit -F` 流程（见上层 AGENTS.md）。

### 首次验证

2026-09-02 已跑通该链路：smoke test 子 agent 成功返回并写出验证文件，本文件即该模式的第一个落地产物。

### 渠道变更说明（2026-09-02）

协作模式最初建立在 codebuddy provider（`codebuddy/glm-5.3` + `codebuddy/glm-5.3-flash`）上，因 codebuddy 渠道已被用户移除，模型路由迁移到 tokenhub（orchestrator=`glm-5.2`、worker=`glm-5.3-flash`）。原 codebuddy 配套的 `patches/agent-sdk-teardown-crash.patch` 及其重打脚本已一并移除（补丁只为修 codebuddy 的 agent-sdk teardown 崩溃，渠道移除后失效）。

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

**路由验证结论（2026-09-01）**：subagent、dynamic workflow（runs.run options 同字段）、swarm（agent-file frontmatter 声明 model，内部转 `--provider <p> --model <m>`）三条通道此前在 codebuddy 上实测路由成功。渠道迁移到 tokenhub 后沿用同一套字段，需按 `tokenhub/glm-5.3-flash` 重新验证。

> codebuddy 渠道已移除（含 `patches/agent-sdk-teardown-crash.patch` 与重打脚本），原「agent-sdk teardown 崩溃」一节随渠道删除，不再适用。
