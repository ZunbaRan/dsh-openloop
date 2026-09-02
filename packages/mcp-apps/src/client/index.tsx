import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpAppInvocationSnapshot, McpAppResource, McpAppResourceReference, McpCallResult } from '@openloop/dsh-mcp-runtime'
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

const MCP_APP_MIME = 'text/html;profile=mcp-app'

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

function isReferenceResource(resource: McpAppSandboxResource): resource is Exclude<McpAppSandboxResource, McpAppResource> {
  return !('html' in resource)
}

/** refresh 响应的 invocation 字段宽松校验：形状不对按「无最近调用」处理，不致命。 */
function parseInvocationSnapshot(value: unknown): McpAppInvocationSnapshot | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  const snapshot = value as Partial<McpAppInvocationSnapshot>
  if (!Array.isArray(snapshot.content) || typeof snapshot.isError !== 'boolean') return undefined
  return {
    content: snapshot.content,
    isError: snapshot.isError,
    ...(snapshot.structuredContent && typeof snapshot.structuredContent === 'object' && !Array.isArray(snapshot.structuredContent)
      ? { structuredContent: snapshot.structuredContent }
      : {}),
    ...(snapshot._meta && typeof snapshot._meta === 'object' && !Array.isArray(snapshot._meta) ? { _meta: snapshot._meta } : {}),
  }
}

/** 对话流工具调用的上下文（pin 场景没有：App 经 callToolUrl 自取数据）。 */
interface ToolCallContext {
  readonly callName: string
  readonly arguments: Record<string, unknown>
  readonly result: McpCallResult
}

/** 引用形态的宽松种子（pin 入口无既有 authority URL，refresh 成功后才补全）。 */
interface McpAppResourceSeed {
  readonly serverId: string
  readonly resourceUri: string
  readonly mimeType: string
}

type McpAppSandboxResource = McpAppResource | McpAppResourceReference | McpAppResourceSeed

interface McpAppSandboxProps {
  /** iframe 定位用唯一 id（对话流 = 工具 callId；dock = tile 稳定 id） */
  readonly callId: string
  /** 展示名（fullscreen 标题 / iframe title） */
  readonly label: string
  readonly serverId: string
  readonly toolName: string
  /** 初始资源：内联 html（presentation 已带）或引用形态（渲染时 refresh + fetch） */
  readonly resource: McpAppSandboxResource
  readonly bindingResourceUri?: string
  readonly toolCall?: ToolCallContext
}

/**
 * 共享沙箱核心（方向1 v2，2026-08-29 提取）：resource 解析（内联 html / 引用
 * refresh / resourceUrl fetch）+ opaque-origin iframe + AppBridge 生命周期。
 * 两个消费方：对话流 AppFrame（带 toolCall 上下文）与 dock pin 的
 * McpAppResourceView（无工具调用，App 经 gateway 的 callToolUrl 回环取数）。
 */
function McpAppSandbox({ callId, label, serverId, toolName, resource: initialResource, bindingResourceUri, toolCall }: McpAppSandboxProps) {
  const [height, setHeight] = useState(MCP_APP_DEFAULT_IFRAME_HEIGHT)
  const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen'>('inline')
  const displayModeRef = useRef<'inline' | 'fullscreen'>('inline')
  const suppressFullscreenUntilRef = useRef(0)
  const bridgeRef = useRef<AppBridge>()
  const [refreshedResource, setRefreshedResource] = useState<McpAppResourceReference | undefined>()
  const resource = refreshedResource ?? initialResource
  const [hydrated, setHydrated] = useState<McpAppResource | undefined>(() => resource && !isReferenceResource(resource) ? resource : undefined)
  const [frameReady, setFrameReady] = useState(false)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    setRefreshedResource(undefined)
    setLoadError(undefined)
    displayModeRef.current = 'inline'
    setDisplayMode('inline')
  }, [initialResource])

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
    if (!isReferenceResource(resource)) {
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
          serverId,
          toolName,
          resourceUri: resource.resourceUri,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error(`MCP App resource refresh failed: ${response.status}`)
        const value = await response.json() as Partial<McpAppResourceReference>
        if (typeof value.resourceUrl !== 'string' || typeof value.documentUrl !== 'string' || typeof value.callToolUrl !== 'string'
          || value.serverId !== serverId || value.resourceUri !== resource.resourceUri || value.mimeType !== resource.mimeType) {
          throw new Error('MCP App resource refresh returned an invalid reference')
        }
        const invocation = parseInvocationSnapshot(value.invocation)
        if (!cancelled) {
          setLoadError(undefined)
          setRefreshedResource({
            ...(value as McpAppResourceReference),
            ...(invocation ? { invocation } : {}),
          })
        }
      }).catch((error: unknown) => {
        if (cancelled) return
        setHydrated(undefined)
        // 对话流场景 presentation 往往已带内联数据，这里只对 pin 场景展示可重试错误。
        if (isReferenceResource(initialResource)) setLoadError(error instanceof Error ? error.message : String(error))
      })
      return () => { cancelled = true }
    }
    // 此分支 resource === refreshedResource（完整引用，authority URL 已签发）
    void fetch(refreshedResource.resourceUrl, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`MCP App resource fetch failed: ${response.status}`)
        const value = await response.json() as { html?: unknown }
        if (typeof value.html !== 'string') throw new Error('MCP App resource response omitted HTML')
        if (!cancelled) setHydrated({
          serverId: refreshedResource.serverId,
          resourceUri: refreshedResource.resourceUri,
          mimeType: refreshedResource.mimeType,
          html: value.html,
          ...(refreshedResource._meta ? { _meta: refreshedResource._meta } : {}),
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setHydrated(undefined)
        setLoadError(error instanceof Error ? error.message : String(error))
      })
    return () => { cancelled = true }
  }, [resource, refreshedResource, serverId, toolName, retryNonce, initialResource])

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
          toolInfo: { tool: { name: toolCall?.callName ?? toolName, inputSchema: { type: 'object' } } },
        },
      })
      bridgeRef.current = bridge
      bridge.oninitialized = () => {
        // pin/预览场景无工具调用上下文：补推最近一次真实调用的结果快照，
        // App（excalidraw 模式）从 structuredContent 取 checkpointId 等句柄后
        // 经 callToolUrl 回环自取场景渲染；无快照则不推（空画布语义正确）。
        if (!toolCall) {
          const invocation = resource && 'invocation' in resource ? resource.invocation : undefined
          if (invocation) {
            void bridge?.sendToolResult({
              content: invocation.content as CallToolResult['content'],
              ...(invocation.structuredContent ? { structuredContent: invocation.structuredContent } : {}),
              ...(invocation._meta ? { _meta: invocation._meta } : {}),
              ...(invocation.isError ? { isError: true } : {}),
            })
          }
          return
        }
        void bridge?.sendToolInput({ arguments: toolCall.arguments })
        void bridge?.sendToolResult({
          content: toolCall.result.content as CallToolResult['content'],
          ...(toolCall.result.structuredContent ? { structuredContent: toolCall.result.structuredContent } : {}),
          ...(toolCall.result._meta ? { _meta: toolCall.result._meta } : {}),
          ...(toolCall.result.isError ? { isError: true } : {}),
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
        if (uri !== resource.resourceUri || (bindingResourceUri !== undefined && bindingResourceUri !== uri)) return { contents: [] }
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
  }, [callId, resource, hydrated, frameReady, documentUrl, toolCall, toolName, bindingResourceUri])

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
      toolInfo: { tool: { name: toolCall?.callName ?? toolName, inputSchema: { type: 'object' } } },
    })
  }, [callId, displayMode, frameReady, height, toolCall, toolName])

  if (loadError && !hydrated) return <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', padding: '12px 14px', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, fontSize: 12 }}>
    <div style={{ color: 'var(--dsw-alias-label-caption)' }}>MCP App 资源暂不可用（{serverId} · {loadError}）</div>
    <button type="button" onClick={() => { setLoadError(undefined); setRefreshedResource(undefined); setRetryNonce(n => n + 1) }} style={{ minWidth: 72, height: 30, padding: '0 14px', fontSize: 12, cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8 }}>重试</button>
  </div>
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
    {...(fullscreen ? { 'data-openloop-mcp-fullscreen': '', role: 'dialog', 'aria-modal': true, 'aria-label': `${label} fullscreen editor` } : {})}
    style={fullscreen
      ? { position: 'fixed', inset: 0, zIndex: 2147483000, display: 'flex', flexDirection: 'column', padding: 16, background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(10px)' }
      : { width: '100%' }}
  >
    {fullscreen && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 52px', padding: '0 16px', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderBottom: 0, borderRadius: '14px 14px 0 0' }}>
      <strong>{label}</strong>
      <button type="button" aria-label="Close fullscreen editor" onClick={closeFullscreen} style={{ minWidth: 72, height: 34, padding: '0 14px', color: 'inherit', background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 9, cursor: 'pointer' }}>Close</button>
    </div>}
    <iframe data-openloop-mcp-call={callId} title={`${label} MCP App`} sandbox={documentUrl ? 'allow-scripts allow-same-origin' : 'allow-scripts'} allow={sandboxAllow(hydrated._meta)} referrerPolicy="no-referrer" {...(documentUrl ? { src: documentUrl } : { srcDoc: doc })} onLoad={() => setFrameReady(true)} style={{ display: 'block', width: '100%', height: fullscreen ? 'calc(100vh - 84px)' : height, flex: fullscreen ? '1 1 auto' : undefined, minHeight: fullscreen ? 0 : undefined, border: fullscreen ? '1px solid var(--dsw-alias-border-l2)' : 0, borderRadius: fullscreen ? '0 0 14px 14px' : 0, background: fullscreen ? '#fff' : 'transparent' }} />
  </div>
}

function AppFrame({ callId, presentation, toolArgumentsRaw }: { callId: string; presentation: McpAppPresentation; toolArgumentsRaw?: string }) {
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

  const initialResource = presentation.result.uiResource
  if (!initialResource) return <div style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 12 }}>MCP App unavailable</div>
  return <McpAppSandbox
    callId={callId}
    label={presentation.toolName}
    serverId={presentation.serverId}
    toolName={presentation.toolName}
    resource={initialResource}
    {...(presentation.binding ? { bindingResourceUri: presentation.binding.resourceUri } : {})}
    toolCall={{ callName: presentation.callName, arguments: toolArguments, result: presentation.result }}
  />
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

export interface McpAppResourceViewProps {
  /** MCP server id（mcp.json 里的键名） */
  readonly serverId: string
  /** resourceUri 绑定的工具名（refresh 端点按 (serverId, toolName, resourceUri) 校验绑定） */
  readonly toolName: string
  /** ui:// 资源地址 */
  readonly resourceUri: string
  /** 展示名（缺省用 resourceUri） */
  readonly title?: string
  /** iframe 定位 id；同一视图多实例并存（dock 多 tile）时须各自稳定唯一 */
  readonly frameId?: string
}

/**
 * 独立资源视图（方向1 v2 pin 入口，2026-08-29）：无工具调用上下文，按
 * (serverId, toolName, resourceUri) 渲染时 refresh 取数——与对话流卡共享
 * 同一沙箱核心与 AppBridge 通道（B/C 同通道）。dock pin tile 的渲染组件。
 */
export function McpAppResourceView(props: McpAppResourceViewProps) {
  const frameId = props.frameId ?? `mcp-app-resource-${CSS.escape(`${props.serverId}__${props.toolName}__${props.resourceUri}`)}`
  const initialResource = useMemo<McpAppResourceSeed>(() => ({
    serverId: props.serverId,
    resourceUri: props.resourceUri,
    mimeType: MCP_APP_MIME,
  }), [props.serverId, props.resourceUri])
  return <McpAppSandbox
    callId={frameId}
    label={props.title ?? props.resourceUri}
    serverId={props.serverId}
    toolName={props.toolName}
    resource={initialResource}
  />
}

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
