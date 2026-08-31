/**
 * agent-activity 渲染器（自管理四件套）：Agent 行为流水——Agent Native 旗舰卡，
 * 「我的 Agent 在为我工作」。数据：GET /openloop/app/agent-activity（app 包
 * 聚合 DSH 会话日志的 tool/call 行，30s 缓存）。
 * 布局：左「最近动作」时间线（tool · workspace · 相对时间），右「工具热度」排行。
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { relativeTime, truncate, useAppEndpoint } from '../local-backend.ts'

interface ActivityData {
  sessionsScanned?: unknown
  actions?: Array<{ at?: unknown; tool?: unknown; workspace?: unknown }>
  toolHeat?: Array<{ tool?: unknown; count?: unknown }>
}

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
  gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--openloop-border)',
}

const colsStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1.6fr 1fr', minHeight: 0 }

const sectionLabelStyle: CSSProperties = {
  fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em',
  color: 'var(--openloop-muted-foreground)', padding: '9px 14px 5px',
}

const listStyle: CSSProperties = { maxHeight: 340, overflowY: 'auto' }

const actionRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 9, padding: '6px 14px',
  fontSize: 12, color: 'var(--openloop-foreground)', borderBottom: '1px solid var(--openloop-border)',
}

const monoStyle: CSSProperties = {
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
  fontSize: 11.5,
}

const heatRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
  fontSize: 11.5, borderBottom: '1px solid var(--openloop-border)',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px', textAlign: 'center', color: 'var(--openloop-muted-foreground)',
  fontSize: 12, lineHeight: 1.7,
}

export function AgentActivityRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<ActivityData>('/openloop/app/agent-activity', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : 'Agent 行为流水'

  const actions = (state.data?.actions ?? []).filter(a => typeof a.tool === 'string')
  const heat = (state.data?.toolHeat ?? []).filter(h => typeof h.tool === 'string')
  const scanned = typeof state.data?.sessionsScanned === 'number' ? state.data.sessionsScanned : 0
  const maxHeat = Math.max(1, ...heat.map(h => (typeof h.count === 'number' ? h.count : 0)))

  return (
    <div style={panel} data-openloop-preset="agent-activity">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{scanned > 0 ? `扫描 ${scanned} 个会话 · ${actions.length} 动作` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 后可查看 Agent 行为</span>
        </div>
      ) : actions.length === 0 ? (
        <div style={placeholderStyle}>
          尚无 Agent 活动记录<br />
          <span style={meta}>Agent 调用工具的动作会实时出现在此（基于会话日志聚合）</span>
        </div>
      ) : (
        <div style={colsStyle}>
          <div>
            <div style={sectionLabelStyle}>最近动作</div>
            <div style={listStyle}>
              {actions.map((a, i) => {
                const at = typeof a.at === 'number' ? a.at : null
                const ws = typeof a.workspace === 'string' ? a.workspace : ''
                return (
                  <div style={actionRowStyle} key={i}>
                    <span style={{ ...monoStyle, color: 'var(--openloop-primary)', flexShrink: 0 }}>{String(a.tool)}</span>
                    <span style={{ ...meta, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ws}>
                      {truncate(ws, 34)}
                    </span>
                    <span style={{ ...meta, marginLeft: 'auto', flexShrink: 0 }}>
                      {at !== null ? relativeTime(new Date(at).toISOString()) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--openloop-border)', minWidth: 0 }}>
            <div style={sectionLabelStyle}>工具热度</div>
            <div style={listStyle}>
              {heat.map((h, i) => {
                const count = typeof h.count === 'number' ? h.count : 0
                return (
                  <div style={heatRowStyle} key={i}>
                    <span style={{ ...monoStyle, color: 'var(--openloop-foreground)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {String(h.tool)}
                    </span>
                    <div style={{ width: 64, height: 6, borderRadius: 3, background: 'var(--openloop-surface-muted)', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${Math.max(4, (count / maxHeat) * 100)}%`, height: '100%', background: 'var(--openloop-primary)' }} />
                    </div>
                    <span style={{ ...meta, flexShrink: 0, fontVariantNumeric: 'tabular-nums', width: 28, textAlign: 'right' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
