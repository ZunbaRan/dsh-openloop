/**
 * mcp-status 渲染器：MCP 服务清单与连接状态。
 * - 数据：GET /openloop/mcp/servers（@openloop/dsh-mcp 既有 admin 路由；
 *   未启用 mcp 插件 → SPA fallback → unavailable 占位）
 * - 行：id（mono）· source（user/project）· kind · endpoint · state 状态点
 * - state 语义（mcp-runtime admin-routes）：running=绿 · connecting/closed/unknown=灰 · error=红
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { truncate, useAppEndpoint } from '../local-backend.ts'

interface McpServersData {
  ok?: unknown
  servers?: Array<{ id?: unknown; source?: unknown; kind?: unknown; endpoint?: unknown; protocol?: unknown; state?: unknown }>
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

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
}

const thStyle: CSSProperties = {
  padding: '7px 12px',
  color: 'var(--openloop-muted-foreground)',
  fontWeight: 600,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface-muted)',
}

const tdStyle: CSSProperties = {
  padding: '7px 12px',
  color: 'var(--openloop-foreground)',
  borderBottom: '1px solid var(--openloop-border)',
  verticalAlign: 'top',
  wordBreak: 'break-all',
}

const monoStyle: CSSProperties = {
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
  fontSize: 11.5,
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 12,
  lineHeight: 1.7,
}

const STATE_TONE: Record<string, string> = {
  running: 'var(--openloop-success)',
  connecting: 'var(--openloop-warning)',
  error: 'var(--openloop-error)',
}

export function McpStatusRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<McpServersData>('/openloop/mcp/servers', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : 'MCP 服务状态'

  const servers = (state.data?.servers ?? []).filter(s => typeof s.id === 'string')
  const runningCount = servers.filter(s => s.state === 'running').length

  return (
    <div style={panel} data-openloop-preset="mcp-status">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{servers.length > 0 ? `${runningCount} / ${servers.length} 运行中` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          MCP 插件未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-mcp 后可查看服务清单</span>
        </div>
      ) : state.error !== undefined ? (
        <div style={placeholderStyle}>服务清单读取失败：{state.error}</div>
      ) : servers.length === 0 ? (
        <div style={placeholderStyle}>
          mcp.json 中没有配置服务<br />
          <span style={meta}>在 DSH_HOME/mcp.json 或项目 .dsh/mcp.json 登记 MCP server</span>
        </div>
      ) : (
        <div style={scrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>服务</th>
                <th style={thStyle}>来源</th>
                <th style={thStyle}>端点</th>
                <th style={thStyle}>状态</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(s => {
                const stateStr = typeof s.state === 'string' ? s.state : 'unknown'
                return (
                  <tr key={String(s.id)}>
                    <td style={{ ...tdStyle, ...monoStyle }}>{truncate(String(s.id), 36)}</td>
                    <td style={tdStyle}>{String(s.source ?? '')}</td>
                    <td style={{ ...tdStyle, ...monoStyle }} title={String(s.endpoint ?? '')}>
                      {truncate(String(s.endpoint ?? ''), 40)}
                      <span style={meta}> · {String(s.kind ?? '')}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        marginRight: 6,
                        background: STATE_TONE[stateStr] ?? 'var(--openloop-muted-foreground)',
                      }} />
                      {stateStr}
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
