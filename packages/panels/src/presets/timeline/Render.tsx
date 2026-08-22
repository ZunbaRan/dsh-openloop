/**
 * timeline 渲染器。
 * 移植自 DeclarativeCard.tsx TimelineView：左时间列 + 圆点/竖线轨道 + 右内容列。
 * 改写点：--openloop-selection 光圈收敛为 --openloop-primary-tint；
 * current 节点用 primary、past 用 success、future 用 border，全部 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isNonEmptyString } from '../common.ts'
import { meta, micro, panel, title } from '../style.ts'

type TimelineStatus = 'past' | 'current' | 'future'

interface TimelineItem {
  id: string
  title: string
  detail: string | undefined
  status: TimelineStatus | undefined
  time: string | undefined
}

const headerStyle: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--openloop-border)',
}

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '14px 14px 16px',
}

const itemStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '72px 18px minmax(0, 1fr)',
  columnGap: 10,
  minHeight: 60,
}

const timeStyle: CSSProperties = {
  ...micro,
  textAlign: 'right',
  paddingTop: 2,
}

const railStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
}

const railLineStyle: CSSProperties = {
  position: 'absolute',
  top: 14,
  bottom: -2,
  width: 1,
  background: 'var(--openloop-border)',
}

const contentStyle: CSSProperties = {
  paddingBottom: 16,
  minWidth: 0,
}

function dotStyle(status: TimelineStatus): CSSProperties {
  const active = status === 'current'
  return {
    position: 'relative',
    width: active ? 13 : 9,
    height: active ? 13 : 9,
    marginTop: active ? 1 : 3,
    borderRadius: 999,
    background:
      status === 'current'
        ? 'var(--openloop-primary)'
        : status === 'past'
          ? 'var(--openloop-success)'
          : 'var(--openloop-border)',
    boxShadow: active ? '0 0 0 4px var(--openloop-primary-tint)' : undefined,
  }
}

export function TimelineRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const description = typeof root.description === 'string' ? root.description : undefined

  const items: TimelineItem[] = (Array.isArray(root.items) ? root.items : [])
    .slice(0, 16)
    .map((raw, index) => {
      const item = asRecord(raw) ?? {}
      return {
        id: isNonEmptyString(item.id) ? item.id : `item-${index}`,
        title: typeof item.title === 'string' ? item.title : `条目 ${index + 1}`,
        detail: typeof item.detail === 'string' ? item.detail : undefined,
        status:
          item.status === 'past' || item.status === 'current' || item.status === 'future'
            ? item.status
            : undefined,
        time: typeof item.time === 'string' ? item.time : undefined,
      }
    })

  if (items.length === 0) {
    return (
      <div data-openloop-preset="timeline" data-openloop-count="0" style={{ ...panel, padding: '12px 14px' }}>
        <div style={meta}>暂无时间线数据</div>
      </div>
    )
  }

  return (
    <div data-openloop-preset="timeline" data-openloop-count={String(items.length)} style={{ ...panel, overflow: 'hidden', padding: 0 }}>
      {panelTitle !== undefined || description !== undefined ? (
        <div style={headerStyle}>
          {panelTitle !== undefined ? <div style={title}>{panelTitle}</div> : null}
          {description !== undefined ? <div style={{ ...meta, marginTop: 3 }}>{description}</div> : null}
        </div>
      ) : null}
      <ol style={listStyle}>
        {items.map((item, index) => {
          const status: TimelineStatus = item.status ?? (index === 0 ? 'current' : 'future')
          const active = status === 'current'
          return (
            <li key={item.id} style={itemStyle} data-openloop-status={status}>
              <div style={timeStyle}>{item.time}</div>
              <div style={railStyle}>
                {index < items.length - 1 ? <div style={railLineStyle} /> : null}
                <div style={dotStyle(status)} aria-hidden="true" />
              </div>
              <div style={contentStyle}>
                <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: active ? 650 : 560, color: 'var(--openloop-foreground)', wordBreak: 'break-word' }}>
                  {item.title}
                </div>
                {item.detail !== undefined ? (
                  <div style={{ ...meta, marginTop: 3 }}>{item.detail}</div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
