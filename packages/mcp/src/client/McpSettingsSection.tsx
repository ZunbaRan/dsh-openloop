/**
 * "MCP servers" settings section：可视化 server 管理。
 *
 * 设计语言对齐 DSH 设置壳 recipe（参照 dsh-better-sidebar SideCardSection）：
 * 容器卡片（l2 hairline + 16px radius + layer-3 fill）、标题行 + 计数徽章、
 * 行内 hairline 分隔。交互零弹窗：行级测试就地出结果（加载态 → ✓ 工具数 /
 * ✗ 错误）、删除走两步内联确认、编辑载入底部表单并标记「编辑中」。
 *
 * 数据经 admin 路由（/openloop/mcp/servers*）读写 mcp.json；保存后需重启生效。
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

interface ServerRow {
  id: string
  source: 'user' | 'project'
  kind: string
  endpoint: string
  protocol: string
  state: string
}

type RowTest =
  | { phase: 'idle' }
  | { phase: 'testing' }
  | { phase: 'ok'; toolCount: number }
  | { phase: 'fail'; error: string }

// ---- 设计 token（DSH 设置页 recipe：变量优先 + fallback）----
const card: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))',
  borderRadius: 16,
  background: 'var(--dsw-alias-bg-layer-3, rgba(0,0,0,.015))',
  overflow: 'hidden',
}
const rowLine: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
  borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))',
}
const mono: CSSProperties = { font: '11px ui-monospace, SFMono-Regular, monospace', opacity: 0.72 }
const badge = (fg: string, bg: string): CSSProperties => ({
  fontSize: 10, lineHeight: '16px', padding: '0 7px', borderRadius: 8,
  color: fg, background: bg, whiteSpace: 'nowrap',
})
const btn: CSSProperties = {
  fontSize: 11, padding: '3px 10px', borderRadius: 8, cursor: 'pointer',
  border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.14))',
  background: 'transparent', color: 'inherit', whiteSpace: 'nowrap',
}
const input: CSSProperties = {
  flex: 1, minWidth: 110, fontSize: 12, padding: '6px 9px', borderRadius: 8,
  border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.14))',
  background: 'var(--dsw-alias-bg-layer-1, transparent)', color: 'inherit',
}
const STATE_DOT: Record<string, string> = {
  connected: '#2da44e', connecting: '#d4a72c', error: '#cf222e',
  disconnected: '#8c959f', closed: '#8c959f', unknown: '#8c959f',
}
const STATE_LABEL: Record<string, string> = {
  connected: '已连接', connecting: '连接中', error: '错误',
  disconnected: '未连接', closed: '已关闭', unknown: '未知',
}

function SectionHeading({ title, count }: { title: string; count?: number | undefined }): ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 8px' }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
      {count !== undefined && (
        <span style={badge('var(--dsw-alias-fg-secondary, #57606a)', 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,.05))')}>{count}</span>
      )}
    </div>
  )
}

export function McpSettingsSection(): ReactNode {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  // 行级就地状态（测试 / 删除两步确认）——杜绝 window.alert/confirm
  const [rowTests, setRowTests] = useState<Record<string, RowTest>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 表单状态
  const [scope, setScope] = useState<'user' | 'project'>('user')
  const [id, setId] = useState('')
  const [type, setType] = useState<'stdio' | 'http'>('http')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [url, setUrl] = useState('')
  const [protocol, setProtocol] = useState('auto')
  const [busy, setBusy] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await fetch('/openloop/mcp/servers')
      const data = await res.json() as { ok: boolean; servers?: ServerRow[] }
      setServers(data.servers ?? [])
    } catch {
      setServers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => () => clearTimeout(confirmTimer.current), [])

  const buildEntry = (): Record<string, unknown> | null => {
    if (id.trim() === '') { setNote('id 必填'); return null }
    if (type === 'stdio') {
      if (command.trim() === '') { setNote('stdio 类型必须填 command'); return null }
      const entry: Record<string, unknown> = { type: 'stdio', command: command.trim() }
      const argList = args.split('\n').map(a => a.trim()).filter(a => a !== '')
      if (argList.length > 0) entry.args = argList
      if (protocol !== 'auto') entry.protocol = protocol
      return entry
    }
    if (url.trim() === '') { setNote('http 类型必须填 url'); return null }
    const entry: Record<string, unknown> = { type: 'http', url: url.trim() }
    if (protocol !== 'auto') entry.protocol = protocol
    return entry
  }

  const testForm = async (): Promise<void> => {
    const entry = buildEntry()
    if (entry === null) return
    setBusy(true); setTestResult(null)
    try {
      const res = await fetch('/openloop/mcp/servers/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.trim(), entry }) })
      const data = await res.json() as { ok: boolean; toolCount?: number; error?: string }
      setTestResult(data.ok
        ? { ok: true, text: `连接成功 · ${data.toolCount} 个工具` }
        : { ok: false, text: data.error ?? '连接失败' })
    } catch (error) {
      setTestResult({ ok: false, text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  const save = async (): Promise<void> => {
    const entry = buildEntry()
    if (entry === null) return
    setBusy(true); setNote('')
    try {
      const res = await fetch(`/openloop/mcp/servers/${scope}/${encodeURIComponent(id.trim())}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
      const data = await res.json() as { ok: boolean; error?: string }
      setNote(data.ok ? '已保存 · 重启 DSH 后生效' : `保存失败：${data.error}`)
      if (data.ok) {
        resetForm()
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const resetForm = (): void => {
    setId(''); setCommand(''); setArgs(''); setUrl(''); setProtocol('auto')
    setTestResult(null); setEditing(null)
  }

  const startEdit = (row: ServerRow): void => {
    setScope(row.source); setId(row.id)
    setType(row.kind === 'stdio' ? 'stdio' : 'http')
    setCommand(row.kind === 'stdio' ? row.endpoint : '')
    setUrl(row.kind === 'stdio' ? '' : row.endpoint)
    setProtocol(row.protocol); setTestResult(null)
    setEditing(row.id); setNote('')
  }

  const remove = async (row: ServerRow): Promise<void> => {
    const key = `${row.source}/${row.id}`
    // 两步内联确认：第一次点击按钮变「确认删除」3 秒，第二次执行
    if (confirmDelete !== key) {
      setConfirmDelete(key)
      clearTimeout(confirmTimer.current)
      confirmTimer.current = setTimeout(() => setConfirmDelete(null), 3000)
      return
    }
    clearTimeout(confirmTimer.current)
    setConfirmDelete(null)
    await fetch(`/openloop/mcp/servers/${row.source}/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    await refresh()
  }

  const testRow = async (row: ServerRow): Promise<void> => {
    const key = `${row.source}/${row.id}`
    setRowTests(prev => ({ ...prev, [key]: { phase: 'testing' } }))
    try {
      const res = await fetch('/openloop/mcp/servers/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, entry: row.kind === 'stdio' ? { type: 'stdio', command: row.endpoint } : { type: 'http', url: row.endpoint } }),
      })
      const data = await res.json() as { ok: boolean; toolCount?: number; error?: string }
      setRowTests(prev => ({ ...prev, [key]: data.ok
        ? { phase: 'ok', toolCount: data.toolCount ?? 0 }
        : { phase: 'fail', error: data.error ?? '连接失败' } }))
    } catch (error) {
      setRowTests(prev => ({ ...prev, [key]: { phase: 'fail', error: error instanceof Error ? error.message : String(error) } }))
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12, opacity: 0.72, marginTop: 0, lineHeight: 1.6 }}>
        管理 Agent 可用的 MCP server（写入 <code>mcp.json</code> 配置文件；保存后重启 DSH 生效）。
      </p>

      <SectionHeading title="Servers" count={loading ? undefined : servers.length} />
      <div style={card}>
        {servers.length === 0 && !loading && (
          <div style={{ padding: 16, fontSize: 12, opacity: 0.6 }}>暂无 server——在下方添加你的第一个</div>
        )}
        {servers.map((row, index) => {
          const key = `${row.source}/${row.id}`
          const test = rowTests[key] ?? { phase: 'idle' as const }
          const confirming = confirmDelete === key
          return (
            <div key={key} style={{ ...rowLine, ...(index === servers.length - 1 ? { borderBottom: 'none' } : {}) }}>
              {/* 状态点（实时连接状态） */}
              <span title={STATE_LABEL[row.state] ?? row.state} style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: STATE_DOT[row.state] ?? STATE_DOT.unknown,
                ...(row.state === 'connecting' ? { animation: 'openloop-mcp-pulse 1.2s ease-in-out infinite' } : {}),
              }} />
              <strong style={{ fontSize: 12 }}>{row.id}</strong>
              <span style={badge('var(--dsw-alias-fg-secondary, #57606a)', 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,.05))')}>{row.source}</span>
              <span style={mono}>{row.kind}</span>
              <span style={{ ...mono, flex: 1, minWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.endpoint}</span>
              {/* 行级测试就地结果 */}
              {test.phase === 'testing' && <span style={{ fontSize: 11, opacity: 0.6 }}>测试中…</span>}
              {test.phase === 'ok' && <span style={badge('#1a7f37', 'rgba(45,164,78,.12)')}>✓ {test.toolCount} 工具</span>}
              {test.phase === 'fail' && (
                <span title={test.error} style={{ ...badge('#cf222e', 'rgba(207,34,46,.1)'), maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>✗ {test.error.slice(0, 40)}</span>
              )}
              <button type="button" style={btn} onClick={() => startEdit(row)}>编辑</button>
              <button type="button" style={btn} disabled={test.phase === 'testing'} onClick={() => void testRow(row)}>测试</button>
              <button
                type="button"
                style={confirming
                  ? { ...btn, borderColor: '#cf222e', color: '#cf222e', fontWeight: 600 }
                  : btn}
                onClick={() => void remove(row)}
              >{confirming ? '确认删除？' : '删除'}</button>
            </div>
          )
        })}
      </div>

      <SectionHeading title={editing !== null ? `编辑 server：${editing}` : '新增 server'} />
      <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12 }}>
          <span style={{ opacity: 0.72 }}>作用域</span>
          <label><input type="radio" checked={scope === 'user'} onChange={() => setScope('user')} /> 用户级（~/.dsh/mcp.json）</label>
          <label><input type="radio" checked={scope === 'project'} onChange={() => setScope('project')} /> 项目级（.dsh/mcp.json）</label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={input} placeholder="id（如 github）" value={id} onChange={e => setId(e.target.value)} />
          <select style={{ ...input, maxWidth: 96 }} value={type} onChange={e => setType(e.target.value === 'stdio' ? 'stdio' : 'http')}>
            <option value="http">http</option>
            <option value="stdio">stdio</option>
          </select>
          <select style={{ ...input, maxWidth: 116 }} value={protocol} onChange={e => setProtocol(e.target.value)}>
            <option value="auto">protocol: auto</option>
            <option value="legacy">legacy</option>
            <option value="2026-07-28">2026-07-28</option>
          </select>
        </div>
        {type === 'stdio' ? (
          <>
            <input style={input} placeholder="command（如 npx）" value={command} onChange={e => setCommand(e.target.value)} />
            <textarea style={{ ...input, minHeight: 46, resize: 'vertical', fontFamily: 'ui-monospace, monospace' }} placeholder={'args（每行一个，如：\n-y\n@modelcontextprotocol/server-github）'} value={args} onChange={e => setArgs(e.target.value)} />
          </>
        ) : (
          <input style={input} placeholder="url（如 https://mcp.example.com/mcp）" value={url} onChange={e => setUrl(e.target.value)} />
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={{ ...btn, padding: '5px 14px' }} disabled={busy} onClick={() => void testForm()}>{busy ? '请求中…' : '测试连接'}</button>
          <button type="button" style={{ ...btn, padding: '5px 14px', fontWeight: 600, background: 'var(--dsw-alias-bg-inverse, #1f2328)', color: 'var(--dsw-alias-fg-inverse, #fff)', border: 'none' }} disabled={busy} onClick={() => void save()}>{editing !== null ? '保存修改' : '添加'}</button>
          {editing !== null && <button type="button" style={btn} onClick={resetForm}>取消编辑</button>}
          {testResult !== null && (
            <span style={testResult.ok ? badge('#1a7f37', 'rgba(45,164,78,.12)') : badge('#cf222e', 'rgba(207,34,46,.1)')}>
              {testResult.ok ? '✓' : '✗'} {testResult.text}
            </span>
          )}
          {note !== '' && <span style={{ fontSize: 11, opacity: 0.75 }}>{note}</span>}
        </div>
      </div>
      <style>{'@keyframes openloop-mcp-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }'}</style>
    </div>
  )
}
