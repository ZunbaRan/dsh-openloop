/**
 * section 渲染器：可 bordered 的分区（bordered=false 时仅留白 + 标题）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { ContainerHeader } from '../container.tsx'
import { renderChildren } from '../widget-view.tsx'

const borderedShell: CSSProperties = {
  border: '1px solid var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-md)',
  background: 'var(--openloop-surface-subtle)',
  padding: '12px 14px',
}

const plainShell: CSSProperties = {
  padding: '4px 0',
}

const body: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

export function SectionRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const title = typeof root.title === 'string' ? root.title : undefined
  const bordered = root.bordered !== false
  const children = Array.isArray(root.children) ? (root.children as unknown[]) : []

  return (
    <section data-openloop-preset="section" data-openloop-bordered={bordered ? 'true' : 'false'} style={bordered ? borderedShell : plainShell}>
      <ContainerHeader title={title} />
      <div style={body}>{renderChildren(children)}</div>
    </section>
  )
}
