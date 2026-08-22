/**
 * markdown 渲染器：轻量解析（md.ts，≤60 行、无依赖）输出 React 元素。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { renderMarkdown } from './md.tsx'

const shell: CSSProperties = {
  color: 'var(--openloop-foreground)',
  fontSize: 'var(--openloop-type-label, 13px)',
  wordBreak: 'break-word',
}

export function MarkdownRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const content = typeof root.content === 'string' ? root.content : ''
  return (
    <div data-openloop-preset="markdown" style={shell}>
      {renderMarkdown(content)}
    </div>
  )
}
