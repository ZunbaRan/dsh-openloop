# Excalidraw dock 预览排查笔记（2026-09-02/03）

> 目的：跨 compact 恢复。结论都以此为唯一事实源，不依赖浏览器内存活状态。

## 现象
excalidraw App 在 dock 预览（资源列表点行 → 右列 iframe 预览）永远空画布/Connecting。
同一 App 在对话流内渲染正常。

## 已确认（死的结论）
1. 服务端链路全通：refresh → resourceUrl → documentUrl 三段 curl 全 200，CSP 正常。服务端排除。
2. 对话流与 dock 预览用同一 iframe 机制（同一 documentUrl 沙箱 iframe + 同一 AppBridge 桥）。
   对话流正常 → iframe/origin/CSP/沙箱均非根因。
3. 唯一差异 = toolCall 上下文：
   - 对话流：宿主 bridge 初始化后推 toolInput + toolResult（`ui/notifications/tool-result`）
   - dock 预览：不推任何场景数据
4. excalidraw App 是标准 MCP Apps 2.0 SDK 客户端：主动向 window.parent 发 `ui/initialize`，
   然后依赖宿主推送场景数据（read_checkpoint 的 id 来自 toolResult）渲染画布。
5. 推论：预览无 toolResult → App 无数据来源 → 空画布。修复方向在宿主侧
   （预览/pin 场景补推送，或 App 经 callToolUrl 自取）。

## 待验证（最后一击）
抓 dock 预览 iframe 重挂载时真实握手流量：
- App 发 `ui/initialize` 后宿主有没有应答？
- 是「握手成功但缺数据」还是「握手本身没成功」？

## 实测结果（2026-09-03 02:50，preview tab 真机）

**触发方式**：dock APP 页 → 点左列 excalidraw 行（选中应用）→ 点资源列表
`excalidraw:create-view`（mcp-app 行）→ 右列挂预览 iframe。
（注意：点 APP 行本身不挂 iframe，必须点组件资源行。）

**iframe→parent 全量流量**（探针 window.__mcpProbe，含旧探针双写）：
1. `ui/initialize` request（id=0，appInfo Excalidraw 1.0.0，protocolVersion 2025-11-21）——**只发一次，不重试**
2. `ui/notifications/initialized` ——一次
3. `ui/notifications/size-changed`（width:0 height:140/146）——App 活着，在等

**结论**：App 发完 initialize 后无限等待，没有任何重试或后续请求。
parent→iframe 方向无法从宿主侧 hook（跨 origin，见下），需查宿主源码确认
bridge 是否应答了 initialize / 是否推了数据。

**新发现：跨 origin**。预览 iframe src = `http://localhost:3080/api/openloop/mcp-app/document/<hash>`，
而宿主页面 = `http://127.0.0.1:3080`。cross-frame 属性访问被浏览器拦截
（hook contentWindow.postMessage 失败）。若宿主 bridge 有任何
`ev.origin === location.origin` 之类的同源校验，localhost vs 127.0.0.1 会 mismatch。
待查：宿主 AppBridge 的 origin 校验逻辑 + dock 预览挂载是否接了 bridge。

## 探针方法（重装探针即可，不依赖旧的）
在 preview tab 注入：hook iframe contentWindow.postMessage + window message 事件，
记录所有往返消息到 window.__mcpProbe 数组。然后点击 dock 左列 excalidraw 行
触发 iframe 重挂载，读 __mcpProbe。

## 环境事实
- 用户实例 3080（preview tab，tabId="preview"）
- Excalidraw iframe URL 形如 /api/openloop/mcp-app/document/<hash>
- 探针注入目标：preview tab 的顶层 window

## 根因确认（2026-09-03 03:30，代码+curl 实证，排查终结）

**不是握手问题，不是跨 origin 问题——是纯数据面缺失。**

1. **握手实际是成功的**：App 发 `ui/initialize` → 宿主应答 → App 才会发
   `ui/notifications/initialized`（MCP 标准握手顺序，探针看到了 initialized）。
   跨 origin 理论排除：`resolveAppDocumentUrl`（mcp-apps/src/security.ts:229）的
   localhost↔127.0.0.1 交换是**故意的**沙箱隔离技巧，且 transport 的
   `expectedOrigin` = `new URL(documentUrl).origin`（localhost），与 iframe 实际
   origin 一致，`isTrustedAppMessage` 校验通过。
2. **excalidraw App 的唯一数据入口**（App HTML 反编译实证，line 302 附近）：
   `e.ontoolresult → structuredContent.checkpointId` → 拿到 id 后经
   `callServerTool("read_checkpoint")`（callToolUrl 回环）自取场景渲染。
   toolInput 只用于首帧（对话流 args 里的 elements）；无 toolResult 则**永远空画布**。
3. **宿主侧差异**（mcp-apps/src/client/index.tsx:205-216）：`bridge.oninitialized`
   里 `if (!toolCall) return` —— 对话流推 toolInput+toolResult，预览/pin 什么都不推。
4. **callToolUrl 通道实测可用**：curl POST
   `/api/openloop/mcp-app/call/<token>` `{"name":"read_checkpoint",...}` 返回 200
   （`read_checkpoint` 是 appVisible 工具，非 403）——App 拿到 checkpointId 后自取的
   通路是通的。

**结论**：预览/pin 场景只要补推一个带 `checkpointId` 的 toolResult，App 即可自愈渲染。

### 修复方案（A，已验证可行性）

「最近一次调用」记录 + refresh 下发 + 客户端补推：

1. **mcp-runtime**：`McpAppGateway` 增加 per-(serverId, toolName, resourceUri) 的
   `lastInvocation` 记录（结构化结果，含 checkpointId）。记录挂点 =
   `preparePresentation → reference()`（mcp-tools 投影真实工具结果的唯一通道，
   mcp-tools/src/index.ts:41）。**坑**：refresh handler 也调 `reference(tool, 合成结果)`
   （index.ts:626，content:[] 的合成 McpCallResult）——必须区分真实调用与合成调用，
   否则 refresh 会用空结果覆盖记录（给 reference 加参数或在 callTool hydrate 路径记录）。
2. **refresh 端点**：响应增加可选 `invocation` 字段（最近一次真实调用的
   structuredContent/content）。
3. **mcp-apps 客户端**：`McpAppSandbox` 的 `oninitialized`：无 toolCall 但 resource 带
   `invocation` 时，推送 `sendToolResult(invocation)`（checkpointId 在
   structuredContent 里，App 拿到即走 read_checkpoint 自取）。
4. 不推 toolInput（elements 可能很大，且 read_checkpoint 回环已够）。

受益面：所有依赖 toolResult 自举的 MCP App（excalidraw/tldraw 类），预览 + pin tile
一起修好。曾调用过的工具预览有内容；从未调用过的工具预览维持空画布（语义正确：
该工具没有可展示的既有场景）。记录为会话级内存（globalThis 单例生命周期），
PB 持久化（pin 时捕获调用上下文进组件条目）留作后续增强。

## 修复候选位置（已定位）
- 记录挂点：`packages/mcp-runtime/src/index.ts` McpAppGateway.reference()（注意区分
  refresh 合成调用）+ refresh 响应
- 客户端补推：`packages/mcp-apps/src/client/index.tsx` McpAppSandbox oninitialized（:205）
- 类型：`packages/mcp-runtime/src/types.ts` McpAppResourceReference（+invocation 可选字段）
