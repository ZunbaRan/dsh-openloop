/**
 * card 渲染器：面板外壳 + 头部（title/description）+ children 槽。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { panel } from '../style.ts'
import { ContainerHeader } from '../container.tsx'
import { renderChildren } from '../widget-view.tsx'

const shell: CSSProperties = {
  ...panel,
  padding: '14px 16px',
}

const body: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

export function CardRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const title = typeof root.title === 'string' ? root.title : undefined
  const description = typeof root.description === 'string' ? root.description : undefined
  const children = Array.isArray(root.children) ? (root.children as unknown[]) : []

  return (
    <div data-openloop-preset="card" style={shell}>
      <ContainerHeader title={title} description={description} />
      <div style={body}>{renderChildren(children)}</div>
    </div>
  )
}
