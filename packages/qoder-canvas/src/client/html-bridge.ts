/**
 * html-bridge（0.9.0 增强档）：父页面侧的探针协议端。
 *
 * 职责：
 * - 每个 html 节点 iframe 一条注册记录（nodeId ↔ frame element ↔ token ↔ 状态机）
 * - init 握手（onload 后发 token）→ ready（探针回执）→ hit/marquee 请求响应（reqId 关联）
 * - 探针未就绪超时（800ms）→ 该节点降级节点级标注（保底档内嵌于增强档）
 * - 坐标换算：探针 rect 是 iframe 视口坐标；父页面高亮 = iframe 容器偏移 + rect
 *   （iframe 自身不滚动——高度自适应策略让容器随内容长，滚动发生在画布层）
 *
 * 协议安全：sandbox="allow-scripts"（opaque origin）+ 每帧随机 token——
 * iframe 内用户脚本理论上可伪造 postMessage（同 iframe 内可见 token），但伪造面
 * 仅限「让父层选中一个假元素」——无宿主数据可偷（opaque origin 隔离），可接受。
 *
 * 使用方式：CanvasSurface 的 HtmlNode 挂载时 register()，PinLayer 经
 * hitAt/marqueeIn 查询，事件路由读 isReady/degraded。
 */
import type { ProbeHit } from './probe.ts'

/** iframe 内框选矩形（父页面传 iframe 视口坐标系） */
export interface ProbeRect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

type Mode = 'point' | 'marquee' | 'text' | 'off'

interface FrameRecord {
  readonly nodeId: string
  readonly frame: HTMLIFrameElement
  readonly token: string
  ready: boolean
  /** 降级标记：超时未 ready 或探针已死（版本重渲染瞬间） */
  degraded: boolean
  /** 高度自适应：探针上报的内容高度（px） */
  height: number
  /** 宽度自适应：探针上报的内容自然宽度（scrollWidth，px；0=未知/未超宽） */
  width: number
  readonly mountedAt: number
  /** pending 请求（reqId → resolver） */
  readonly pending: Map<number, (hit: unknown) => void>
}

// 真机教训（2026-09-07）：800ms 对复杂 HTML 设计稿过紧（大 srcdoc 渲染慢 +
// 主线程繁忙时 hello→init 往返延迟）——误判降级导致「点击只能选整块」
const READY_TIMEOUT_MS = 3000
let reqSeq = 1

const registry = new Map<string, FrameRecord>() // key: nodeId
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function randomToken(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/** 全局 message 监听（模块级一次；HtmlNode 的注册驱动它） */
if (typeof window !== 'undefined') {
  window.addEventListener('message', (ev: MessageEvent) => {
    const d = ev.data as Record<string, unknown> | null
    if (d === null || typeof d !== 'object' || d['__openloopProbe'] !== true) return
    // 诊断日志（0.9.4 排查期保留——走 window 数组，宿主 console 可能被接管）
    
    // 按 token 找记录（iframe 的 ev.source 与 contentWindow 对齐双保险）
    // 特例：hello 无 token（探针未 init 前拉握手）——按 ev.source 匹配 frame
    for (const rec of registry.values()) {
      const tokenMatch = d['t'] === 'hello' ? rec.frame.contentWindow === ev.source : rec.token === d['token']
      if (!tokenMatch || rec.frame.contentWindow !== ev.source) continue
      const t = d['t']
      if (t === 'hello') {
        // 探针拉起握手：脚本已执行（监听已挂）——（重）发 init 确保 token 必达
        // 0.9.6 根因 2：init 带当前 mode——否则用户在探针 ready 前切了划字，
        // mode 广播丢失，探针永远停 'off' 不上报 selection
        rec.frame.contentWindow?.postMessage({ __openloopProbe: true, t: 'init', token: rec.token, mode: currentMode }, '*')
      } else if (t === 'ready') {
        rec.ready = true
        rec.degraded = false
        const h = d['height']
        if (typeof h === 'number' && h > 0) rec.height = h
        const w = d['width']
        if (typeof w === 'number' && w > 0) rec.width = w
        // ready 后补发当前 mode（用户在 ready 前切模式的广播可能丢失——双保险）
        rec.frame.contentWindow?.postMessage({ __openloopProbe: true, t: 'mode', token: rec.token, mode: currentMode }, '*')
        emit()
      } else if (t === 'height') {
        const h = d['height']
        const w = d['width']
        let changed = false
        if (typeof h === 'number' && h > 0 && Math.abs(h - rec.height) > 2) { rec.height = h; changed = true }
        if (typeof w === 'number' && w > 0 && Math.abs(w - rec.width) > 2) { rec.width = w; changed = true }
        if (changed) emit()
      } else if (t === 'hit-result' || t === 'marquee-result') {
        const reqId = d['reqId']
        if (typeof reqId === 'number') {
          const resolver = rec.pending.get(reqId)
          if (resolver !== undefined) {
            rec.pending.delete(reqId)
            resolver(t === 'hit-result' ? d['hit'] : d['hits'])
          }
        }
      }
      // selection 事件由 PinLayer 经 onProbeSelection 订阅（bridge 不缓存——流语义）
      if (t === 'selection') {
        for (const sel of selectionListeners) {
          sel(rec.nodeId, { excerpt: String(d['excerpt'] ?? ''), domPath: String(d['domPath'] ?? '') })
        }
      }
      return
    }
  })
}

const selectionListeners = new Set<(nodeId: string, info: { excerpt: string; domPath: string }) => void>()

/** 划字订阅（PinLayer text 模式挂） */
export function onProbeSelection(fn: (nodeId: string, info: { excerpt: string; domPath: string }) => void): () => void {
  selectionListeners.add(fn)
  return () => { selectionListeners.delete(fn) }
}

/** 注册/重注册一个 html 节点的 iframe（HtmlNode onload 调用；重渲染自动覆盖旧记录） */
export function registerProbeFrame(nodeId: string, frame: HTMLIFrameElement): void {
  const token = randomToken()
  const rec: FrameRecord = { nodeId, frame, token, ready: false, degraded: false, height: 0, width: 0, mountedAt: Date.now(), pending: new Map() }
  registry.set(nodeId, rec)
  // 握手：iframe onload 后探针已在监听——发 init（含当前 mode 由 PinLayer 切换时补发）
  frame.contentWindow?.postMessage({ __openloopProbe: true, t: 'init', token, mode: currentMode }, '*')
  // 超时降级
  setTimeout(() => {
    if (rec.ready === false && registry.get(nodeId) === rec) {
      rec.degraded = true
      emit()
    }
  }, READY_TIMEOUT_MS)
  emit()
}

/** 卸载（HtmlNode unmount；版本重渲染先卸后挂） */
export function unregisterProbeFrame(nodeId: string): void {
  const rec = registry.get(nodeId)
  if (rec !== undefined) {
    for (const resolve of rec.pending.values()) resolve(null)
    registry.delete(nodeId)
  }
  emit()
}

/** 当前模式（模块级——init/ready 补发时用；0.9.6 根因 2 修复） */
let currentMode: Mode = 'off'

/** 模式广播（PinLayer mode 变化时对全部 frame 补发——含未 ready 的，探针 init 后生效） */
export function broadcastProbeMode(mode: Mode): void {
  currentMode = mode
  for (const rec of registry.values()) {
    rec.frame.contentWindow?.postMessage({ __openloopProbe: true, t: 'mode', token: rec.token, mode }, '*')
  }
}

/** 订阅 bridge 状态（ready/degraded/height 变化——HtmlNode 高度 + PinLayer 路由用） */
export function onBridgeChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function bridgeState(): { nodeId: string; ready: boolean; degraded: boolean; height: number }[] {
  return [...registry.values()].map(r => ({ nodeId: r.nodeId, ready: r.ready, degraded: r.degraded, height: r.height }))
}

/** 某坐标点命中的 iframe 记录（父页面坐标 → 判定落在哪个 frame 的包围盒内） */
export function frameAt(nodeId: string, clientX: number, clientY: number): FrameRecord | null {
  const rec = registry.get(nodeId)
  if (rec === undefined) return null
  const r = rec.frame.getBoundingClientRect()
  if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return rec
  return null
}

/** 找全部 html 节点中坐标命中的 frame（跨节点查询——PinLayer hitElement 用） */
export function frameAtAny(clientX: number, clientY: number): FrameRecord | null {
  for (const rec of registry.values()) {
    const r = rec.frame.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return rec
  }
  return null
}

/** 全部 frame 记录（框选扫描用） */
export function allFrameRecords(): FrameRecord[] {
  return [...registry.values()]
}

/** 诊断暴露（真机调试用；生产无害——只读。挂 window 便于控制台排查） */
export function bridgeDebug(): unknown {
  const out: unknown[] = []
  for (const r of registry.values()) {
    out.push({ nodeId: r.nodeId, ready: r.ready, degraded: r.degraded, token: r.token.slice(0, 6), height: r.height, pending: r.pending.size })
  }
  return out
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__openloopBridgeDebug = bridgeDebug
}

/** iframe 的当前缩放比（0.9.7 宽度自适应：内容自然宽 > 容器宽时等比缩小；未缩放=1） */
export function frameScale(rec: FrameRecord): number {
  if (rec.width <= 0) return 1
  const fr = rec.frame.getBoundingClientRect()
  if (fr.width === 0) return 1
  return fr.width / rec.width
}

/** iframe 内容坐标（父页面 client 坐标 → iframe 视口坐标；0.9.7 带 scale 换算 + 越界守卫） */
export function toFrameCoords(rec: FrameRecord, clientX: number, clientY: number): { x: number; y: number } {
  const r = rec.frame.getBoundingClientRect()
  const s = frameScale(rec)
  return { x: (clientX - r.left) / s, y: (clientY - r.top) / s }
}

/** 坐标越界守卫（0.9.7 问题 2「选到奇怪位置」）：缝隙/滚动条处换算出的坐标超出
 * iframe 视口——不发探针查询（否则返回边缘大容器，高亮错位）。调用方在
 * probeHitAt/probeMarqueeIn 前判定。 */
export function coordsInFrame(rec: FrameRecord, x: number, y: number): boolean {
  if (x < 0 || y < 0) return false
  const fr = rec.frame.getBoundingClientRect()
  const s = frameScale(rec)
  return x <= fr.width / s && y <= fr.height / s
}

/** 按 nodeId 取 frame 记录（HighlightEl 算 scale 用） */
export function frameRecordOf(nodeId: string): FrameRecord | null {
  return registry.get(nodeId) ?? null
}

/** iframe 内容自然宽度（0=未知；HtmlNode 缩放渲染用） */
export function probeWidth(nodeId: string): number {
  return registry.get(nodeId)?.width ?? 0
}

/** 点查询（探针 ready 才有效；degraded/未 ready 返回 null → 走节点级降级。
 * 真机教训：120ms 对复杂 HTML 过紧（postMessage 往返 + 大 DOM 命中计算 + 主线程
 * 竞争）——点选体验优先放宽默认 300ms） */
export function probeHitAt(rec: FrameRecord, x: number, y: number, timeoutMs = 500): Promise<ProbeHit | null> {
  if (!rec.ready || rec.degraded) {
    
    return Promise.resolve(null)
  }
  return new Promise(resolve => {
    const reqId = reqSeq++
    const timer = setTimeout(() => {
      rec.pending.delete(reqId)
      
      resolve(null)
    }, timeoutMs)
    rec.pending.set(reqId, hit => {
      clearTimeout(timer)
      resolve(hit as ProbeHit | null)
    })
    
    rec.frame.contentWindow?.postMessage({ __openloopProbe: true, t: 'hit', token: rec.token, reqId, x, y }, '*')
  })
}

/** 框选查询（同上；返回叶子元素命中数组。默认 400ms——复杂 HTML 多叶子遍历） */
export function probeMarqueeIn(rec: FrameRecord, rect: ProbeRect, timeoutMs = 400): Promise<ProbeHit[]> {
  if (!rec.ready || rec.degraded) return Promise.resolve([])
  return new Promise(resolve => {
    const reqId = reqSeq++
    const timer = setTimeout(() => { rec.pending.delete(reqId); resolve([]) }, timeoutMs)
    rec.pending.set(reqId, hits => {
      clearTimeout(timer)
      resolve(Array.isArray(hits) ? hits as ProbeHit[] : [])
    })
    rec.frame.contentWindow?.postMessage({ __openloopProbe: true, t: 'marquee', token: rec.token, reqId, rect }, '*')
  })
}

/** iframe 内容高度（自适应；degraded 时 0 = iframe 用固定高度兜底） */
export function probeHeight(nodeId: string): number {
  return registry.get(nodeId)?.height ?? 0
}

/** 导出 FrameRecord 类型（PinLayer 持有引用查询用） */
export type { FrameRecord }

/**
 * 坐标换算（纯函数，单测覆盖）：探针 rect（iframe 视口）→ 父页面画布容器坐标。
 * iframe 本身不滚动（高度自适应），故只加 iframe 在容器内的偏移。
 */
export function frameRectToContainer(frame: HTMLIFrameElement, container: HTMLElement, r: { x: number; y: number; w: number; h: number }, scale = 1): { left: number; top: number; width: number; height: number } {
  const fb = frame.getBoundingClientRect()
  const cb = container.getBoundingClientRect()
  return {
    left: fb.left - cb.left + r.x * scale,
    top: fb.top - cb.top + r.y * scale,
    width: r.w * scale,
    height: r.h * scale,
  }
}
