import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateDivider } from '../../src/presets/divider/validate.ts'
import { DividerRender } from '../../src/presets/divider/Render.tsx'
import { validateAvatar } from '../../src/presets/avatar/validate.ts'
import { AvatarRender } from '../../src/presets/avatar/Render.tsx'

describe('divider schema 边界', () => {
  it('空 props（纯横线）通过', () => {
    expect(validateDivider({}).ok).toBe(true)
    expect(validateDivider({ label: '分组' }).ok).toBe(true)
  })

  it('label 必须 1–80 字符串', () => {
    expect(validateDivider({ label: '' }).ok).toBe(false)
    expect(validateDivider({ label: 42 }).ok).toBe(false)
    expect(validateDivider({ label: 'x'.repeat(81) }).ok).toBe(false)
  })
})

describe('divider 渲染断言', () => {
  it('带 label 渲染居中标签 + 左右横线', () => {
    const markup = renderToStaticMarkup(<DividerRender props={{ label: '里程碑' }} />)
    expect(markup).toContain('role="separator"')
    expect(markup).toContain('里程碑')
    expect(markup).toContain('data-openloop-has-label="true"')
  })

  it('无 label 渲染单根横线', () => {
    const markup = renderToStaticMarkup(<DividerRender props={{}} />)
    expect(markup).toContain('data-openloop-has-label="false"')
    expect(markup).not.toContain('里程碑')
  })
})

describe('avatar schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateAvatar({ name: '王小明' }).ok).toBe(true)
    expect(validateAvatar({ name: 'Ada', size: 'lg', tone: 'info' }).ok).toBe(true)
  })

  it('name 必填 1–80 字符', () => {
    expect(validateAvatar({}).ok).toBe(false)
    expect(validateAvatar({ name: '' }).ok).toBe(false)
    expect(validateAvatar({ name: 'x'.repeat(81) }).ok).toBe(false)
  })

  it('size/tone 枚举拒绝', () => {
    expect(validateAvatar({ name: 'a', size: 'xl' }).ok).toBe(false)
    expect(validateAvatar({ name: 'a', tone: 'gold' }).ok).toBe(false)
  })
})

describe('avatar 渲染断言', () => {
  it('渲染 name 首字 + 色圆（哈希落在预设色圆集合内）', () => {
    const markup = renderToStaticMarkup(<AvatarRender props={{ name: '张三' }} />)
    expect(markup).toContain('data-openloop-preset="avatar"')
    expect(markup).toContain('>张<')
    expect(markup).toMatch(/var\(--openloop-(primary|info|success|warning|error)\)/)
  })

  it('同名同色（确定性哈希）', () => {
    const a = renderToStaticMarkup(<AvatarRender props={{ name: 'Bob' }} />)
    const b = renderToStaticMarkup(<AvatarRender props={{ name: 'Bob' }} />)
    expect(a).toBe(b)
  })
})
