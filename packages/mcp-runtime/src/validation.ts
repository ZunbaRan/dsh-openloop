import type { JsonObject, McpAppResource, McpResourceValidationOptions, McpUiBinding } from './types.ts'

export const MCP_APP_MIME = 'text/html;profile=mcp-app'
export const MCP_APP_MAX_BYTES = 8 * 1024 * 1024

export type McpRuntimeErrorCode =
  | 'UNKNOWN_SERVER'
  | 'UNKNOWN_TOOL'
  | 'INVALID_BINDING'
  | 'INVALID_RESOURCE'
  | 'RESOURCE_URI'
  | 'RESOURCE_MIME'
  | 'RESOURCE_ENCODING'
  | 'RESOURCE_TOO_LARGE'
  | 'RESOURCE_POLICY'
  | 'CONNECTION'

export class McpRuntimeError extends Error {
  readonly code: McpRuntimeErrorCode

  constructor(code: McpRuntimeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'McpRuntimeError'
    this.code = code
  }
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asJsonObject(value: unknown): JsonObject | undefined {
  return isRecord(value) ? value : undefined
}

export function isUiResourceUri(uri: string): boolean {
  return uri.startsWith('ui://') && uri.length > 'ui://'.length
}

export function validateUiBinding(binding: McpUiBinding, expectedServerId?: string, expectedToolName?: string): McpUiBinding {
  if (!isUiResourceUri(binding.resourceUri)) {
    throw new McpRuntimeError('INVALID_BINDING', `MCP App binding must use a ui:// resource: ${binding.resourceUri}`)
  }
  if (expectedServerId !== undefined && binding.serverId !== expectedServerId) {
    throw new McpRuntimeError('INVALID_BINDING', 'MCP App binding server does not match the tool server')
  }
  if (expectedToolName !== undefined && binding.toolName !== expectedToolName) {
    throw new McpRuntimeError('INVALID_BINDING', 'MCP App binding tool does not match the tool')
  }
  if (binding.visibility !== undefined && binding.visibility !== 'inline' && binding.visibility !== 'fullscreen') {
    throw new McpRuntimeError('INVALID_BINDING', 'MCP App binding visibility is not supported')
  }
  return binding
}

function getUiMeta(meta: JsonObject | undefined): JsonObject | undefined {
  if (!meta) return undefined
  const ui = meta.ui ?? meta['io.modelcontextprotocol/ui']
  if (ui === undefined) return undefined
  if (!isRecord(ui)) {
    throw new McpRuntimeError('RESOURCE_POLICY', 'MCP App UI metadata must be an object')
  }
  return ui
}

function hasOnlySafePolicyValues(value: unknown): boolean {
  if (value === undefined) return true
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return true
  if (Array.isArray(value)) return value.every(hasOnlySafePolicyValues)
  if (!isRecord(value)) return false
  return Object.values(value).every(hasOnlySafePolicyValues)
}

export function validateAppMetadata(meta: JsonObject | undefined): void {
  const ui = getUiMeta(meta)
  if (!ui) return
  if (!hasOnlySafePolicyValues(ui)) {
    throw new McpRuntimeError('RESOURCE_POLICY', 'MCP App metadata contains a non-serializable policy value')
  }
  for (const key of ['csp', 'permissions', 'domain', 'domains', 'frameAncestors']) {
    const value = ui[key]
    if (value === undefined) continue
    if (key === 'permissions') {
      if (!isRecord(value)) {
        throw new McpRuntimeError('RESOURCE_POLICY', 'MCP App permissions must be an object')
      }
      continue
    }
    if (key === 'domain' || key === 'domains' || key === 'frameAncestors') {
      if (value !== undefined && (!Array.isArray(value) || value.length > 0)) {
        throw new McpRuntimeError('RESOURCE_POLICY', `MCP App ${key} policy cannot request an external origin`)
      }
      continue
    }
    if (!isRecord(value)) {
      throw new McpRuntimeError('RESOURCE_POLICY', 'MCP App CSP metadata must be an object')
    }
    for (const [directive, sources] of Object.entries(value)) {
      if (!Array.isArray(sources) || sources.some((source) => typeof source !== 'string' || !isSafeCspSource(source))) {
        throw new McpRuntimeError('RESOURCE_POLICY', `MCP App CSP directive ${directive} contains an invalid source`)
      }
    }
  }
}

export function appContentSecurityPolicy(meta: JsonObject | undefined): string {
  validateAppMetadata(meta)
  const ui = getUiMeta(meta)
  const csp = isRecord(ui?.csp) ? ui.csp : undefined
  const sources = (key: string): string[] => Array.isArray(csp?.[key])
    ? (csp[key] as unknown[]).filter((value): value is string => typeof value === 'string')
    : []
  const resource = sources('resourceDomains')
  const connect = sources('connectDomains')
  const frames = sources('frameDomains')
  const directive = (name: string, values: readonly string[]) => `${name} ${values.length > 0 ? values.join(' ') : "'none'"}`
  return [
    "default-src 'none'",
    directive('script-src', ["'unsafe-inline'", ...resource]),
    directive('style-src', ["'unsafe-inline'", ...resource]),
    directive('img-src', ['data:', 'blob:', ...resource]),
    directive('media-src', ['data:', 'blob:', ...resource]),
    directive('font-src', ['data:', ...resource]),
    directive('worker-src', ['blob:', ...resource]),
    directive('connect-src', connect),
    directive('frame-src', frames),
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

function isSafeCspSource(source: string): boolean {
  if (source === "'none'" || source === "'self'" || source === 'data:' || source === 'blob:' || source === 'about:') return true
  try {
    const url = new URL(source)
    return url.protocol === 'https:' && url.username === '' && url.password === '' && url.pathname === '/' && url.search === '' && url.hash === ''
  } catch {
    return false
  }
}

function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new McpRuntimeError('RESOURCE_ENCODING', 'MCP App resource blob is not valid base64')
  }
  const bytes = Uint8Array.from(Buffer.from(value, 'base64'))
  if (Buffer.from(bytes).toString('base64') !== value) {
    throw new McpRuntimeError('RESOURCE_ENCODING', 'MCP App resource blob has non-canonical base64 encoding')
  }
  return bytes
}

function utf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    throw new McpRuntimeError('RESOURCE_ENCODING', 'MCP App resource is not valid UTF-8', { cause: error })
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function validateAppHtml(html: string, maxBytes = MCP_APP_MAX_BYTES): void {
  if (byteLength(html) > maxBytes) {
    throw new McpRuntimeError('RESOURCE_TOO_LARGE', `MCP App resource exceeds the ${maxBytes}-byte limit`)
  }
  // MCP Apps are executable documents. The security boundary is the opaque
  // iframe sandbox plus the host-generated CSP derived from signed metadata;
  // scanning bundled JavaScript for tag/URL substrings produces false
  // positives and cannot establish safety.
}

export interface RawMcpResourceContents {
  readonly uri?: unknown
  readonly mimeType?: unknown
  readonly text?: unknown
  readonly blob?: unknown
  readonly _meta?: unknown
}

export function validateAppResource(
  serverId: string,
  requestedUri: string,
  contents: readonly RawMcpResourceContents[],
  options: McpResourceValidationOptions = {},
): McpAppResource {
  if (!isUiResourceUri(requestedUri)) {
    throw new McpRuntimeError('RESOURCE_URI', `MCP App resources must use ui://: ${requestedUri}`)
  }
  const matching = contents.filter((content) => content.uri === requestedUri)
  if (matching.length !== 1) {
    throw new McpRuntimeError('INVALID_RESOURCE', `MCP App resource response must contain exactly one ${requestedUri}`)
  }
  const content = matching[0]
  if (!content || content.mimeType !== MCP_APP_MIME) {
    throw new McpRuntimeError('RESOURCE_MIME', `MCP App resource MIME must be ${MCP_APP_MIME}`)
  }
  const maxBytes = options.maxBytes ?? MCP_APP_MAX_BYTES
  let html: string
  if (typeof content.text === 'string' && content.blob === undefined) {
    html = content.text
  } else if (typeof content.blob === 'string' && content.text === undefined) {
    if (Math.floor(content.blob.length / 4) * 3 > maxBytes) {
      throw new McpRuntimeError('RESOURCE_TOO_LARGE', `MCP App resource exceeds the ${maxBytes}-byte limit`)
    }
    html = utf8(decodeBase64(content.blob))
  } else {
    throw new McpRuntimeError('INVALID_RESOURCE', 'MCP App resource must contain exactly one text or blob payload')
  }
  validateAppHtml(html, maxBytes)
  const meta = asJsonObject(content._meta)
  validateAppMetadata(meta)
  return {
    serverId,
    resourceUri: requestedUri,
    mimeType: content.mimeType,
    html,
    ...(meta ? { _meta: meta } : {}),
  }
}
