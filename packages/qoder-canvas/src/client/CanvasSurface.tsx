/**
 * CanvasSurface：画布渲染器（M1）——10 节点类型的组件树渲染。
 * 全部内联 style 消费 --dsw-alias-*（DSH 宿主 token，明暗自适应）；
 * chart 用内联 SVG 手绘（不引库）；markdown 极简渲染（零 HTML 解析）。
 */
import type { CSSProperties, ReactNode } from 'react'
import type { CanvasNode, CanvasSnapshot } from '../dsl.ts'
import { renderMarkdownLines } from './markdown.tsx'

// ---- 通用样式 ----

const surface: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
  borderRadius: 14,
  background: 'var(--dsw-alias-bg-layer-1, #fff)',
  overflow: 'hidden',
  fontFamily: 'inherit',
}

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 16px 10px',
  borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
}

const TONE_COLOR: Record<string, string> = {
  default: 'var(--dsw-alias-label-primary, inherit)',
  success: 'var(--dsw-alias-state-success-primary, #22c55e)',
  warn: 'var(--dsw-alias-state-warn-primary, #f59e0b)',
  error: 'var(--dsw-alias-state-error-primary, #d4453a)',
  info: 'var(--dsw-alias-state-business-primary, #4176e6)',
}

// ---- 布局 ----

function layoutStyle(layout: string, nodeCount: number): CSSProperties {
  if (layout === 'flow') return { display: 'flex', flexWrap: 'wrap', gap: 12, padding: 12, alignItems: 'stretch' }
  if (layout === 'split-h') return { display: 'grid', gridTemplateColumns: `repeat(${Math.min(nodeCount, 2)}, minmax(0, 1fr))`, gap: 12, padding: 12 }
  if (layout === 'split-v') return { display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }
  // grid（默认）
  return { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: 12, alignItems: 'stretch' }
}

// ---- 节点渲染 ----

function nodeBase(): CSSProperties {
  return {
    border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
    borderRadius: 10,
    background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)',
    padding: 12,
    minWidth: 0,
    overflow: 'hidden',
  }
}

function StatCardNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const tone = typeof props.tone === 'string' ? props.tone : 'default'
  const delta = typeof props.delta === 'number' ? props.delta : null
  const deltaLabel = typeof props.deltaLabel === 'string' ? props.deltaLabel : ''
  return (
    <div style={nodeBase()}>
      <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)' }}>{String(props.label ?? '')}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: TONE_COLOR[tone] ?? TONE_COLOR['default'] }}>{String(props.value ?? '')}</div>
      {delta !== null ? (
        <div style={{ fontSize: 11, marginTop: 4, color: delta >= 0 ? 'var(--dsw-alias-state-success-primary, #22c55e)' : 'var(--dsw-alias-state-error-primary, #d4453a)' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}{deltaLabel ? ` ${deltaLabel}` : ''}
        </div>
      ) : null}
    </div>
  )
}

function ChartNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const series = Array.isArray(props.series) ? props.series : []
  const kind = typeof props.chart === 'string' ? props.chart : 'line'
  return (
    <div style={{ ...nodeBase(), display: 'flex', flexDirection: 'column', gap: 8 }}>
      {typeof props.title === 'string' && props.title.length > 0 ? (
        <div style={{ fontSize: 12, fontWeight: 600 }}>{props.title}</div>
      ) : null}
      <InlineChart kind={kind} series={series} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>
        {series.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {String((s as { name?: unknown }).name ?? `S${i + 1}`)}
          </span>
        ))}
      </div>
    </div>
  )
}

const SERIES_COLORS = ['#4176e6', '#22c55e', '#f59e0b', '#d4453a', '#b06ad9', '#14b8a6', '#f97316', '#64748b']

/** 内联 SVG 图表（line/area/bar/pie；数据已在 dsl 层限流） */
function InlineChart({ kind, series }: { kind: string; series: readonly unknown[] }): ReactNode {
  const W = 320, H = 160, PAD = 8
  if (kind === 'pie') {
    const points = (series[0] as { points?: unknown[] } | undefined)?.points ?? []
    const values = points.map(p => (typeof (p as { y?: unknown })?.y === 'number' ? (p as { y: number }).y : 0)).filter(v => v > 0)
    const total = values.reduce((a, b) => a + b, 0)
    if (total <= 0 || values.length === 0) return <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 16 }}>无数据</div>
    let acc = 0
    const R = 60, CX = W / 2, CY = H / 2
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} aria-hidden="true">
        {values.map((v, i) => {
          const start = (acc / total) * Math.PI * 2 - Math.PI / 2
          acc += v
          const end = (acc / total) * Math.PI * 2 - Math.PI / 2
          const large = end - start > Math.PI ? 1 : 0
          const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start)
          const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end)
          return <path key={i} d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`} fill={SERIES_COLORS[i % SERIES_COLORS.length]} stroke="var(--dsw-alias-bg-layer-2, #f6f6f7)" strokeWidth="1.5" />
        })}
      </svg>
    )
  }
  // line / area / bar：取全部 series 点的 y 值域
  const allPoints: { x: number | string; y: number }[] = []
  for (const s of series) {
    const points = (s as { points?: unknown[] })?.points
    if (Array.isArray(points)) {
      for (const p of points) {
        const pp = p as { x?: unknown; y?: unknown }
        if (typeof pp.y === 'number') allPoints.push({ x: pp.x as number | string, y: pp.y })
      }
    }
  }
  if (allPoints.length === 0) return <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 16 }}>无数据</div>
  const ys = allPoints.map(p => p.y)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const yRange = maxY - minY || 1
  const n = Math.max(...series.map(s => ((s as { points?: unknown[] })?.points ?? []).length), 1)
  const xAt = (i: number) => PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2)
  const yAt = (y: number) => H - PAD - ((y - minY) / yRange) * (H - PAD * 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} aria-hidden="true">
      {[0, 0.5, 1].map(f => (
        <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="var(--dsw-alias-border-l1, rgba(127,127,127,.12))" strokeWidth="1" />
      ))}
      {kind === 'bar' ? (
        series.map((s, si) => {
          const points = ((s as { points?: unknown[] })?.points ?? []) as { y?: unknown }[]
          const bw = Math.min(18, (W - PAD * 2) / Math.max(points.length * (series.length + 0.5), 1))
          return points.map((p, i) => typeof p.y === 'number' ? (
            <rect key={`${si}-${i}`} x={xAt(i) + si * bw - (series.length * bw) / 2} y={yAt(p.y)} width={Math.max(bw - 1, 2)} height={H - PAD - yAt(p.y)} fill={SERIES_COLORS[si % SERIES_COLORS.length]} rx="1.5" />
          ) : null)
        })
      ) : (
        series.map((s, si) => {
          const points = (((s as { points?: unknown[] })?.points ?? []) as { x?: unknown; y?: unknown }[]).filter(p => typeof p.y === 'number')
          if (points.length === 0) return null
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.y as number)}`).join(' ')
          const color = SERIES_COLORS[si % SERIES_COLORS.length]
          return kind === 'area' && si === 0 ? (
            <g key={si}>
              <path d={`${d} L ${xAt(points.length - 1)} ${H - PAD} L ${xAt(0)} ${H - PAD} Z`} fill={color} opacity="0.12" />
              <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            </g>
          ) : (
            <path key={si} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          )
        })
      )}
    </svg>
  )
}

function TableNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const columns = Array.isArray(props.columns) ? props.columns.map(String) : []
  const rows = Array.isArray(props.rows) ? props.rows : []
  return (
    <div style={{ ...nodeBase(), padding: 0, overflow: 'auto' }}>
      {typeof props.title === 'string' && props.title.length > 0 ? (
        <div style={{ fontSize: 12, fontWeight: 600, padding: '10px 12px 0' }}>{props.title}</div>
      ) : null}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr>{columns.map((c, i) => (
            <th key={i} style={{ textAlign: 'left', padding: '7px 12px', color: 'var(--dsw-alias-label-caption, #888)', fontSize: 10, fontWeight: 600, borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', whiteSpace: 'nowrap' }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {(Array.isArray(row) ? row : []).map((cell, ci) => (
                <td key={ci} style={{ padding: '6px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cell === null || cell === undefined ? '' : String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KeyValueNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const pairs = (props.pairs ?? {}) as Record<string, unknown>
  return (
    <div style={{ ...nodeBase(), display: 'flex', flexDirection: 'column', gap: 6 }}>
      {typeof props.title === 'string' && props.title.length > 0 ? (
        <div style={{ fontSize: 12, fontWeight: 600 }}>{props.title}</div>
      ) : null}
      {Object.entries(pairs).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11.5 }}>
          <span style={{ color: 'var(--dsw-alias-label-caption, #888)' }}>{k}</span>
          <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

function MarkdownNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const text = typeof props.text === 'string' ? props.text : ''
  return <div style={{ ...nodeBase(), fontSize: 12, lineHeight: 1.65 }}>{renderMarkdownLines(text)}</div>
}

function CalloutNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const tone = typeof props.tone === 'string' ? props.tone : 'info'
  const color = TONE_COLOR[tone] ?? TONE_COLOR['info']
  return (
    <div style={{ ...nodeBase(), borderLeft: `3px solid ${color}`, background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)' }}>
      {typeof props.title === 'string' && props.title.length > 0 ? (
        <div style={{ fontSize: 12, fontWeight: 600, color }}>{props.title}</div>
      ) : null}
      <div style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: props.title ? 4 : 0 }}>{String(props.text ?? '')}</div>
    </div>
  )
}

function SectionNode({ node, children }: { node: CanvasNode; children: ReactNode }): ReactNode {
  return (
    <div style={{ gridColumn: '1 / -1', border: '1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.18))', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dsw-alias-label-caption, #888)', marginBottom: 8, letterSpacing: '.05em' }}>{String(node.props.title ?? '')}</div>
      {children}
    </div>
  )
}

function ActionNode({ props }: { props: Record<string, unknown> }): ReactNode {
  // M1：渲染为静态按钮（M2 接 composer-bridge 回传）
  return (
    <button
      type="button"
      disabled
      title="M2 将启用：点击注入上下文草稿"
      style={{ ...nodeBase(), cursor: 'not-allowed', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-state-business-primary, #4176e6)', background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 30%, transparent)' }}
    >
      {String(props.label ?? 'Action')}
    </button>
  )
}

function LinkNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const href = typeof props.href === 'string' ? props.href : '#'
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" style={{ ...nodeBase(), display: 'block', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-state-business-primary, #4176e6)', textDecoration: 'none' }}>
      {String(props.label ?? href)} ↗
    </a>
  )
}

function NodeRenderer({ node }: { node: CanvasNode }): ReactNode {
  const props = node.props as Record<string, unknown>
  switch (node.type) {
    case 'stat-card': return <StatCardNode props={props} />
    case 'chart': return <ChartNode props={props} />
    case 'table': return <TableNode props={props} />
    case 'key-value': return <KeyValueNode props={props} />
    case 'markdown': return <MarkdownNode props={props} />
    case 'callout': return <CalloutNode props={props} />
    case 'action': return <ActionNode props={props} />
    case 'link': return <LinkNode props={props} />
    case 'section': return <SectionNode node={node}>{null}</SectionNode>
    case 'panel': return <div style={nodeBase()} /> // 占位：v0.1 不支持嵌套
    default: return <div style={nodeBase()}>未知节点 {node.type}</div>
  }
}

// ---- 主渲染 ----

export function CanvasSurface({ snapshot }: { snapshot: CanvasSnapshot }): ReactNode {
  const { canvas } = snapshot
  const sectionNodes = canvas.nodes.filter(n => n.type === 'section')
  const plainNodes = canvas.nodes.filter(n => n.type !== 'section')
  return (
    <section style={surface} data-openloop-canvas={snapshot.canvasId} data-revision={snapshot.revision}>
      <header style={headerStyle}>
        <span style={{ fontSize: 13, fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{canvas.title}</span>
        <span style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--dsw-alias-label-caption, #888)' }}>{snapshot.canvasId}@r{snapshot.revision}</span>
      </header>
      <div style={layoutStyle(canvas.layout, canvas.nodes.length)}>
        {plainNodes.map(n => <NodeRenderer key={n.id} node={n} />)}
      </div>
      {sectionNodes.length > 0 ? (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sectionNodes.map(n => <SectionNode key={n.id} node={n}>{null}</SectionNode>)}
        </div>
      ) : null}
    </section>
  )
}
