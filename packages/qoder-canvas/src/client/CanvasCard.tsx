/**
 * CanvasCard：toolview 卡片（M1）。
 * 读 block.meta.snapshot（presentationMeta 内嵌全量快照）→ CanvasSurface 渲染。
 * M2 将在此挂 AnnotationOverlay（标注回流）。
 */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { CanvasSnapshot } from '../dsl.ts'
import { CanvasSurface } from './CanvasSurface.tsx'

const captionStyle = { color: 'var(--dsw-alias-label-caption, #888)', fontSize: 12 } as const

/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错） */
export function canvasMetaFrom(value: unknown): CanvasSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.kind !== 'qoder-canvas' || record.version !== 1) return undefined
  const snapshot = record.snapshot
  if (typeof snapshot !== 'object' || snapshot === null) return undefined
  const s = snapshot as Record<string, unknown>
  if (s.kind !== 'qoder-canvas' || typeof s.canvasId !== 'string' || typeof s.revision !== 'number') return undefined
  const canvas = s.canvas
  if (typeof canvas !== 'object' || canvas === null) return undefined
  const c = canvas as Record<string, unknown>
  if (typeof c.title !== 'string' || !Array.isArray(c.nodes)) return undefined
  return snapshot as CanvasSnapshot
}

export function CanvasCard({ block }: ToolCallViewProps) {
  if (!('kind' in block)) return <div style={captionStyle}>Canvas · rendering…</div>
  if (block.isError) return <div style={captionStyle}>Canvas · failed</div>
  const meta = canvasMetaFrom(block.meta)
  if (!meta) return <div style={captionStyle}>Canvas · metadata unavailable</div>
  return (
    <div style={{ position: 'relative' }}>
      <CanvasSurface snapshot={meta} />
      {/* M2: AnnotationOverlay 挂载点 */}
    </div>
  )
}
