import { describe, expect, it } from 'vitest'
import { buildWidgetDocument, WIDGET_CSP } from '../src/shell.ts'

describe('widget sandbox shell', () => {
  it('uses an opaque-friendly CSP with no network connection', () => {
    expect(WIDGET_CSP).toContain("connect-src 'none'")
    expect(WIDGET_CSP).toContain("frame-src 'none'")
    const doc = buildWidgetDocument('<div>x</div>', 'A < B', 'call-1', { scheme: 'dark' })
    expect(doc).toContain('<title>A &lt; B</title>')
    expect(doc).toContain('color-scheme:dark')
    const themed = buildWidgetDocument('<div>x</div>', 'A', 'call-2', { scheme: 'light', tokens: { 'chart-1': '#123456', primary: '#abcdef' } })
    expect(themed).toContain('--openloop-chart-1:#123456')
  })
})
