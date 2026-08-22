import type {
  JsonObject,
  McpAppResource,
  McpCallResult,
  McpToolRecord,
  McpUiBinding,
} from '@openloop/dsh-mcp-runtime'

const MCP_APP_MIME = 'text/html;profile=mcp-app'

export const MCP_APP_PRESENTATION_KIND = 'openloop.dsh-mcp'
export const MCP_APP_DEFAULT_IFRAME_HEIGHT = 560
export const MCP_APP_MAX_IFRAME_HEIGHT = 720
export const MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX = '\u2063openloop.dsh-mcp/code-dispatch:v1:'
/** PTC Code Mode durable-display transport cap; oversized presentations degrade to ordinary fallback, not 8 MiB rendering. */
export const MCP_APP_CODE_DISPATCH_PRESENTATION_MAX_BYTES = 256 * 1024

export interface McpAppPresentation {
  readonly kind: typeof MCP_APP_PRESENTATION_KIND
  readonly version: 1
  readonly callName: string
  readonly serverId: string
  readonly toolName: string
  readonly toolMeta?: JsonObject
  readonly binding?: McpUiBinding
  readonly result: McpCallResult
}

export interface AppMessageEventLike {
  readonly source: unknown
  readonly origin: string
  readonly data: unknown
}

export interface McpCodeDispatchPresentation {
  readonly presentation: McpAppPresentation
  readonly envelopeText: string
}

function isUiResourceUri(uri: string): boolean {
  return uri.startsWith('ui://') && uri.length > 'ui://'.length
}

function validateUiBinding(binding: McpUiBinding, expectedServerId: string, expectedToolName: string): void {
  if (!isUiResourceUri(binding.resourceUri)
    || binding.serverId !== expectedServerId
    || binding.toolName !== expectedToolName
    || (binding.visibility !== undefined && binding.visibility !== 'inline' && binding.visibility !== 'fullscreen')) {
    throw new Error('MCP App binding does not match the expected tool resource')
  }
}

function validateAppHtml(html: string): void {
  if (new TextEncoder().encode(html).byteLength > 8 * 1024 * 1024) throw new Error('MCP App resource exceeds the 8 MiB limit')
}

export function isTrustedAppMessage(
  event: AppMessageEventLike,
  expectedSource: unknown,
  expectedOrigin: string,
): boolean {
  if (event.source !== expectedSource || event.origin !== expectedOrigin) return false
  return typeof event.data === 'object' && event.data !== null && !Array.isArray(event.data)
}

function record(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : undefined
}

function bindingFrom(value: unknown): McpUiBinding | undefined {
  const binding = record(value)
  if (!binding || typeof binding.serverId !== 'string' || typeof binding.toolName !== 'string' || typeof binding.resourceUri !== 'string') return undefined
  if (binding.visibility !== undefined && binding.visibility !== 'inline' && binding.visibility !== 'fullscreen') return undefined
  const bindingMeta = record(binding._meta)
  return {
    serverId: binding.serverId,
    toolName: binding.toolName,
    resourceUri: binding.resourceUri,
    ...(binding.visibility === 'fullscreen' ? { visibility: 'fullscreen' } : {}),
    ...(bindingMeta ? { _meta: bindingMeta } : {}),
  }
}

function resultFrom(value: unknown): McpCallResult | undefined {
  const result = record(value)
  if (!result || typeof result.serverId !== 'string' || typeof result.toolName !== 'string' || !Array.isArray(result.content) || typeof result.isError !== 'boolean') return undefined
  const resourceValue = record(result.uiResource)
  const uiResource = resourceValue && typeof resourceValue.serverId === 'string' && typeof resourceValue.resourceUri === 'string' && typeof resourceValue.mimeType === 'string'
    ? (() => {
        const resourceMeta = record(resourceValue._meta)
        if (typeof resourceValue.html === 'string') return {
        serverId: resourceValue.serverId,
        resourceUri: resourceValue.resourceUri,
        mimeType: resourceValue.mimeType,
        html: resourceValue.html,
        ...(resourceMeta ? { _meta: resourceMeta } : {}),
        }
        if (typeof resourceValue.resourceUrl === 'string' && typeof resourceValue.callToolUrl === 'string'
          && typeof resourceValue.documentUrl === 'string'
          && resourceValue.resourceUrl.startsWith('/api/openloop/mcp-app/resource/')
          && resourceValue.documentUrl.startsWith('/api/openloop/mcp-app/document/')
          && resourceValue.callToolUrl.startsWith('/api/openloop/mcp-app/call/')) return {
          serverId: resourceValue.serverId,
          resourceUri: resourceValue.resourceUri,
          mimeType: resourceValue.mimeType,
          resourceUrl: resourceValue.resourceUrl,
          documentUrl: resourceValue.documentUrl,
          callToolUrl: resourceValue.callToolUrl,
          ...(resourceMeta ? { _meta: resourceMeta } : {}),
        }
        return undefined
      })()
    : undefined
  const structuredContent = record(result.structuredContent)
  const resultMeta = record(result._meta)
  return {
    serverId: result.serverId,
    toolName: result.toolName,
    content: result.content,
    ...(structuredContent ? { structuredContent } : {}),
    isError: result.isError,
    ...(resultMeta ? { _meta: resultMeta } : {}),
    ...(uiResource ? { uiResource } : {}),
  }
}

export function parseMcpAppPresentation(value: unknown, expectedCallName: string): McpAppPresentation | undefined {
  const envelope = record(value)
  if (!envelope || envelope.kind !== MCP_APP_PRESENTATION_KIND || envelope.version !== 1 || envelope.callName !== expectedCallName) return undefined
  if (typeof envelope.serverId !== 'string' || typeof envelope.toolName !== 'string') return undefined
  if (expectedCallName !== `mcp__${envelope.serverId}__${envelope.toolName}`) return undefined
  const result = resultFrom(envelope.result)
  if (!result || result.serverId !== envelope.serverId || result.toolName !== envelope.toolName) return undefined
  const binding = bindingFrom(envelope.binding)
  const toolMeta = record(envelope.toolMeta)
  if (binding) {
    try {
      validateUiBinding(binding, envelope.serverId, envelope.toolName)
    } catch {
      return undefined
    }
    if (!result.uiResource || result.uiResource.resourceUri !== binding.resourceUri || result.uiResource.serverId !== binding.serverId) return undefined
  } else if (result.uiResource) {
    return undefined
  }
  if (result.uiResource) {
    if (result.isError || result.uiResource.mimeType !== MCP_APP_MIME || result.uiResource.serverId !== envelope.serverId) return undefined
    if ('html' in result.uiResource) {
      try {
        validateAppHtml(result.uiResource.html)
      } catch {
        return undefined
      }
    }
  }
  return {
    kind: MCP_APP_PRESENTATION_KIND,
    version: 1,
    callName: expectedCallName,
    serverId: envelope.serverId,
    toolName: envelope.toolName,
    ...(toolMeta ? { toolMeta } : {}),
    ...(binding ? { binding } : {}),
    result,
  }
}

function textByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function parseMcpAppCodeDispatchPresentation(
  content: readonly unknown[],
  expectedCallName: string,
  expectedCallId: string,
): McpCodeDispatchPresentation | undefined {
  if (!expectedCallId || expectedCallId.length > 512) return undefined
  const candidates: string[] = []
  let candidateIndex = -1
  for (const [index, value] of content.entries()) {
    const block = record(value)
    if (block?.type !== 'text' || typeof block.text !== 'string' || !block.text.startsWith(MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX)) continue
    candidates.push(block.text)
    candidateIndex = index
  }
  if (candidates.length !== 1 || candidateIndex <= 0 || candidateIndex !== content.length - 1) return undefined
  const envelopeText = candidates[0]
  if (envelopeText === undefined || textByteLength(envelopeText) > MCP_APP_CODE_DISPATCH_PRESENTATION_MAX_BYTES) return undefined
  let envelope: unknown
  try {
    envelope = JSON.parse(envelopeText.slice(MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX.length))
  } catch {
    return undefined
  }
  const value = record(envelope)
  if (!value
    || Object.keys(value).length !== 5
    || value.kind !== 'openloop.dsh-mcp/code-dispatch'
    || value.version !== 1
    || value.callId !== expectedCallId
    || value.callName !== expectedCallName) return undefined
  const presentation = parseMcpAppPresentation(value.presentation, expectedCallName)
  if (!presentation?.result.uiResource) return undefined
  return { presentation, envelopeText }
}

export function ensurePresentationMatchesTool(presentation: McpAppPresentation, tool: Pick<McpToolRecord, 'serverId' | 'name' | 'ui'>): boolean {
  return presentation.serverId === tool.serverId
    && presentation.toolName === tool.name
    && presentation.callName === `mcp__${tool.serverId}__${tool.name}`
    && (tool.ui
      ? presentation.binding?.resourceUri === tool.ui.resourceUri && presentation.result.uiResource?.resourceUri === tool.ui.resourceUri
      : presentation.binding === undefined && presentation.result.uiResource === undefined)
}

/**
 * Resolve the cross-origin App document URL for the sandboxed iframe.
 *
 * The App document is served from the same DSH origin, so the host swaps the
 * loopback hostname (127.0.0.1 <-> localhost) to place the App on a distinct
 * origin while `allow-same-origin` stays available for App storage.
 *
 * Fail-closed: when the App document would still share the host origin (for
 * example a non-loopback or IPv6-loopback deployment where the swap does not
 * apply), return undefined so the caller falls back to the opaque-origin
 * srcDoc path without `allow-same-origin` instead of granting the App
 * same-origin access to the DSH host.
 */
export function resolveAppDocumentUrl(documentUrl: string, locationHref: string): string | undefined {
  const locationUrl = new URL(locationHref)
  const url = new URL(documentUrl, locationHref)
  if (url.origin === locationUrl.origin) {
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      url.hostname = url.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1'
    }
    if (url.origin === locationUrl.origin) return undefined
  }
  return url.href
}

function metadataPolicy(meta: JsonObject | undefined): { csp: string; allow: string } {
  const ui = record(meta?.ui)
  const csp = record(ui?.csp)
  const permissions = record(ui?.permissions)
  const sources = (key: string): string[] => Array.isArray(csp?.[key])
    ? (csp?.[key] as unknown[]).filter((value): value is string => typeof value === 'string')
    : []
  const resource = sources('resourceDomains')
  const connect = sources('connectDomains')
  const frames = sources('frameDomains')
  const directive = (name: string, values: readonly string[]) => `${name} ${values.length > 0 ? values.join(' ') : "'none'"}`
  const policy = [
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
  const allow: string[] = []
  if (record(permissions?.clipboardWrite)) allow.push('clipboard-write')
  if (record(permissions?.camera)) allow.push('camera')
  if (record(permissions?.microphone)) allow.push('microphone')
  if (record(permissions?.geolocation)) allow.push('geolocation')
  return { csp: policy, allow: allow.join('; ') }
}

export function sandboxAllow(meta: JsonObject | undefined): string {
  return metadataPolicy(meta).allow
}

export function buildSandboxDocument(html: string, meta?: JsonObject): string {
  validateAppHtml(html)
  const policy = metadataPolicy(meta)
  // Always wrap App HTML in a host-owned document. The CSP meta lives in the
  // wrapper's own <head>, where App content cannot displace it: a decoy
  // `<head>` inside an HTML comment (or any other App markup) stays inert
  // body content while scripts and styles keep executing. Injecting into
  // App-provided markup with a regex is not HTML-aware and would let a
  // crafted App drop the policy into a comment.
  const injection = `<meta http-equiv="Content-Security-Policy" content=${JSON.stringify(policy.csp)}>`
  return `<!doctype html><html><head><meta charset="utf-8">${injection}</head><body>${html}</body></html>`
}

export function resourceAsReadResult(resource: McpAppResource) {
  if (resource.mimeType !== MCP_APP_MIME) throw new Error(`Unexpected MCP App MIME: ${resource.mimeType}`)
  return {
    contents: [{
      uri: resource.resourceUri,
      mimeType: resource.mimeType,
      text: resource.html,
      ...(resource._meta ? { _meta: resource._meta } : {}),
    }],
  }
}

export function fallbackCallResult(result: McpCallResult): { content: [{ type: 'text'; text: string }]; isError: true } {
  const text = result.content.find((part) => typeof part === 'object' && part !== null && (part as Record<string, unknown>).type === 'text' && typeof (part as Record<string, unknown>).text === 'string')
  const textValue = text && typeof (text as Record<string, unknown>).text === 'string' ? (text as { text: string }).text : 'MCP App request rejected by the host policy'
  return {
    content: [{ type: 'text', text: textValue }],
    isError: true,
  }
}

export function unsupportedAppToolCallResult(): { content: [{ type: 'text'; text: string }]; isError: true } {
  return {
    content: [{ type: 'text', text: 'MCP App tool calls are disabled in this DSH host; invoke the ordinary bound MCP tool instead.' }],
    isError: true,
  }
}
