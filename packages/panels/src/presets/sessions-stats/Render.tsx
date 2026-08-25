/**
 * sessions-stats 渲染器：DSH 会话目录统计。
 * - metric 行：会话总数 / 总占用 / 最近活跃（相对时间）
 * - 按日柱状（近 14 天，高度 = 会话数，tooltip 含日期与字节）
 * - 最大占用 Top5 表
 * - 数据：GET /openloop/app/sessions-stats
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { formatBytes, relativeTime, truncate, useAppEndpoint } from '../local-backend.ts'

interface SessionsData {
  totalSessions?: unknown
  totalBytes?: unknown
  lastActiveAt?: unknown
  byDay?: Array<{ date?: unknown; count?: unknown; bytes?: unknown }>
  largest?: Array<{ name?: unknown; bytes?: unknown; modified?: unknown }>
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid var(--openloop-border)',
}

const metricsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  gap: 8,
  padding: '12px 14px 8px',
}

const metricStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 'var(--openloop-radius-md)',
  border: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface-muted)',
}

const metricValueStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 650,
  lineHeight: 1.3,
  color: 'var(--openloop-foreground)',
  fontVariantNumeric: 'tabular-nums',
}

const chartStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 4,
  height: 48,
  padding: '6px 14px 10px',
}

const barStyle: CSSProperties = {
  flex: 1,
  minWidth: 6,
  borderRadius: '3px 3px 0 0',
  background: 'var(--openloop-chart-2)',
  minHeight: 2,
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11.5,
}

const tdStyle: CSSProperties = {
  padding: '6px 14px',
  color: 'var(--openloop-foreground)',
  borderBottom: '1px solid var(--openloop-border)',
  verticalAlign: 'top',
  wordBreak: 'break-all',
}

const monoStyle: CSSProperties = {
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 12,
  lineHeight: 1.7,
}

export function SessionsStatsRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<SessionsData>('/openloop/app/sessions-stats', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : '会话统计'

  const byDay = (state.data?.byDay ?? []).filter(d => typeof d.count === 'number')
  const maxCount = byDay.reduce((m, d) => Math.max(m, Number(d.count ?? 0)), 0)
  const largest = (state.data?.largest ?? []).filter(l => typeof l.bytes === 'number')

  return (
    <div style={panel} data-openloop-preset="sessions-stats">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{byDay.length > 0 ? `近 ${byDay.length} 天` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          本地应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 插件后可查看会话统计</span>
        </div>
      ) : state.error !== undefined ? (
        <div style={placeholderStyle}>会话统计读取失败：{state.error}</div>
      ) : state.loading || state.data === undefined ? (
        <div style={placeholderStyle}>统计中…</div>
      ) : (
        <>
          <div style={metricsStyle}>
            <div style={metricStyle}>
              <div style={meta}>会话总数</div>
              <div style={metricValueStyle}>{(typeof state.data.totalSessions === 'number' ? state.data.totalSessions : 0).toLocaleString()}</div>
            </div>
            <div style={metricStyle}>
              <div style={meta}>总占用</div>
              <div style={metricValueStyle}>{formatBytes(typeof state.data.totalBytes === 'number' ? state.data.totalBytes : 0)}</div>
            </div>
            <div style={metricStyle}>
              <div style={meta}>最近活跃</div>
              <div style={{ ...metricValueStyle, fontSize: 13 }}>{relativeTime(typeof state.data.lastActiveAt === 'string' ? state.data.lastActiveAt : null)}</div>
            </div>
          </div>
          {byDay.length > 0 ? (
            <div style={chartStyle} role="img" aria-label="近 14 天每日会话数">
              {byDay.map(d => {
                const count = Number(d.count ?? 0)
                const h = maxCount > 0 ? Math.max(4, (count / maxCount) * 100) : 0
                return (
                  <span
                    key={String(d.date)}
                    style={{ ...barStyle, height: `${h}%` }}
                    title={`${String(d.date)}：${count} 会话 · ${formatBytes(Number(d.bytes ?? 0))}`}
                  />
                )
              })}
            </div>
          ) : null}
          {largest.length > 0 ? (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...tdStyle, color: 'var(--openloop-muted-foreground)', fontWeight: 600, background: 'var(--openloop-surface-muted)' }}>最大占用</th>
                  <th style={{ ...tdStyle, color: 'var(--openloop-muted-foreground)', fontWeight: 600, textAlign: 'right', background: 'var(--openloop-surface-muted)' }}>大小</th>
                </tr>
              </thead>
              <tbody>
                {largest.map(l => (
                  <tr key={String(l.name)}>
                    <td style={{ ...tdStyle, ...monoStyle }}>{truncate(String(l.name ?? ''), 56)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatBytes(Number(l.bytes ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </div>
  )
}
