/**
 * Agent 工具 `app_backend`（MVP 出口：Agent 可经门面 CRUD）。
 *
 * 单 tool + action 参数化（panels 单 tool 多参数的同款哲学）：门面动作全部收口在一处，
 * 参数契约与 facade 一一对应；错误消息由 facade 生成（面向 Agent 可自修正）。
 * skill 即 API 文档：openloop-app-backend SKILL.md 承载完整用法与何时唤起。
 */
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { AppBackend } from './backend.ts'

export const APP_BACKEND_TOOL = 'app_backend'

const ACTIONS = [
  'list_apps', 'upsert_app', 'delete_app', 'get_app',
  'register_component', 'remove_component',
  'register_api', 'remove_api', 'set_api_key',
  'save_dock_state', 'load_dock_state',
  'invalidate',
  'connect_server',
  'backend_health', 'backend_restart',
] as const

type Action = (typeof ACTIONS)[number]

export const APP_BACKEND_PARAMETERS = {
  action: {
    type: 'string',
    required: true,
    enum: [...ACTIONS],
    description: 'Facade action. Registry: list_apps / upsert_app / delete_app / get_app; components: register_component / remove_component; apis: register_api / remove_api / set_api_key; boards: save_dock_state / load_dock_state.',
  },
  app: {
    type: 'object',
    additionalProperties: true,
    description: 'App manifest for upsert_app: { name (kebab-case, global namespace), displayName, kind (builtin|local|thirdparty), version, description?, skill? }. Same name = update.',
  },
  appName: {
    type: 'string',
    description: 'Owning app name (namespace) for register_component / register_api / delete_app / get_app.',
  },
  component: {
    type: 'object',
    additionalProperties: true,
    description: 'Component resource for register_component: { rid (must start with "<appName>:"), kind (panel|artifact), title, entry?, description? }.',
  },
  rid: {
    type: 'string',
    description: 'Resource id `app-name:resource-name` for remove_component / remove_api / set_api_key.',
  },
  api: {
    type: 'object',
    additionalProperties: true,
    description: 'Api resource for register_api: { rid (must start with "<appName>:"), domain, path, authType (none|key), summary? }. Credentials are set separately via set_api_key and never echoed back.',
  },
  apiKey: {
    type: 'string',
    description: 'The API key value for set_api_key (stored server-side; only configured true/false is ever returned).',
  },
  dockState: {
    type: 'object',
    additionalProperties: true,
    description: 'Full dock v2 state for save_dock_state: { version: 2, boards: [{ id, name, tiles }], activeBoardId }. Replaces all boards/tiles atomically.',
  },
  serverId: {
    type: 'string',
    description: 'MCP server id for connect_server: the mcp.json key and the app namespace (kebab-case).',
  },
  server: {
    type: 'object',
    additionalProperties: true,
    description: 'MCP server entry for connect_server (mcp.json shape): { "type": "http", "url": "https://…" } or { "type": "stdio", "command": "npx", "args": […] }, optional headers / env / cwd / protocol ("legacy"|"auto"|"2026-07-28"). Connects a third-party MCP Apps 2.0 pack: writes user-scope mcp.json, hot-activates the runtime, and registers ui-bound tools as mcp-app components (pin-ready).',
  },
} as const

/** 写操作清单（这些 action 完成后建议 agent 调一次 invalidate 通知 UI 刷新） */
const WRITE_ACTIONS: ReadonlySet<Action> = new Set([
  'upsert_app', 'delete_app', 'register_component', 'remove_component',
  'register_api', 'remove_api', 'set_api_key', 'save_dock_state',
  'connect_server',
])

/** 输出契约：各 action 返回形态不同，统一为开放对象（细节由 facade 类型承载） */
const APP_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
} as const

function expectString(args: Record<string, unknown>, key: string, action: Action): string {
  const value = args[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`action "${action}" requires a non-empty string parameter "${key}".`)
  }
  return value
}

function expectObject(args: Record<string, unknown>, key: string, action: Action): unknown {
  const value = args[key]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`action "${action}" requires an object parameter "${key}" (a stringified JSON is also fine — pass the object directly, do not stringify).`)
  }
  return value
}

async function runAction(action: Action, a: Record<string, unknown>, backend: AppBackend, facade: Awaited<ReturnType<AppBackend['ready']>>): Promise<unknown> {
  // backend_health / backend_restart 不走 facade（诊断/运维语义——backend 未运行也要能答）
  if (action === 'backend_health') {
    const s = backend.status()
    return {
      state: s.state,
      version: s.version,
      baseUrl: s.baseUrl ?? null,
      restarts: s.restarts ?? 0,
      lastError: s.lastError ?? null,
      lastRestartAt: s.lastRestartAt ?? null,
      registryRev: s.registryRev ?? 0,
      hint: s.state === 'running'
        ? 'backend is healthy'
        : s.state === 'starting'
          ? 'backend is starting (first start downloads the binary — wait and re-check)'
          : `backend is ${s.state}${s.error !== undefined ? `: ${s.error}` : ''} — call backend_restart to recover, or check OPENLOOP_PB_BIN / network`,
    }
  }
  if (action === 'backend_restart') {
    await backend.restart()
    const s = backend.status()
    return { restarted: true, state: s.state, baseUrl: s.baseUrl ?? null }
  }

  const result = await runCore(action, a, facade)
  // 写操作 + 显式 invalidate 都 bump registryRev（本地计数器零成本；dock 轻探即可感知）
  if (WRITE_ACTIONS.has(action) || action === 'invalidate') backend.invalidateRegistry()
  return result
}

/** dsh 输出契约：lossless JSON（panels toJsonValue 同款收敛） */
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

async function runCore(action: Action, a: Record<string, unknown>, facade: Awaited<ReturnType<AppBackend['ready']>>): Promise<unknown> {
  switch (action) {
    case 'list_apps':
      return { apps: await facade.listApps() }
    case 'upsert_app':
      return { app: await facade.upsertApp(expectObject(a, 'app', action)) }
    case 'delete_app': {
      const appName = expectString(a, 'appName', action)
      return { deleted: appName, ...(await facade.deleteApp(appName)) }
    }
    case 'get_app': {
      const detail = await facade.getAppDetail(expectString(a, 'appName', action))
      if (detail === undefined) {
        throw new Error(`app "${String(a.appName)}" is not registered. Call list_apps to see what exists.`)
      }
      return detail
    }
    case 'register_component':
      return { component: await facade.registerComponent(expectString(a, 'appName', action), expectObject(a, 'component', action)) }
    case 'remove_component':
      await facade.removeComponent(expectString(a, 'rid', action))
      return { removed: expectString(a, 'rid', action) }
    case 'register_api':
      return { api: await facade.registerApi(expectString(a, 'appName', action), expectObject(a, 'api', action)) }
    case 'remove_api':
      await facade.removeApi(expectString(a, 'rid', action))
      return { removed: expectString(a, 'rid', action) }
    case 'set_api_key':
      await facade.setApiKey(expectString(a, 'rid', action), expectString(a, 'apiKey', action))
      return { rid: expectString(a, 'rid', action), configured: true }
    case 'save_dock_state':
      return { saved: await facade.saveDockState(expectObject(a, 'dockState', action)) }
    case 'load_dock_state':
      return { state: await facade.loadDockState() }
    case 'invalidate':
      // 显式通知（写 action 已自动 bump，这里是给「直接改 PB / 外部脚本」的补丁通道）
      return { invalidated: true }
    case 'backend_health':
    case 'backend_restart':
      // 已在 runAction 前置分支处理（不达此处）；此处兜底满足穷尽性
      throw new Error(`action "${action}" is handled elsewhere`)
  }
}

export function createAppBackendTool(backend: AppBackend, options: { getMcpRuntime?: () => import('@openloop/dsh-mcp-runtime').McpRuntimeService | undefined } = {}): ToolDefinition {
  return defineTool({
    name: APP_BACKEND_TOOL,
    description: 'Managed local app backend (PocketBase behind a controlled facade): app/component/api registry, board & tile storage, dock state migration, and connect_server for third-party MCP Apps 2.0 packs. Load the openloop-app-backend skill before the first call. All resource ids follow `app-name:resource-name` (naming is addressing). Credentials are write-only — only configured status is returned.',
    parameters: APP_BACKEND_PARAMETERS,
    output: {
      schema: APP_OUTPUT_SCHEMA,
      render: (args, value) => {
        const action = typeof (args as Record<string, unknown>).action === 'string' ? (args as Record<string, unknown>).action : 'unknown'
        return [{ type: 'text', text: `app_backend ${String(action)} ok: ${JSON.stringify(value).slice(0, 400)}` }]
      },
    },
    async execute(args): Promise<Record<string, JsonValue>> {
      const a = args as Record<string, unknown>
      const action = expectString(a, 'action', 'list_apps') as Action
      if (!(ACTIONS as readonly string[]).includes(action)) {
        throw new Error(`unknown action "${String(a.action)}". Valid actions: ${ACTIONS.join(', ')}.`)
      }
      // doctor 动作（backend_health / backend_restart）不经 facade——backend 挂了也要能诊断/恢复
      if (action === 'backend_health' || action === 'backend_restart') {
        return await runAction(action, a, backend, undefined as never) as Record<string, JsonValue>
      }
      // connect_server：方向 1 v2 第三方包 connect（需 mcpRuntime 上下文；facade 落引用条目）
      if (action === 'connect_server') {
        const { connectServer } = await import('./connect.ts')
        return await connectServer({
          serverId: expectString(a, 'serverId', action),
          entry: expectObject(a, 'server', action),
          dshHome: backend.dshHome(),
          backend,
          mcpRuntime: options.getMcpRuntime?.(),
        }) as Record<string, JsonValue>
      }
      const facade = await backend.ready()
      return await runAction(action, a, backend, facade) as Record<string, JsonValue>
    },
  })
}
