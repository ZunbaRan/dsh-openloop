import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { HEIGHT_MESSAGE, widgetMetaFrom } from '../contract.ts'
import { buildWidgetDocument } from '../shell.ts'
import { resolveTheme } from './theme.ts'
import { useOpenLoopVisualTheme, type OpenLoopSettingsScope } from '@openloop/dsh-visual-theme/client'

const subtle: CSSProperties = { color: 'var(--dsw-alias-label-caption)', fontSize: 12, lineHeight: 1.4 }

function firstText(content: readonly unknown[]): string | undefined {
  for (const part of content) {
    if (typeof part === 'object' && part !== null && 'type' in part && part.type === 'text' && 'text' in part && typeof part.text === 'string') return part.text
  }
  return undefined
}

export function WidgetCard({ callId, block, scope }: ToolCallViewProps & { scope: OpenLoopSettingsScope }) {
  const [height, setHeight] = useState(72)
  const theme = useOpenLoopVisualTheme(scope)
  const meta = 'kind' in block && !block.isError ? widgetMetaFrom(block.meta) : undefined

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; token?: unknown; height?: unknown } | null
      if (data?.type === HEIGHT_MESSAGE && data.token === callId && typeof data.height === 'number' && Number.isFinite(data.height)) setHeight(Math.max(72, Math.min(640, Math.ceil(data.height))))
    }
    addEventListener('message', listener)
    return () => removeEventListener('message', listener)
  }, [callId])

  const doc = useMemo(() => meta ? buildWidgetDocument(meta.fragment, meta.title, callId, resolveTheme(theme.palette, theme.appearance)) : '', [meta, callId, theme.palette, theme.appearance])
  if (!('kind' in block)) return <div style={subtle}>Widget · composing…</div>
  if (block.isError || !meta) return <div style={subtle}>{firstText(block.content) ?? 'Widget unavailable'}</div>
  return <section style={{ width: '100%', ...theme.style }} data-openloop-preset={theme.settings.preset}>
    <div style={{ ...subtle, color: 'var(--openloop-muted-foreground)', display: 'flex', alignItems: 'center', gap: 7, margin: '0 2px 7px' }}><span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--openloop-primary)' }} />{meta.title}</div>
    <iframe title={meta.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={doc} style={{ display: 'block', width: '100%', height, border: 0, background: 'transparent' }} />
  </section>
}
