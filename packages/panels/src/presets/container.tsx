/**
 * 容器组件共享件：标题/描述头。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties, ReactNode } from 'react'

export const containerTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'var(--openloop-type-label, 13px)',
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--openloop-foreground)',
}

export const containerDescStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 'var(--openloop-type-meta, 12px)',
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
}

export function ContainerHeader({ title, description }: { title?: string | undefined; description?: string | undefined }): ReactNode | null {
  if (!title && !description) return null
  return (
    <div style={{ marginBottom: 10 }}>
      {title ? <div style={containerTitleStyle}>{title}</div> : null}
      {description ? <div style={containerDescStyle}>{description}</div> : null}
    </div>
  )
}
