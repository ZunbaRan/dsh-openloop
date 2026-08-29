# 方向 1 · 第三方包协议 v2（MCP Apps 2.0 底座）

> **状态**：已拍板实施（2026-08-28 用户四轮修正定稿，2026-08-29 落地核心链路）
> **取代**：v1 草案（`DIRECTION1_PACK_PROTOCOL.md`，安装时概念——已废弃，保留作历史参考）
> **定位**：第三方开发者按此规范交付「包」接入 DSH 工作台

---

## 1. 核心模型：一句话

**第三方包 = 一个实现了 MCP Apps 2.0 的 server；DSH 是它的 client + 容器。**

不自造协议。initialize 握手、listTools 发现、`_meta.ui` 资源绑定、`readResource` 取数、沙箱渲染、AppBridge 回环调用——全部复用 MCP 官方协议与官方 SDK（`@modelcontextprotocol/ext-apps`）。

```
connect（一次性，Agent 执行）:
  app_backend connect_server { serverId, server: <mcp.json 条目> }
    → 校验条目 → 写 user 作用域 mcp.json（原文，${ENV} 读取时插值）
    → 热激活 runtime（web 不重启；重复 connect = 重连语义）
    → listTools 探活（失败容忍：state disconnected，惰性重连自愈）
    → app 壳（kind: thirdparty）+ 有 ui binding 的工具落 mcp-app 引用组件

render（每次打开）:
  容器（对话流卡 / dock tile）按 (serverId, toolName, resourceUri) 引用
    → POST /api/openloop/mcp-app/refresh → 签发 authority token（TTL 1h，LRU 64）
    → GET resource/<token> 取 HTML（MIME/大小/CSP 校验在 runtime readAppResource）
    → opaque-origin 沙箱 iframe + AppBridge（size / displayMode / readResource / callTool）

API 通道:
  沙箱内 App → AppBridge.oncalltool → POST /api/openloop/mcp-app/call/<token>
    → runtime.callTool（仅 appVisible 工具）→ 凭据归 server 自管，永不过 DSH
```

## 2. 三个 surface 裁决（形式统一的关键）

| surface | 地位 |
|---|---|
| **HTML 沙箱**（本协议唯一 surface） | 第三方组件一律以 MCP App 资源（`ui://` + `text/html;profile=mcp-app`）交付；渲染在 opaque-origin iframe，CSP 由宿主从签名元数据生成 |
| panel-widget（预设拼接） | **退出第三方协议**——保留为 DSH 内部 codegen 体系（panels 预设 + Python builder），服务「Agent 给用户生成组件」 |
| panel-react 源码形态 | 第三方形态 = 沙箱 HTML 内引用预置库 react18（不引入第二种安全模型） |

「纯 API 包」零额外设计：只有 tools 没有 ui binding 的 MCP server 就是它。

## 3. 第三方开发者要做什么

1. **实现一个 MCP server**（Streamable HTTP 或 stdio），实现 initialize / tools/list / tools/call；需要 UI 的工具在 `_meta.ui.resourceUri` 声明 `ui://` 资源绑定
2. **提供 App 资源**：`resources/read` 返回 `text/html;profile=mcp-app` 的自包含 HTML（≤8MB；可用官方 SDK `@modelcontextprotocol/ext-apps` 构建）
3. **交付一份 connect 信息**给用户：serverId + mcp.json 条目（`{ type: "http", url: … }`）。没有包管理器、没有市场、没有签名——用户让 Agent「接入这个 server」即完成安装

DSH 侧零文件复制：HTML 内容**永不落盘**，每次渲染经 refresh 端点现取（render-time fetch）。

## 4. DSH 侧实现组件（2026-08-29 落地）

| 组件 | 位置 | 状态 |
|---|---|---|
| 连接热加载（addServer / removeServer / onServersChanged） | mcp-runtime | ✅ `1255eee` |
| 工具动态同步（新 server 补注册 / 移除清理） | mcp-tools | ✅ `1255eee` |
| 共享沙箱核心提取（McpAppSandbox：refresh→fetch→iframe→AppBridge） | mcp-apps client | ✅ |
| 独立资源视图 McpAppResourceView（pin 入口，无工具调用上下文） | mcp-apps client（mcp bundle re-export） | ✅ |
| connect_server action（写盘 + 热激活 + 引用组件落库） | app（`app_backend`） | ✅ |
| mcp-app tile kind（引用形态 pin + 渲染） | dock + app facade（coerceDockState） | ✅ |
| 启动容错（连不上不退进程，server 粒度降级） | mcp-runtime + mcp-tools | ✅（2026-08-27，前置） |

## 5. 硬边界（安全模型）

- **沙箱是第三方代码的唯一 surface**：CSP 由宿主从 `_meta` 生成（资源域名/连接域名/帧域名白名单经校验，不能请求外部 origin）；App 无法访问宿主 DOM / 存储
- **凭据归 server 自管**：DSH 不持第三方凭据（方向 2 的 registerApi/set_api_key 只服务本地后端，不进本协议）；沙箱回环调用走短时效 authority token（64-hex，TTL 1h），且仅限 appVisible 工具
- **连接失败停在 server 粒度**：MCP server 是可选外设，某个 server 死了只是那一组工具暂时没有，绝不拖死 `dsh web`（启动容错契约，2026-08-27）
- **错误消息面向 Agent**：connect 的校验失败带期望形态 + 实际值，可自修正闭环

## 6. 明确不做（继承 v1「刚刚好」原则）

- ❌ 签名 / 验签 / 发布者指纹 / 市场目录 / 包管理器（本地单用户，手动接入即信任）
- ❌ DSH 侧资源缓存与复制（render-time fetch，server 即真相源）
- ❌ 第三方 panel-widget 通道（预设拼接是内部体系）
- ❌ v1 的 install_manifest / 安装 skill（connect_server 取代）

## 7. 验收（真机）

对象 = **tldraw + excalidraw 真机**（不自建 demo 包）：

1. **connect**：Agent 调 `connect_server` 接 excalidraw（`https://mcp.excalidraw.com`）→ 不重启 web：工具注册、APP 页出现 thirdparty 壳与 mcp-app 组件
2. **对话流回归**：调 tldraw / excalidraw 工具 → uiResource 沙箱渲染（既有能力，防回归）
3. **dock pin**：APP 页 pin mcp-app 组件 → tile 渲染时经 refresh 取资源 → 重启 web 后 tile 仍在且重新取数
4. **容错**：tldraw（127.0.0.1:39512 未开）→ web 存活 + tile 显示可重试错误态
