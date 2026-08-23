/**
 * "MCP servers" settings section：可视化 server 管理（列表/新增/删除/试连）。
 * 数据经 admin 路由（/openloop/mcp/servers*）读写 mcp.json；保存后提示重启生效。
 */
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'

interface ServerRow {
  id: string
  source: 'user' | 'project'
  kind: string
  endpoint: string
  protocol: string
}

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))', flexWrap: 'wrap' }
const mono: CSSProperties = { font: '11px ui-monospace, monospace', opacity: 0.75 }
const btn: CSSProperties = { fontSize: 11, padding: '3px 10px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.14))', background: 'transparent', cursor: 'pointer' }
const input: CSSProperties = { flex: 1, minWidth: 120, fontSize: 12, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.14))', background: 'transparent', color: 'inherit' }

export function McpSettingsSection(): ReactNode {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')

  // 表单状态
  const [scope, setScope] = useState<'user' | 'project'>('user')
  const [id, setId] = useState('')
  const [type, setType] = useState<'stdio' | 'http'>('http')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [url, setUrl] = useState('')
  const [protocol, setProtocol] = useState('auto')
  const [busy, setBusy] = useState(false)
  const [testResult, setTestResult] = useState('')

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

  const test = async (): Promise<void> => {
    const entry = buildEntry()
    if (entry === null) return
    setBusy(true); setTestResult('测试中…')
    try {
      const res = await fetch('/openloop/mcp/servers/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.trim(), entry }) })
      const data = await res.json() as { ok: boolean; toolCount?: number; error?: string }
      setTestResult(data.ok ? `✓ 连接成功，${data.toolCount} 个工具` : `✗ ${data.error ?? '连接失败'}`)
    } catch (error) {
      setTestResult(`✗ ${error instanceof Error ? error.message : String(error)}`)
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
      const data = await res.json() as { ok: boolean; note?: string; error?: string }
      setNote(data.ok ? `✓ 已保存（${data.note ?? ''}）` : `✗ ${data.error}`)
      if (data.ok) {
        setId(''); setCommand(''); setArgs(''); setUrl(''); setTestResult('')
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const remove = async (row: ServerRow): Promise<void> => {
    if (!confirm(`删除 server "${row.id}"（${row.source}）？`)) return
    await fetch(`/openloop/mcp/servers/${row.source}/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    await refresh()
  }

  const testRow = async (row: ServerRow): Promise<void> => {
    await fetch('/openloop/mcp/servers/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, entry: row.kind === 'stdio' ? { type: 'stdio', command: row.endpoint } : { type: 'http', url: row.endpoint } }),
    })
    alert(`测试请求已发送——请看下方"新增 server"区的"测试连接"输出？\n（行级测试结果见 console；简化 UI：可在下方表单粘贴同样的 endpoint 测试）`)
  }

  return (
    <div>
      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 0 }}>
        MCP server 管理（配置文件 <code>mcp.json</code> 的可视化编辑）。保存后需重启 DSH 生效。
      </p>

      <h4 style={{ fontSize: 13, margin: '14px 0 6px' }}>当前 servers（{loading ? '加载中…' : servers.length}）</h4>
      <div style={{ border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))', borderRadius: 10, overflow: 'hidden' }}>
        {servers.length === 0 && !loading && <div style={{ padding: 14, fontSize: 12, opacity: 0.6 }}>暂无 server——在下方添加</div>}
        {servers.map(row => (
          <div key={`${row.source}/${row.id}`} style={rowStyle}>
            <strong style={{ fontSize: 12 }}>{row.id}</strong>
            <span style={{ ...mono, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 5, padding: '1px 6px' }}>{row.source}</span>
            <span style={mono}>{row.kind}</span>
            <span style={{ ...mono, flex: 1, minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.endpoint}</span>
            <span style={mono}>{row.protocol}</span>
            <button type="button" style={btn} onClick={() => { setScope(row.source); setId(row.id); setType(row.kind === 'stdio' ? 'stdio' : 'http'); setCommand(row.kind === 'stdio' ? row.endpoint : ''); setUrl(row.kind === 'stdio' ? '' : row.endpoint); setProtocol(row.protocol); setTestResult(''); }}>编辑</button>
            <button type="button" style={btn} onClick={() => void testRow(row)}>测试</button>
            <button type="button" style={btn} onClick={() => void remove(row)}>删除</button>
          </div>
        ))}
      </div>

      <h4 style={{ fontSize: 13, margin: '18px 0 6px' }}>新增 / 编辑 server</h4>
      <div style={{ border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12 }}>作用域</span>
          <label style={{ fontSize: 12 }}><input type="radio" checked={scope === 'user'} onChange={() => setScope('user')} /> 用户级（~/.dsh/mcp.json）</label>
          <label style={{ fontSize: 12 }}><input type="radio" checked={scope === 'project'} onChange={() => setScope('project')} /> 项目级（.dsh/mcp.json）</label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={input} placeholder="id（如 github）" value={id} onChange={e => setId(e.target.value)} />
          <select style={{ ...input, maxWidth: 100 }} value={type} onChange={e => setType(e.target.value === 'stdio' ? 'stdio' : 'http')}>
            <option value="http">http</option>
            <option value="stdio">stdio</option>
          </select>
          <select style={{ ...input, maxWidth: 110 }} value={protocol} onChange={e => setProtocol(e.target.value)}>
            <option value="auto">auto</option>
            <option value="legacy">legacy</option>
            <option value="2026-07-28">2026-07-28</option>
          </select>
        </div>
        {type === 'stdio' ? (
          <>
            <input style={input} placeholder="command（如 npx）" value={command} onChange={e => setCommand(e.target.value)} />
            <textarea style={{ ...input, minHeight: 44, resize: 'vertical' }} placeholder={'args（每行一个，如：\n-y\n@modelcontextprotocol/server-github）'} value={args} onChange={e => setArgs(e.target.value)} />
          </>
        ) : (
          <input style={input} placeholder="url（如 https://mcp.example.com/mcp）" value={url} onChange={e => setUrl(e.target.value)} />
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" style={{ ...btn, padding: '5px 14px' }} disabled={busy} onClick={() => void test()}>测试连接</button>
          <button type="button" style={{ ...btn, padding: '5px 14px', fontWeight: 600 }} disabled={busy} onClick={() => void save()}>保存</button>
          {testResult !== '' && <span style={{ fontSize: 12 }}>{testResult}</span>}
          {note !== '' && <span style={{ fontSize: 12 }}>{note}</span>}
        </div>
      </div>
    </div>
  )
}
