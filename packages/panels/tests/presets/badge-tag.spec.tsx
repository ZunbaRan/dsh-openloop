import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateBadge } from '../../src/presets/badge/validate.ts'
import { BadgeRender } from '../../src/presets/badge/Render.tsx'
import { validateTag } from '../../src/presets/tag/validate.ts'
import { TagRender } from '../../src/presets/tag/Render.tsx'

describe('badge schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateBadge({ label: '稳定' }).ok).toBe(true)
    expect(validateBadge({ label: '热卖', tone: 'primary' }).ok).toBe(true)
  })

  it('label 必填 1–80 字符', () => {
    expect(validateBadge({}).ok).toBe(false)
    expect(validateBadge({ label: '' }).ok).toBe(false)
    expect(validateBadge({ label: 'x'.repeat(81) }).ok).toBe(false)
  })

  it('tone 六档枚举', () => {
    expect(validateBadge({ label: 'a', tone: 'neutral' }).ok).toBe(true)
    expect(validateBadge({ label: 'a', tone: 'error' }).ok).toBe(true)
    expect(validateBadge({ label: 'a', tone: 'danger' }).ok).toBe(false)
  })
})

describe('badge 渲染断言', () => {
  it('渲染胶囊 + tone 件套', () => {
    const markup = renderToStaticMarkup(<BadgeRender props={{ label: 'Beta', tone: 'info' }} />)
    expect(markup).toContain('data-openloop-preset="badge"')
    expect(markup).toContain('data-openloop-tone="info"')
    expect(markup).toContain('var(--openloop-info-background)')
    expect(markup).toContain('Beta')
  })
})

describe('tag schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateTag({ label: 'React' }).ok).toBe(true)
  })

  it('label 必填 1–80；tone 枚举', () => {
    expect(validateTag({}).ok).toBe(false)
    expect(validateTag({ label: 'x'.repeat(81) }).ok).toBe(false)
    expect(validateTag({ label: 'a', tone: 'noop' }).ok).toBe(false)
  })
})

describe('tag 渲染断言', () => {
  it('描边型：transparent 背景 + tone 边框', () => {
    const markup = renderToStaticMarkup(<TagRender props={{ label: 'v2', tone: 'success' }} />)
    expect(markup).toContain('data-openloop-preset="tag"')
    expect(markup).toContain('background:transparent')
    expect(markup).toContain('var(--openloop-success)')
    expect(markup).toContain('v2')
  })
})
