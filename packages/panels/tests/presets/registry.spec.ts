import { describe, expect, it } from 'vitest'
import { allPresetKinds, getPreset } from '../../src/presets/index.ts'
import type { PresetKind } from '../../src/contract.ts'

describe('preset registry', () => {
  it('getPreset 返回已注册模块（schema/validate/Render 三件齐备）', () => {
    const module = getPreset('metric-grid')
    expect(module).toBeDefined()
    expect(module?.schema).toBeDefined()
    expect(typeof module?.validate).toBe('function')
    expect(typeof module?.Render).toBe('function')
  })

  it('批 2 kind 已注册（text/heading/card/stack 等）', () => {
    for (const kind of ['text', 'markdown', 'heading', 'badge', 'tag', 'divider', 'avatar', 'card', 'section', 'stack', 'grid', 'row', 'split']) {
      expect(getPreset(kind as PresetKind)).toBeDefined()
    }
  })

  it('未实现 kind 返回 undefined', () => {
    expect(getPreset('tooltip')).toBeUndefined()
    expect(getPreset('metric')).toBeUndefined()
  })

  it('allPresetKinds 覆盖批 1+批 2+批 3+批 4+批 5 共 33 个 kind', () => {
    const kinds = allPresetKinds()
    expect(kinds.sort()).toEqual([
      'accordion', 'api-credentials', 'avatar', 'badge', 'callout', 'card', 'chart',
      'comparison', 'data-table', 'db-browser', 'divider', 'flow', 'funnel', 'gauge',
      'grid', 'heading', 'heatmap', 'markdown', 'mcp-status', 'metric-grid',
      'pb-stats', 'plugin-registry', 'progress', 'row', 'section', 'sessions-stats',
      'sparkline', 'split', 'stack', 'storage-usage', 'tag', 'text', 'timeline',
    ])
    for (const kind of kinds) {
      expect(getPreset(kind)).toBeDefined()
    }
  })

  it('已注册 kind 全部落在 contract.ts PresetKind 白名单内', () => {
    const kinds = allPresetKinds()
    const valid = new Set<PresetKind>([
      'text', 'markdown', 'heading', 'badge', 'tag', 'divider', 'avatar',
      'card', 'section', 'stack', 'grid', 'row', 'split', 'scroll-area',
      'metric', 'metric-grid', 'data-table', 'list', 'key-value', 'stat',
      'rating', 'empty-state', 'timeline',
      'chart', 'sparkline', 'gauge', 'funnel', 'heatmap',
      'flow', 'comparison', 'steps', 'tree',
      'callout', 'status', 'progress', 'skeleton',
      'tabs', 'accordion', 'pagination', 'tooltip',
      'pb-stats', 'db-browser', 'storage-usage', 'api-credentials', 'sessions-stats', 'mcp-status', 'plugin-registry',
    ])
    for (const kind of kinds) expect(valid.has(kind)).toBe(true)
  })
})
