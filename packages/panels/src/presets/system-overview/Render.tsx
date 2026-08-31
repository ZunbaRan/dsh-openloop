/**
 * system-overview 渲染器（自管理四件套）：系统总览——demo 开场卡，
 * 「这是我的系统，它活着」。聚合四个既有端点：app status / mcp servers /
 * storage-usage / sessions-stats；零新后端。
 * 布局：顶部四格指标（后端/MCP/存储/会话）+ 异常清单（有错才显示）。
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { formatBytes, useAppEndpoint } from '../local-backend.ts'

interface StatusData { state?: unknown; version?: unknown; restarts?: unknown }
interface McpData { servers?: Array<{ id?: unknown; state?: unknown }> }
interface StorageData { totalBytes?: unknown; breakdown?: Array<{ label?: unknown; bytes?: unknown }> }
interface SessionsData { total?: unknown; totalBytes?: unknown }

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
  gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--openloop-border)',
}

const gridStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
  background: 'var(--openloop-border)',
}

const cellStyle: CSSProperties = {
  padding: '12px 14px', background: 'var(--openloop-surface)',
}

const cellLabelStyle: CSSProperties = {
  fontSize: 11, color: 'var(--openloop-muted-foreground)',
}

const cellValueStyle: CSSProperties = {
  fontSize: 17, fontWeight: 700, marginTop: 3, fontVariantNumeric: 'tabular-nums',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px', textAlign: 'center', color: 'var(--openloop-muted-foreground)',
  fontSize: 12, lineHeight: 1.7,
}

const warnRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
  fontSize: 12, color: 'var(--openloop-foreground)', borderBottom: '1px solid var(--openloop-border)',
}

const dotStyle = (tone: 'ok' | 'warn' | 'error'): CSSProperties => ({
  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
  background: tone === 'ok' ? 'var(--openloop-success)' : tone === 'warn' ? 'var(--openloop-warning)' : 'var(--openloop-error)',
})

export function SystemOverviewRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const status = useAppEndpoint<StatusData>('/openloop/app/status', autoRefreshMs)
  const mcp = useAppEndpoint<McpData>('/openloop/mcp/servers', autoRefreshMs)
  const storage = useAppEndpoint<StorageData>('/openloop/app/storage-usage', autoRefreshMs)
  const sessions = useAppEndpoint<SessionsData>('/openloop/app/sessions-stats', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : '系统总览'

  const backendState = typeof status.data?.state === 'string' ? status.data.state : 'unknown'
  const servers = (mcp.data?.servers ?? []).filter(s => typeof s.id === 'string')
  const mcpRunning = servers.filter(s => s.state === 'running').length
  const mcpDead = servers.filter(s => s.state === 'error' || s.state === 'disconnected')
  const totalBytes = typeof storage.data?.totalBytes === 'number' ? storage.data.totalBytes : null
  const sessionsTotal = typeof sessions.data?.total === 'number' ? sessions.data.total : null
  const restarts = typeof status.data?.restarts === 'number' ? status.data.restarts : 0

  const warnings: Array<{ tone: 'warn' | 'error'; text: string }> = []
  if (backendState !== 'running') warnings.push({ tone: 'error', text: `应用后端 ${backendState}——面板看板已降级本地存储` })
  if (restarts > 0) warnings.push({ tone: 'warn', text: `后端自上次启动已自动重启 ${restarts} 次（watchdog 守护）` })
  for (const s of mcpDead) warnings.push({ tone: 'warn', text: `MCP server「${String(s.id)}」不可达（惰性重连中）` })

  return (
    <div style={panel} data-openloop-preset="system-overview">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>
          {backendState === 'running' && servers.length > 0
            ? `运行中 · ${typeof status.data?.version === 'string' ? status.data.version : ''} · ${mcpRunning}/${servers.length} MCP`
            : ''}
        </span>
      </div>
      {status.unavailable ? (
        <div style={placeholderStyle}>
          应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 后可查看系统总览</span>
        </div>
      ) : (
        <>
          <div style={gridStyle}>
            <div style={cellStyle}>
              <div style={cellLabelStyle}>应用后端</div>
              <div style={{ ...cellValueStyle, color: backendState === 'running' ? 'var(--openloop-success)' : 'var(--openloop-error)' }}>
                {backendState === 'running' ? '正常' : backendState === 'starting' ? '启动中' : '异常'}
              </div>
            </div>
            <div style={cellStyle}>
              <div style={cellLabelStyle}>MCP 服务</div>
              <div style={cellValueStyle}>{mcpRunning}<span style={meta}> / {servers.length}</span></div>
            </div>
            <div style={cellStyle}>
              <div style={cellLabelStyle}>磁盘占用</div>
              <div style={cellValueStyle}>{totalBytes !== null ? formatBytes(totalBytes) : '—'}</div>
            </div>
            <div style={cellStyle}>
              <div style={cellLabelStyle}>会话总数</div>
              <div style={cellValueStyle}>{sessionsTotal !== null ? sessionsTotal : '—'}</div>
            </div>
          </div>
          {warnings.length > 0 ? (
            <div>
              {warnings.map((w, i) => (
                <div style={{ ...warnRowStyle, borderTop: i === 0 ? '1px solid var(--openloop-border)' : undefined }} key={i}>
                  <span style={dotStyle(w.tone)} />
                  {w.text}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...warnRowStyle, color: 'var(--openloop-muted-foreground)', borderBottom: 0 }}>
              <span style={dotStyle('ok')} /> 全部子系统正常
            </div>
          )}
        </>
      )}
    </div>
  )
}
