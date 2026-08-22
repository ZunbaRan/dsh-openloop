import type { McpCallResult, McpToolRecord } from '@openloop/dsh-mcp-runtime'

export const MCP_TOOL_PREFIX = 'mcp__'
export const MCP_PRESENTATION_KIND = 'openloop.dsh-mcp'
export const MCP_CODE_DISPATCH_PRESENTATION_PREFIX = '\u2063openloop.dsh-mcp/code-dispatch:v1:'
/** PTC Code Mode durable-display transport cap; oversized presentations degrade to ordinary fallback, not 8 MiB rendering. */
export const MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES = 256 * 1024

export function mcpToolName(serverId: string, toolName: string): string {
  return `${MCP_TOOL_PREFIX}${serverId}__${toolName}`
}

export interface McpToolPresentation {
  readonly kind: typeof MCP_PRESENTATION_KIND
  readonly version: 1
  readonly callName: string
  readonly serverId: string
  readonly toolName: string
  readonly toolMeta?: Record<string, unknown>
  readonly binding?: McpToolRecord['ui']
  readonly result: McpCallResult
}

export interface McpCodeDispatchPresentationEnvelope {
  readonly kind: 'openloop.dsh-mcp/code-dispatch'
  readonly version: 1
  readonly callId: string
  readonly callName: string
  readonly presentation: McpToolPresentation
}

type TextContentBlock = { readonly type: 'text'; readonly text: string }

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function codeDispatchPresentationBlock(
  callId: string,
  presentation: McpToolPresentation,
): TextContentBlock | undefined {
  if (!callId || callId.length > 512 || presentation.callName !== mcpToolName(presentation.serverId, presentation.toolName)) return undefined
  const envelope: McpCodeDispatchPresentationEnvelope = {
    kind: 'openloop.dsh-mcp/code-dispatch',
    version: 1,
    callId,
    callName: presentation.callName,
    presentation,
  }
  let encoded: string
  try {
    encoded = JSON.stringify(envelope)
  } catch {
    return undefined
  }
  const text = `${MCP_CODE_DISPATCH_PRESENTATION_PREFIX}${encoded}`
  return byteLength(text) <= MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES ? { type: 'text', text } : undefined
}

export function textFallback(content: readonly unknown[]): string {
  const lines: string[] = []
  for (const block of content) {
    if (typeof block !== 'object' || block === null) {
      lines.push(String(block))
      continue
    }
    const record = block as Record<string, unknown>
    if (record.type === 'text' && typeof record.text === 'string') {
      lines.push(record.text)
    } else if (typeof record.type === 'string') {
      const mimeType = typeof record.mimeType === 'string' ? ` ${record.mimeType}` : ''
      lines.push(`[MCP ${record.type}${mimeType} content preserved in the structured result]`)
    } else {
      lines.push('[MCP content block preserved in the structured result]')
    }
  }
  return lines.join('\n') || '[MCP tool returned no text content]'
}

export function toPresentation(tool: McpToolRecord, callName: string, result: McpCallResult): McpToolPresentation {
  return {
    kind: MCP_PRESENTATION_KIND,
    version: 1,
    callName,
    serverId: tool.serverId,
    toolName: tool.name,
    ...(tool._meta ? { toolMeta: tool._meta } : {}),
    ...(tool.ui ? { binding: tool.ui } : {}),
    result,
  }
}
