import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateMarkdown } from '../../src/presets/markdown/validate.ts'
import { MarkdownRender } from '../../src/presets/markdown/Render.tsx'
import { renderMarkdown } from '../../src/presets/markdown/md.tsx'

describe('markdown schema 边界', () => {
  it('合法 content 通过', () => {
    expect(validateMarkdown({ content: '# 标题\n正文' }).ok).toBe(true)
  })

  it('非对象 / 缺 content / 空串 / 超长拒绝', () => {
    expect(validateMarkdown(undefined).ok).toBe(false)
    expect(validateMarkdown({}).ok).toBe(false)
    expect(validateMarkdown({ content: '' }).ok).toBe(false)
    expect(validateMarkdown({ content: 'x'.repeat(10001) }).ok).toBe(false)
  })
})

describe('markdown 渲染断言', () => {
  it('标题/加粗/行内代码/列表解析', () => {
    const source = '# 大标题\n\n**加粗** 与 `code`\n\n- 甲\n- 乙\n\n1. 一\n2. 二'
    const markup = renderToStaticMarkup(<MarkdownRender props={{ content: source }} />)
    expect(markup).toContain('data-openloop-preset="markdown"')
    expect(markup).toContain('<h1')
    expect(markup).toContain('大标题')
    expect(markup).toContain('<strong>加粗</strong>')
    expect(markup).toContain('<code')
    expect(markup).toContain('<ul')
    expect(markup).toContain('<ol')
    expect(markup).toContain('>甲<')
    expect(markup).toContain('>一<')
  })

  it('四级标题映射 h1–h4', () => {
    const source = '# a\n## b\n### c\n#### d'
    const markup = renderToStaticMarkup(<MarkdownRender props={{ content: source }} />)
    expect(markup).toMatch(/<h1/)
    expect(markup).toMatch(/<h2/)
    expect(markup).toMatch(/<h3/)
    expect(markup).toMatch(/<h4/)
  })

  it('未匹配的文本按字面输出（不引入 marked 等依赖）', () => {
    expect(renderMarkdown('普通段落')).toHaveLength(1)
  })
})
