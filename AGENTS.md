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

## qoder-canvas 标注迭代踩坑（2026-09-06 实测，勿再犯）

元素 pin 标注（点选/框选/划字 → 评注 → 结构化注入 composer）从 S3 做到 0.6.1 才顺滑，以下每条都付过真实代价：

1. **CSS 路径回查必须带 `:nth-of-type`，否则高亮框永远钉在第一个匹配元素**。无 class 的元素（table 的 td、stat-card 的子 div）domPath 形如 `table > tbody > tr > td`，`nodeEl.querySelector(domPath)` 永远命中第一个——**命中逻辑（elementsFromPoint）是对的，是高亮框画错位置**，用户看到的是「只能选第一格」。教训：「生成选择器 → 回查定位」的模式，选择器必须唯一命中自己；排查时把「命中」和「渲染」两段分开验证（静态 elementsFromPoint 探测正常 → 排除遮挡 → 必是渲染路径错）。
2. **容器级原生事件监听器，必须对内部浮层豁免**。悬浮评论面板渲染在画布滚动容器**内部**，面板上的 pointerdown/up 冒泡到容器的原生监听器触发点选——点保存按钮时 pointerup 先把 targets 重置为空，`saveAnnotation` 拿到空 targets 直接 return，表象是「评论了但什么都没发生」。修复：`e.target.closest('[data-annotation-float]')` 豁免。教训：浮层和监听同挂一个容器时，穿透不是「点到了下层元素」这么简单——它会篡改交互状态机。
3. **Lexical composer 的 markdown 插件会把 `[...]` 误识别为 link 语法**。注入草稿的头部 `[画布标注 · xxx]` 被吃掉、评注顺序错乱。教训：注入 composer 的文本避免 `[` 开头的行。
4. **标注是给 Agent 消费的结构化上下文，不是给人看的文本标签**（产品认知坑，用户原话「如果只是输入这几个字，我有必要做这么费劲的功能吗」）。`▸ rate 成功率` 这种标签对 Agent 零信息量；有效注入 = `canvasId@revision + <target type id path="nodes[i]" element="..." tag text>{节点完整 DSL 源码}</target>`——Agent 能直接定位 document 里改哪段。Qoder 叫「注释即 API 文档」。
5. **用户确认过的方案不许走捷径**（执行纪律）：确认了「composer 胶囊」方案，执行时偷懒做成「文本铺进输入框」，被用户当场指出「你明明跟我确认过，但是却完全没有执行」。形态级需求（布局/交互范式）必须在交付前对着确认记录逐条自检。
6. **两列常驻分栏被推翻**：用户的设计直觉是「画布铺满、面板悬浮窗（可拖拽/可关）」。不要自作主张用常驻右栏挤占主内容区。
7. **`!== undefined` 挡不住 `null`**：全局桥函数（`__openloopCanvasUpdate`）被测试脚本传 null 直接崩。对外暴露的 window 桥一律 `!= null` 宽松判空。
8. **排查方法论：干净探测实例 + 真实环境对比**。3085（同 profile、无历史数据）上 hover 链路完全正常，3080（用户真实会话）异常——环境差异定位法能快速把「代码 bug」和「环境/数据因素」分开；本次是代码 bug，但探测实例提供的「正常基准」是反推渲染路径的前提。

## 0.1.2 内核迁移踩坑（2026-09-04 实测，勿再犯）

1. **bsb 占位被双重计数**：0.1.1 时代 app 不认识 `--dsh-sidebar-width`，dock 的挤压规则 `#root { margin-right: bsb+dock }` 代办 bsb 占位；**0.1.2 的 frame 已原生以 `padding-right: bsb宽度` 承担**（实测 `0px 448px 0px 0px` 随 bsb 开合变化）——两道规则同读一个变量，bsb 宽被减两遍，聊天区 \(1280-448\times2-56=328\)px + 中间 448 空白。**修复（0.9.23）：margin 只管 dock 自己，bsb 交给 frame 原生 padding**。教训：**内核升级后必须重验「共存插件的占位由谁承担」——我们代办的布局职责可能被原生接管**。
2. **诊断这类「神秘空白」的对账法**：`elementFromPoint(空白中心)` 认元素 → 逐层量父链 `getBoundingClientRect` 宽度 → `getComputedStyle` 的 margin/padding/gridCols 做算术对账（\(1280-448\times2-56=328\) 一算即中）。勿先验假设是自家变量卡死——本次先改了 var 自愈（0.9.22，保留无害）才发现真因在 frame padding。
3. **0.1.2 新布局事实**：`pI_x6G_frame` = `56px minmax(0,1fr) 0px` 三列网格（sidebar/center/details）+ absolute overlayLayer；会话列有 `--dsh-conversation-column-width`（ResizeObserver 实测）+ 宽度拖拽手柄；web URL 带一次性 token（curl 直取会消耗，验证走 agent-browser）。
4. **第三方插件升级窗口期**：内核 rc 发布当天，dshmarket/better-sidebar 这类活跃插件通常几小时内出适配版；升级内核后 boot 硬失败先 `npm view <pkg> time` 看有没有 rc 后的新版，没有再考虑移除。
