import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Button, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { ARTIFACT_HEIGHT_MESSAGE, artifactMetaFrom, type ArtifactMeta } from '../contract.ts'
import { buildArtifactDocument } from '../shell.ts'
import { resolveTheme } from './theme.ts'
import { useOpenLoopVisualTheme, type OpenLoopSettingsScope } from '@openloop/dsh-visual-theme/client'

const caption: CSSProperties = { color: 'var(--dsw-alias-label-caption)', fontSize: 12 }

function firstText(content: readonly unknown[]): string | undefined {
  for (const part of content) {
    if (typeof part === 'object' && part !== null && 'type' in part && part.type === 'text' && 'text' in part && typeof part.text === 'string') return part.text
  }
  return undefined
}

function ArtifactFrame({ meta, token, fullscreen, scope }: { meta: ArtifactMeta; token: string; fullscreen: boolean; scope: OpenLoopSettingsScope }) {
  const [height, setHeight] = useState(fullscreen ? 700 : 520)
  const theme = useOpenLoopVisualTheme(scope)
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; token?: unknown; height?: unknown } | null
      if (data?.type === ARTIFACT_HEIGHT_MESSAGE && data.token === token && typeof data.height === 'number' && Number.isFinite(data.height)) setHeight(Math.max(360, Math.min(fullscreen ? 1600 : 760, Math.ceil(data.height))))
    }
    addEventListener('message', listener)
    return () => removeEventListener('message', listener)
  }, [token, fullscreen])
  const doc = useMemo(() => buildArtifactDocument(meta.html, meta.title, meta.runtime, token, resolveTheme(theme.palette, theme.appearance)), [meta, token, theme.palette, theme.appearance])
  return <iframe title={meta.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={doc} style={{ display: 'block', width: '100%', height: fullscreen ? '100%' : height, minHeight: fullscreen ? 0 : 360, border: 0, background: 'var(--dsw-alias-bg-layer-1)', borderRadius: fullscreen ? 0 : 14 }} />
}

function ArtifactSurface({ meta, callId, scope }: { meta: ArtifactMeta; callId: string; scope: OpenLoopSettingsScope }) {
  const [fullscreen, setFullscreen] = useState(false)
  const theme = useOpenLoopVisualTheme(scope)
  useEffect(() => {
    if (!fullscreen) return
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') setFullscreen(false) }
    addEventListener('keydown', listener)
    return () => removeEventListener('keydown', listener)
  }, [fullscreen])
  return <>
    <section style={{ ...theme.style, border: '1px solid var(--openloop-border)', borderRadius: 'var(--openloop-radius-lg)', overflow: 'hidden', background: 'var(--openloop-surface)', color: 'var(--openloop-foreground)', boxShadow: 'var(--openloop-shadow-2)' }} data-openloop-preset={theme.settings.preset}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px 10px 15px', borderBottom: '1px solid var(--openloop-border)' }}>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.title}</div><div style={{ ...caption, marginTop: 2 }}>{meta.path}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Pill>{meta.runtime === 'static' ? 'Static' : 'Interactive'}</Pill><Button size="sm" variant="toolbar" onClick={() => setFullscreen(true)}>Fullscreen</Button></div>
      </header>
      <div style={{ padding: 8 }}><ArtifactFrame meta={meta} token={callId} fullscreen={false} scope={scope} /></div>
    </section>
    {fullscreen && <div role="dialog" aria-modal="true" aria-label={meta.title} style={{ position: 'fixed', inset: 12, zIndex: 2147482000, display: 'grid', gridTemplateRows: '52px minmax(0,1fr)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 20, overflow: 'hidden', background: 'var(--dsw-alias-bg-layer-1)', boxShadow: '0 30px 100px rgb(0 0 0 / 38%)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 0 18px', borderBottom: '1px solid var(--dsw-alias-border-l2)' }}><strong>{meta.title}</strong><Button size="sm" variant="outline" onClick={() => setFullscreen(false)}>Close</Button></header>
      <ArtifactFrame meta={meta} token={`${callId}:fullscreen`} fullscreen scope={scope} />
    </div>}
  </>
}

export function ArtifactCard({ callId, block, scope }: ToolCallViewProps & { scope: OpenLoopSettingsScope }) {
  if (!('kind' in block)) return <div style={caption}>HTML Artifact · building…</div>
  if (block.isError) return <div style={caption}>{firstText(block.content) ?? 'Artifact failed'}</div>
  const meta = artifactMetaFrom(block.meta)
  return meta ? <ArtifactSurface meta={meta} callId={callId} scope={scope} /> : <div style={caption}>Artifact metadata unavailable</div>
}
