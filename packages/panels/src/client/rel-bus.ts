/**
 * 联动事件通道（client 侧，2026-09-02 联动特性 v1）。
 *
 * 极小的 window 事件总线：panel 行点击产生带参事件（emits）→ 宿主监听按
 * relations.consumes 映射为目标面板参数（rid + params）→ 由对话流卡片 /
 * Board 悬浮窗渲染。遵循仓库既有 window 单例事实标准（__openloopDockService
 * 模式），不引入 cordis 依赖、不跨插件 import。
 *
 * 事件流：window.postMessage('openloop-rel:{event}', { payload }) —— 用
 * postMessage 而非 CustomEvent 直发，是因为沙箱 iframe（panel 的 sandbox 车道）
 * 只能经 window.parent.postMessage 与宿主通信；宿主与 iframe 两侧用同一形态。
 */

/** 消息前缀（联动事件通道专用） */
export const REL_EVENT_PREFIX = 'openloop-rel:'

/** 联动事件消息形态（iframe → 宿主，或宿主内部直发） */
export interface RelEventMessage {
  readonly type: string
  readonly payload: JsonObject
}

type JsonObject = Record<string, unknown>

/** 联动事件监听器 */
export type RelEventListener = (event: string, payload: JsonObject) => void

interface RelBus {
  subscribe(listener: RelEventListener): () => void
  dispatch(event: string, payload: JsonObject): void
}

const BUS_KEY = '__openloopRelBus'

function createBus(): RelBus {
  const listeners = new Set<RelEventListener>()
  const onMessage = (ev: MessageEvent): void => {
    if (typeof ev.data !== 'object' || ev.data === null) return
    const data = ev.data as { type?: unknown; payload?: unknown }
    if (typeof data.type !== 'string' || !data.type.startsWith(REL_EVENT_PREFIX)) return
    const event = data.type.slice(REL_EVENT_PREFIX.length)
    const payload = (typeof data.payload === 'object' && data.payload !== null && !Array.isArray(data.payload)
      ? data.payload
      : {}) as JsonObject
    for (const listener of listeners) listener(event, payload)
  }
  window.addEventListener('message', onMessage)
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    dispatch(event, payload) {
      for (const listener of listeners) listener(event, payload)
    },
  }
}

/** 宿主侧联动事件总线（window 单例；测试可重复创建） */
export function relBus(): RelBus {
  const w = window as unknown as { [BUS_KEY]?: RelBus }
  if (!w[BUS_KEY]) w[BUS_KEY] = createBus()
  return w[BUS_KEY]
}

/** 便捷直发（宿主侧 React 组件内，不经 postMessage 绕行） */
export function dispatchRelEvent(event: string, payload: JsonObject): void {
  relBus().dispatch(event, payload)
}

/** iframe 侧便捷发送（panel 沙箱车道 widget → 宿主） */
export function postRelEvent(event: string, payload: JsonObject): void {
  window.parent.postMessage({ type: REL_EVENT_PREFIX + event, payload }, '*')
}

// ---------------------------------------------------------------------
// relations 声明解析（宿主侧；从 PanelDefinition / 组件 entry 提取）
// ---------------------------------------------------------------------

import type { PanelConsumesDecl, PanelEmitsDecl, PanelRelationsDecl } from '../contract.ts'

/** 宽松校验提取 relations（形状不对按无声明处理，不致命） */
export function parseRelations(value: unknown): PanelRelationsDecl | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const out: PanelRelationsDecl = {}
  if (Array.isArray(record.emits)) {
    const emits: PanelEmitsDecl[] = []
    for (const item of record.emits) {
      if (typeof item !== 'object' || item === null) continue
      const decl = item as Record<string, unknown>
      if (typeof decl.event !== 'string' || decl.event.length === 0) continue
      emits.push({
        event: decl.event,
        ...(decl.payload && typeof decl.payload === 'object' && !Array.isArray(decl.payload)
          ? { payload: decl.payload as JsonObject }
          : {}),
        ...(typeof decl.note === 'string' ? { note: decl.note } : {}),
      })
    }
    if (emits.length > 0) out.emits = emits
  }
  if (Array.isArray(record.consumes)) {
    const consumes: PanelConsumesDecl[] = []
    for (const item of record.consumes) {
      if (typeof item !== 'object' || item === null) continue
      const decl = item as Record<string, unknown>
      if (typeof decl.event !== 'string' || decl.event.length === 0) continue
      if (typeof decl.param !== 'string' || decl.param.length === 0) continue
      consumes.push({
        event: decl.event,
        param: decl.param,
        ...(typeof decl.note === 'string' ? { note: decl.note } : {}),
      })
    }
    if (consumes.length > 0) out.consumes = consumes
  }
  return out.emits || out.consumes ? out : undefined
}

/**
 * payload 模板求值（emits 侧）：`$row.x` / `$panel.x` 引用触发上下文。
 * 非模板值原样下发；路径不存在时该字段省略。
 */
export function evalPayloadTemplate(
  template: JsonObject | undefined,
  row: unknown,
  panel: unknown,
): JsonObject {
  if (!template) return {}
  const out: JsonObject = {}
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string' && value.startsWith('$row.')) {
      const resolved = pickPath(row, value.slice('$row.'.length))
      if (resolved !== undefined) out[key] = resolved
    } else if (typeof value === 'string' && value.startsWith('$panel.')) {
      const resolved = pickPath(panel, value.slice('$panel.'.length))
      if (resolved !== undefined) out[key] = resolved
    } else {
      out[key] = value
    }
  }
  return out
}

function pickPath(source: unknown, path: string): unknown {
  let cursor: unknown = source
  for (const segment of path.split('.').filter(Boolean)) {
    if (typeof cursor !== 'object' || cursor === null) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}
