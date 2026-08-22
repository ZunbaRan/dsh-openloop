import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpAppResource, McpAppResourceReference } from '@openloop/dsh-mcp-runtime'
import { SecurePostMessageTransport } from './transport.ts'
import {
  buildSandboxDocument,
  MCP_APP_DEFAULT_IFRAME_HEIGHT,
  MCP_APP_MAX_IFRAME_HEIGHT,
  MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX,
  parseMcpAppCodeDispatchPresentation,
  parseMcpAppPresentation,
  resolveAppDocumentUrl,
  resourceAsReadResult,
  sandboxAllow,
  unsupportedAppToolCallResult,
  type McpAppPresentation,
} from '../security.ts'
import type { McpAppsClientOptions } from '../client-contract.d.ts'

function firstText(content: readonly unknown[], hiddenText?: string): string | undefined {
  for (const part of content) {
    if (typeof part === 'object' && part !== null && (part as Record<string, unknown>).type === 'text' && typeof (part as Record<string, unknown>).text === 'string') {
      const text = (part as Record<string, unknown>).text
      if (typeof text !== 'string') continue
      if (text !== hiddenText && !text.startsWith(MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX)) return text
    }
  }
  return undefined
}

function AppFrame({ callId, presentation, toolArgumentsRaw }: { callId: string; presentation: McpAppPresentation; toolArgumentsRaw?: string }) {
  const [height, setHeight] = useState(MCP_APP_DEFAULT_IFRAME_HEIGHT)
  const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen'>('inline')
  const displayModeRef = useRef<'inline' | 'fullscreen'>('inline')
  const suppressFullscreenUntilRef = useRef(0)
  const bridgeRef = useRef<AppBridge>()
  const initialResource = presentation.result.uiResource
  const [refreshedResource, setRefreshedResource] = useState<McpAppResourceReference | undefined>()
  const resource = refreshedResource ?? initialResource
  const [hydrated, setHydrated] = useState<McpAppResource | undefined>(() => resource && 'html' in resource ? resource : undefined)
  const [frameReady, setFrameReady] = useState(false)
  const toolArguments = useMemo<Record<string, unknown>>(() => {
    if (!toolArgumentsRaw) return {}
    try {
      const parsed = JSON.parse(toolArgumentsRaw)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {}
    } catch {
      return {}
    }
  }, [toolArgumentsRaw])

  useEffect(() => {
    setRefreshedResource(undefined)
    displayModeRef.current = 'inline'
    setDisplayMode('inline')
  }, [presentation])

  useEffect(() => {
    if (displayMode !== 'fullscreen') return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      suppressFullscreenUntilRef.current = Date.now() + 1500
      displayModeRef.current = 'inline'
      setDisplayMode('inline')
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [displayMode])

  useEffect(() => {
    setFrameReady(false)
    if (!resource) {
      setHydrated(undefined)
      return
    }
    if ('html' in resource) {
      setHydrated(resource)
      return
    }
    let cancelled = false
    setHydrated(undefined)
    if (!refreshedResource) {
      void fetch('/api/openloop/mcp-app/refresh', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          serverId: presentation.serverId,
          toolName: presentation.toolName,
          resourceUri: resource.resourceUri,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error(`MCP App resource refresh failed: ${response.status}`)
        const value = await response.json() as Partial<McpAppResourceReference>
        if (typeof value.resourceUrl !== 'string' || typeof value.documentUrl !== 'string' || typeof value.callToolUrl !== 'string'
          || value.serverId !== presentation.serverId || value.resourceUri !== resource.resourceUri || value.mimeType !== resource.mimeType) {
          throw new Error('MCP App resource refresh returned an invalid reference')
        }
        if (!cancelled) setRefreshedResource(value as McpAppResourceReference)
      }).catch(() => { if (!cancelled) setHydrated(undefined) })
      return () => { cancelled = true }
    }
    void fetch(resource.resourceUrl, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`MCP App resource fetch failed: ${response.status}`)
        const value = await response.json() as { html?: unknown }
        if (typeof value.html !== 'string') throw new Error('MCP App resource response omitted HTML')
        if (!cancelled) setHydrated({
          serverId: resource.serverId,
          resourceUri: resource.resourceUri,
          mimeType: resource.mimeType,
          html: value.html,
          ...(resource._meta ? { _meta: resource._meta } : {}),
        })
      })
      .catch(() => { if (!cancelled) setHydrated(undefined) })
    return () => { cancelled = true }
  }, [resource, refreshedResource, presentation.serverId, presentation.toolName])

  const doc = useMemo(() => hydrated ? buildSandboxDocument(hydrated.html, hydrated._meta) : '', [hydrated])
  const documentUrl = useMemo(() => {
    if (!resource || !('documentUrl' in resource)) return undefined
    return resolveAppDocumentUrl(resource.documentUrl, window.location.href)
  }, [resource])

  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(`iframe[data-openloop-mcp-call="${CSS.escape(callId)}"]`)
    if (!iframe || !resource || !hydrated || !frameReady) return
    let bridge: AppBridge | undefined
    let transport: SecurePostMessageTransport | undefined
    let cancelled = false
    const connect = async () => {
      const source = iframe.contentWindow
      if (!source || cancelled) return
      transport = new SecurePostMessageTransport(window, source, documentUrl ? new URL(documentUrl).origin : 'null')
      bridge = new AppBridge(null, { name: 'OpenLoop DSH MCP Apps Host', version: '0.1.0' }, {
        serverResources: {},
        serverTools: {},
        logging: {},
      }, {
        hostContext: {
          displayMode: displayModeRef.current,
          platform: 'web',
          availableDisplayModes: ['inline', 'fullscreen'],
          containerDimensions: { width: Math.max(1, iframe.clientWidth), height: Math.max(1, iframe.clientHeight) },
          toolInfo: { tool: { name: presentation.callName, inputSchema: { type: 'object' } } },
        },
      })
      bridgeRef.current = bridge
      bridge.oninitialized = () => {
        void bridge?.sendToolInput({ arguments: toolArguments })
        void bridge?.sendToolResult({
          content: presentation.result.content as CallToolResult['content'],
          ...(presentation.result.structuredContent ? { structuredContent: presentation.result.structuredContent } : {}),
          ...(presentation.result._meta ? { _meta: presentation.result._meta } : {}),
          ...(presentation.result.isError ? { isError: true } : {}),
        })
      }
      bridge.onsizechange = ({ height: nextHeight }) => {
        if (displayModeRef.current === 'inline' && typeof nextHeight === 'number' && Number.isFinite(nextHeight)) {
          setHeight(Math.max(96, Math.min(MCP_APP_MAX_IFRAME_HEIGHT, Math.ceil(nextHeight))))
        }
      }
      bridge.onrequestdisplaymode = async ({ mode }) => {
        const fullscreenSuppressed = mode === 'fullscreen' && Date.now() < suppressFullscreenUntilRef.current
        const nextMode = fullscreenSuppressed
          ? 'inline'
          : mode === 'fullscreen' || mode === 'inline' ? mode : displayModeRef.current
        displayModeRef.current = nextMode
        setDisplayMode(nextMode)
        return { mode: nextMode }
      }
      bridge.onreadresource = async ({ uri }): Promise<ReadResourceResult> => {
        if (uri !== resource.resourceUri || presentation.binding?.resourceUri !== uri) return { contents: [] }
        return resourceAsReadResult(hydrated)
      }
      bridge.onlistresources = async () => ({ resources: [{ uri: resource.resourceUri, name: resource.resourceUri, mimeType: resource.mimeType }] })
      // The opaque-origin frame may invoke only App-visible tools through the
      // per-presentation, same-origin authority URL issued by the runtime.
      bridge.oncalltool = async ({ name, arguments: args }): Promise<CallToolResult> => {
        if (!('callToolUrl' in resource)) return unsupportedAppToolCallResult()
        try {
          const response = await fetch(resource.callToolUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, arguments: args ?? {} }),
          })
          if (!response.ok) return { content: [{ type: 'text', text: `MCP App tool call rejected (${response.status})` }], isError: true }
          return await response.json() as CallToolResult
        } catch {
          return { content: [{ type: 'text', text: 'MCP App tool call failed' }], isError: true }
        }
      }
      bridge.onopenlink = async () => ({ isError: true })
      bridge.onmessage = async () => ({ isError: true })
      await bridge.connect(transport as unknown as Parameters<AppBridge['connect']>[0])
    }
    void connect().catch(() => undefined)
    return () => {
      cancelled = true
      if (bridgeRef.current === bridge) bridgeRef.current = undefined
      void bridge?.teardownResource({}).catch(() => undefined)
      void bridge?.close().catch(() => undefined)
      void transport?.close().catch(() => undefined)
    }
  }, [callId, presentation, resource, hydrated, frameReady, documentUrl, toolArguments])

  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(`iframe[data-openloop-mcp-call="${CSS.escape(callId)}"]`)
    const bridge = bridgeRef.current
    if (!iframe || !bridge || !frameReady) return
    bridge.setHostContext({
      displayMode,
      platform: 'web',
      availableDisplayModes: ['inline', 'fullscreen'],
      containerDimensions: {
        width: Math.max(1, iframe.clientWidth),
        height: Math.max(1, iframe.clientHeight),
      },
      toolInfo: { tool: { name: presentation.callName, inputSchema: { type: 'object' } } },
    })
  }, [callId, displayMode, frameReady, height, presentation.callName])

  if (!hydrated || !resource) return <div style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 12 }}>Loading MCP App…</div>
  const fullscreen = displayMode === 'fullscreen'
  const closeFullscreen = () => {
    // Some editors immediately repeat their fullscreen request while they are
    // reconciling unsaved local state. Briefly reject that echo so the host's
    // explicit Close/Escape action always returns to the inline card.
    suppressFullscreenUntilRef.current = Date.now() + 1500
    displayModeRef.current = 'inline'
    setDisplayMode('inline')
  }
  return <div
    {...(fullscreen ? { 'data-openloop-mcp-fullscreen': '', role: 'dialog', 'aria-modal': true, 'aria-label': `${presentation.toolName} fullscreen editor` } : {})}
    style={fullscreen
      ? { position: 'fixed', inset: 0, zIndex: 2147483000, display: 'flex', flexDirection: 'column', padding: 16, background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(10px)' }
      : { width: '100%' }}
  >
    {fullscreen && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 52px', padding: '0 16px', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderBottom: 0, borderRadius: '14px 14px 0 0' }}>
      <strong>{presentation.toolName}</strong>
      <button type="button" aria-label="Close fullscreen editor" onClick={closeFullscreen} style={{ minWidth: 72, height: 34, padding: '0 14px', color: 'inherit', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 9, cursor: 'pointer' }}>Close</button>
    </div>}
    <iframe data-openloop-mcp-call={callId} title={`${presentation.toolName} MCP App`} sandbox={documentUrl ? 'allow-scripts allow-same-origin' : 'allow-scripts'} allow={sandboxAllow(hydrated._meta)} referrerPolicy="no-referrer" {...(documentUrl ? { src: documentUrl } : { srcDoc: doc })} onLoad={() => setFrameReady(true)} style={{ display: 'block', width: '100%', height: fullscreen ? 'calc(100vh - 84px)' : height, flex: fullscreen ? '1 1 auto' : undefined, minHeight: fullscreen ? 0 : undefined, border: fullscreen ? '1px solid var(--dsw-alias-border-l2)' : 0, borderRadius: fullscreen ? '0 0 14px 14px' : 0, background: fullscreen ? '#fff' : 'transparent' }} />
  </div>
}

function McpAppCard({ callId, toolName, block }: ToolCallViewProps) {
  if (!('kind' in block)) return <div style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 12 }}>MCP App · calling…</div>
  if (block.isError) return <div style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 12 }}>{firstText(block.content) ?? 'MCP App call failed'}</div>
  const codePresentation = parseMcpAppCodeDispatchPresentation(block.content, toolName, callId)
  const presentation = parseMcpAppPresentation(block.meta, toolName) ?? codePresentation?.presentation
  if (!presentation?.result.uiResource) return <div style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 12 }}>{firstText(block.content, codePresentation?.envelopeText) ?? 'MCP App unavailable'}</div>
  return <section style={{ width: '100%', overflow: 'hidden', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-1)' }}><AppFrame callId={callId} presentation={presentation} {...(block.call?.argsRaw ? { toolArgumentsRaw: block.call.argsRaw } : {})} /></section>
}

export const name = 'openloop-dsh-mcp-apps'
export const inject = ['slots']
export function registerMcpAppToolViews(ctx: ClientContext, toolNames: readonly string[]): void {
  const names = [...new Set(toolNames)]
  if (names.length === 0) return
  if (names.some((toolName) => typeof toolName !== 'string' || toolName.length === 0)) {
    throw new Error('MCP App tool registration requires non-empty wire tool names')
  }
  ctx.slots.inject('tool.call.toolview', function* () {
    for (const toolName of names) {
      yield ctx.slots.register({ name: 'tool.call.toolview', key: toolName }, McpAppCard)
    }
  })
}

export function apply(ctx: ClientContext, options: McpAppsClientOptions = {}): void {
  registerMcpAppToolViews(ctx, options.toolNames ?? [])
}
