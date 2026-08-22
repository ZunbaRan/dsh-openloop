import { describe, expect, it } from 'vitest'
import type { PanelDefinition, PresetKind } from '../src/contract.ts'

// §6.1 全清单（运行时白名单，对照 §5.4 preset kind 校验）
const PRESET_KINDS: readonly PresetKind[] = [
  'text', 'markdown', 'heading', 'badge', 'tag', 'divider', 'avatar',
  'card', 'section', 'stack', 'grid', 'row', 'split', 'scroll-area',
  'metric', 'metric-grid', 'data-table', 'list', 'key-value', 'stat',
  'rating', 'empty-state', 'timeline',
  'chart', 'sparkline', 'gauge', 'funnel', 'heatmap',
  'flow', 'comparison', 'steps', 'tree',
  'callout', 'status', 'progress', 'skeleton',
  'tabs', 'accordion', 'pagination', 'tooltip',
]

const validPanel = {
  $schema: 'openloop.panel/v1',
  id: 'hello-panel',
  title: 'Hello Panel',
  widgets: [
    { id: 'hero-metric', source: { type: 'preset', kind: 'metric', props: { label: '月营收', value: 48210 } } },
  ],
} satisfies PanelDefinition

describe('PanelDefinition 契约（§5.3）', () => {
  it('合法面板可 JSON 序列化且 $schema 恒定', () => {
    const parsed = JSON.parse(JSON.stringify(validPanel)) as PanelDefinition
    expect(parsed.$schema).toBe('openloop.panel/v1')
    expect(parsed.id).toBe('hello-panel')
    expect(parsed.widgets).toHaveLength(1)
  })

  it('widgets 数量在 1–24 内（§5.4）', () => {
    expect(validPanel.widgets.length).toBeGreaterThanOrEqual(1)
    expect(validPanel.widgets.length).toBeLessThanOrEqual(24)
  })

  it('widget id 为 kebab-case 且面板内唯一（§5.4）', () => {
    const ids = validPanel.widgets.map(widget => widget.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  it('title 长度不超过 120 字符（§5.4）', () => {
    expect(validPanel.title.length).toBeLessThanOrEqual(120)
  })

  it('preset source 的 kind 落在 §6.1 白名单内', () => {
    for (const widget of validPanel.widgets) {
      if (widget.source.type === 'preset') {
        expect(PRESET_KINDS).toContain(widget.source.kind)
      }
    }
    expect(PRESET_KINDS).not.toContain('nope')
  })
})
