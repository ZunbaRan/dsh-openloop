/**
 * 联动关系 UI 组件（M4，2026-09-02 联动特性 v1；2026-09-03 补齐原型形态）：
 * - RelChips：资源列表行的具名关系 chip（→ 目标页名 / ← 来源页名，可点跳）
 * - RelDeclSection：组件详情页「页面关系」双语声明表
 * - RelTryIt：关联预览（可交互最小闭环——点行 → 目标面板带参渲染）
 * - RelatedPages：相关页面跳转 chips
 * 数据源：registry 组件 entry.relations（panels 契约形态，经懒桥解析）。
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
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
// 组件详情：关联预览（直接点上方真实预览的行 → 联动页面出现在下方）
// ---------------------------------------------------------------------

/**
 * 不再渲染小预览表（2026-09-03 用户反馈）：上方 ComponentPreview 的
 * PanelSurface 自带行点击事件委托，点行即发事件到 relBus；这里订阅同一
 * 事件，把全部消费方面板带参渲染在下方。
 */
export function RelTryIt({ rid }: { rid: string }): ReactNode {
  const rels = relationsOf(rid)
  const emit = rels?.emits?.[0]
  const emitEvent = emit?.event
  const [selected, setSelected] = useState<JsonObject | null>(null)

  useEffect(() => {
    const panels = getPanelsClient()
    if (!emitEvent || !panels) return
    return panels.relBus().subscribe((event, payload) => {
      if (event === emitEvent) setSelected(payload)
    })
  }, [emitEvent])

  const panels = getPanelsClient()
  if (!emit || !panels) return null
  const consumers = buildRelConsumesIndex().get(emit.event)
    ?? (emit.target ? [{ rid: emit.target.rid, param: '' }] : [])

  return (
    <div data-openloop-rel-try={rid}>
      <div style={secLabelStyle}>关联预览 <span style={{ fontWeight: 400 }}>Try it · 在上方预览里点行看效果</span></div>
      {selected ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, fontSize: 10.5, color: 'var(--dsw-alias-label-secondary, inherit)' }}>
            <span style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 9.5, color: '#b06ad9' }}>⚡ {emit.event}</span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9.5, opacity: .75 }}>{Object.entries(selected).map(([k, v]) => `${k}=${String(v)}`).join(' · ')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {consumers.map(c => {
              const panel = panels.panelDefinitionFromEntry(lookupRegistryComponent(c.rid)?.entry)
              if (!panel) return null
              return (
                <div key={c.rid} style={{ border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 9, overflow: 'hidden' }}>
                  <panels.PanelSurface
                    meta={{ kind: 'openloop.panel', version: 1, panel, resolved: {}, resolvedAt: new Date().toISOString() }}
                    relParams={selected}
                  />
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{ border: '1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.18))', borderRadius: 9, padding: '14px 16px', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', lineHeight: 1.7 }}>
          在上面的预览里点一行，{consumers.map(c => `「${titleOfRid(c.rid)}」`).join('、')} 会即时出现在这里 ·
          click a row in the preview above to open the linked pages
        </div>
      )}
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
