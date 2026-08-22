import { describe, expect, it } from 'vitest'
import { toAntdThemeTokens, toMuiThemeTokens } from '../../src/packs/bridge.ts'

/** 最小预设系 token 快照（§14 词汇表子集；覆盖桥接器涉及的全部键） */
const tokens: Record<string, string> = {
  surface: 'oklch(1 0 0)',
  'surface-muted': 'oklch(0.965 0.003 285)',
  'surface-subtle': 'oklch(0.985 0.002 285)',
  border: 'oklch(0.895 0.008 285)',
  'border-muted': 'oklch(0.948 0.007 285)',
  foreground: 'oklch(0.21 0.006 285)',
  'muted-foreground': 'oklch(0.46 0.014 285)',
  'foreground-subtle': 'oklch(0.335 0.005 285)',
  'foreground-strong': 'oklch(0.21 0.006 285)',
  primary: 'oklch(0.57 0.2 260)',
  'primary-tint': 'oklch(0.68 0.16 260)',
  'primary-shade': 'oklch(0.5 0.19 260)',
  'primary-foreground': 'oklch(0.985 0 0)',
  success: 'oklch(0.46 0.15 150)',
  warning: 'oklch(0.48 0.13 65)',
  error: 'oklch(0.52 0.2 27)',
  info: 'oklch(0.49 0.15 240)',
  'chart-1': 'oklch(0.58 0.19 260)',
  'radius-sm': '8px',
  'radius-md': '12px',
  'radius-lg': '16px',
}

describe('toAntdThemeTokens（§12.3 桥接器 → antd theme.token）', () => {
  it('关键键映射：colorPrimary←primary / colorBgContainer←surface / colorText←foreground / borderRadius←radius-md', () => {
    const out = toAntdThemeTokens(tokens)
    expect(out.colorPrimary).toBe(tokens.primary)
    expect(out.colorBgContainer).toBe(tokens.surface)
    expect(out.colorText).toBe(tokens.foreground)
    expect(out.borderRadius).toBe(12)
  })

  it('状态色 / 边框 / 背景层 / 圆角档位映射', () => {
    const out = toAntdThemeTokens(tokens)
    expect(out.colorSuccess).toBe(tokens.success)
    expect(out.colorWarning).toBe(tokens.warning)
    expect(out.colorError).toBe(tokens.error)
    expect(out.colorInfo).toBe(tokens.info)
    expect(out.colorBorder).toBe(tokens.border)
    expect(out.colorBorderSecondary).toBe(tokens['border-muted'])
    expect(out.colorBgLayout).toBe(tokens['surface-muted'])
    expect(out.colorBgElevated).toBe(tokens['surface-subtle'])
    expect(out.borderRadiusSM).toBe(8)
    expect(out.borderRadiusLG).toBe(16)
  })

  it('灰阶按语义就近归并（有损映射，§12.3 说明）', () => {
    const out = toAntdThemeTokens(tokens)
    expect(out.colorTextSecondary).toBe(tokens['muted-foreground'])
    expect(out.colorTextTertiary).toBe(tokens['foreground-subtle'])
    expect(out.colorTextHeading).toBe(tokens['foreground-strong'])
  })

  it('primary hover/active ← primary-tint/shade；link ← primary', () => {
    const out = toAntdThemeTokens(tokens)
    expect(out.colorPrimaryHover).toBe(tokens['primary-tint'])
    expect(out.colorPrimaryActive).toBe(tokens['primary-shade'])
    expect(out.colorLink).toBe(tokens.primary)
  })

  it('缺失 token 的字段不输出；radius 非法值兜底为 0 不输出', () => {
    const out = toAntdThemeTokens({ surface: 'oklch(1 0 0)', primary: 'x', 'radius-md': 'round' })
    expect(out.colorBgContainer).toBe('oklch(1 0 0)')
    expect(out.colorText).toBeUndefined()
    expect(out.borderRadius).toBeUndefined() // 非法圆角值 → 0 → 不输出
  })
})

describe('toMuiThemeTokens（§12.3 桥接器 → MUI createTheme 输入）', () => {
  it('palette.primary.main ← primary；shape.borderRadius ← radius-md；background/text/divider 映射', () => {
    const out = toMuiThemeTokens(tokens)
    expect(out.palette?.primary?.main).toBe(tokens.primary)
    expect(out.palette?.primary?.light).toBe(tokens['primary-tint'])
    expect(out.palette?.primary?.dark).toBe(tokens['primary-shade'])
    expect(out.palette?.primary?.contrastText).toBe(tokens['primary-foreground'])
    expect(out.shape?.borderRadius).toBe(12)
    expect(out.palette?.background?.default).toBe(tokens.surface)
    expect(out.palette?.background?.paper).toBe(tokens['surface-subtle'])
    expect(out.palette?.text?.primary).toBe(tokens.foreground)
    expect(out.palette?.text?.secondary).toBe(tokens['muted-foreground'])
    expect(out.palette?.divider).toBe(tokens.border)
  })

  it('四态色映射；secondary 无对应 token → chart-1 近似（有损说明）', () => {
    const out = toMuiThemeTokens(tokens)
    expect(out.palette?.error?.main).toBe(tokens.error)
    expect(out.palette?.warning?.main).toBe(tokens.warning)
    expect(out.palette?.info?.main).toBe(tokens.info)
    expect(out.palette?.success?.main).toBe(tokens.success)
    expect(out.palette?.secondary?.main).toBe(tokens['chart-1'])
  })

  it('输入含全局系 font-sans 时映射 typography.fontFamily', () => {
    const out = toMuiThemeTokens({ ...tokens, 'font-sans': 'system-ui, sans-serif' })
    expect(out.typography?.fontFamily).toBe('system-ui, sans-serif')
  })

  it('空 token 输入返回空对象（无字段输出，调用方走默认主题）', () => {
    expect(toAntdThemeTokens({})).toEqual({})
    expect(toMuiThemeTokens({})).toEqual({})
  })
})
