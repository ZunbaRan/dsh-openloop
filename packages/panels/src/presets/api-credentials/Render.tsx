/**
 * api-credentials 渲染器：全部注册 API 资源的凭据配置总览。
 * - 行：rid（mono）· domain + path · authType 徽章 · configured 状态点（绿=已配 / 黄=未配）
 * - 空态引导：让 Agent 经 app_backend register_api + set_api_key 登记
 * - 数据：GET /openloop/app/credentials（keySecret 永不出现在响应里）
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { truncate, useAppEndpoint } from '../local-backend.ts'

interface CredentialsData {
  apis?: Array<{ rid?: unknown; appName?: unknown; domain?: unknown; path?: unknown; authType?: unknown; configured?: unknown }>
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
  wordBreak: 'break-word',
}

const monoStyle: CSSProperties = {
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
  fontSize: 11.5,
}

const dotStyle: CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  marginRight: 6,
  verticalAlign: 'baseline',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 12,
  lineHeight: 1.7,
}

export function ApiCredentialsRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const state = useAppEndpoint<CredentialsData>('/openloop/app/credentials', autoRefreshMs)
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : 'API 凭据总览'

  const apis = (state.data?.apis ?? []).filter(a => typeof a.rid === 'string')
  const configuredCount = apis.filter(a => a.configured === true).length

  return (
    <div style={panel} data-openloop-preset="api-credentials">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{apis.length > 0 ? `${configuredCount} / ${apis.length} 已配置` : ''}</span>
      </div>
      {state.unavailable ? (
        <div style={placeholderStyle}>
          本地应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 插件后可查看凭据配置</span>
        </div>
      ) : state.error !== undefined ? (
        <div style={placeholderStyle}>凭据信息读取失败：{state.error}</div>
      ) : apis.length === 0 ? (
        <div style={placeholderStyle}>
          暂无登记的 API 资源<br />
          <span style={meta}>让 Agent 经 app_backend 工具 register_api + set_api_key 登记</span>
        </div>
      ) : (
        <div style={scrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>资源 ID</th>
                <th style={thStyle}>端点</th>
                <th style={thStyle}>鉴权</th>
                <th style={thStyle}>状态</th>
              </tr>
            </thead>
            <tbody>
              {apis.map(api => (
                <tr key={String(api.rid)}>
                  <td style={{ ...tdStyle, ...monoStyle }}>{truncate(String(api.rid), 48)}</td>
                  <td style={tdStyle}>
                    <span style={monoStyle}>{truncate(String(api.domain ?? ''), 30)}</span>
                    <span style={meta}>{String(api.path ?? '')}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--openloop-border)',
                      color: 'var(--openloop-muted-foreground)',
                      fontSize: 11,
                    }}>{api.authType === 'key' ? 'key + 域名' : '无鉴权'}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={dotStyle} data-openloop-tone={api.configured === true ? 'success' : 'warning'} />
                    {api.configured === true ? '已配置' : '未配置'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
