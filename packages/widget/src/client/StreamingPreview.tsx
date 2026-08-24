import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { extractStreamingFragment, HEIGHT_MESSAGE, previewFragment, SHOW_WIDGET_TOOL, STREAM_MESSAGE } from '../contract.ts'
import { buildStreamingDocument } from '../shell.ts'
import { resolveTheme } from './theme.ts'
import type { OpenLoopSettingsScope } from '@openloop/dsh-base/client'
import { getBaseClient } from './base-bridge.tsx'

type Props = PropsRuntime<'conversation.input.dock'>

function Preview({ raw, scope }: { raw: string; scope: OpenLoopSettingsScope }) {
  const fragment = previewFragment(extractStreamingFragment(raw) ?? '')
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [height, setHeight] = useState(0)
  const theme = getBaseClient()!.useOpenLoopVisualTheme(scope)
  const doc = useMemo(() => buildStreamingDocument('openloop-widget-preview', resolveTheme(theme.palette, theme.appearance)), [theme.palette, theme.appearance])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loaded) frame.current?.contentWindow?.postMessage({ type: STREAM_MESSAGE, token: 'openloop-widget-preview', fragment }, '*')
    }, 100)
    return () => clearTimeout(timer)
  }, [fragment, loaded])
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; token?: unknown; height?: unknown } | null
      if (data?.type === HEIGHT_MESSAGE && data.token === 'openloop-widget-preview' && typeof data.height === 'number') setHeight(Math.min(280, Math.max(0, Math.ceil(data.height))))
    }
    addEventListener('message', listener)
    return () => removeEventListener('message', listener)
  }, [])
  return <div style={{ width: '100%', maxWidth: 760, margin: '8px auto 2px' }}>
    <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-caption)', marginBottom: 4 }}>Widget · live preview</div>
    <iframe ref={frame} title="Widget live preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={doc} onLoad={() => setLoaded(true)} style={{ display: 'block', width: '100%', height, border: 0, transition: 'height 180ms ease', background: 'transparent' }} />
  </div>
}

export function StreamingPreview(props: Props & { scope: OpenLoopSettingsScope | undefined }) {
  // 流预览是输入框旁的小部件：base 缺失时静默隐藏（降级条在这里太吵）
  if (props.scope === undefined) return null
  return <StreamingPreviewInner {...props} scope={props.scope} />
}

function StreamingPreviewInner({ session, scope }: Props & { scope: OpenLoopSettingsScope }) {
  let raw: string | undefined
  for (const block of session?.partial?.blocks ?? []) if (block.kind === 'tool-call' && block.name === SHOW_WIDGET_TOOL) raw = block.argsRaw
  return raw === undefined ? null : <Preview raw={raw} scope={scope} />
}
