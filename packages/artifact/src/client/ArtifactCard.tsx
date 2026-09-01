import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { ARTIFACT_FETCH_MESSAGE, ARTIFACT_FETCH_RESULT_MESSAGE, ARTIFACT_HEIGHT_MESSAGE, artifactMetaFrom, type ArtifactMeta } from '../contract.ts'
import { buildArtifactDocument } from '../shell.ts'
import { resolveTheme } from './theme.ts'
import { getDockService } from './dock-pin.ts'
import type { OpenLoopSettingsScope } from '@openloop/dsh-base/client'
import { getBaseClient, DependencyMissing } from './base-bridge.tsx'

const caption: CSSProperties = { color: 'var(--dsw-alias-label-caption)', fontSize: 12 }

function firstText(content: readonly unknown[]): string | undefined {
  for (const part of content) {
    if (typeof part === 'object' && part !== null && 'type' in part && part.type === 'text' && 'text' in part && typeof part.text === 'string') return part.text
  }
  return undefined
}

export function ArtifactFrame(props: { meta: ArtifactMeta; token: string; fullscreen: boolean; scope: OpenLoopSettingsScope | undefined }) {
  if (props.scope === undefined) return <DependencyMissing what="OpenLoop Artifact" />
  return <ArtifactFrameInner {...props} scope={props.scope} />
}

function ArtifactFrameInner({ meta, token, fullscreen, scope }: { meta: ArtifactMeta; token: string; fullscreen: boolean; scope: OpenLoopSettingsScope }) {
  const [height, setHeight] = useState(fullscreen ? 700 : 520)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const theme = getBaseClient()!.useOpenLoopVisualTheme(scope)
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; token?: unknown; height?: unknown } | null
      if (data?.type === ARTIFACT_HEIGHT_MESSAGE && data.token === token && typeof data.height === 'number' && Number.isFinite(data.height)) setHeight(Math.max(360, Math.min(fullscreen ? 1600 : 760, Math.ceil(data.height))))
    }
    addEventListener('message', listener)
    return () => removeEventListener('message', listener)
  }, [token, fullscreen])
  // v2 network 档：openloop.fetch 代理（iframe 断网 → 宿主经 /openloop/base/fetch 服务端取数）
  // token 校验与 height 桥同款；来源 iframe 校验经 event.source 比对 contentWindow。
  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      const data = event.data as { type?: unknown; token?: unknown; callId?: unknown; url?: unknown; init?: { method?: unknown; body?: unknown; headers?: unknown; timeoutMs?: unknown } } | null
      if (data?.type !== ARTIFACT_FETCH_MESSAGE || data.token !== token) return
      if (typeof data.callId !== 'string' || typeof data.url !== 'string') return
      const frame = frameRef.current
      if (!frame || event.source !== frame.contentWindow) return
      try {
        const response = await fetch('/openloop/base/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: data.url,
            ...(typeof data.init?.method === 'string' ? { method: data.init.method } : {}),
            ...(typeof data.init?.body === 'string' ? { body: data.init.body } : {}),
            ...(data.init?.headers && typeof data.init.headers === 'object' ? { headers: data.init.headers } : {}),
            ...(typeof data.init?.timeoutMs === 'number' ? { timeoutMs: data.init.timeoutMs } : {}),
          }),
        })
        const result = await response.json() as { ok: boolean; status?: number; data?: unknown; error?: string }
        frame.contentWindow?.postMessage(
          result.ok
            ? { type: ARTIFACT_FETCH_RESULT_MESSAGE, token, callId: data.callId, ok: true, status: result.status, data: result.data }
            : { type: ARTIFACT_FETCH_RESULT_MESSAGE, token, callId: data.callId, ok: false, error: result.error },
          '*',
        )
      } catch (error) {
        frame.contentWindow?.postMessage(
          { type: ARTIFACT_FETCH_RESULT_MESSAGE, token, callId: data.callId, ok: false, error: error instanceof Error ? error.message : String(error) },
          '*',
        )
      }
    }
    addEventListener('message', listener)
    return () => removeEventListener('message', listener)
  }, [token])
  const doc = useMemo(() => buildArtifactDocument(meta.html, meta.title, meta.runtime, token, resolveTheme(theme.palette, theme.appearance)), [meta, token, theme.palette, theme.appearance])
  return <iframe ref={frameRef} title={meta.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={doc} style={{ display: 'block', width: '100%', height: fullscreen ? '100%' : height, minHeight: fullscreen ? 0 : 360, border: 0, background: 'var(--dsw-alias-bg-layer-1)', borderRadius: fullscreen ? 0 : 14 }} />
}

function ArtifactSurface({ meta, callId, scope }: { meta: ArtifactMeta; callId: string; scope: OpenLoopSettingsScope }) {
  const [fullscreen, setFullscreen] = useState(false)
  const theme = getBaseClient()!.useOpenLoopVisualTheme(scope)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {getDockService() ? <Button size="sm" variant="toolbar" onClick={() => getDockService()?.pinArtifact(meta, meta.title)}>📌 Pin</Button> : null}
          <Pill>{meta.runtime === 'static' ? 'Static' : meta.runtime === 'network' ? 'Network' : 'Interactive'}</Pill><Button size="sm" variant="toolbar" onClick={() => setFullscreen(true)}>Fullscreen</Button></div>
      </header>
      <div style={{ padding: 8 }}><ArtifactFrame meta={meta} token={callId} fullscreen={false} scope={scope} /></div>
    </section>
    {fullscreen && <div role="dialog" aria-modal="true" aria-label={meta.title} style={{ position: 'fixed', inset: 12, zIndex: 2147482000, display: 'grid', gridTemplateRows: '52px minmax(0,1fr)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 20, overflow: 'hidden', background: 'var(--dsw-alias-bg-layer-1)', boxShadow: '0 30px 100px rgb(0 0 0 / 38%)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 0 18px', borderBottom: '1px solid var(--dsw-alias-border-l2)' }}><strong>{meta.title}</strong><Button size="sm" variant="outline" onClick={() => setFullscreen(false)}>Close</Button></header>
      <ArtifactFrame meta={meta} token={`${callId}:fullscreen`} fullscreen scope={scope} />
    </div>}
  </>
}

export function ArtifactCard(props: ToolCallViewProps & { scope: OpenLoopSettingsScope | undefined }) {
  if (props.scope === undefined) return <DependencyMissing what="OpenLoop Artifact" />
  return <ArtifactCardInner {...props} scope={props.scope} />
}

function ArtifactCardInner({ callId, block, scope }: ToolCallViewProps & { scope: OpenLoopSettingsScope }) {
  if (!('kind' in block)) return <div style={caption}>HTML Artifact · building…</div>
  if (block.isError) return <div style={caption}>{firstText(block.content) ?? 'Artifact failed'}</div>
  const meta = artifactMetaFrom(block.meta)
  return meta ? <ArtifactSurface meta={meta} callId={callId} scope={scope} /> : <div style={caption}>Artifact metadata unavailable</div>
}
