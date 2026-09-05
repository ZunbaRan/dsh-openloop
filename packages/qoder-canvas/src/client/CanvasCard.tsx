/**
 * CanvasCard：toolview 入口卡片（S5 形态修正，2026-09-06 用户反馈拍板）。
 *
 * 双形态正确分工（修正「两个画布」的错误）：
 * - 对话流 = 【轻量入口】：预览快照（只读）+ 「⇱ 工作台」主按钮 + action 点击=打开工作台。
 *   【删除】对话流内的标注交互（AnnotationOverlay 下线）与 action 注入——标注只属于工作台。
 * - 工作台 = 【唯一操作主场】：画布真身 + 评论面板 + 标注。
 *
 * 生成即开：卡片挂载时静默同步工作台快照（回放不打扰）；工作台处于空态时
 * 自动展开定位（首个画布自动生成即开，见 CanvasWorkbench 的 hasEverOpened 判断）。
 */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { useEffect, type ReactNode } from 'react'
import type { CanvasSnapshot } from '../dsl.ts'
import { CanvasSurface } from './CanvasSurface.tsx'

const captionStyle = { color: 'var(--dsw-alias-label-caption, #888)', fontSize: 12 } as const

/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错）。
 *  presentationMeta 返回扁平 snapshot 本体（无包装层）。 */
export function canvasMetaFrom(value: unknown): CanvasSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const s = value as Record<string, unknown>
  if (s.kind !== 'qoder-canvas' || s.version !== 1) return undefined
  if (typeof s.canvasId !== 'string' || typeof s.revision !== 'number') return undefined
  const canvas = s.canvas
  if (typeof canvas !== 'object' || canvas === null) return undefined
  const c = canvas as Record<string, unknown>
  if (typeof c.title !== 'string' || !Array.isArray(c.nodes)) return undefined
  return value as CanvasSnapshot
}

export function CanvasCard({ block }: ToolCallViewProps) {
  if (!('kind' in block)) return <div style={captionStyle}>Canvas · rendering…</div>
  if (block.isError) return <div style={captionStyle}>Canvas · failed</div>
  const meta = canvasMetaFrom(block.meta)
  if (!meta) return <div style={captionStyle}>Canvas · metadata unavailable</div>
  return <CanvasCardInner snapshot={meta} />
}

declare global {
  interface Window {
    __openloopCanvasOpen?: (canvasId: string, snapshot?: CanvasSnapshot) => void
    __openloopCanvasUpdate?: (canvasId: string, snapshot: CanvasSnapshot) => void
  }
}

/** 入口卡片（只读预览 + 工作台入口；零标注交互） */
function CanvasCardInner({ snapshot }: { snapshot: CanvasSnapshot }): ReactNode {
  // 生成即开 + 回放静默同步：挂载即把快照推给工作台（workbench 内部判断
  // 是自动展开（空态首画布）还是仅更新内容（已开着/回放））
  useEffect(() => {
    window.__openloopCanvasUpdate?.(snapshot.canvasId, snapshot)
  }, [snapshot])

  /** action 节点在对话流的语义：点击 = 打开工作台执行（不在对话流注入） */
  const onAction = (): void => {
    window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ⇱ 工作台主按钮（对话流唯一操作入口） */}
      <button type="button" onClick={() => window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot)} title="在画布工作台打开（右侧推出栏：标注/迭代）"
        style={{ position: 'absolute', top: 6, right: 8, zIndex: 20, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', color: '#fff', background: 'var(--dsw-alias-state-business-primary, #4176e6)', border: 'none', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 2px 8px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 35%, transparent)' }}>
        ⇱ 工作台
      </button>
      <CanvasSurface snapshot={snapshot} onAction={onAction} />
    </div>
  )
}
