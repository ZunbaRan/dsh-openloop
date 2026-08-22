/**
 * 轻量 markdown 解析（§6 排版 markdown；不引入 marked 等依赖）。
 * 块级：标题 #–#### / 无序列表 -、* / 有序列表 1. / 段落；
 * 行内：**加粗**、`行内代码`。其余一律按字面文本输出。
 */
import type { CSSProperties, ReactNode } from 'react'

const codeStyle: CSSProperties = {
  padding: '1px 5px',
  borderRadius: 'var(--openloop-radius-sm)',
  background: 'var(--openloop-surface-muted)',
  border: '1px solid var(--openloop-border)',
  fontFamily: 'var(--openloop-font-sans, ui-monospace, SFMono-Regular, Menlo, monospace)',
  fontSize: '0.92em',
}

/** 行内解析：**加粗** 与 `代码`，其余原样 */
export function renderInline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let index = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${prefix}-b${index}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={`${prefix}-c${index}`} style={codeStyle}>{token.slice(1, -1)}</code>)
    }
    last = match.index + token.length
    index += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** 块级解析：返回 React 元素数组（标题/列表/段落） */
export function renderMarkdown(content: string): ReactNode[] {
  const blocks: ReactNode[] = []
  const lines = content.split(/\r?\n/)
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  const flushList = (key: number) => {
    if (listType === null) return key
    const items = listItems
    blocks.push(listType === 'ol'
      ? <ol key={`ol${key}`} style={{ margin: '4px 0', paddingLeft: 20 }}>{items.map((text, i) => <li key={i}>{renderInline(text, `ol${key}-${i}`)}</li>)}</ol>
      : <ul key={`ul${key}`} style={{ margin: '4px 0', paddingLeft: 20 }}>{items.map((text, i) => <li key={i}>{renderInline(text, `ul${key}-${i}`)}</li>)}</ul>)
    listType = null
    listItems = []
    return key + 1
  }
  const pStyle: CSSProperties = { margin: '4px 0', lineHeight: 1.55 }
  let key = 0
  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      key = flushList(key)
      const level = heading[1]!.length
      const Tag = (['h1', 'h2', 'h3', 'h4'] as const)[level - 1]!
      blocks.push(<Tag key={`h${key}`} style={{ margin: '8px 0 4px' }}>{renderInline(heading[2] ?? '', `h${key}`)}</Tag>)
      key += 1
      continue
    }
    const ul = /^[-*]\s+(.*)$/.exec(line)
    if (ul) {
      if (listType !== 'ul') { key = flushList(key); listType = 'ul' }
      listItems.push(ul[1] ?? '')
      continue
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ol) {
      if (listType !== 'ol') { key = flushList(key); listType = 'ol' }
      listItems.push(ol[1] ?? '')
      continue
    }
    key = flushList(key)
    if (line.trim() === '') continue
    blocks.push(<p key={`p${key}`} style={pStyle}>{renderInline(line, `p${key}`)}</p>)
    key += 1
  }
  flushList(key)
  return blocks
}
