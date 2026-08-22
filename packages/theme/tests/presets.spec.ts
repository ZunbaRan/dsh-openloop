import { describe, expect, it } from 'vitest'
import { DEFAULT_OPENLOOP_SETTINGS, OPENLOOP_GLOBAL_TOKENS, OPENLOOP_PRESET_IDS, OPENLOOP_PRESETS, decodeOpenLoopSettings, resolvePalette } from '../src/index.ts'

describe('OpenLoop visual presets', () => {
  it('contains the eight OpenChamber presets with light and dark palettes', () => {
    expect(OPENLOOP_PRESET_IDS).toHaveLength(8)
    for (const id of OPENLOOP_PRESET_IDS) {
      expect(OPENLOOP_PRESETS[id].light['primary']).toBeTruthy()
      expect(OPENLOOP_PRESETS[id].dark['primary']).toBeTruthy()
      expect(OPENLOOP_PRESETS[id].light['chart-8']).toBeTruthy()
    }
  })
  it('has the curated v2 tokens in every preset × light/dark group', () => {
    const curated = ['foreground-subtle', 'foreground-strong', 'border-muted', 'border-strong'] as const
    for (const id of OPENLOOP_PRESET_IDS) {
      for (const mode of ['light', 'dark'] as const) {
        for (const key of curated) expect(OPENLOOP_PRESETS[id][mode][key], `${id}/${mode}/${key}`).toBeTruthy()
      }
    }
  })
  it('exposes the global tokens independent of presets', () => {
    const expected = ['font-sans', 'type-display', 'type-title', 'type-label', 'type-meta', 'type-micro', 'space-1', 'space-2', 'space-3', 'space-4', 'space-5']
    for (const key of expected) expect(OPENLOOP_GLOBAL_TOKENS[key], key).toBeTruthy()
    expect(Object.keys(OPENLOOP_GLOBAL_TOKENS)).toHaveLength(expected.length)
  })
  it('normalizes unknown settings and follows system appearance', () => {
    expect(decodeOpenLoopSettings({ preset: 'unknown', appearance: 'wat' })).toEqual(DEFAULT_OPENLOOP_SETTINGS)
    expect(resolvePalette(DEFAULT_OPENLOOP_SETTINGS, true).appearance).toBe('dark')
  })
})
