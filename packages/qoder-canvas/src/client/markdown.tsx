/**
 * 极简 markdown 行渲染（设计文档 §3.1 安全规格：零 HTML 解析）。
 * 支持：# 标题、- 列表、**加粗**、`code` span、空行分段。恶意标签按纯文本显示。
 */
import type { ReactNode } from 'react'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  // 分割 **bold** 与 `code`
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith('**')) {
      out.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>)
    } else {
      out.push(<code key={`${keyPrefix}-c${i}`} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.9em', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', padding: '1px 4px', borderRadius: 4 }}>{token.slice(1, -1)}</code>)
    }
    last = m.index + token.length
    i += 1
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function renderMarkdownLines(text: string): ReactNode {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
        if (line.startsWith('### ')) return <div key={i} style={{ fontSize: 12, fontWeight: 650, marginTop: 8 }}>{renderInline(line.slice(4), `l${i}`)}</div>
        if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 13, fontWeight: 650, marginTop: 10 }}>{renderInline(line.slice(3), `l${i}`)}</div>
        if (line.startsWith('# ')) return <div key={i} style={{ fontSize: 14, fontWeight: 700, marginTop: 12 }}>{renderInline(line.slice(2), `l${i}`)}</div>
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--dsw-alias-label-caption, #888)' }}>•</span><span>{renderInline(line.slice(2), `l${i}`)}</span></div>
        return <div key={i}>{renderInline(line, `l${i}`)}</div>
      })}
    </>
  )
}
