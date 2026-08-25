/**
 * plugin-registry 渲染器：当前 web 客户端已加载的插件清单。
 * - 数据源：window.__DSH_BOOT__.entries（页面 boot 载荷，零网络请求——唯一不用
 *   useAppEndpoint 的本地后端预设）
 * - 分组：OpenLoop（@openloop/*）/ DeepSeek（@deepseek-ai/*）/ 其他（dshmarket 等）
 * - 行：插件 id（mono）· 依赖注入数
 * 样式 100% var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { truncate } from '../local-backend.ts'

interface BootEntry {
  id?: unknown
  inject?: unknown
  immediately?: unknown
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid var(--openloop-border)',
}

const groupLabelStyle: CSSProperties = {
  padding: '8px 14px 2px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: 'var(--openloop-muted-foreground)',
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11.5,
}

const tdStyle: CSSProperties = {
  padding: '5px 14px',
  color: 'var(--openloop-foreground)',
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

function readBootEntries(): BootEntry[] {
  const boot = (globalThis as { __DSH_BOOT__?: { entries?: unknown } }).__DSH_BOOT__
  if (typeof boot !== 'object' || boot === null || !Array.isArray(boot.entries)) return []
  return boot.entries as BootEntry[]
}

function groupOf(id: string): 'openloop' | 'deepseek' | 'other' {
  if (id.startsWith('@openloop/')) return 'openloop'
  if (id.startsWith('@deepseek-ai/')) return 'deepseek'
  return 'other'
}

const GROUP_LABELS: Record<'openloop' | 'deepseek' | 'other', string> = {
  openloop: 'OpenLoop 插件',
  deepseek: 'DeepSeek 官方',
  other: '其他',
}

export function PluginRegistryRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : '插件清单'

  const entries = readBootEntries()
    .filter(e => typeof e.id === 'string')
    .map(e => ({ id: String(e.id), inject: Array.isArray(e.inject) ? e.inject.length : 0 }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const groups: Array<'openloop' | 'deepseek' | 'other'> = ['openloop', 'deepseek', 'other']

  return (
    <div style={panel} data-openloop-preset="plugin-registry">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{entries.length > 0 ? `${entries.length} 个已加载` : ''}</span>
      </div>
      {entries.length === 0 ? (
        <div style={placeholderStyle}>
          页面启动载荷不可读<br />
          <span style={meta}>__DSH_BOOT__.entries 在当前环境不可用</span>
        </div>
      ) : (
        groups.map(group => {
          const rows = entries.filter(e => groupOf(e.id) === group)
          if (rows.length === 0) return null
          return (
            <div key={group}>
              <div style={groupLabelStyle}>{GROUP_LABELS[group]}（{rows.length}）</div>
              <table style={tableStyle}>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id}>
                      <td style={{ ...tdStyle, ...monoStyle }}>{truncate(e.id, 52)}</td>
                      <td style={{ ...tdStyle, width: 56, textAlign: 'right', color: 'var(--openloop-muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        {e.inject > 0 ? `${e.inject} 注入` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </div>
  )
}
