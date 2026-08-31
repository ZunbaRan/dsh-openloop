/**
 * event-log 渲染器（自管理四件套）：系统事件流——「系统记得自己发生过什么」。
 * 数据：GET /openloop/app/events?limit=（app 包 ring buffer；registry 变更 /
 * backend 迁移 / manage 动作）。行 = 时间 · kind 徽标 · level 色点 · 文本。
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { relativeTime, useAppEndpoint } from '../local-backend.ts'

interface EventsData {
  events?: Array<{ at?: unknown; kind?: unknown; level?: unknown; text?: unknown }>
}

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
  gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--openloop-border)',
}

const listStyle: CSSProperties = { maxHeight: 320, overflowY: 'auto' }

const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 9, padding: '7px 14px',
  fontSize: 12, color: 'var(--openloop-foreground)', borderBottom: '1px solid var(--openloop-border)',
}

const timeStyle: CSSProperties = {
  fontSize: 11, color: 'var(--openloop-muted-foreground)', flexShrink: 0,
  minWidth: 64, fontVariantNumeric: 'tabular-nums',
}

const kindBadgeStyle: CSSProperties = {
  fontSize: 10, padding: '1px 7px', borderRadius: 999,
  border: '1px solid var(--openloop-border)', color: 'var(--openloop-muted-foreground)', flexShrink: 0,
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px', textAlign: 'center', color: 'var(--openloop-muted-foreground)',
  fontSize: 12, lineHeight: 1.7,
}

const dotStyle = (level: string): CSSProperties => ({
  width: 7, height: 7, borderRadius: '50%', flexShrink: 0, alignSelf: 'center',
  background: level === 'error' ? 'var(--openloop-error)' : level === 'warn' ? 'var(--openloop-warning)' : 'var(--openloop-success)',
})

export function EventLogRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const limit = typeof record.limit === 'number' ? Math.max(1, Math.min(200, Math.round(record.limit))) : 50
  const state = useAppEndpoint<EventsData>(`/openloop/app/events?limit=${limit}`, autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : '系统事件流'

  const events = (state.data?.events ?? []).filter(e => typeof e.text === 'string')

  return (
    <div style={panel} data-openloop-preset="event-log">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{events.length > 0 ? `${events.length} 条 · 新→旧` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 后可查看系统事件</span>
        </div>
      ) : events.length === 0 ? (
        <div style={placeholderStyle}>
          暂无事件<br />
          <span style={meta}>接入/断开第三方包、删除 APP、后端重启等动作会记录在此</span>
        </div>
      ) : (
        <div style={listStyle}>
          {events.map((e, i) => {
            const kind = typeof e.kind === 'string' ? e.kind : ''
            const level = typeof e.level === 'string' ? e.level : 'info'
            const at = typeof e.at === 'number' ? e.at : null
            return (
              <div style={rowStyle} key={i}>
                <span style={timeStyle}>{at !== null ? relativeTime(new Date(at).toISOString()) : '—'}</span>
                <span style={dotStyle(level)} />
                <span style={kindBadgeStyle}>{kind}</span>
                <span style={{ minWidth: 0 }}>{String(e.text)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
