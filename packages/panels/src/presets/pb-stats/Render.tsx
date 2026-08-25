/**
 * pb-stats 渲染器：本地后端（PocketBase 门面）运行状态。
 * - metric 行：uptime / 管理表数 / 总记录数 / 数据目录占用
 * - 表格：各管理表记录数
 * - 数据：GET /openloop/app/pb-stats（dsh-app 未装 → 「未启用」占位）
 * 样式 100% var(--openloop-*)，无硬编码色值。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { formatBytes, formatDuration, useAppEndpoint } from '../local-backend.ts'

interface PbStatsData {
  version?: unknown
  uptimeMs?: unknown
  dataDirBytes?: unknown
  collections?: unknown
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
  padding: '12px 14px',
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

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
}

const cellStyle: CSSProperties = {
  padding: '7px 14px',
  color: 'var(--openloop-foreground)',
  borderBottom: '1px solid var(--openloop-border)',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 12,
  lineHeight: 1.7,
}

export function PbStatsRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<PbStatsData>('/openloop/app/pb-stats', autoRefreshMs)

  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : '后端运行状态'
  const collections = Array.isArray(state.data?.collections)
    ? state.data.collections.filter((c): c is { name: string; count: number } =>
        typeof (c as { name?: unknown })?.name === 'string' && typeof (c as { count?: unknown })?.count === 'number')
    : []
  const totalRecords = collections.reduce((n, c) => n + c.count, 0)
  const version = typeof state.data?.version === 'string' ? state.data.version : ''

  return (
    <div style={panel} data-openloop-preset="pb-stats">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{version !== '' ? `PocketBase ${version}` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          本地应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 插件后可查看运行状态</span>
        </div>
      ) : state.error !== undefined ? (
        <div style={placeholderStyle}>后端状态读取失败：{state.error}</div>
      ) : state.loading || state.data === undefined ? (
        <div style={placeholderStyle}>读取中…</div>
      ) : (
        <>
          <div style={metricsStyle}>
            <div style={metricStyle}>
              <div style={meta}>运行时长</div>
              <div style={metricValueStyle}>{formatDuration(typeof state.data.uptimeMs === 'number' ? state.data.uptimeMs : 0)}</div>
            </div>
            <div style={metricStyle}>
              <div style={meta}>管理表</div>
              <div style={metricValueStyle}>{collections.length}</div>
            </div>
            <div style={metricStyle}>
              <div style={meta}>总记录数</div>
              <div style={metricValueStyle}>{totalRecords.toLocaleString()}</div>
            </div>
            <div style={metricStyle}>
              <div style={meta}>数据占用</div>
              <div style={metricValueStyle}>{formatBytes(typeof state.data.dataDirBytes === 'number' ? state.data.dataDirBytes : 0)}</div>
            </div>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...cellStyle, color: 'var(--openloop-muted-foreground)', fontWeight: 600, textAlign: 'left' }}>集合</th>
                <th style={{ ...cellStyle, color: 'var(--openloop-muted-foreground)', fontWeight: 600, textAlign: 'right' }}>记录数</th>
              </tr>
            </thead>
            <tbody>
              {collections.map(c => (
                <tr key={c.name}>
                  <td style={{ ...cellStyle, fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)', fontSize: 11.5 }}>{c.name}</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
