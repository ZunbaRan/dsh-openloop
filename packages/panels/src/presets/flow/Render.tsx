/**
 * flow 渲染器。
 * 移植自 DeclarativeCard.tsx FlowView：节点自上而下顺序渲染，入边在节点上方
 * 以竖线 + 文字连接；序号圆点 + tone 软底卡片。
 * 改写点：selection/white 等硬编码一律收敛到 var(--openloop-*) 件套
 * （tone 三件套复用 style.ts toneColors，与 badge/callout 同进同退）。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isNonEmptyString } from '../common.ts'
import { meta, micro, panel, title, toneColors, type BadgeTone } from '../style.ts'

interface FlowNode {
  id: string
  label: string
  detail: string | undefined
  tone: BadgeTone | undefined
}

interface FlowEdge {
  from: string
  to: string
  label: string | undefined
}

const headerStyle: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--openloop-border)',
}

const bodyStyle: CSSProperties = {
  padding: 14,
  display: 'grid',
  gap: 8,
}

const connectorStyle: CSSProperties = {
  minHeight: 22,
  marginLeft: 20,
  borderLeft: '1px solid var(--openloop-border)',
  paddingLeft: 15,
  color: 'var(--openloop-muted-foreground)',
  display: 'flex',
  alignItems: 'center',
}

const nodeCardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '30px minmax(0, 1fr)',
  gap: 10,
  alignItems: 'start',
  border: '1px solid var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-md)',
  padding: '10px 12px',
}

const badgeStyle: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  fontSize: 12,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
}

const nodeLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 620,
  lineHeight: 1.35,
  color: 'var(--openloop-foreground)',
  wordBreak: 'break-word',
}

export function FlowRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const description = typeof root.description === 'string' ? root.description : undefined

  const nodes: FlowNode[] = (Array.isArray(root.nodes) ? root.nodes : [])
    .slice(0, 12)
    .map((raw, index) => {
      const node = asRecord(raw) ?? {}
      return {
        id: isNonEmptyString(node.id) ? node.id : `node-${index}`,
        label: typeof node.label === 'string' ? node.label : `节点 ${index + 1}`,
        detail: typeof node.detail === 'string' ? node.detail : undefined,
        // danger 为 declarative 兼容别名，渲染归一到 error
        tone: node.tone === 'danger'
          ? 'error'
          : node.tone === 'neutral' || node.tone === 'info' || node.tone === 'success'
            || node.tone === 'warning' || node.tone === 'error'
            ? node.tone
            : undefined,
      }
    })

  const edges: FlowEdge[] = (Array.isArray(root.edges) ? root.edges : [])
    .slice(0, 20)
    .map((raw) => {
      const edge = asRecord(raw) ?? {}
      return {
        from: typeof edge.from === 'string' ? edge.from : '',
        to: typeof edge.to === 'string' ? edge.to : '',
        label: typeof edge.label === 'string' ? edge.label : undefined,
      }
    })
    .filter((edge) => edge.from.length > 0 && edge.to.length > 0)

  const incoming = new Map<string, FlowEdge[]>()
  for (const node of nodes) {
    incoming.set(node.id, edges.filter((edge) => edge.to === node.id))
  }

  if (nodes.length === 0) {
    return (
      <div data-openloop-preset="flow" data-openloop-count="0" style={{ ...panel, padding: '12px 14px' }}>
        <div style={meta}>暂无流程数据</div>
      </div>
    )
  }

  return (
    <div data-openloop-preset="flow" data-openloop-count={String(nodes.length)} style={{ ...panel, overflow: 'hidden', padding: 0 }}>
      {panelTitle !== undefined || description !== undefined ? (
        <div style={headerStyle}>
          {panelTitle !== undefined ? <div style={title}>{panelTitle}</div> : null}
          {description !== undefined ? <div style={{ ...meta, marginTop: 3 }}>{description}</div> : null}
        </div>
      ) : null}
      <div style={bodyStyle}>
        {nodes.map((node, index) => {
          const tone = toneColors(node.tone ?? (index === 0 ? 'info' : 'neutral'))
          const incomingEdges = incoming.get(node.id) ?? []
          const connectorText = incomingEdges
            .map((edge) => edge.label)
            .filter((label): label is string => typeof label === 'string' && label.length > 0)
            .join(' · ')
          return (
            <div key={node.id}>
              {incomingEdges.length > 0 ? (
                <div style={{ ...connectorStyle, ...micro }}>{connectorText || '↓'}</div>
              ) : null}
              <div style={{ ...nodeCardStyle, background: tone.background, borderColor: tone.border }}>
                <div style={{ ...badgeStyle, background: tone.background, color: tone.foreground, border: `1px solid ${tone.border}` }} aria-hidden="true">
                  {index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={nodeLabelStyle}>{node.label}</div>
                  {node.detail !== undefined ? (
                    <div style={{ ...meta, marginTop: 4 }}>{node.detail}</div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
