/**
 * api-usage-monitor 渲染器（自管理四件套）：API 资源调用监控——
 * 「系统在观察自己被怎么用」。数据：GET /openloop/app/api-usage（app 包
 * 聚合 globalThis 埋点单例：panels 数据绑定 + MCP 工具调用）。
 * 行 = source（mono）· kind · total · failures · avgMs · 迷你条形（total 比例）。
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { truncate, useAppEndpoint } from '../local-backend.ts'

interface UsageData {
  windowMs?: unknown
  sources?: Array<{ source?: unknown; kind?: unknown; total?: unknown; failures?: unknown; avgMs?: unknown }>
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid var(--openloop-border)',
}

const scrollStyle: CSSProperties = { overflowX: 'auto' }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 }
const thStyle: CSSProperties = {
  padding: '7px 12px', color: 'var(--openloop-muted-foreground)', fontWeight: 600,
  textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface-muted)',
}
const tdStyle: CSSProperties = {
  padding: '7px 12px', color: 'var(--openloop-foreground)',
  borderBottom: '1px solid var(--openloop-border)', verticalAlign: 'top',
}
const monoStyle: CSSProperties = {
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
  fontSize: 11.5,
}
const placeholderStyle: CSSProperties = {
  padding: '22px 14px', textAlign: 'center', color: 'var(--openloop-muted-foreground)',
  fontSize: 12, lineHeight: 1.7,
}

const KIND_LABEL: Record<string, string> = { 'panel-binding': '面板绑定', 'mcp-call': 'MCP 调用' }

export function ApiUsageMonitorRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<UsageData>('/openloop/app/api-usage', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : 'API 资源调用监控'

  const sources = (state.data?.sources ?? []).filter(s => typeof s.source === 'string')
  const totalCalls = sources.reduce((n, s) => n + (typeof s.total === 'number' ? s.total : 0), 0)
  const totalFailures = sources.reduce((n, s) => n + (typeof s.failures === 'number' ? s.failures : 0), 0)
  const maxTotal = Math.max(1, ...sources.map(s => (typeof s.total === 'number' ? s.total : 0)))

  return (
    <div style={panel} data-openloop-preset="api-usage-monitor">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>
          {sources.length > 0 ? `${totalCalls} 次调用 · ${totalFailures} 失败 · 近 24h` : ''}
        </span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 后可查看调用统计</span>
        </div>
      ) : sources.length === 0 ? (
        <div style={placeholderStyle}>
          尚无调用记录<br />
          <span style={meta}>面板数据绑定与 MCP 工具调用会在此累计（重启后清零）</span>
        </div>
      ) : (
        <div style={scrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>来源</th>
                <th style={thStyle}>类型</th>
                <th style={thStyle}>调用</th>
                <th style={thStyle}>失败</th>
                <th style={thStyle}>均耗</th>
                <th style={{ ...thStyle, width: '30%' }}>频度</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => {
                const total = typeof s.total === 'number' ? s.total : 0
                const failures = typeof s.failures === 'number' ? s.failures : 0
                const kind = typeof s.kind === 'string' ? s.kind : ''
                return (
                  <tr key={String(s.source)}>
                    <td style={{ ...tdStyle, ...monoStyle }}>{truncate(String(s.source), 44)}</td>
                    <td style={tdStyle}>{KIND_LABEL[kind] ?? kind}</td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{total}</td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums', color: failures > 0 ? 'var(--openloop-error)' : 'var(--openloop-muted-foreground)' }}>{failures}</td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{typeof s.avgMs === 'number' ? `${s.avgMs}ms` : '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--openloop-surface-muted)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(3, (total / maxTotal) * 100)}%`, height: '100%', background: failures > 0 ? 'var(--openloop-warning)' : 'var(--openloop-primary)' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
