/**
 * 联动详情渲染槽（M2，2026-09-02 联动特性 v1；2026-09-03 多消费方扩展）。
 *
 * PanelCard 的一部分：列表面板声明了 emits 时，卡片内渲染此槽。
 * 订阅联动事件总线 → 解析「该事件的全部消费方」（dock 注入的 consumes 索引
 * 优先；缺省回落到 emits.target 显式指向或事件名推断）→ 逐个解析目标面板
 * 定义 → 带参渲染 PanelSurface（多消费方堆叠）。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { JsonObject, PanelDefinition, PanelMeta, PanelRelationsDecl } from '../contract.ts'
import { relBus, evalPayloadTemplate, parseRelations } from './rel-bus.ts'
// 循环依赖规避：PanelCard 也 import 本文件（RelLinkedSlot）；运行时按需取
// PanelSurface（两端都构建完成后再触发渲染，ESM 循环引用在此场景安全——
// 仅函数体内引用，模块顶层不执行）
import { PanelSurface } from './PanelCard.tsx'

/** 注册表条目解析器：宿主（dock/panels client）注入「rid → PanelDefinition」查找 */
export type RelPanelResolver = (rid: string) => PanelDefinition | undefined

/** 消费方索引：宿主注入「event → [{ rid, param }]」（dock 从全 registry 构建） */
export type RelConsumesIndexFn = (event: string) => Array<{ rid: string; param: string }>

let panelResolver: RelPanelResolver | undefined
let consumesIndexFn: RelConsumesIndexFn | undefined

/** 注入注册表面板解析器（dock client 启动时调用一次） */
export function setRelPanelResolver(resolver: RelPanelResolver): void {
  panelResolver = resolver
}

/** 注入消费方索引（dock client 启动时调用一次；惰性调用时读取最新 registry） */
export function setRelConsumesIndex(fn: RelConsumesIndexFn): void {
  consumesIndexFn = fn
}

function resolvePanelDefinition(rid: string): PanelDefinition | undefined {
  try { return panelResolver?.(rid) } catch { return undefined }
}

/** 把注册表条目 entry 宽松解析为 PanelDefinition（形状不对返回 undefined） */
export function panelDefinitionFromEntry(entry: unknown): PanelDefinition | undefined {
  if (typeof entry !== 'object' || entry === null) return undefined
  const record = entry as Record<string, unknown>
  const panel = record.panel ?? record
  if (typeof panel !== 'object' || panel === null) return undefined
  const def = panel as Record<string, unknown>
  if (typeof def.id !== 'string' || typeof def.title !== 'string' || !Array.isArray(def.widgets)) return undefined
  return def as unknown as PanelDefinition
}

/** 目标面板定义 + 参数（事件映射结果） */
interface LinkedTarget {
  readonly rid: string
  readonly panel: PanelDefinition
  readonly params: JsonObject
}

/**
 * 联动渲染槽：emits 声明 + 事件 → 目标面板带参渲染。
 * 行点击（PanelSurface 事件委托）→ relBus 事件 → 这里解析全部消费方并堆叠渲染。
 */
export function RelLinkedSlot({ relations }: { relations: PanelRelationsDecl }): ReactNode {
  const [targets, setTargets] = useState<ReadonlyArray<LinkedTarget> | undefined>()
  const [event, setEvent] = useState<string>('')
  const relationsRef = useRef(relations)
  relationsRef.current = relations

  useEffect(() => {
    return relBus().subscribe((ev, payload) => {
      const rels = relationsRef.current
      const emit = rels.emits?.find(e => e.event === ev)
      if (!emit) return
      // 消费方解析：注入的 consumes 索引（全 registry 视角，多消费方）优先；
      // 缺省回落 emits.target 显式指向 / 事件名推断（单目标）
      const consumers = (() => { try { return consumesIndexFn?.(ev) ?? [] } catch { return [] } })()
      const ridList = consumers.length > 0
        ? consumers.map(c => c.rid)
        : emit.target?.rid !== undefined
          ? [emit.target.rid]
          : inferTargetRid(ev) !== undefined ? [inferTargetRid(ev) as string] : []
      const resolved = ridList
        .map(rid => ({ rid, panel: resolvePanelDefinition(rid) }))
        .filter((t): t is { rid: string; panel: PanelDefinition } => t.panel !== undefined)
      if (resolved.length === 0) return
      setTargets(resolved.map(t => ({ rid: t.rid, panel: t.panel, params: payload })))
      setEvent(ev)
    })
  }, [])

  if (!targets || targets.length === 0) {
    return (
      <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--openloop-muted-foreground, #888)', borderTop: '1px dashed var(--openloop-border)' }} data-openloop-rel-slot="empty">
        点击列表行，关联页面将在这里呈现 · click a row to open the linked page
      </div>
    )
  }
  const first = targets[0]
  return (
    <div style={{ borderTop: '1px dashed var(--openloop-border)', paddingTop: 10, marginTop: 10 }} data-openloop-rel-slot="linked">
      {first !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', marginBottom: 8, fontSize: 10.5, color: 'var(--openloop-muted-foreground, #888)' }}>
          <span>⚡ {event}</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', opacity: .8 }}>{Object.keys(first.params).map(k => `${k}=${String(first.params[k])}`).join(' · ')}</span>
          <span style={{ marginLeft: 'auto' }}>{targets.map(t => t.rid).join(' · ')}</span>
        </div>
      )}
      {targets.map(t => (
        <div key={t.rid} style={targets.length > 1 ? { marginBottom: 12 } : undefined}>
          <LinkedPanelSurface panel={t.panel} params={t.params} />
        </div>
      ))}
    </div>
  )
}

/** 带参面板渲染：api widget 的 {{param}} 经 refresh 端点带参解析（M1 通道） */
export function LinkedPanelSurface({ panel, params }: { panel: PanelDefinition; params: JsonObject }): ReactNode {
  const meta = useMemo<PanelMeta>(() => ({
    kind: 'openloop.panel',
    version: 1,
    panel,
    resolved: {},
    resolvedAt: new Date().toISOString(),
  }), [panel])
  return <PanelSurface meta={meta} relParams={params} />
}

/** 事件名 → 目标 rid 推断（未显式声明 target 时的兜底：{app}:{entity}:selected → 同 entity 详情） */
function inferTargetRid(event: string): string | undefined {
  const match = /^([a-z0-9][a-z0-9-]*):([a-z][a-z0-9-]*):selected$/.exec(event)
  if (!match) return undefined
  return `${match[1]}:${match[2]}-detail`
}

export { parseRelations, evalPayloadTemplate }
