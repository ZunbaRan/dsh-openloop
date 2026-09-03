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

## 联动特性踩坑（2026-09-04 实测，勿再犯）

1. **`useEffect` 依赖里放对象/数组字面量 → 无限循环**：`useLinkHighlight(tiles)` / `useStreamLink(payload)` 内部 effect 依赖 `tiles`/`payload`，而 `TileGrid` 每次渲染传入新字面量 → effect 反复跑、反复 postMessage/setState → React Maximum update depth exceeded 白屏。**修复：依赖用稳定原始值（`tiles.map(t=>t.id).join(',')`、`payload==null`），数组本体改用 ref 读**。教训：给「宿主每渲染都新建字面量」的消费方写 hook，依赖只能是原始值。
2. **面板预览代码 1:1 搬进 dock 必崩**：panels 的 iframe 预览作用域只有 presets，`TileGrid`/`tileUrl`/widgetRuntime 全不存在；且 panels 契约包对 widget 是 external——bundle 里 `widgetContract_1.default` 是 undefined，`.default.safeParse` 直接 TypeError。**修复：作用域用 `LINK_SCOPE`（契约 + TileGrid + tileUrl），iframe html 预校验字符串字面量、契约 parse 加防御**（undefined 走兜底不抛）。教训：跨包搬运行时代码必须核对目标作用域 + external 依赖在目标 bundle 的真实形态。
3. **Panels 类实例在 render 期间新建 → 每次渲染全量卸载重建**：`TileGrid` 原来每次渲染都 `new Panels(document.createElement('div'))` + `setDocument`，即使 tiles 没变也全部 dispose→重建，点击后 DOM 闪烁。**修复：`useRef` 持久化 Panels 实例，未初始化时同步建一次（无闪烁窗口），之后 `setTiles` 增量更新；dispose 走 effect cleanup 防 StrictMode 双重挂载泄漏**。
