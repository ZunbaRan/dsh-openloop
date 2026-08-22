/**
 * 沙箱车道格子（DSH_PANELS_DESIGN §8，宿主侧渲染）。
 *
 * - iframe 恒 `sandbox="allow-scripts"`（**不给** `allow-same-origin` → opaque origin，§15 S1），
 *   `referrerPolicy="no-referrer"`，`srcDoc` 由 `buildSandboxDocument` 合成（§15 S5）。
 * - 高度由 `openloop:size-change` 驱动，`clamp(360, 1600)`（§8.5）。
 * - 桥消息经 `isTrustedBridgeMessage` 三关校验（§15 S7）；token 由宿主每渲染生成（tokenPayload.token）。
 * - 错误边界渲染降级占位；初始显示 loading 占位，收到 `openloop:ready` 后移除。
 *
 * 注意：custom code 的编译（sucrase）在服务端 compiler.ts 完成（index.ts 于 tool.execute
 * 包装处接入，§8.3），此处直接透传 widget.source.code（已是编译产物；源码形态由 runtime 容错）。
 * 主题/数据切换不重建 iframe：token-sync / data 经桥消息热更新（§8.5）；srcDoc 仅在
 * runtime/编译产物/token 变化时重建。
 */
import { Component, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { WidgetUnit } from '../contract.ts'
import { buildSandboxDocument } from '../sandbox/shell.ts'
import { BRIDGE_MESSAGE, isTrustedBridgeMessage, sendData, sendTokenSync, type TokenSyncPayload } from './bridge.ts'

export interface SandboxLaneProps {
  widget: WidgetUnit
  /** runtime 资产 URL（本地源，经 §9 路由 serve） */
  runtimeUrl: string
  /** 宿主生成的 token/token 快照（§8.4；token 每 widget 每生命周期随机） */
  tokenPayload: TokenSyncPayload
  /** §5.2 数据绑定解析结果（resolved[widgetId]）；变化时经 openloop:data 重推，不重建 iframe */
  data?: unknown
}

const MIN_HEIGHT = 360
const MAX_HEIGHT = 1600

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  fontSize: 12,
  color: 'var(--openloop-muted-foreground, rgba(128,128,128,.7))',
  pointerEvents: 'none',
}

const errorBox: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  padding: 12,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-error, #c0392b)',
  background: 'color-mix(in oklab, var(--openloop-error, #c0392b) 6%, transparent)',
  border: '1px solid var(--openloop-border, rgba(128,128,128,.35))',
  borderRadius: 'var(--openloop-radius-md, 8px)',
}

/** 单格错误边界：沙箱渲染/文档生成崩溃时降级，不拖垮面板（§7 错误边界约束） */
class SandboxErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  render(): ReactNode {
    if (this.state.error) {
      return <div style={errorBox}>Sandbox widget failed: {this.state.error.message}</div>
    }
    return this.props.children
  }
}

function SandboxFrame({ widget, runtimeUrl, tokenPayload, data }: SandboxLaneProps) {
  const [height, setHeight] = useState(MIN_HEIGHT)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const { token } = tokenPayload
  // 首帧 token 快照：后续主题/数据变化走 token-sync / data 桥消息热更新（§8.5），iframe 不重建
  const initialPayload = useRef(tokenPayload)

  // §8.3：custom code 已在服务端编译（compilePanelCustomCode，幂等）；非产物源码形态由 runtime 容错
  const compiledJs = useMemo(() => (widget.source.type === 'custom' ? widget.source.code : ''), [widget])

  const doc = useMemo(
    () => buildSandboxDocument({
      runtimeUrl,
      compiledJs,
      preset: initialPayload.current.preset,
      appearance: initialPayload.current.appearance,
      token,
      widgetId: widget.id,
      presetTokens: initialPayload.current.tokens,
      globalTokens: initialPayload.current.global,
    }),
    [runtimeUrl, compiledJs, token, widget.id],
  )

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!isTrustedBridgeMessage(event, token)) return
      const data = event.data as { type?: unknown; height?: unknown; message?: unknown }
      if (data.type === BRIDGE_MESSAGE.sizeChange && typeof data.height === 'number' && Number.isFinite(data.height)) {
        setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(data.height))))
      } else if (data.type === BRIDGE_MESSAGE.ready) {
        setReady(true)
      } else if (data.type === BRIDGE_MESSAGE.error && typeof data.message === 'string') {
        setError(data.message)
      }
    }
    addEventListener('message', listener)
    return () => removeEventListener('message', listener)
  }, [token])

  const pushTokenSync = (): void => sendTokenSync(frameRef.current?.contentWindow ?? null, tokenPayload)

  // 首帧 + token 载荷变化重发（§8.4 预设/明暗切换）；iframe load 后 runtime 监听器已就绪再发一次
  useEffect(() => {
    pushTokenSync()
  }, [tokenPayload, token])

  // §10 数据刷新：resolved 变化经 openloop:data 重推（§8.4 方向 B），iframe 不重建
  useEffect(() => {
    sendData(frameRef.current?.contentWindow ?? null, {
      token,
      widgetId: widget.id,
      data,
      resolvedAt: new Date().toISOString(),
    })
  }, [data, token, widget.id])

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: MIN_HEIGHT }}>
      <iframe
        ref={frameRef}
        title={widget.id}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={doc}
        onLoad={pushTokenSync}
        style={{ display: 'block', width: '100%', height, border: 0, background: 'transparent' }}
      />
      {!ready && !error && <div style={overlay}>Sandbox widget · loading…</div>}
      {error !== null && <div style={errorBox}>{error}</div>}
    </div>
  )
}

export function SandboxLane(props: SandboxLaneProps) {
  return (
    <SandboxErrorBoundary>
      <SandboxFrame {...props} />
    </SandboxErrorBoundary>
  )
}
