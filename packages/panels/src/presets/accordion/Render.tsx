/**
 * accordion 渲染器。
 * 参照 DeclarativeAdvancedPrimitives.AccordionPrimitive：单开手风琴 + 组件内本地
 * useState 展开态；chevron 用内联 SVG，箭头随展开旋转。样式 100% 来自 var(--openloop-*)。
 */
import { useId, useState, type CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isFiniteNumber } from '../common.ts'
import { meta, panel, title } from '../style.ts'

const triggerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  padding: '10px 12px',
  background: 'transparent',
  border: 'none',
  color: 'var(--openloop-foreground)',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4,
  cursor: 'pointer',
  textAlign: 'left',
}

const triggerLabelStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const chevronStyle: CSSProperties = {
  display: 'inline-flex',
  flexShrink: 0,
  transition: 'transform 150ms ease',
}

const panelRegionStyle: CSSProperties = {
  padding: '2px 12px 12px',
  fontSize: 12,
  lineHeight: 1.55,
  color: 'var(--openloop-muted-foreground)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

interface AccordionItem {
  label: string
  content: string
}

export function AccordionRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const items: AccordionItem[] = (Array.isArray(root.items) ? root.items : [])
    .slice(0, 20)
    .map((raw, index) => {
      const item = asRecord(raw) ?? {}
      return {
        label: typeof item.label === 'string' ? item.label : `条目 ${index + 1}`,
        content: typeof item.content === 'string' ? item.content : '',
      }
    })

  const baseId = useId()
  const requestedDefault = isFiniteNumber(root.defaultOpenIndex) ? Math.trunc(root.defaultOpenIndex) : 0
  const [openIndex, setOpenIndex] = useState<number | null>(
    requestedDefault >= 0 && requestedDefault < items.length ? requestedDefault : items.length > 0 ? 0 : null,
  )

  if (items.length === 0) {
    return (
      <div data-openloop-preset="accordion" data-openloop-count="0" style={{ ...panel, padding: '12px 14px' }}>
        <div style={meta}>暂无内容</div>
      </div>
    )
  }

  return (
    <div data-openloop-preset="accordion" data-openloop-count={String(items.length)} style={{ ...panel, overflow: 'hidden', padding: 0 }}>
      {panelTitle !== undefined ? (
        <div style={{ ...title, padding: '10px 12px', borderBottom: '1px solid var(--openloop-border)' }}>{panelTitle}</div>
      ) : null}
      {items.map((item, index) => {
        const expanded = openIndex === index
        const triggerId = `${baseId}-trigger-${index}`
        const panelId = `${baseId}-panel-${index}`
        return (
          <div key={triggerId} style={index > 0 ? { borderTop: '1px solid var(--openloop-border)' } : undefined}>
            <button
              type="button"
              id={triggerId}
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpenIndex(expanded ? null : index)}
              style={triggerStyle}
            >
              <span style={triggerLabelStyle}>{item.label}</span>
              <span aria-hidden="true" style={expanded ? { ...chevronStyle, transform: 'rotate(180deg)' } : chevronStyle}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </span>
            </button>
            <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded} style={panelRegionStyle}>
              {item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
