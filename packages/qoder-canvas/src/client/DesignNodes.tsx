/**
 * DesignNodes：设计原语节点渲染器（0.11 DSL 复刻 baoyu-design）。
 *
 * 「把 baoyu 的 HTML 翻译成我们自己的 DOM」——Agent 写结构化设计 JSON，
 * 这里的 React 组件在主 document 生成元素。标注系统（PinLayer 的
 * hitElement/domPath）零改动天然工作——每个嵌套节点渲染时都带
 * data-canvas-node（关键：嵌套 wrapper 用普通 div 而非 display:contents，
 * 后者无盒模型 → getBoundingClientRect 全 0 → 标注失效，0.2.1 教训）。
 */
import type { CSSProperties, ReactNode } from 'react'
import type { CanvasNode } from '../dsl.ts'
import { FONT_STACKS, GRADIENT_PRESETS, SHADOW_PRESETS, TONE_COLORS, animationCss, KEYFRAMES_CSS, type IconName } from '../design-system.ts'

/** style props（白名单已校验）→ React CSSProperties（语义预设在此映射） */
function designStyle(style: Record<string, unknown>): CSSProperties {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(style)) {
    if (k === 'shadow') { out.boxShadow = SHADOW_PRESETS[String(v)] ?? 'none'; continue }
    if (k === 'gradient') { const g = GRADIENT_PRESETS[String(v)]; if (g !== undefined && g !== 'none') out.background = g; continue }
    if (k === 'fontFamily') { out.fontFamily = FONT_STACKS[String(v)] ?? FONT_STACKS.sans; continue }
    if (k === 'flex') { out.flex = v === 'grow' ? '1 1 0%' : v === 'full' ? '1 1 100%' : 'none'; continue }
    if (k === 'tone') {
      const t = TONE_COLORS[String(v)]
      if (t !== undefined) { out.color = t.fg; out.background = t.bg }
      continue
    }
    if (typeof v === 'number' && ['fontSize', 'padding', 'margin', 'gap', 'borderRadius', 'borderWidth', 'width', 'maxWidth', 'minHeight', 'letterSpacing'].includes(k)) {
      out[k] = `${v}px`
      continue
    }
    if (k === 'fontWeight') { out[k] = Number(v); continue }
    out[k] = v
  }
  return out as CSSProperties
}

/** 动画配置 → CSS animation 字符串 */
function animStyle(anim: unknown): CSSProperties {
  if (anim === null || typeof anim !== 'object') return {}
  const a = anim as { name?: unknown; duration?: unknown; delay?: unknown }
  const name = typeof a.name === 'string' ? a.name : 'none'
  if (name === 'none') return {}
  const duration = typeof a.duration === 'number' ? a.duration : 400
  const delay = typeof a.delay === 'number' ? a.delay : 0
  return { animation: animationCss(name, duration, delay) }
}

/** 嵌套子节点递归渲染（渲染器由 CanvasSurface 注入——避免循环 import；onAction 透传到嵌套 action 节点） */
export type ChildRenderer = (node: CanvasNode) => ReactNode

export function renderDesignChildren(children: readonly CanvasNode[] | undefined, renderChild: ChildRenderer): ReactNode {
  if (children === undefined || children.length === 0) return null
  return <>{children.map(child => renderChild(child))}</>
}

/** 动画 keyframes 一次性注入（CanvasSurface surface 层调用，全局一份） */
export function DesignKeyframesStyle(): ReactNode {
  return <style>{KEYFRAMES_CSS}</style>
}

export function BoxNode({ node, renderChild }: { node: CanvasNode; renderChild: ChildRenderer }): ReactNode {
  const style = typeof node.props.style === 'object' && node.props.style !== null ? node.props.style as Record<string, unknown> : {}
  const anim = node.props.animation
  return (
    <div data-canvas-node={node.id} style={{ ...designStyle(style), ...animStyle(anim), boxSizing: 'border-box', minWidth: 0 }}>
      {renderDesignChildren(node.children, renderChild)}
    </div>
  )
}

export function TextNode({ node }: { node: CanvasNode }): ReactNode {
  const style = typeof node.props.style === 'object' && node.props.style !== null ? node.props.style as Record<string, unknown> : {}
  const anim = node.props.animation
  const content = String(node.props.content ?? '')
  return (
    <div data-canvas-node={node.id} style={{ ...designStyle(style), ...animStyle(anim), boxSizing: 'border-box', minWidth: 0 }}>
      {content}
    </div>
  )
}

export function IconNode({ node }: { node: CanvasNode }): ReactNode {
  const name = String(node.props.name ?? 'star') as IconName
  const size = typeof node.props.size === 'number' ? node.props.size : 24
  const style = typeof node.props.style === 'object' && node.props.style !== null ? node.props.style as Record<string, unknown> : {}
  return (
    <div data-canvas-node={node.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...designStyle(style), boxSizing: 'border-box' }}>
      <IconGlyph name={name} size={size} />
    </div>
  )
}

export function DividerNode({ node }: { node: CanvasNode }): ReactNode {
  const style = typeof node.props.style === 'object' && node.props.style !== null ? node.props.style as Record<string, unknown> : {}
  const s = designStyle(style)
  return <div data-canvas-node={node.id} style={{ width: '100%', height: 1, background: 'var(--dsw-alias-border-l2, rgba(127,127,127,.25))', ...s, boxSizing: 'border-box' }} />
}

// ---- 内置图标集（lucide 风格 stroke 图标，24 viewBox） ----

const ICON_PATHS: Readonly<Record<string, string>> = {
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 22V12h6v10',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  rocket: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'trending-up': 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  'trending-down': 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  database: 'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5',
}

function IconGlyph({ name, size }: { name: IconName; size: number }): ReactNode {
  const d = ICON_PATHS[name] ?? ICON_PATHS.star
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
