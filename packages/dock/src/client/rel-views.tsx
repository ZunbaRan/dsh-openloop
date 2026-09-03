/**
 * 联动关系 UI 组件（M4，2026-09-02 联动特性 v1）：
 * 资源列表行的 relations chip + 组件预览详情页的「页面关系」双语声明区。
 * 数据源：registry 组件 entry.relations（panels 契约形态，经懒桥解析）。
 */
import type { ReactNode } from 'react'
import { getPanelsClient } from './openloop-clients.ts'
import { lookupRegistryComponent, getRegistryComponents } from './app-registry.ts'

/** 组件的 relations（panels 契约形态；无声明返回 undefined） */
export function relationsOf(rid: string): { emits?: Array<{ event: string; note?: string }>; consumes?: Array<{ event: string; param: string; note?: string }> } | undefined {
  const panels = getPanelsClient()
  const comp = lookupRegistryComponent(rid)
  if (!panels || !comp) return undefined
  const entry = comp.entry
  if (typeof entry !== 'object' || entry === null) return undefined
  const record = entry as Record<string, unknown>
  const panel = typeof record.panel === 'object' && record.panel !== null ? record.panel : record
  return panels.parseRelations((panel as Record<string, unknown>).relations)
}

/**
 * 全量 registry 的 consumes 索引：event → [{ rid, param }]。
 * 惰性构建（每次调用读最新 registry 缓存）——registry 刷新后自然生效。
 */
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

/** 事件名 → 关系另一端 rid 推断（与 panels RelLinked.inferTargetRid 同规则） */
function peerRidOfEvent(event: string): string | undefined {
  const m = /^([a-z0-9][a-z0-9-]*):([a-z][a-z0-9-]*):selected$/.exec(event)
  return m ? `${m[1]}:${m[2]}-detail` : undefined
}

/** chip 颜色样式（rel 紫） */
const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 3,
  fontSize: 9, padding: '1px 6px', borderRadius: 5,
  color: '#b06ad9', background: 'rgba(176,106,217,.12)',
  whiteSpace: 'nowrap',
}

/** 资源行 relations chip：有 emits 显示「⚡ 可触发」、有 consumes 显示「⇄ 可响应」 */
export function RelChips({ rid }: { rid: string }): ReactNode {
  const rels = relationsOf(rid)
  if (!rels) return null
  return (
    <>
      {rels.emits && rels.emits.length > 0 ? (
        <span style={chipStyle} title={`点行可触发 · emits：${rels.emits.map(e => e.event).join(', ')}`}>⚡ 可触发</span>
      ) : null}
      {rels.consumes && rels.consumes.length > 0 ? (
        <span style={chipStyle} title={`可响应事件 · consumes：${rels.consumes.map(c => c.event).join(', ')}`}>⇄ 可响应</span>
      ) : null}
    </>
  )
}

/** 组件详情区：页面关系双语表（预览头部下方） */
export function RelDeclSection({ rid }: { rid: string }): ReactNode {
  const rels = relationsOf(rid)
  if (!rels || ((!rels.emits || rels.emits.length === 0) && (!rels.consumes || rels.consumes.length === 0))) return null
  const rows: Array<{ dir: 'out' | 'in'; event: string; param: string; note: string }> = []
  for (const e of rels.emits ?? []) rows.push({ dir: 'out', event: e.event, param: '—', note: e.note ?? '点行时触发 · fires on row click' })
  for (const c of rels.consumes ?? []) rows.push({ dir: 'in', event: c.event, param: c.param, note: c.note ?? `按 ${c.param} 取数 · renders by ${c.param}` })
  return (
    <div style={{ marginTop: 12 }} data-openloop-rel-decl={rid}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: 'var(--dsw-alias-label-caption, #888)', marginBottom: 6 }}>
        页面关系 <span style={{ fontWeight: 400 }}>Relations（emits 可触发 / consumes 可响应）</span>
      </div>
      <div style={{ border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', borderRadius: 9, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 10.5,
              borderTop: i === 0 ? undefined : '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
              color: 'var(--dsw-alias-label-primary, inherit)',
            }}
          >
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '1px 7px', borderRadius: 999, whiteSpace: 'nowrap',
              color: r.dir === 'out' ? '#b06ad9' : 'var(--dsw-alias-state-business-primary, #4176e6)',
              background: r.dir === 'out' ? 'rgba(176,106,217,.1)' : 'rgba(65,118,230,.1)',
            }}>
              {r.dir === 'out' ? '→ 可触发 emits' : '← 可响应 consumes'}
            </span>
            <span style={{ fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 9.5, color: '#b06ad9' }}>{r.event}</span>
            {r.param !== '—' ? <span style={{ fontSize: 10 }}>{r.param}</span> : null}
            <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--dsw-alias-label-caption, #888)' }}>{r.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
