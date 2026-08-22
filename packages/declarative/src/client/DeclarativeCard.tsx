import { useState, type CSSProperties } from 'react'
import { Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { useOpenLoopVisualTheme, type OpenLoopSettingsScope } from '@openloop/dsh-visual-theme/client'
import { declarativeMetaFrom, type ComparisonDocument, type DeclarativeDocument, type FlowDocument, type TimelineDocument, type Tone } from '../document.ts'

const palette: Record<Tone, { soft: string; strong: string }> = {
  neutral: { soft: 'var(--openloop-surface-muted)', strong: 'var(--openloop-muted-foreground)' },
  info: { soft: 'var(--openloop-info-background)', strong: 'var(--openloop-info)' },
  success: { soft: 'var(--openloop-success-background)', strong: 'var(--openloop-success)' },
  warning: { soft: 'var(--openloop-warning-background)', strong: 'var(--openloop-warning)' },
  danger: { soft: 'var(--openloop-error-background)', strong: 'var(--openloop-error)' },
}

const shell: CSSProperties = {
  width: '100%', border: '1px solid var(--openloop-border)', borderRadius: 'var(--openloop-radius-lg)',
  background: 'var(--openloop-surface)', color: 'var(--openloop-foreground)', overflow: 'hidden', boxShadow: 'var(--openloop-shadow-2)',
}

const header: CSSProperties = { padding: '18px 20px 14px', borderBottom: '1px solid var(--openloop-border)' }
const titleStyle: CSSProperties = { margin: 0, fontSize: 18, lineHeight: 1.3, letterSpacing: '-0.02em', fontWeight: 650 }
const descriptionStyle: CSSProperties = { margin: '5px 0 0', color: 'var(--openloop-muted-foreground)', fontSize: 13, lineHeight: 1.55 }

function Frame({ document, scope }: { document: DeclarativeDocument; scope: OpenLoopSettingsScope }) {
  const theme = useOpenLoopVisualTheme(scope)
  return <section style={{ ...shell, ...theme.style }} data-openloop-visual={document.kind} data-openloop-preset={theme.settings.preset} data-openloop-appearance={theme.appearance}>
    <header style={header}>
      <h3 style={titleStyle}>{document.title}</h3>
      {document.description && <p style={descriptionStyle}>{document.description}</p>}
    </header>
    {document.kind === 'flow' && <FlowView document={document} />}
    {document.kind === 'timeline' && <TimelineView document={document} />}
    {document.kind === 'comparison' && <ComparisonView document={document} />}
  </section>
}

function FlowView({ document }: { document: FlowDocument }) {
  const incoming = new Map(document.nodes.map(node => [node.id, document.edges.filter(edge => edge.to === node.id)]))
  return <div style={{ padding: 20, display: 'grid', gap: 10 }}>
    {document.nodes.map((node, index) => {
      const tone = palette[node.tone ?? (index === 0 ? 'info' : 'neutral')]
      const edges = incoming.get(node.id) ?? []
      return <div key={node.id}>
        {edges.length > 0 && <div style={{ minHeight: 26, marginLeft: 22, borderLeft: '1px solid var(--openloop-border)', paddingLeft: 17, color: 'var(--openloop-muted-foreground)', fontSize: 11, display: 'flex', alignItems: 'center' }}>
          {edges.map(edge => edge.label).filter(Boolean).join(' · ') || '↓'}
        </div>}
        <div style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: 12, alignItems: 'start', border: '1px solid var(--openloop-border)', borderRadius: 'var(--openloop-radius-md)', padding: '13px 14px', background: tone.soft }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center', background: tone.strong, color: 'white', fontSize: 12, fontWeight: 700 }}>{index + 1}</div>
          <div><div style={{ fontWeight: 620, lineHeight: 1.35 }}>{node.label}</div>{node.detail && <div style={{ marginTop: 4, color: 'var(--openloop-muted-foreground)', fontSize: 12, lineHeight: 1.5 }}>{node.detail}</div>}</div>
        </div>
      </div>
    })}
  </div>
}

function TimelineView({ document }: { document: TimelineDocument }) {
  return <ol style={{ listStyle: 'none', margin: 0, padding: '20px 20px 22px' }}>
    {document.items.map((item, index) => {
      const status = item.status ?? (index === 0 ? 'current' : 'future')
      const active = status === 'current'
      return <li key={item.id} style={{ display: 'grid', gridTemplateColumns: '82px 20px minmax(0,1fr)', columnGap: 12, minHeight: 72 }}>
        <div style={{ textAlign: 'right', paddingTop: 2, color: 'var(--openloop-muted-foreground)', fontSize: 11 }}>{item.time}</div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          {index < document.items.length - 1 && <div style={{ position: 'absolute', top: 16, bottom: -2, width: 1, background: 'var(--openloop-border)' }} />}
          <div style={{ position: 'relative', width: active ? 14 : 10, height: active ? 14 : 10, marginTop: active ? 1 : 3, borderRadius: 999, background: active ? 'var(--openloop-primary)' : status === 'past' ? 'var(--openloop-success)' : 'var(--openloop-border)', boxShadow: active ? '0 0 0 5px var(--openloop-selection)' : undefined }} />
        </div>
        <div style={{ paddingBottom: 20 }}><div style={{ fontWeight: active ? 650 : 560 }}>{item.title}</div>{item.detail && <div style={{ color: 'var(--openloop-muted-foreground)', fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{item.detail}</div>}</div>
      </li>
    })}
  </ol>
}

export function ComparisonView({ document }: { document: ComparisonDocument }) {
  const recommended = document.columns.findIndex(column => column.recommended === true)
  const [focus, setFocus] = useState(recommended >= 0 ? recommended : 0)
  return <div style={{ padding: 20, overflowX: 'auto' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {document.columns.map((column, index) => <Pill key={column.id} active={focus === index} onClick={() => setFocus(index)}>{column.title}{column.recommended ? ' · 推荐' : ''}</Pill>)}
    </div>
    <div style={{ minWidth: 460, display: 'grid', gridTemplateColumns: `minmax(120px, .8fr) repeat(${document.columns.length}, minmax(120px, 1fr))`, border: '1px solid var(--openloop-border)', borderRadius: 'var(--openloop-radius-md)', overflow: 'hidden' }}>
      <div style={{ padding: 12, background: 'var(--openloop-surface-muted)' }} />
      {document.columns.map((column, index) => <div key={column.id} style={{ padding: '12px 14px', background: focus === index ? 'var(--openloop-selection)' : 'var(--openloop-surface-muted)', color: focus === index ? 'var(--openloop-selection-foreground)' : undefined, borderLeft: '1px solid var(--openloop-border)' }}><div style={{ fontWeight: 650 }}>{column.title}</div>{column.subtitle && <div style={{ fontSize: 11, color: focus === index ? 'var(--openloop-selection-foreground)' : 'var(--openloop-muted-foreground)', opacity: focus === index ? .7 : 1, marginTop: 3 }}>{column.subtitle}</div>}</div>)}
      {document.rows.flatMap((row, rowIndex) => [
        <div key={`label-${rowIndex}`} style={{ padding: '11px 12px', borderTop: '1px solid var(--openloop-border)', fontSize: 12, color: 'var(--openloop-muted-foreground)', fontWeight: row.emphasis === 'strong' ? 650 : 500 }}>{row.label}</div>,
        ...row.values.map((value, columnIndex) => <div key={`${rowIndex}-${columnIndex}`} style={{ padding: '11px 14px', borderTop: '1px solid var(--openloop-border)', borderLeft: '1px solid var(--openloop-border)', background: focus === columnIndex ? 'var(--openloop-selection)' : undefined, color: focus === columnIndex ? 'var(--openloop-selection-foreground)' : undefined, fontWeight: row.emphasis === 'strong' ? 650 : 450, fontSize: 13 }}>{value}</div>),
      ])}
    </div>
  </div>
}

function firstLine(block: { content: readonly { type: string; text?: string }[] }): string {
  return block.content.find(part => part.type === 'text' && part.text)?.text?.split('\n')[0] ?? 'Visualization unavailable'
}

export function DeclarativeCard({ block, scope }: ToolCallViewProps & { scope: OpenLoopSettingsScope }) {
  if (!('kind' in block)) return <div style={descriptionStyle}>OpenLoop Visual · rendering…</div>
  if (block.isError) return <div style={descriptionStyle}>{firstLine(block)}</div>
  const meta = declarativeMetaFrom(block.meta)
  if (!meta) return <div style={descriptionStyle}>{firstLine(block)}</div>
  return <Frame document={meta.document} scope={scope} />
}
