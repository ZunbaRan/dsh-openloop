/**
 * db-browser 渲染器：本地后端数据库浏览（筛选 + 选库 + 分页）。
 * - 数据通道：GET /openloop/app/collections（下拉）/ GET /openloop/app/collections/:name/records
 * - 交互态：集合下拉（含记录数）、关键词输入（Enter 提交）、上一页/下一页
 * - 列 = 首行键序（≤8 列，id 恒显；超长单元格截断，对象/数组 JSON 摘要）
 * 样式 100% var(--openloop-*)。
 */
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title as titleStyle } from '../style.ts'
import { truncate, useAppEndpoint } from '../local-backend.ts'

interface CollectionsData {
  collections?: Array<{ name?: unknown; count?: unknown }>
}

interface RecordsData {
  items?: Array<Record<string, unknown>>
  page?: unknown
  perPage?: unknown
  totalItems?: unknown
  totalPages?: unknown
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 14px',
  borderBottom: '1px solid var(--openloop-border)',
}

const controlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '10px 14px',
}

const selectStyle: CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  borderRadius: 'var(--openloop-radius-md)',
  border: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface)',
  color: 'var(--openloop-foreground)',
  fontFamily: 'inherit',
}

const inputStyle: CSSProperties = {
  ...selectStyle,
  flex: 1,
  minWidth: 120,
}

const buttonStyle: CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  borderRadius: 'var(--openloop-radius-md)',
  border: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface-muted)',
  color: 'var(--openloop-foreground)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const scrollStyle: CSSProperties = { overflowX: 'auto' }

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11.5,
}

const thStyle: CSSProperties = {
  padding: '7px 10px',
  color: 'var(--openloop-muted-foreground)',
  fontWeight: 600,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface-muted)',
}

const tdStyle: CSSProperties = {
  padding: '6px 10px',
  color: 'var(--openloop-foreground)',
  borderBottom: '1px solid var(--openloop-border)',
  verticalAlign: 'top',
  wordBreak: 'break-word',
  maxWidth: 260,
  fontFamily: 'var(--openloop-font-mono, ui-monospace, "SF Mono", Menlo, monospace)',
}

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 14px',
}

const placeholderStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  color: 'var(--openloop-muted-foreground)',
  fontSize: 12,
  lineHeight: 1.7,
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return truncate(value, 80)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return truncate(JSON.stringify(value), 80)
}

const COLUMNS_MAX = 8

export function DbBrowserRender({ props }: PresetRenderProps) {
  const record = asRecord(props) ?? {}
  const perPageProp = typeof record.perPage === 'number' ? Math.min(100, Math.max(5, Math.round(record.perPage))) : 20
  const collectionProp = typeof record.collection === 'string' && record.collection.length > 0 ? record.collection : null
  const headerTitle = typeof record.title === 'string' && record.title.length > 0 ? record.title : '数据库浏览'

  const collectionsState = useAppEndpoint<CollectionsData>('/openloop/app/collections')
  const collections = (collectionsState.data?.collections ?? [])
    .filter((c): c is { name: string; count: number } => typeof c.name === 'string' && typeof c.count === 'number')

  // 浏览态持久化（0.5.1：刷新/重启不丢浏览位置——UI 态走 localStorage，
  // 对齐「UI 态不进 PB」纪律；per-instance key 避免多张浏览卡互相覆盖）
  const browserKey = `openloop.dock.db-browser.${typeof record.browserId === 'string' && record.browserId.length > 0 ? record.browserId : 'default'}`
  const readBrowserState = (): { collection: string | null; query: string } => {
    try {
      const raw = localStorage.getItem(browserKey)
      if (raw === null) return { collection: collectionProp, query: '' }
      const p = JSON.parse(raw) as { collection?: unknown; query?: unknown }
      return {
        collection: typeof p.collection === 'string' ? p.collection : collectionProp,
        query: typeof p.query === 'string' ? p.query : '',
      }
    } catch {
      return { collection: collectionProp, query: '' }
    }
  }
  const [browserState, setBrowserState] = useState(readBrowserState)
  const collection = browserState.collection
  const query = browserState.query
  const [queryInput, setQueryInput] = useState(query)
  const [page, setPage] = useState(1)
  const persistBrowserState = (next: { collection: string | null; query: string }): void => {
    setBrowserState(next)
    try { localStorage.setItem(browserKey, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // 初始集合：持久态 > prop > 第一个表
  useEffect(() => {
    if (collection === null && collections.length > 0) persistBrowserState({ collection: collections[0]?.name ?? null, query })
  }, [collection, collections])

  // 切换集合/关键词重置页码
  useEffect(() => { setPage(1) }, [collection, query])

  const path = collection !== null
    ? `/openloop/app/collections/${encodeURIComponent(collection)}/records?page=${page}&perPage=${perPageProp}${query !== '' ? `&q=${encodeURIComponent(query)}` : ''}`
    : null
  const recordsState = useAppEndpoint<RecordsData>(path)

  const items = Array.isArray(recordsState.data?.items) ? recordsState.data.items : []
  const columnKeys = items.length > 0
    ? Object.keys(items[0] ?? {}).filter(k => k !== 'id').slice(0, COLUMNS_MAX - 1)
    : []
  const totalItems = typeof recordsState.data?.totalItems === 'number' ? recordsState.data.totalItems : 0
  const totalPages = typeof recordsState.data?.totalPages === 'number' ? recordsState.data.totalPages : 1
  const currentPage = typeof recordsState.data?.page === 'number' ? recordsState.data.page : page

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') persistBrowserState({ collection, query: e.currentTarget.value.trim() })
  }

  const unavailable = collectionsState.unavailable
  const error = collectionsState.error ?? recordsState.error

  return (
    <div style={panel} data-openloop-preset="db-browser">
      <div style={headerStyle}>
        <span style={titleStyle}>{headerTitle}</span>
        <span style={meta}>{totalItems > 0 ? `${totalItems.toLocaleString()} 条记录` : ''}</span>
      </div>
      {unavailable ? (
        <div style={placeholderStyle}>
          本地应用后端未启用<br />
          <span style={meta}>安装并激活 @openloop/dsh-app 插件后可浏览数据库</span>
        </div>
      ) : error !== undefined ? (
        <div style={placeholderStyle}>数据读取失败：{error}</div>
      ) : (
        <>
          <div style={controlsStyle}>
            <select
              style={selectStyle}
              value={collection ?? ''}
              aria-label="选择集合"
              onChange={e => persistBrowserState({ collection: e.target.value, query })}
            >
              {collections.map(c => (
                <option key={c.name} value={c.name}>{c.name}（{c.count}）</option>
              ))}
            </select>
            <input
              style={inputStyle}
              placeholder="关键词筛选（Enter 应用）"
              aria-label="关键词筛选"
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => persistBrowserState({ collection, query: queryInput.trim() })}
            >查询</button>
            {query !== '' ? (
              <button
                type="button"
                style={buttonStyle}
                title="清除关键词"
                onClick={() => { setQueryInput(''); persistBrowserState({ collection, query: '' }) }}
              >✕</button>
            ) : null}
          </div>
          <div style={scrollStyle}>
            {items.length === 0 ? (
              <div style={placeholderStyle}>{recordsState.loading ? '读取中…' : '无匹配记录'}</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>id</th>
                    {columnKeys.map(key => <th key={key} style={thStyle}>{key}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => (
                    <tr key={String(row.id ?? index)}>
                      <td style={{ ...tdStyle, color: 'var(--openloop-muted-foreground)' }}>{truncate(String(row.id ?? ''), 14)}</td>
                      {columnKeys.map(key => <td key={key} style={tdStyle}>{cellText(row[key])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={footerStyle}>
            <span style={meta}>第 {currentPage} / {Math.max(1, totalPages)} 页</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={buttonStyle} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
              <button type="button" style={buttonStyle} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
