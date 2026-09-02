/**
 * 联动详情渲染槽（M2，2026-09-02 联动特性 v1）。
 *
 * PanelCard 的一部分：列表面板声明了 emits 时，卡片内渲染此槽。
 * 订阅联动事件总线 → 按（本会话可见的）consumes 注册表把事件映射为
 * 「目标面板 rid + 参数」→ 解析目标面板定义 → 带参渲染 PanelSurface。
 *
 * 目标面板解析路径（M1 范围）：
 * 1. 对话流内的其它 PanelMeta（同消息上下文）——v1 不做跨卡片查找，
 *    目标面板定义由资源注册表提供（见 resolveTargetPanel）。
 * 2. 资源注册表条目 entry.panel（panelFile / registry 组件 entry）。
 *
 * v1 简化：目标面板由 emits 事件的 `target.rid` 显式指向（skill 指导 agent
 * 生成时成对声明），未声明 target 或注册表查不到时不渲染（安全空态）。
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

let panelResolver: RelPanelResolver | undefined

/** 注入注册表面板解析器（dock client 启动时调用一次） */
export function setRelPanelResolver(resolver: RelPanelResolver): void {
  panelResolver = resolver
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
  readonly event: string
}

/**
 * 联动渲染槽：emits 声明 + 事件 → 目标面板带参渲染。
 * 行点击（PanelSurface 事件委托）→ relBus 事件 → 这里解析目标并渲染。
 */
export function RelLinkedSlot({ relations }: { relations: PanelRelationsDecl }): ReactNode {
  const [target, setTarget] = useState<LinkedTarget | undefined>()
  const relationsRef = useRef(relations)
  relationsRef.current = relations

  useEffect(() => {
    return relBus().subscribe((event, payload) => {
      const rels = relationsRef.current
      // v1：任一 emits 匹配事件名即触发；目标 rid 取 emits.target.rid 或事件名推断
      const emit = rels.emits?.find(e => e.event === event)
      if (!emit) return
      const targetRid = emit.target?.rid ?? inferTargetRid(event)
      if (typeof targetRid !== 'string' || targetRid.length === 0) return
      const panel = resolvePanelDefinition(targetRid)
      if (!panel) return
      setTarget({ rid: targetRid, panel, params: payload, event })
    })
  }, [])

  if (!target) {
    return (
      <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--openloop-muted-foreground, #888)', borderTop: '1px dashed var(--openloop-border)' }} data-openloop-rel-slot="empty">
        点击列表行，关联页面将在这里呈现 · click a row to open the linked page
      </div>
    )
  }
  return (
    <div style={{ borderTop: '1px dashed var(--openloop-border)', paddingTop: 10, marginTop: 10 }} data-openloop-rel-slot="linked">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', marginBottom: 8, fontSize: 10.5, color: 'var(--openloop-muted-foreground, #888)' }}>
        <span>⚡ {target.event}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', opacity: .8 }}>{Object.keys(target.params).map(k => `${k}=${String(target.params[k])}`).join(' · ')}</span>
        <span style={{ marginLeft: 'auto' }}>{target.rid}</span>
      </div>
      <LinkedPanelSurface panel={target.panel} params={target.params} />
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
  // v1：params 注入 panel 的 api binding（替换 {{param}}）由带参刷新通道处理；
  // 此处先把 params 挂到 resolved 之外（PanelSurface 的刷新编排会带 params 发请求）。
  return <PanelSurface meta={meta} relParams={params} />
}

/** 事件名 → 目标 rid 推断（未显式声明 target 时的兜底：{app}:{entity}:selected → 同 entity 详情） */
function inferTargetRid(event: string): string | undefined {
  // my-crm:lead:selected → 查注册表 my-crm:lead-detail（由 resolver 决定存在性）
  const match = /^([a-z0-9][a-z0-9-]*):([a-z][a-z0-9-]*):selected$/.exec(event)
  if (!match) return undefined
  return `${match[1]}:${match[2]}-detail`
}

export { parseRelations, evalPayloadTemplate }
