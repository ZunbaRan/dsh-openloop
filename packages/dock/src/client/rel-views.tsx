/**
 * 联动关系 UI 组件（M4，2026-09-02 联动特性 v1；2026-09-03 补齐原型形态）：
 * - RelChips：资源列表行的具名关系 chip（→ 目标页名 / ← 来源页名，可点跳）
 * - RelDeclSection：组件详情页「页面关系」双语声明表
 * - RelTryIt：关联预览（可交互最小闭环——点行 → 目标面板带参渲染）
 * - RelatedPages：相关页面跳转 chips
 * 数据源：registry 组件 entry.relations（panels 契约形态，经懒桥解析）。
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { getPanelsClient } from './openloop-clients.ts'
import { lookupRegistryComponent, getRegistryComponents } from './app-registry.ts'

type JsonObject = Record<string, unknown>
interface RelEmits { event: string; note?: string; target?: { rid: string }; payload?: JsonObject }
interface RelConsumes { event: string; param: string; note?: string }
interface RelDecl { emits?: RelEmits[]; consumes?: RelConsumes[] }

/** 组件的 relations（panels 契约形态；无声明返回 undefined） */
export function relationsOf(rid: string): RelDecl | undefined {
  const panels = getPanelsClient()
  const comp = lookupRegistryComponent(rid)
  if (!panels || !comp) return undefined
  const entry = comp.entry
  if (typeof entry !== 'object' || entry === null) return undefined
  const record = entry as Record<string, unknown>
  const panel = typeof record.panel === 'object' && record.panel !== null ? record.panel : record
  return panels.parseRelations((panel as Record<string, unknown>).relations) as RelDecl | undefined
}

/** 事件名 → 目标 rid 推断（与 panels RelLinked.inferTargetRid 同规则） */
function inferTargetRid(event: string): string | undefined {
  const m = /^([a-z0-9][a-z0-9-]*):([a-z][a-z0-9-]*):selected$/.exec(event)
  return m ? `${m[1]}:${m[2]}-detail` : undefined
}

/** 组件标题解析（未注册返回 rid 的组件名段） */
function titleOfRid(rid: string): string {
  const comp = lookupRegistryComponent(rid)
  return comp?.title ?? rid.split(':')[1] ?? rid
}

/** 具名关系端点（资源行 chip / 相关页面共用） */
export interface RelPeer {
  readonly dir: 'out' | 'in'
  readonly rid: string
  readonly title: string
  readonly event: string
  readonly how: string
}

/** 组件的全部具名关系端点：out = 本组件触发指向谁；in = 谁触发打开本组件 */
export function relPeersOf(rid: string): RelPeer[] {
  const rels = relationsOf(rid)
  if (!rels) return []
  const peers: RelPeer[] = []
  for (const e of rels.emits ?? []) {
    const targetRid = e.target?.rid ?? inferTargetRid(e.event)
    if (!targetRid) continue
    peers.push({ dir: 'out', rid: targetRid, title: titleOfRid(targetRid), event: e.event, how: e.note ?? '点行打开' })
  }
  for (const c of rels.consumes ?? []) {
    // 来源端：registry 里 emits 同事件的组件
    for (const comp of getRegistryComponents()) {
      if (comp.id === rid) continue
      const src = relationsOf(comp.id)
      if (!src?.emits?.some(e => e.event === c.event)) continue
      peers.push({ dir: 'in', rid: comp.id, title: comp.title, event: c.event, how: `按 ${c.param} 取数` })
    }
  }
  return peers
}

/** 全量 registry 的 consumes 索引：event → [{ rid, param }]（惰性构建） */
export function buildRelConsumesIndex(): Map<string, Array<{ rid: string; param: string }>> {
  const index = new Map<string, Array<{ rid: string; param: string }>>()
  for (const comp of getRegistryComponents()) {
    const rels = relationsOf(comp.id)
    if (!rels?.consumes) continue
    for (const c of rels.consumes) {
      const list = index.get(c.event) ?? []
      list.push({ rid: comp.id, param: c.param })
      index.set(c.event, list)
    }
  }
  return index
}

// ---------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------

const chipStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 9.5, padding: '1.5px 7px', borderRadius: 6,
  color: '#b06ad9', background: 'rgba(176,106,217,.1)',
  border: '1px solid rgba(176,106,217,.3)',
  whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
}

const secLabelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: '.06em',
  color: 'var(--dsw-alias-label-caption, #888)', marginBottom: 6, marginTop: 14,
}

// ---------------------------------------------------------------------
// 资源行 relations chip（具名：→ 目标页 / ← 来源页；onJump 可点跳选中）
// ---------------------------------------------------------------------

export function RelChips({ rid, onJump }: { rid: string; onJump?: (rid: string) => void }): ReactNode {
  const peers = relPeersOf(rid)
  if (peers.length === 0) return null
  return (
    <>
      {peers.slice(0, 3).map(p => (
        <button
          key={`${p.dir}:${p.rid}:${p.event}`}
          type="button"
          style={chipStyle}
          title={`${p.dir === 'out' ? '点行打开' : '被联动打开'} · ${p.event}`}
          onClick={e => { e.stopPropagation(); onJump?.(p.rid) }}
        >{p.dir === 'out' ? '→' : '←'} {p.title}</button>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------
// 组件详情：页面关系双语声明表
// ---------------------------------------------------------------------

export function RelDeclSection({ rid }: { rid: string }): ReactNode {
  const rels = relationsOf(rid)
  if (!rels || ((!rels.emits || rels.emits.length === 0) && (!rels.consumes || rels.consumes.length === 0))) return null
  const rows: Array<{ dir: 'out' | 'in'; event: string; param: string; note: string }> = []
  for (const e of rels.emits ?? []) rows.push({ dir: 'out', event: e.event, param: '—', note: e.note ?? '点行时触发 · fires on row click' })
  for (const c of rels.consumes ?? []) rows.push({ dir: 'in', event: c.event, param: c.param, note: c.note ?? `按 ${c.param} 取数 · renders by ${c.param}` })
  const cellStyle: CSSProperties = { fontSize: 10.5, padding: '7px 10px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', color: 'var(--dsw-alias-label-primary, inherit)' }
  return (
    <div data-openloop-rel-decl={rid}>
      <div style={secLabelStyle}>页面关系 <span style={{ fontWeight: 400 }}>Relations（emits 可触发 / consumes 可响应）</span></div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 9, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)' }}>
            <th style={{ ...cellStyle, textAlign: 'left', fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>方向</th>
            <th style={{ ...cellStyle, textAlign: 'left', fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>事件 Event</th>
            <th style={{ ...cellStyle, textAlign: 'left', fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>参数 Param</th>
            <th style={{ ...cellStyle, textAlign: 'left', fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={i === rows.length - 1 ? { borderBottom: 0 } : undefined}>
              <td style={cellStyle}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 7px', borderRadius: 999, whiteSpace: 'nowrap',
                  color: r.dir === 'out' ? '#b06ad9' : 'var(--dsw-alias-state-business-primary, #4176e6)',
                  background: r.dir === 'out' ? 'rgba(176,106,217,.1)' : 'rgba(65,118,230,.1)',
                }}>{r.dir === 'out' ? '→ 可触发 emits' : '← 可响应 consumes'}</span>
              </td>
              <td style={{ ...cellStyle, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 9.5, color: '#b06ad9' }}>{r.event}</td>
              <td style={{ ...cellStyle, fontSize: 10 }}>{r.param}</td>
              <td style={{ ...cellStyle, fontSize: 9.5, color: 'var(--dsw-alias-label-caption, #888)' }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------
// 组件详情：关联预览（可交互——点行 → 目标面板带参渲染）
// ---------------------------------------------------------------------

/** 从面板定义取静态 rows（首个 preset widget 的 props.rows；api 列表无静态行返回 undefined） */
function staticRowsOf(rid: string): JsonObject[] | undefined {
  const panels = getPanelsClient()
  const comp = lookupRegistryComponent(rid)
  if (!panels || !comp) return undefined
  const def = panels.panelDefinitionFromEntry(comp.entry)
  if (!def) return undefined
  for (const w of def.widgets) {
    if (w.source.type !== 'preset') continue
    const rows = (w.source.props as Record<string, unknown> | undefined)?.rows
    if (Array.isArray(rows)) return rows as JsonObject[]
  }
  return undefined
}

export function RelTryIt({ rid }: { rid: string }): ReactNode {
  const rels = relationsOf(rid)
  const emit = rels?.emits?.[0]
  const rows = useMemo(() => (emit ? staticRowsOf(rid) : undefined), [rid, emit])
  const [selected, setSelected] = useState<{ rowIndex: number; payload: JsonObject } | null>(null)
  const panels = getPanelsClient()
  if (!emit || !panels) return null
  const consumers = buildRelConsumesIndex().get(emit.event)
    ?? (emit.target ? [{ rid: emit.target.rid, param: '' }] : [])

  const pick = (rowIndex: number): void => {
    const row = rows?.[rowIndex]
    if (!row) return
    const payload = panels.evalPayloadTemplate(emit.payload, row, {})
    setSelected({ rowIndex, payload })
  }

  const th: CSSProperties = { fontSize: 9.5, fontWeight: 600, color: 'var(--dsw-alias-label-caption, #888)', textAlign: 'left', padding: '5px 10px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }
  const td: CSSProperties = { fontSize: 10.5, padding: '5px 10px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', color: 'var(--dsw-alias-label-primary, inherit)' }
  return (
    <div data-openloop-rel-try={rid}>
      <div style={secLabelStyle}>关联预览 <span style={{ fontWeight: 400 }}>Try it · 点行看效果</span></div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 10px', fontSize: 10.5, fontWeight: 600, background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }}>
              {titleOfRid(rid)} <span style={{ fontWeight: 400, fontSize: 9, color: 'var(--dsw-alias-label-caption, #888)' }}>点行试试</span>
            </div>
            {rows ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>#</th>{Object.keys(rows[0] ?? {}).slice(0, 3).map(k => <th key={k} style={th}>{k}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        cursor: 'pointer',
                        background: selected?.rowIndex === i ? 'rgba(65,118,230,.1)' : undefined,
                        boxShadow: selected?.rowIndex === i ? 'inset 3px 0 0 var(--dsw-alias-state-business-primary, #4176e6)' : undefined,
                      }}
                      onClick={() => pick(i)}
                    >
                      <td style={td}>{i + 1}</td>
                      {Object.keys(row).slice(0, 3).map(k => <td key={k} style={{ ...td, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[k])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 12, fontSize: 10.5, color: 'var(--dsw-alias-label-caption, #888)' }}>行数据来自接口——请在对话流或看板里点选体验</div>
            )}
          </div>
        </div>
        <div style={{ flex: '0 0 46px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#b06ad9' }}>
          <div style={{ fontSize: 9, color: selected ? '#b06ad9' : 'var(--dsw-alias-label-caption, #888)', fontWeight: selected ? 600 : 400, textAlign: 'center', lineHeight: 1.4 }}>
            {selected ? Object.entries(selected.payload).map(([k, v]) => `${k}=${String(v)}`).join(' ') : '等待点选'}
          </div>
          <div style={{ width: '100%', height: 2, background: selected ? 'linear-gradient(90deg, transparent, #b06ad9, transparent)' : 'var(--dsw-alias-border-l2, rgba(127,127,127,.18))', position: 'relative' }}>
            <div style={{ position: 'absolute', right: 0, top: -3, border: '4px solid transparent', borderLeftColor: selected ? '#b06ad9' : 'var(--dsw-alias-border-l2, rgba(127,127,127,.18))' }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--dsw-alias-label-caption, #888)', textAlign: 'center' }}>{selected ? '即时打开' : 'click a row'}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selected ? consumers.map(c => {
            const panel = panels.panelDefinitionFromEntry(lookupRegistryComponent(c.rid)?.entry)
            if (!panel) return null
            return (
              <div key={c.rid} style={{ border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 9, overflow: 'hidden' }}>
                <panels.PanelSurface
                  meta={{ kind: 'openloop.panel', version: 1, panel, resolved: {}, resolvedAt: new Date().toISOString() }}
                  relParams={selected.payload}
                />
              </div>
            )
          }) : (
            <div style={{ border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 9, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-caption, #888)' }}>详情将在这里出现</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// 组件详情：相关页面跳转 chips
// ---------------------------------------------------------------------

export function RelatedPages({ rid, onJump }: { rid: string; onJump: (rid: string) => void }): ReactNode {
  const peers = relPeersOf(rid)
  if (peers.length === 0) return null
  return (
    <div>
      <div style={secLabelStyle}>相关页面 <span style={{ fontWeight: 400 }}>Related pages</span></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {peers.map(p => (
          <button key={`${p.dir}:${p.rid}:${p.event}`} type="button" style={chipStyle} onClick={() => onJump(p.rid)}>
            {p.dir === 'out' ? '→' : '←'} {p.title} · {p.how}
          </button>
        ))}
      </div>
    </div>
  )
}
