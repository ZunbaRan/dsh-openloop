/**
 * connect_server —— 方向 1 v2 的 connect 动作（2026-08-29）。
 *
 * 第三方包 = 一个实现 MCP Apps 2.0 的 server（协议 v2，MCP Apps 2.0 底座）：
 * 1. 校验 mcp.json 条目形态（parseServerEntry，纯函数来自 mcp-runtime）
 * 2. 写入 user 作用域 mcp.json（upsert 语义，原文落盘——${ENV} 插值发生在读取时）
 * 3. 热激活：mcpRuntime 存在（web profile）→ removeServer + addServer，即时生效；
 *    不存在（headless）→ 仅落盘，返回「重启后生效」
 * 4. listTools 探活（best-effort：连接失败不失败 connect——与启动容错同语义）
 * 5. app 壳 + 有 ui binding 的工具落 components 引用条目（kind: 'mcp-app'，
 *    entry = { serverId, toolName, resourceUri }，不复制 HTML——渲染时取数）
 *
 * 纪律：错误消息面向 Agent（期望形态 + 实际值）；凭据归 server 自管，本通道零凭据。
 */
import type { McpRuntimeService, McpToolRecord } from '@openloop/dsh-mcp-runtime'
import { parseServerEntry, scopedFilePath, upsertServerToFile } from '@openloop/dsh-mcp-runtime'
import { readFileSync } from 'node:fs'
import { recordSystemEvent } from './event-log.ts'
import type { AppBackend } from './backend.ts'
import type { AppFacade, ComponentRow } from './facade.ts'

export interface ConnectServerInput {
  readonly serverId: string
  readonly entry: unknown
}

export interface ConnectServerOptions extends ConnectServerInput {
  readonly dshHome: string
  readonly backend: AppBackend
  /** web profile 注入的活动 runtime；headless 缺省（仅落盘） */
  readonly mcpRuntime: McpRuntimeService | undefined
}

/** MCP 工具名（可含下划线/大写）→ rid 段（kebab 词法，RID_RE 兼容） */
function ridSegment(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
}

function toolTitle(serverId: string, tool: McpToolRecord): string {
  const firstLine = tool.description?.split('\n', 1)[0]?.trim()
  return (firstLine && firstLine.length > 0 ? firstLine : `${serverId} · ${tool.name}`).slice(0, 120)
}

function toolSummary(tool: McpToolRecord): Record<string, unknown> {
  return {
    name: tool.name,
    ...(tool.description ? { description: tool.description.slice(0, 160) } : {}),
    modelVisible: tool.modelVisible,
    appVisible: tool.appVisible,
    hasUi: Boolean(tool.ui),
    ...(tool.ui ? { resourceUri: tool.ui.resourceUri } : {}),
  }
}

/**
 * disconnect_server / reconnect_server —— app-manager 的受控管理动作（2026-08-31）。
 *
 * 断开 = 热移除 runtime server（工具随之清掉）+ 保留 mcp.json 条目（下次重连即用）
 *   + 删除 registry 壳与组件（APP 页/看板 pin 目录不再显示）。
 * 重连 = 等价于 connect_server 的 mcp.json 已有条目（热激活 + 探活 + 引用组件落库）。
 * 纪律同 connect：错误消息面向 Agent；凭据零接触（条目只是 transport 描述）。
 */
export async function disconnectServer(options: Omit<ConnectServerOptions, 'entry'>): Promise<Record<string, unknown>> {
  const { serverId, dshHome, backend, mcpRuntime } = options

  // registry 侧先查（不论 runtime 状态，壳子有就删）
  const facade: AppFacade = await backend.ready()
  const detail = await facade.getAppDetail(serverId)
  if (detail === undefined) {
    throw new Error(`app "${serverId}" is not registered. Call list_apps to see what exists.`)
  }

  // 热移除（web：工具/连接即时清掉；headless：本来就没加载）
  let removed = false
  if (mcpRuntime !== undefined && mcpRuntime.serverIds().includes(serverId)) {
    removed = await mcpRuntime.removeServer(serverId)
  }

  // mcp.json 条目保留（断开 ≠ 删除配置；重连直接复用）
  const mcpJsonPath = scopedFilePath('user', { dshHome })

  // registry 壳 + 组件级联清（deleteApp 自带级联）
  await facade.deleteApp(serverId)
  backend.invalidateRegistry()

  recordSystemEvent('registry', 'info', `断开第三方包 ${serverId}（保留配置，可重连）`)

  return {
    ok: true,
    serverId,
    runtimeRemoved: removed,
    mcpJsonEntry: 'kept (reconnect to re-activate)',
    mcpJsonPath,
    removedComponents: detail.components.length,
    removedApis: detail.apis.length,
  }
}

export async function reconnectServer(options: Omit<ConnectServerOptions, 'entry'>): Promise<Record<string, unknown>> {
  const { serverId, dshHome, backend, mcpRuntime } = options
  // 读回 mcp.json 条目（断开时保留的）
  const mcpJsonPath = scopedFilePath('user', { dshHome })
  let entry: unknown
  try {
    const parsed = JSON.parse(readFileSync(mcpJsonPath, 'utf8')) as { servers?: Record<string, unknown> }
    entry = parsed.servers?.[serverId]
  } catch {
    entry = undefined
  }
  if (entry === undefined) {
    throw new Error(`no mcp.json entry for "${serverId}" — disconnected apps keep their entry; if it is gone, use connect_server with a fresh entry`)
  }
  return connectServer({ ...options, entry })
}

export async function connectServer(options: ConnectServerOptions): Promise<Record<string, unknown>> {
  const { serverId, entry, dshHome, backend, mcpRuntime } = options

  // 1. 校验条目形态（fail-closed；消息面向 Agent 可自修正）
  const config = parseServerEntry(serverId, entry)
  if (config === undefined) {
    throw new Error(`invalid MCP server entry for "${serverId}": expected an mcp.json entry object like { "type": "http", "url": "https://…" } or { "type": "stdio", "command": "npx", "args": […] } (optional: headers / env / cwd / protocol "legacy"|"auto"|"2026-07-28"), got ${JSON.stringify(entry).slice(0, 200)}`)
  }

  // 2. 落盘 user 作用域 mcp.json（原文 upsert；${ENV} 插值发生在 runtime 读取时）
  const mcpJsonPath = scopedFilePath('user', { dshHome })
  upsertServerToFile(mcpJsonPath, serverId, entry)

  // 3. 热激活（web：即时生效；headless：仅落盘）
  let activated = false
  let state = 'saved'
  let tools: readonly McpToolRecord[] = []
  let connectionNote: string | undefined
  if (mcpRuntime !== undefined) {
    if (mcpRuntime.serverIds().includes(serverId)) {
      // 重复 connect = 重连语义：先摘旧配置再挂新配置
      await mcpRuntime.removeServer(serverId)
    }
    mcpRuntime.addServer(config)
    activated = true
    state = 'activated'
    try {
      tools = await mcpRuntime.listTools(serverId)
      state = 'connected'
    } catch (error) {
      // 连接失败停在 server 粒度（2026-08-27 容错契约同语义）：
      // 工具注册由 mcp-tools 惰性补上，服务恢复后自愈。
      state = 'disconnected'
      connectionNote = `server unreachable right now (${error instanceof Error ? error.message : String(error)}) — saved and hot-registered; lazy reconnect will pick it up when the server comes online`
    }
  }

  // 4. registry 落库：app 壳 + ui binding 工具的引用条目（渲染时取数，不复制内容）
  const facade: AppFacade = await backend.ready()
  await facade.upsertApp({
    name: serverId,
    displayName: serverId,
    kind: 'thirdparty',
    version: '1.0.0',
    description: `MCP Apps 2.0 third-party pack (connected via app_backend connect_server)`,
  })
  const components: ComponentRow[] = []
  for (const tool of tools) {
    if (!tool.ui) continue
    const row = await facade.registerComponent(serverId, {
      rid: `${serverId}:${ridSegment(tool.name)}`,
      kind: 'mcp-app',
      title: toolTitle(serverId, tool),
      entry: {
        serverId,
        toolName: tool.name,
        resourceUri: tool.ui.resourceUri,
      },
      description: `MCP App resource (render-time fetch): ${tool.ui.resourceUri}`,
    })
    components.push(row)
  }

  recordSystemEvent('registry', state === 'disconnected' ? 'warn' : 'info',
    `接入第三方包 ${serverId}${activated ? `（${state}，${tools.length} 工具）` : '（已保存，重启后激活）'}`)

  return {
    ok: true,
    serverId,
    scope: 'user',
    mcpJsonPath,
    activated,
    state,
    toolCount: tools.length,
    tools: tools.map(toolSummary),
    uiResourceCount: components.length,
    components: components.map(row => ({ rid: row.rid, title: row.title, resourceUri: (row.entry as { resourceUri?: unknown })?.resourceUri ?? null })),
    ...(connectionNote !== undefined ? { note: connectionNote } : {}),
    ...(activated ? {} : { note: 'saved to user-scope mcp.json; restart DSH to activate (MCP runtime is not loaded in this profile)' }),
  }
}
