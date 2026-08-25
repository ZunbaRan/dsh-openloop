/**
 * storage-usage 渲染器：DSH_HOME 磁盘占用分解。
 * - 每条目一行：label + bytes（比例条，chart-1 填充）+ files 数
 * - 头部 meta：home 路径 + 总占用
 * - 数据：GET /openloop/app/storage-usage
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { formatBytes, truncate, useAppEndpoint } from '../local-backend.ts'

interface StorageData {
  home?: unknown
  totalBytes?: unknown
  entries?: Array<{ label?: unknown; path?: unknown; bytes?: unknown; files?: unknown }>
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid var(--openloop-border)',
  flexWrap: 'wrap',
}

const rowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '12px 14px',
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(70px, auto) 1fr minmax(64px, auto)',
  alignItems: 'center',
  gap: 10,
  fontSize: 12,
}

const barTrackStyle: CSSProperties = {
  height: 6,
  borderRadius: 3,
  background: 'var(--openloop-surface-muted)',
  overflow: 'hidden',
}

const labelStyle: CSSProperties = {
  color: 'var(--openloop-foreground)',
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
  fontSize: 11.5,
  whiteSpace: 'nowrap',
}

const bytesStyle: CSSProperties = {
  color: 'var(--openloop-muted-foreground)',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 12,
  lineHeight: 1.7,
}

const ENTRIES_MAX = 12

export function StorageUsageRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<StorageData>('/openloop/app/storage-usage', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : 'DSH 存储占用'

  const entries = (state.data?.entries ?? [])
    .filter(e => typeof e.bytes === 'number')
    .slice(0, ENTRIES_MAX)
  const maxBytes = entries.reduce((m, e) => Math.max(m, Number(e.bytes ?? 0)), 0)
  const totalBytes = typeof state.data?.totalBytes === 'number' ? state.data.totalBytes : 0
  const home = typeof state.data?.home === 'string' ? state.data.home : ''

  return (
    <div style={panel} data-openloop-preset="storage-usage">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta} title={home}>{totalBytes > 0 ? `${formatBytes(totalBytes)} · ${truncate(home, 48)}` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          本地应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 插件后可查看存储占用</span>
        </div>
      ) : state.error !== undefined ? (
        <div style={placeholderStyle}>存储统计读取失败：{state.error}</div>
      ) : state.loading || state.data === undefined ? (
        <div style={placeholderStyle}>统计中…</div>
      ) : (
        <div style={rowsStyle}>
          {entries.map(e => {
            const bytes = Number(e.bytes ?? 0)
            const pct = maxBytes > 0 ? Math.max(1.5, (bytes / maxBytes) * 100) : 0
            return (
              <div key={`${String(e.label)}`} style={rowStyle} title={String(e.path ?? '')}>
                <span style={labelStyle}>{truncate(String(e.label ?? ''), 18)}</span>
                <span style={barTrackStyle}>
                  <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: 'var(--openloop-chart-1)', borderRadius: 3 }} />
                </span>
                <span style={bytesStyle}>{formatBytes(bytes)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
