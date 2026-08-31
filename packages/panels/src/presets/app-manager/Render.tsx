/**
 * app-manager 渲染器（自管理四件套之一）：全部 APP 的管理面板——
 * 「系统能管理自己」的具象。行 = APP（来源徽标/资源计数/连接态），行尾动作：
 * 第三方 → 断开（mcp.json 条目保留，重连即恢复）/ 重连；任意 → 删除（级联清资源）。
 * 写通道 = app 包受控路由（POST /openloop/app/manage/*，门面化，不直连 PB）。
 * 二次确认同 dock 清空的既有模式（3s 超时复位）。
 * 样式 100% var(--openloop-*)。
 */
import { useEffect, useState, type CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { truncate, useAppEndpoint } from '../local-backend.ts'

interface RegistryData {
  apps?: Array<{
    app?: { name?: unknown; displayName?: unknown; kind?: unknown; version?: unknown; description?: unknown }
    components?: unknown[]
    apis?: unknown[]
  }>
}

interface McpServersData {
  servers?: Array<{ id?: unknown; state?: unknown }>
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

const KIND_LABEL: Record<string, string> = { builtin: '内置', thirdparty: '第三方', local: '自研' }

const btnStyle: CSSProperties = {
  padding: '2px 9px',
  borderRadius: 7,
  border: '1px solid var(--openloop-border)',
  background: 'transparent',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const dangerBtnStyle: CSSProperties = {
  ...btnStyle,
  color: 'var(--openloop-error)',
  borderColor: 'var(--openloop-error-border)',
}

const confirmBtnStyle: CSSProperties = {
  ...dangerBtnStyle,
  background: 'var(--openloop-error-background)',
  color: 'var(--openloop-error)',
  fontWeight: 600,
}

/** 写动作（受控路由）；返回错误文本（无错 undefined）。3s 后清提示。 */
function useManageAction(onDone: () => void): { run: (path: string, body: Record<string, unknown>, label: string) => void; busy: string | null; message: string | null } {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [message])
  const run = (path: string, body: Record<string, unknown>, label: string): void => {
    if (busy !== null) return
    setBusy(label)
    void fetch(`/openloop/app/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async res => {
        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json() as { ok?: unknown; error?: unknown }
        if (!res.ok || payload.ok !== true) throw new Error(typeof payload.error === 'string' ? payload.error : `HTTP ${res.status}`)
        setMessage(`${label}完成`)
        onDone()
      })
      .catch(error => {
        setMessage(`${label}失败：${error instanceof Error ? error.message : String(error)}`)
      })
      .finally(() => setBusy(null))
  }
  return { run, busy, message }
}

export function AppManagerRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const autoRefreshMs = typeof record.autoRefreshMs === 'number' ? record.autoRefreshMs : undefined
  const [reloadNonce, setReloadNonce] = useState(0)
  const registry = useAppEndpoint<RegistryData>('/openloop/app/registry', autoRefreshMs)
  const mcp = useAppEndpoint<McpServersData>('/openloop/mcp/servers', autoRefreshMs)
  const { run, busy, message } = useManageAction(() => setReloadNonce(n => n + 1))
  // 写操作后立即重拉 registry（不等 autoRefresh——管理面板要即时反馈）
  useEffect(() => { void reloadNonce }, [reloadNonce])

  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : 'APP 管理'
  const confirmKey = typeof record.confirm === 'string' ? record.confirm : null
  const [confirming, setConfirming] = useState<string | null>(null)
  useEffect(() => {
    if (confirming === null) return
    const timer = setTimeout(() => setConfirming(null), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  const mcpStateOf = (name: string): string | undefined => {
    const hit = (mcp.data?.servers ?? []).find(s => s.id === name)
    return typeof hit?.state === 'string' ? hit.state : undefined
  }

  const apps = (registry.data?.apps ?? []).filter(a => typeof a.app?.name === 'string')

  const onAction = (action: 'disconnect' | 'reconnect' | 'delete', name: string): void => {
    if (action === 'delete') {
      if (confirmKey !== name) { setConfirming(name); return }
      setConfirming(null)
    }
    if (action === 'disconnect') {
      run('manage/disconnect', { serverId: name }, `断开 ${name}`)
      return
    }
    if (action === 'reconnect') {
      run('manage/reconnect', { serverId: name }, `重连 ${name}`)
      return
    }
    // delete：走 app_backend 的既有语义经 tool 不合适（浏览器写通道）——复用 manage 通道的删除
    run('manage/delete', { appName: name }, `删除 ${name}`)
  }

  return (
    <div style={panel} data-openloop-preset="app-manager">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{apps.length > 0 ? `${apps.length} 个应用` : ''}{busy !== null ? ' · 处理中…' : ''}</span>
      </div>
      {message !== null ? (
        <div style={{ padding: '6px 14px', fontSize: 11.5, color: 'var(--openloop-muted-foreground)', borderBottom: '1px solid var(--openloop-border)' }}>{message}</div>
      ) : null}
      {registry.unavailable ? (
        <div style={placeholderStyle}>
          应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 后可管理 APP</span>
        </div>
      ) : apps.length === 0 ? (
        <div style={placeholderStyle}>暂无注册 APP</div>
      ) : (
        <div style={scrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>应用</th>
                <th style={thStyle}>资源</th>
                <th style={thStyle}>连接</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => {
                const name = String(a.app?.name)
                const kind = typeof a.app?.kind === 'string' ? a.app.kind : 'local'
                const state = mcpStateOf(name)
                const displayName = typeof a.app?.displayName === 'string' && a.app.displayName.length > 0 ? a.app.displayName : name
                const isThirdparty = kind === 'thirdparty'
                const isBuiltin = kind === 'builtin'
                return (
                  <tr key={name}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{truncate(displayName, 24)}</span>
                      <span style={{ ...meta, marginLeft: 7 }}>{KIND_LABEL[kind] ?? kind}</span>
                      <div style={{ ...monoStyle, ...meta, marginTop: 2 }}>{name}</div>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {(a.components ?? []).length} 组件 · {(a.apis ?? []).length} API
                    </td>
                    <td style={tdStyle}>
                      {state === undefined ? (
                        <span style={meta}>—</span>
                      ) : (
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          marginRight: 6,
                          background: state === 'running' ? 'var(--openloop-success)' : state === 'error' ? 'var(--openloop-error)' : 'var(--openloop-muted-foreground)',
                        }} />
                      )}
                      {state ?? '本地'}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {isBuiltin ? (
                        <span style={meta}>系统保留</span>
                      ) : (
                        <>
                          {isThirdparty ? (
                            state === 'running' || state === 'connecting'
                              ? <button type="button" style={btnStyle} disabled={busy !== null} onClick={() => onAction('disconnect', name)}>断开</button>
                              : <button type="button" style={btnStyle} disabled={busy !== null} onClick={() => onAction('reconnect', name)}>重连</button>
                          ) : null}
                          {confirming === name ? (
                            <button type="button" style={confirmBtnStyle} disabled={busy !== null} onClick={() => onAction('delete', name)}>确认删除？</button>
                          ) : (
                            <button type="button" style={dangerBtnStyle} disabled={busy !== null} onClick={() => onAction('delete', name)}>删除</button>
                          )}
                        </>
                      )}
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
