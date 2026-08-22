# DSH Panels 插件实现参考笔记

> **用途**：为 `@openloop/dsh-panels`（`packages/panels/`）落地提供 DSH 插件各侧面的标准写法。
> **调研方式**：只读 `dsh-visual-plugins/packages/` 下已工作的插件代码 + 对应 node_modules 类型定义。
> **关联文档**：设计冻结文档见 [`DSH_PANELS_DESIGN.md`](./DSH_PANELS_DESIGN.md)（§4.1 包结构、§9 路由、§11 存储、§8 沙箱）。
> **来源约定**：`mcp-runtime` = `packages/mcp-runtime/src/index.ts`；`artifact` = `packages/artifact/src/index.ts`；`shell.ts` = `packages/artifact/src/shell.ts`；`declarative` = `packages/declarative/src/index.ts`（client 为 `src/client/index.tsx`）；`theme-client` = `packages/theme/src/client.tsx`。

---

## 1. webServer.register：签名与最小示例

### 1.1 签名（类型定义权威）

来源：`packages/mcp-runtime/node_modules/@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts`（`mcp-runtime/index.ts:5` 导入 `WebServer` 类型）。

```ts
type WebRouteKind = 'exact' | 'prefix'          // exact=pathname 完全匹配；prefix=匹配 p 与 p/<anything>
interface WebRoute {
  kind: WebRouteKind
  path: string                                  // 绝对路径名，无尾部斜杠
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}
register(route: WebRoute): () => void           // 返回 disposer；重复 (kind, path) 注册抛错
registerUpgrade(route: WebUpgradeRoute): () => void
registerFallback(handler): () => void           // 唯一 fallback 席位（SPA dist 服务器），二次注册抛错
tapIndex(transform: (html: string) => string): () => void
```

- `ctx.webServer` 由 `declare module '@deepseek-ai/cordis'` 挂到 `Context`（同文件 index.d.ts:14-18）。
- **webServer 本身不 serve 文件**（"Knows no harness concepts and serves no files"）——静态资产的分发要在 handler 里自己读文件写 `res`。
- 路由注册顺序不影响匹配：exact 表先查、prefix 最长前缀胜出；无路由认领的请求走 fallback（组合层持有）。

### 1.2 最小示例（prefix 路由 + disposer 接线）

出处：`mcp-runtime/index.ts:436-443`（`McpAppGateway.register`）。

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'

class PanelsAssets {
  constructor(private readonly webServer: WebServer) {}
  register(ctx: Context): void {
    ctx.effect(() => this.webServer.register({
      kind: 'prefix',
      path: '/openloop/runtime',               // 绝对路径、无尾斜杠；与 DSH_PANELS_DESIGN §9 路由一致
      handler: (req, res) => this.handle(req, res),
    }), 'panels: runtime assets')
  }
  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 静态资产：Cache-Control: public, max-age=31536000, immutable（D10 共享 hashed URL 策略）
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    // …按 contentHash 从内存/磁盘读取，res.end(...)
  }
}
```

### 1.3 下发 CSP header

出处：`mcp-runtime/index.ts:505-511`（document 路由）。CSP 作为 `Content-Security-Policy` 响应头下发；生成函数 `appContentSecurityPolicy(meta)` 在 `mcp-runtime/src/validation.ts:106-131`（默认 `default-src 'none'`，按 ui meta 里的 `csp.resourceDomains/connectDomains/frameDomains` 追加白名单）。

```ts
res.statusCode = 200
res.setHeader('Content-Type', 'text/html; charset=utf-8')
res.setHeader('Content-Security-Policy', appContentSecurityPolicy(authority.resource._meta))
res.end(authority.resource.html)
```

### 1.4 panels 落地的坑

- **重复路由 = 崩溃**：`(kind, path)` 唯一是组合级契约，`/openloop/runtime` 与 `/openloop/packs` 若与既有插件撞前缀（尤其 `kind: 'prefix'`）直接抛错。panels 是唯一 owner，最好沿用设计文档 §9 的两个明确前缀。
- **注册必须包在 `ctx.effect` 里**：用 `ctx.effect(() => this.webServer.register(...), label)` 拿 disposer 做生命周期回收；裸调用会在插件卸载时漏路由。
- **动态内容记得 `Cache-Control: no-store`**（mcp-runtime/index.ts:490），只有 immutable 资产才能开长缓存。
- **path 契约**：绝对路径、无尾部斜杠；handler 拥有完整响应生命周期（可挂 SSE），别在 handler 外泄漏响应。

---

## 2. tool 注册：最小示例

### 2.1 模式总览

入口 `ctx.tools.register(defineTool({...}))`；`defineTool` 来自 `@deepseek-ai/dsh-tools`。ToolDefinition 要求 `output`（mandatory canonical output declaration）+ `execute`。

出处：`artifact/index.ts:21-59`（最完整）、`declarative/index.ts:11-33`（更简）。

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'

export const PANEL_TOOL = 'panel'                       // tool 名常量；client 注入 key 必须逐字一致

ctx.tools.register(defineTool({
  name: PANEL_TOOL,
  description: 'Render a reusable dashboard panel… Load the openloop-dsh-panels skill first.',
  parameters: {                                        // ParameterSchemaSpec：key → 属性
    panel: { type: 'json', required: true, description: 'A PanelDefinition (see contract). Pass a JSON object.' },
    persist: { type: 'boolean', description: 'Write the panel to disk when true.' },
  },
  output: {
    schema: {
      type: 'object', additionalProperties: false,     // 显式对象必须声明 openness
      properties: {
        version: { type: 'integer', const: 1, required: true },
        panel: { type: 'json', required: true },
        resolved: { type: 'json', required: true },
        resolvedAt: { type: 'string', required: true },
      },
    },
    render: (_args, value) => [{ type: 'text', text: `Rendered panel: ${value.panel.title}.` }],
    presentationMeta: (_args, value) => ({ kind: 'openloop.panel', version: 1, panel: value.panel, resolved: value.resolved, resolvedAt: value.resolvedAt }),
  },
  async execute(args, exec) {
    // args 为 frozen 参数快照；exec.signal 用于取消
    // …校验（见 §2.4）→ 解析数据 → 写盘
    return { version: 1 as const, panel, resolved, resolvedAt }
  },
  presentCall: () => ({ card: 'generic', title: 'Panel · building', kind: 'other' }),
  presentResult: (_args, result) => result.isError ? undefined : ({ card: 'generic', title: 'Panel' }),
}))
```

### 2.2 关键语义

- **参数 schema**：`ParameterSchemaSpec`（`dsh-tools/lib/types/schema.d.ts`）是隐式 open object 根，**required 是 per-property 的 `required: true` 注解**，不是 JSON Schema 的 required 数组。支持 `type: 'string'|'number'|'integer'|'boolean'|'null'|'array'|'object'|'json'` 与 `oneOf`。`type: 'json'` 用于任意无损 JSON（declarative 的 `document` 参数即此——见 `declarative/src/document.ts:168-175`）。
- **输出 schema 有两层（2026-08-21 对照官方文档 + dsh-tools 源码核实）**：`output.schema` 写的是**作者侧 DSL**（`ValueSchemaSpec`）——per-property `required: true`、`type: 'json'` 都合法；注册表经 `valueSchemaSpecToJsonSchema()` 编译为 raw 子集（`required: string[]` 数组、无 `json` 类型）后再校验。官方文档 tools.md 里的 `JsonSchemaNode` 接口是**编译后**的 raw 形态，别拿它当书写规范来改自己的 DSL——artifact 生产在用的就是 per-property 写法（dsh-tools/lib/index.js:601-602 显式提升 per-property required 到父级数组）。显式 object 必须带 `additionalProperties: false`（否则编译器报错）；声明后的返回值会被校验。
- **`presentationMeta` 是 client 渲染入口**：tool 的 canonical result 中 `kind: 'openloop.*'` + version 会被 client 端 `metaFrom` 函数解析（见 artifact `contract.ts:33-40` 的 `artifactMetaFrom`）。panels 必须定义等价契约（对照 DSH_PANELS_DESIGN §5.3 `PanelMeta`）。
- **`render` 生成模型可见文本**：`(args, value) => ContentBlock[]`。
- **错误即拒绝**：execute 抛 Error 即失败（fail-closed 语义），错误消息面向 Agent 可自修正。
- **presentCall/presentResult 必须纯**：只依赖 args 与 result 投影（content/isError/meta），实时流式与日志回放都会调用。

### 2.3 多工具 / 多文件组织

- 工具定义可拆到独立文件（panels 设计文档已规划 `src/tool.ts`），`index.ts` 只做 `ctx.tools.register(defineTool(...))` 装配。
- `presentResult` 中读 meta 的写法参照 `declarative/index.ts:26-30`（`result.meta as {...} | undefined`，容错解析）。

### 2.4 panels 落地的坑

- **tool 名一致性**：`name`（服务端）与 client 注入的 `key`（§4）必须逐字相同，差一个字符即渲染不挂载。
- **`output.schema` 与 execute 返回值必须对齐**：schema 声明什么，execute 就返回什么（frozen snapshot）；多返回或少返回都会在运行时报错。panels 的 `resolved`（数据快照）字段要与 §5.3 契约逐字段一致。
- **参数校验要在 execute 内 fail-closed**：schema 只约束形状（enum/const/type），数量级/长度上限（widgets 1–24、title ≤120 等，见 DSH_PANELS_DESIGN §5.4）要像 declarative 的 `validateDocument`（`document.ts:187-243`）一样手写校验函数，错误消息面向 Agent 可自修正。

---

## 3. ctx.fs + sandboxPolicy：服务端写文件 seams

### 3.1 签名（类型定义权威）

- `ctx.fs`（`@deepseek-ai/dsh-fs`，`lib/types/index.d.ts`）：
  ```ts
  abstract resolve(path: string, opts?: { cwd?: string; signal?: AbortSignal }): Promise<FsTarget>
  abstract writeText(target: FsTarget, content: string, expected?: FsWriteIntent,
                     signal?: AbortSignal, sandboxPolicy?: SandboxExecutionPolicy): Promise<FsWriteOutcome>
  ```
  `FsTarget` 有 `.displayPath`（回传给模型/展示用）与不透明的 `.targetKey`。
- `ctx.sandboxPolicy`（`@deepseek-ai/dsh-sandbox-policy`，`lib/types/index.d.ts`）：
  ```ts
  resolve(request?: { session?: Session; mode?: SandboxMode }): SandboxExecutionPolicy  // 含 workspaceRoot + mode
  ```
  sandboxing backend 会把写操作按该 policy 围栏（`workspace-write` 根 = session cwd 或配置兜底）；bare backend 忽略之。

### 3.2 最小示例

出处：`artifact/index.ts:49-53`（服务端写文件的唯一正例，S10 约束的直接参照）。

```ts
// 1) 解析本次执行的 sandbox policy（session 生效，非全局）
const sandboxPolicy = ctx.get('sandboxPolicy')?.resolve({ ...(exec.agent ? { session: exec.agent.session } : {}) })
// 2) cwd 回退链：policy.workspaceRoot → agent session header cwd
const cwd = sandboxPolicy?.workspaceRoot ?? exec.agent?.session.header.cwd
// 3) 相对路径 + cwd 解析（绝不拿模型给的绝对路径拼盘）
const target = await ctx.fs.resolve(`openloop-panels/${slug(id)}.json`, { ...(cwd ? { cwd } : {}), signal: exec.signal })
// 4) 把 policy 传给 writeText（原子写；sandbox backend 依此围栏）
await ctx.fs.writeText(target, JSON.stringify(panel, null, 2), undefined, exec.signal, sandboxPolicy)
// 5) 回传 displayPath 供展示/复用
return { …, path: target.displayPath }
```

### 3.3 panels 落地的坑

- **`sandboxPolicy` 必须传给 `writeText`**（第 4 参位置是 signal、**第 5 参才是 policy**——artifact 就是这么传的）。漏传时 sandboxing backend 用自身默认（可能是 read-only），写盘静默失败或抛错；这与 DSH_PANELS_DESIGN S10（面板存储经 sandboxPolicy seams）直接相关。
- **resolve 用相对路径 + cwd**，不是 `path.join(cwd, 绝对路径)`；`cwd` 回退链照抄 artifact（policy.workspaceRoot 优先，session cwd 兜底），避免 agentless/无 cwd 场景崩。
- **写目录前先确认父目录语义**：artifact 的 `artifacts/<slug>-<hash>.html` 是平铺单文件；panels 按 `openloop-panels/<panelId>.json` 组织时若 backend 要求目录预建，需查 `ctx.fs` 的 mkdir/写目录能力（本笔记未深入，实施时验证）。

---

## 4. client toolview 注入：最小示例

### 4.1 模式

出处：`artifact/src/client/index.tsx`（单工具）、`declarative/src/client/index.tsx`（多槽位）、`mcp-apps/src/client/index.tsx:270-285`（多工具 generator）。

```tsx
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'          // 引类型副作用，挂 tool.call.toolview 槽
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'      // 设置页槽（如需）
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

export const name = 'openloop-dsh-panels'
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const scope = createOpenLoopSettingsScope()                        // 主题桥接（theme 包，§5）
  const ThemedPanelCard = (props: ToolCallViewProps) => <PanelCard {...props} scope={scope} />
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'panel' },                    // key = 服务端 tool 名，逐字一致
    ThemedPanelCard,
  ))
  // 可选：设置页注入
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'openloop-panels', order: 12, label: () => 'OpenLoop Panels' },
    () => <PanelsSettingsPage scope={scope} />,
  ))
}
```

多工具注册（同服务端注册多个 tool 时，参照 `mcp-apps/src/client/index.tsx:276-280` 用 generator）：

```tsx
ctx.slots.inject('tool.call.toolview', function* () {
  for (const toolName of ['panel', 'panel_manage']) {
    yield ctx.slots.register({ name: 'tool.call.toolview', key: toolName }, ThemedPanelCard)
  }
})
```

### 4.2 卡片组件约定（ToolCallViewProps）

出处：`artifact/src/client/ArtifactCard.tsx:57-62`、`mcp-apps/src/client/index.tsx:259-266`。

```tsx
function PanelCard({ callId, block, scope }: ToolCallViewProps & { scope: OpenLoopSettingsScope }) {
  if (!('kind' in block)) return <div style={caption}>Panel · building…</div>   // 执行中
  if (block.isError) return <div style={caption}>{firstText(block.content) ?? 'Panel failed'}</div>
  const meta = panelMetaFrom(block.meta)                                        // 解析 presentationMeta 契约
  return meta ? <PanelSurface meta={meta} callId={callId} scope={scope} /> : <div style={caption}>Panel metadata unavailable</div>
}
```

要点：
- `block` 三态判定顺序：无 `kind` → building；`isError` → 失败（`firstText` 取首个 text 内容块）；否则解析 `block.meta`。
- `firstText` 工具函数见 `ArtifactCard.tsx:11-16`（容错遍历 content 找 `type === 'text'`）。
- meta 解析函数要容错（`panelMetaFrom` 返回 `undefined` 而不是抛错，参照 `contract.ts:33-40`）。

### 4.3 panels 落地的坑

- **client 包是独立构建产物**：入口必须是 `src/client/index.tsx`，经 tsdown 的 `__ModuleLoader__` banner 打包（见 §6）。ClientContext 的类型从 `@deepseek-ai/dsh-client-runtime/client` 导入，与服务端 `Context` 是两套。
- **`slots.inject` 返回 register 函数而非直接 register**（`() => ctx.slots.register(...)`），延迟到槽点求值；写错会不渲染且无报错。
- **主题 scope 是单例**：`createOpenLoopSettingsScope()` 在 `apply` 顶层建一次，注入组件的多个卡片共享同一 scope（artifac t/declarative 均如此）；不要在每个组件里重建。

---

## 5. skill 注册：最小示例

### 5.1 模式

出处：`artifact/src/skill.ts`、`declarative/src/skill.ts`（几乎逐行相同）。

```ts
// src/skills.ts
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillDefinition, type SkillProvider } from '@deepseek-ai/dsh-skill'

const body = new URL('../assets/panels-skill.md', import.meta.url)      // 内容文件（相对本模块）
const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('../assets/', import.meta.url)) } as const

const candidate: SkillCandidate = {
  name: 'openloop-dsh-panels',
  description: 'Author reusable dashboard panels from preset widgets, custom sandbox code, or external packs.',
  invocation: { modelInvocable: true, userInvocable: true },
  provider: 'openloop-dsh-panels', source: 'bundled', resourceBase,
  rank: BUNDLED_SKILL_RANK, locator: body,
}

export const panelsSkillProvider: SkillProvider = {
  name: candidate.provider,
  list: () => Promise.resolve([candidate]),
  async get(): Promise<SkillDefinition> {
    return { ...candidate, content: await readFile(body, 'utf8') }
  },
}
```

服务端接线（`artifact/index.ts:58`、`declarative/index.ts:32`）：`ctx.skills.registerProvider(() => panelsSkillProvider)`。

### 5.2 panels 落地的坑

- **`inject` 必须含 `'skills'`**（artifact/declarative 均为 `['tools', 'skills', …]`），漏了 registerProvider 无槽可挂。
- **assets 目录要进 `package.json` 的 `files`**（declarative/package.json `"files": ["lib", "src", "assets", …]`），否则发布后 `readFile(body)` 找不到文件。
- **locator 是 file URL 不是相对路径**（`new URL(..., import.meta.url)`），别用 `path.join(__dirname, …)`；`resourceBase` 用 `fileURLToPath` 转目录。
- **三个 skill 各建一个 provider**（D12：预设风格指引/Agent widget 编写指引/外部包接入指引），name/provider 唯一即可同时注册。
- **候选必填字段**（官方 skills.md 核实）：`name`（kebab-case）/ `description` / `invocation`（`{modelInvocable, userInvocable}`）/ `provider` / `source`（bundled 用 `'bundled'`）/ `rank`（`BUNDLED_SKILL_RANK`）/ `locator`；`resourceBase` 三态联合（`directory`/`url`/`opaque`）。

---

## 5A. 插件配置（Config schema，cordis 约定）

### 5A.1 模式

出处：官方 develop/basic/config.md + `artifact/src/index.ts:14-19`。**cordis 只认名为 `Config` 的导出**——同名 interface + Schemastery schema（`@deepseek-ai/schemastery`，peer 依赖 `^3.18.1`）：

```ts
import z from '@deepseek-ai/schemastery'

export interface Config {
  packsDir?: string                       // pack 扫描目录；缺省不扫描
}
export const Config: z<Config> = z.object({
  packsDir: z.string(),                   // 可选字段不写 .optional()——schemastery 无此方法，
})                                        // 字段缺省即可选（.required() 才是标记必传）

export function apply(ctx: Context, config: Config): void { /* … */ }
```

用户在 profile 的 `cordis.patch.yml`（或 bundle patch）里传配：

```yaml
- insert:
    - id: openloop-dsh-panels
      name: '@openloop/dsh-panels'
      config:
        packsDir: /path/to/packs
```

### 5A.2 要点（官方 config.md 原文原则）

- **「不要硬编码可调值」是官方强制原则**（"anything that two deployments may want to set differently to be a configuration field"）——panels 的 `packsDir` 即属此类，已按此落地（2026-08-21 修复）。
- 默认值直接写在 schema 字段上（`.default(...)`）；非法配置在插件加载时即失败（fail loudly）。
- schemastery API 注意：有 `.required()` / `.default()`，**没有 `.optional()`**（字段缺省即可选）。
- 配置编辑会热替换插件实例（registrations 是 effects 自动清理）。

---

## 6. 接线与构建配置（panels 落地需照抄的模板）

### 6.1 package.json（参照 `declarative/package.json`）

```jsonc
{
  "name": "@openloop/dsh-panels",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "exports": {
    ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
    "./client": "./lib/client.js",
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib", "src", "assets", "cordis.patch.yml", "README.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-tool",
        "@deepseek-ai/dsh-client-ui-primitives",
        "@deepseek-ai/dsh-client-ui-settings"
      ],
      "platform": "web"
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-skill": "^0.1.0-rc.6",
    "@deepseek-ai/dsh-tools": "^0.1.0-rc.6",
    "react": "^18.2.0"
  }
}
```

### 6.2 cordis.patch.yml

```yaml
- insert:
    - id: openloop-dsh-panels
      name: '@openloop/dsh-panels'
```

### 6.3 tsdown.config.ts（双构建：node ESM 服务端 + browser CJS client，带 ModuleLoader banner）

```ts
import type { UserConfig } from 'tsdown'

const id = '@openloop/dsh-panels'
const clientExternals = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client', '@deepseek-ai/dsh-client-ui-tool/client',
  '@deepseek-ai/dsh-client-ui-primitives',
]

export default [
  {
    entry: { index: 'src/index.ts' }, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024',
    fixedExtension: false, dts: true, clean: true,
    deps: { neverBundle: ['@deepseek-ai/cordis'] },
  },
  {
    entry: { client: 'src/client/index.tsx' }, outDir: 'lib', format: 'cjs', platform: 'browser',
    dts: false, clean: false, deps: { neverBundle: clientExternals },
    define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
] satisfies UserConfig[]
```

### 6.4 tsconfig.client.json

```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "lib": ["es2022", "dom", "dom.iterable"] },
  "include": ["src/client", "src/contract.ts", "tests/client.spec.tsx"],
  "exclude": []
}
```

---

## 7. 主题桥接与 srcDoc/CSP 生成（panels 直接复用/参照）

### 7.1 useOpenLoopVisualTheme（theme 包）

- 入口：`@openloop/dsh-visual-theme/client`（`theme/src/client.tsx`）。
- `createOpenLoopSettingsScope(): OpenLoopSettingsScope`——localStorage 持久化的 settings scope（`theme/client.tsx:19-55`，key `openloop.visuals.v1` + `openloop-visual-settings-change` 事件）。
- `useOpenLoopVisualTheme(scope)` 返回结构（token v2 后，`theme/client.tsx:75-84`）：
  ```ts
  { settings, snapshot, preset, appearance, palette, values, global, style }
  // values/palette: 50 个预设系 token（同一对象，新旧字段名并存）
  // global: 11 个全局系 token（font-sans/type-*/space-*，OPENLOOP_GLOBAL_TOKENS）
  // style: Record<CSSProperty, string>，即 --openloop-* 变量映射（paletteVariables 的产物）
  ```
- 卡片外层套 `style={theme.style}` 即可获得整套 `--openloop-*` token（`ArtifactCard.tsx:43`）。容器根节点挂 `data-openloop-preset`/`data-openloop-appearance`（`ArtifactCard.tsx:43`，panels 设计文档 §7 要求一致）。
- **token v2 已落地（2026-08-21）**：`values`/`global` 字段已存在；旧字段（settings/snapshot/palette/style）保留，现有三插件消费方零改动。panels 直接消费 `values`/`global` 即可（沙箱桥 token-sync 载荷来源）。
- 另注：panels 的 `src/client/theme.ts` 是轻量读取实现（共享 localStorage 键/事件 + 从 theme 包 import 静态 token 数据），适用于只需 token 快照、不需要 scope 的场景。

### 7.2 srcDoc 模板 + CSP 生成（artifact 模式）

- 模板函数 `buildArtifactDocument(html, title, runtime, token, theme)`（`shell.ts:64-73`）：合成完整 `<!doctype html>`，meta CSP 内联在 `<head>`，`<script>` 注入 heightReporter。
- **CSP 是字符串常量**（`shell.ts:3-16`，`ARTIFACT_CSP`），不是拼接注入——S5「合成文档包装、禁 regex 注入」教训。
- **token 校验高度上报**：
  - 服务端生成：`heightReporter(token)`（`shell.ts:75-77`）——`ResizeObserver` + `load` + 首帧，`parent.postMessage({ type, token, height }, '*')`，token 每渲染随机生成。
  - 客户端接收：`ArtifactCard.tsx:21-28`——`message` 监听，**校验 `data.type === ARTIFACT_HEIGHT_MESSAGE && data.token === token && Number.isFinite(data.height)`**，然后 clamp（`Math.max(360, Math.min(fullscreen ? 1600 : 760, …))`）后 setHeight。
  - 消息名常量化（`contract.ts:2` `ARTIFACT_HEIGHT_MESSAGE = 'openloop-artifact:height'`）；panels 桥协议沿用此模式（DSH_PANELS_DESIGN §8.4，消息 type `openloop:token-sync`/`openloop:data`/`openloop:size-change` 等）。
- iframe 属性组合（`ArtifactCard.tsx:30`）：`sandbox="allow-scripts"`、`referrerPolicy="no-referrer"`、`srcDoc={doc}`、`title`、宽度 100%、高度状态驱动。

---

## 8. 各节要点速查（源码出处）

| 侧面 | 标准写法来源 | 行号 |
|---|---|---|
| webServer.register | `mcp-runtime/src/index.ts`（McpAppGateway.register） | 436-443 |
| CSP header 下发 | `mcp-runtime/src/index.ts`（document 路由）+ `validation.ts:appContentSecurityPolicy` | 505-511 / 106-131 |
| WebServer 类型/签名 | `dsh-host-webserver/lib/types/index.d.ts` | 全文件 |
| tool 注册（defineTool） | `artifact/src/index.ts` | 21-59 |
| 参数 schema + 校验 | `declarative/src/document.ts` | 168-175 / 187-243 |
| ctx.fs + sandboxPolicy | `artifact/src/index.ts`（execute 内） | 49-53 |
| dsh-fs 类型 | `dsh-fs/lib/types/index.d.ts` | resolve/writeText |
| sandboxPolicy 类型 | `dsh-sandbox-policy/lib/types/index.d.ts` | resolve |
| client toolview 注入 | `artifact/src/client/index.tsx`；多工具 `mcp-apps/src/client/index.tsx` | 全文件 / 270-285 |
| 设置页注入 | `declarative/src/client/index.tsx` | 19-22 |
| 卡片三态渲染 | `artifact/src/client/ArtifactCard.tsx` | 57-62 |
| srcDoc/CSP/高度上报 | `artifact/src/shell.ts` + `ArtifactCard.tsx` | 64-77 / 21-30 |
| skill 注册 | `artifact/src/skill.ts` / `declarative/src/skill.ts` | 全文件 |
| 主题 hook | `theme/src/client.tsx` | 19-76 |
| 构建接线 | `declarative/package.json` / `cordis.patch.yml` / `tsdown.config.ts` / `tsconfig.client.json` | 全文件 |

## 9. panels 落地最高风险清单（跨节汇总）

1. **tool 名一致性**：服务端 `defineTool.name` ↔ client `slots.register key` ↔ skill 文档里的名字，三处逐字一致（§2.4 / §4.3）。
2. **`presentationMeta` 契约（kind + version）**：client 端 `panelMetaFrom(block.meta)` 容错解析，panels 的 `PanelMeta` 与 DSH_PANELS_DESIGN §5.3 逐字段对齐（§2.2）。
3. **sandboxPolicy 漏传 writeText**：面板持久化（S10）依赖第 5 参；resolve 用相对路径 + cwd 回退链（§3.3）。
4. **CSP 必须进 srcDoc 合成模板**，不 regex 注入；桥消息带随机 token + source/origin 校验（§7.2）。
5. **webServer 路由唯一**：`/openloop/runtime`、`/openloop/packs` 前缀冲突即抛错；注册包 `ctx.effect`（§1.4）。

---

## 10. 跨插件共享 client 模块（dsh.client.external，2026-08-22 真机验证）

官方机制：消费者声明 `dsh.client.external: ['@scope/pkg/client']` + tsdown neverBundle 该 specifier，运行时 `require` 经模块图解析到 **supplier 包的 client 模块**（只加载一次）。规则（client-modules README/源码 + 真机事故核实）：

- **supplier 必须声明 `"immediately": true`**（`dsh.client.immediately`）——否则其 factory 是懒加载，消费者的同步 `require` 在 factory 未注册时直接炸：*「missed the module table — no registered package factory」*（theme 0.3.0 漏配导致 DSH 白屏的实际报错）。官方基线包（dsh-client-runtime 等）全部 immediately。消费者**不需要** immediately。
- **specifier 只有 `/client` 结尾能别名到包行**——要共享的导出必须全部从 supplier 的 client 入口（`src/client/index.tsx`）`export *` 出来，缺一个 named export 消费者构建即 MISSING_EXPORT。
- supplier 的 `exports['./client']`：`default` → 构建产物（lib/client.js），`types` → 源码 `./src/client.tsx`（构建产物无 d.ts，否则消费者 typecheck TS7016）。
- **静态打包消费者（未声明 external 的）会被 banner 卡死**：rolldown 静态打包带 ModuleLoader banner 的 CJS 时检测不到 factory 闭包内的 exports → MISSING_EXPORT。结论：一个 supplier 的所有消费者要么都 external，要么 supplier 别只给 banner 产物。
- **测试环境要 alias 回源码**：banner 产物在 vitest（node 环境）里 `window is not defined`（见 declarative/vitest.config.ts 的 resolve.alias）。
- 组合期强校验：缺 supplier / 自引用 / 循环依赖 → 启动即 AggregateError（fail loud，好事）。
- bundles 列表顺序无关：图谱按模块图依赖自动排序（supplier 行恒在消费者前）。
