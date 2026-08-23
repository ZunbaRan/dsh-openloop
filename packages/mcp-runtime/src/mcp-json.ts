/**
 * 多作用域 mcp.json 加载（对齐参考实现 dsh-plugin-mcp 的配置体系，2026-08-23）。
 *
 * 作用域（低 → 高，按 server id 覆盖）：
 *   1. cordis config.servers（bundle 默认 / 编程传入——现默认为空）
 *   2. 用户全局：$DSH_HOME/mcp.json（缺省 ~/.dsh/mcp.json）
 *   3. 项目本地：<process.cwd()>/.dsh/mcp.json
 *
 * 格式（map 形态，与 dsh-plugin-mcp 兼容）：
 * {
 *   "servers": {
 *     "tldraw": { "type": "http", "url": "http://127.0.0.1:39513/mcp" },
 *     "github": { "type": "stdio", "command": "npx", "args": ["-y",
 *                "@modelcontextprotocol/server-github"], "env": { "TOKEN": "${GH_TOKEN}" } }
 *   }
 * }
 *
 * - type: stdio（command/args/env/cwd）| http | sse（→ streamable-http url）；ws 不支持
 * - 字符串值支持 ${ENV_VAR} 插值（url/command/args/env 值/headers 值）
 * - 可选 "protocol": "legacy" | "auto" | "2026-07-28"（缺省 auto 探测）
 * - 坏条目跳过并 warning（fail-open 至合法子集，与 boot 容错一致）
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { McpServerConfig } from './types.ts'

const DEFAULT_DSH_HOME = (): string => process.env.DSH_HOME ?? join(homedir(), '.dsh')

/** ${VAR} 环境变量插值（未定义变量替换为空串并 warning） */
export function interpolateEnv(value: string): string {
  return value.replaceAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    const resolved = process.env[name]
    if (resolved === undefined) {
      console.warn(`[openloop-dsh-mcp-runtime] mcp.json: env var ${match} is undefined (substituted empty)`)
      return ''
    }
    return resolved
  })
}

interface RawServerEntry {
  type?: unknown
  command?: unknown
  args?: unknown
  env?: unknown
  cwd?: unknown
  url?: unknown
  headers?: unknown
  protocol?: unknown
}

/** 单条 mcp.json server 条目 → McpServerConfig；非法返回 undefined（warning 已打） */
export function parseServerEntry(id: string, raw: unknown): McpServerConfig | undefined {
  if (typeof raw !== 'object' || raw === null) {
    console.warn(`[openloop-dsh-mcp-runtime] mcp.json: server "${id}" must be an object, skipped`)
    return undefined
  }
  const entry = raw as RawServerEntry
  const type = typeof entry.type === 'string' ? entry.type : 'stdio'
  const protocol = entry.protocol === 'legacy' || entry.protocol === 'auto' || entry.protocol === '2026-07-28' ? entry.protocol : undefined
  if (type === 'stdio') {
    if (typeof entry.command !== 'string' || entry.command.length === 0) {
      console.warn(`[openloop-dsh-mcp-runtime] mcp.json: stdio server "${id}" requires "command", skipped`)
      return undefined
    }
    const args = Array.isArray(entry.args) ? entry.args.map(a => interpolateEnv(String(a))) : undefined
    const env = entry.env !== undefined && typeof entry.env === 'object' && entry.env !== null
      ? Object.fromEntries(Object.entries(entry.env as Record<string, unknown>).map(([k, v]) => [k, interpolateEnv(String(v))]))
      : undefined
    const cwd = typeof entry.cwd === 'string' ? entry.cwd : undefined
    return {
      id,
      ...(protocol !== undefined ? { protocol } : {}),
      transport: { kind: 'stdio', command: interpolateEnv(entry.command), ...(args !== undefined ? { args } : {}), ...(env !== undefined ? { env } : {}), ...(cwd !== undefined ? { cwd } : {}) },
    }
  }
  if (type === 'http' || type === 'sse') {
    if (typeof entry.url !== 'string' || entry.url.length === 0) {
      console.warn(`[openloop-dsh-mcp-runtime] mcp.json: ${type} server "${id}" requires "url", skipped`)
      return undefined
    }
    const headers = entry.headers !== undefined && typeof entry.headers === 'object' && entry.headers !== null
      ? Object.fromEntries(Object.entries(entry.headers as Record<string, unknown>).map(([k, v]) => [k, interpolateEnv(String(v))]))
      : undefined
    return {
      id,
      ...(protocol !== undefined ? { protocol } : {}),
      transport: { kind: 'streamable-http', url: interpolateEnv(entry.url), ...(headers !== undefined ? { headers } : {}) },
    }
  }
  console.warn(`[openloop-dsh-mcp-runtime] mcp.json: server "${id}" has unsupported type "${type}" (stdio/http/sse), skipped`)
  return undefined
}

/** 读单个 mcp.json 文件 → 合法 server 列表（文件缺失/坏 JSON → 空列表 + warning） */
export function readMcpJsonFile(path: string): McpServerConfig[] {
  if (!existsSync(path)) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    console.warn(`[openloop-dsh-mcp-runtime] mcp.json: failed to parse ${path} (${error instanceof Error ? error.message : String(error)}), ignored`)
    return []
  }
  if (typeof parsed !== 'object' || parsed === null) {
    console.warn(`[openloop-dsh-mcp-runtime] mcp.json: ${path} must be a JSON object, ignored`)
    return []
  }
  const servers = (parsed as { servers?: unknown }).servers
  if (servers === undefined) return []
  if (typeof servers !== 'object' || servers === null || Array.isArray(servers)) {
    console.warn(`[openloop-dsh-mcp-runtime] mcp.json: ${path} "servers" must be an object map, ignored`)
    return []
  }
  const result: McpServerConfig[] = []
  for (const [id, raw] of Object.entries(servers as Record<string, unknown>)) {
    const parsed_entry = parseServerEntry(id, raw)
    if (parsed_entry !== undefined) result.push(parsed_entry)
  }
  return result
}

export interface ScopedMcpJsonOptions {
  /** DSH home（缺省 $DSH_HOME 或 ~/.dsh） */
  dshHome?: string
  /** 项目目录（缺省 process.cwd()） */
  projectDir?: string
}

/**
 * 多作用域加载与合并（user → project，按 id 后者覆盖前者）。
 * cordis config.servers 的合并在调用方完成（bundle 层最低优先级）。
 */
export function loadScopedMcpServers(options: ScopedMcpJsonOptions = {}): McpServerConfig[] {
  const dshHome = options.dshHome ?? DEFAULT_DSH_HOME()
  const projectDir = options.projectDir ?? process.cwd()
  const userServers = readMcpJsonFile(join(dshHome, 'mcp.json'))
  const projectServers = readMcpJsonFile(join(projectDir, '.dsh', 'mcp.json'))
  const merged = new Map<string, McpServerConfig>()
  for (const server of userServers) merged.set(server.id, server)
  for (const server of projectServers) merged.set(server.id, server)
  return [...merged.values()]
}

/** 合并：cordis config（bundle/编程，最低）← mcp.json 作用域（高） */
export function mergeServerConfigs(base: readonly McpServerConfig[], scoped: readonly McpServerConfig[]): McpServerConfig[] {
  const merged = new Map<string, McpServerConfig>()
  for (const server of base) merged.set(server.id, server)
  for (const server of scoped) merged.set(server.id, server)
  return [...merged.values()]
}
